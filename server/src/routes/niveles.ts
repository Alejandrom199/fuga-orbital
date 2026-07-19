import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db.js';
import { niveles, progresoNiveles } from '../schema.js';

export default async function nivelesRoutes(fastify: FastifyInstance) {
  fastify.get('/niveles', { preHandler: fastify.autenticarOpcional }, async (request, reply) => {
    const catalogo = await db.select().from(niveles).where(eq(niveles.activo, true)).orderBy(asc(niveles.orden));

    const progresoPorNivel = new Map<number, typeof progresoNiveles.$inferSelect>();
    if (request.user) {
      const filas = await db
        .select()
        .from(progresoNiveles)
        .where(eq(progresoNiveles.usuarioId, request.user.id));
      for (const fila of filas) progresoPorNivel.set(fila.nivelId, fila);
    }

    // Nivel 1 siempre desbloqueado; nivel N desbloqueado si N-1 está completado.
    // Nada de esto se almacena: se calcula aquí, al vuelo, en cada petición.
    let anteriorCompletado = true;
    const resultado = catalogo.map((nivel) => {
      const progreso = progresoPorNivel.get(nivel.id);
      const desbloqueado = anteriorCompletado;
      anteriorCompletado = progreso?.completado ?? false;

      return {
        id: nivel.id,
        orden: nivel.orden,
        nombre: nivel.nombre,
        config: nivel.config,
        objetivo: nivel.objetivo,
        desbloqueado,
        completado: progreso?.completado ?? false,
        estrellas: progreso?.estrellas ?? 0,
        mejorPuntuacion: progreso?.mejorPuntuacion ?? 0,
        intentos: progreso?.intentos ?? 0,
      };
    });

    reply.send({ niveles: resultado });
  });
}
