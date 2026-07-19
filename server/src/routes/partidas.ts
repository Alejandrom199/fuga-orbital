import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { niveles, partidas, perfiles, progresoNiveles, usuarios } from '../schema.js';
import { evaluarLogrosPendientes } from '../logros.js';

// Anti-trampas proporcional: nada elaborado, sólo límites de cordura.
const DURACION_MAX_S = 3600; // 1 hora de partida es ya sospechoso para un endless runner
const MAX_PUNTOS_POR_SEGUNDO = 45; // ver derivación en el HTML: distancia (~13-25 pts/s) + monedas
const MAX_MONEDAS_POR_SEGUNDO = 20;

const bodyPartida = z
  .object({
    modo: z.enum(['endless', 'nivel']),
    nivelId: z.number().int().positive().optional(),
    puntos: z.number().int().nonnegative(),
    monedasGanadas: z.number().int().nonnegative(),
    duracionS: z.number().int().positive().max(DURACION_MAX_S),
    mejorasUsadas: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => d.modo !== 'nivel' || d.nivelId !== undefined, {
    message: 'nivelId es obligatorio cuando modo=nivel',
    path: ['nivelId'],
  });

interface Objetivo {
  tipo: 'distancia' | 'monedas' | 'sobrevivir_s';
  valor: number;
}

function evaluarObjetivoNivel(objetivo: Objetivo, partida: { puntos: number; monedasGanadas: number; duracionS: number }) {
  let logrado: number;
  switch (objetivo.tipo) {
    case 'distancia':
      logrado = partida.puntos;
      break;
    case 'monedas':
      logrado = partida.monedasGanadas;
      break;
    case 'sobrevivir_s':
      logrado = partida.duracionS;
      break;
    default:
      logrado = 0;
  }

  const cumplido = logrado >= objetivo.valor;
  if (!cumplido) return { cumplido, estrellas: 0 };

  const ratio = objetivo.valor > 0 ? logrado / objetivo.valor : 1;
  let estrellas = 1;
  if (ratio >= 1.5) estrellas = 2;
  if (ratio >= 2) estrellas = 3;
  return { cumplido, estrellas };
}

export default async function partidasRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/partidas',
    {
      preHandler: fastify.autenticar,
      config: {
        rateLimit: { max: 20, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const parseo = bodyPartida.safeParse(request.body);
      if (!parseo.success) {
        return reply.code(400).send({ error: parseo.error.issues[0]?.message ?? 'Partida inválida' });
      }
      const body = parseo.data;
      const usuarioId = request.user.id;

      // Cordura: tasas de puntos/monedas por segundo dentro de rangos plausibles del motor.
      if (body.puntos / body.duracionS > MAX_PUNTOS_POR_SEGUNDO) {
        return reply.code(400).send({ error: 'Puntuación no plausible para la duración reportada' });
      }
      if (body.monedasGanadas / body.duracionS > MAX_MONEDAS_POR_SEGUNDO) {
        return reply.code(400).send({ error: 'Monedas no plausibles para la duración reportada' });
      }
      // Invariante del motor: los puntos incluyen las monedas (puntos = monedas + distancia).
      if (body.monedasGanadas > body.puntos) {
        return reply.code(400).send({ error: 'monedasGanadas no puede superar a puntos' });
      }

      try {
        const resultado = await db.transaction(async (tx) => {
          let nivel: typeof niveles.$inferSelect | undefined;
          if (body.modo === 'nivel') {
            const filas = await tx
              .select()
              .from(niveles)
              .where(and(eq(niveles.id, body.nivelId!), eq(niveles.activo, true)));
            nivel = filas[0];
            if (!nivel) throw new Error('NIVEL_NO_ENCONTRADO');
          }

          const [partidaInsertada] = await tx
            .insert(partidas)
            .values({
              usuarioId,
              modo: body.modo,
              nivelId: body.modo === 'nivel' ? body.nivelId : null,
              puntos: body.puntos,
              monedasGanadas: body.monedasGanadas,
              duracionS: body.duracionS,
              mejorasUsadas: body.mejorasUsadas ?? {},
            })
            .returning();

          // El servidor es el dueño de la economía: acredita monedas de la partida.
          await tx
            .update(perfiles)
            .set({ monedas: sql`${perfiles.monedas} + ${body.monedasGanadas}`, actualizadoEn: sql`now()` })
            .where(eq(perfiles.usuarioId, usuarioId));

          let nivelCompletado: { nivelId: number; completado: boolean; estrellas: number } | undefined;

          if (nivel) {
            const objetivo = nivel.objetivo as Objetivo;
            const { cumplido, estrellas } = evaluarObjetivoNivel(objetivo, body);

            const [progresoExistente] = await tx
              .select()
              .from(progresoNiveles)
              .where(and(eq(progresoNiveles.usuarioId, usuarioId), eq(progresoNiveles.nivelId, nivel.id)));

            const nuevoCompletado = (progresoExistente?.completado ?? false) || cumplido;
            const nuevasEstrellas = Math.max(progresoExistente?.estrellas ?? 0, estrellas);
            const nuevaMejorPuntuacion = Math.max(progresoExistente?.mejorPuntuacion ?? 0, body.puntos);

            await tx
              .insert(progresoNiveles)
              .values({
                usuarioId,
                nivelId: nivel.id,
                completado: nuevoCompletado,
                estrellas: nuevasEstrellas,
                mejorPuntuacion: nuevaMejorPuntuacion,
                intentos: 1,
              })
              .onConflictDoUpdate({
                target: [progresoNiveles.usuarioId, progresoNiveles.nivelId],
                set: {
                  completado: nuevoCompletado,
                  estrellas: nuevasEstrellas,
                  mejorPuntuacion: nuevaMejorPuntuacion,
                  intentos: sql`${progresoNiveles.intentos} + 1`,
                },
              });

            nivelCompletado = { nivelId: nivel.id, completado: cumplido, estrellas };
          }

          const logrosDesbloqueados = await evaluarLogrosPendientes(tx, usuarioId, {
            puntos: body.puntos,
            monedasGanadas: body.monedasGanadas,
            duracionS: body.duracionS,
          });

          return { partida: partidaInsertada, logrosDesbloqueados, nivelCompletado };
        });

        reply.code(201).send(resultado);
      } catch (err) {
        if (err instanceof Error && err.message === 'NIVEL_NO_ENCONTRADO') {
          return reply.code(404).send({ error: 'Nivel no encontrado' });
        }
        throw err;
      }
    },
  );

  fastify.get('/ranking', async (request, reply) => {
    const query = z
      .object({ limite: z.coerce.number().int().positive().max(100).default(20) })
      .safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: 'Parámetro limite inválido' });
    }

    const filas = await db
      .select({
        usuarioId: usuarios.id,
        nombre: usuarios.nombre,
        mejorPuntuacion: sql<number>`max(${partidas.puntos})`.as('mejor_puntuacion'),
      })
      .from(partidas)
      .innerJoin(usuarios, eq(usuarios.id, partidas.usuarioId))
      .where(eq(partidas.modo, 'endless'))
      .groupBy(usuarios.id, usuarios.nombre)
      .orderBy(desc(sql`max(${partidas.puntos})`))
      .limit(query.data.limite);

    reply.send({ ranking: filas });
  });
}
