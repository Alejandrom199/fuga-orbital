import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { logros, logrosUsuario } from '../schema.js';
import { valorCampoTotal, type CondicionLogro } from '../logros.js';

export default async function logrosRoutes(fastify: FastifyInstance) {
  fastify.get('/logros', { preHandler: fastify.autenticarOpcional }, async (request, reply) => {
    const catalogo = await db.select().from(logros).where(eq(logros.activo, true));

    const desbloqueados = new Set<number>();
    if (request.user) {
      const filas = await db.select().from(logrosUsuario).where(eq(logrosUsuario.usuarioId, request.user.id));
      for (const fila of filas) desbloqueados.add(fila.logroId);
    }

    const resultado = await Promise.all(
      catalogo.map(async (logro) => {
        const desbloqueado = desbloqueados.has(logro.id);
        const condicion = logro.condicion as CondicionLogro;

        // Logros secretos no desbloqueados: se devuelven ocultos, sin spoilear el contenido.
        if (logro.secreto && !desbloqueado) {
          return {
            id: logro.id,
            codigo: logro.codigo,
            nombre: '???',
            descripcion: 'Logro secreto todavía no descubierto',
            icono: '❔',
            secreto: true,
            desbloqueado: false,
            progreso: null,
          };
        }

        let progreso: { actual: number; objetivo: number } | null = null;
        if (condicion.ambito === 'total' && request.user) {
          const actual = await valorCampoTotal(db, request.user.id, condicion.campo);
          if (actual !== null) progreso = { actual, objetivo: condicion.valor };
        }

        return {
          id: logro.id,
          codigo: logro.codigo,
          nombre: logro.nombre,
          descripcion: logro.descripcion,
          icono: logro.icono,
          secreto: logro.secreto,
          recompensa: logro.recompensa,
          desbloqueado,
          progreso,
        };
      }),
    );

    reply.send({ logros: resultado });
  });
}
