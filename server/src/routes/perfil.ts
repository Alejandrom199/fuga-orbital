import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { perfiles } from '../schema.js';

const ajustesSchema = z.record(z.string(), z.unknown());

export default async function perfilRoutes(fastify: FastifyInstance) {
  fastify.get('/perfil', { preHandler: fastify.autenticar }, async (request, reply) => {
    const [perfil] = await db.select().from(perfiles).where(eq(perfiles.usuarioId, request.user.id));
    if (!perfil) {
      return reply.code(404).send({ error: 'Perfil no encontrado' });
    }
    reply.send({
      usuarioId: perfil.usuarioId,
      nombre: request.user.nombre,
      monedas: perfil.monedas,
      ajustes: perfil.ajustes,
      actualizadoEn: perfil.actualizadoEn,
    });
  });

  fastify.put('/perfil/ajustes', { preHandler: fastify.autenticar }, async (request, reply) => {
    const parseo = ajustesSchema.safeParse(request.body);
    if (!parseo.success) {
      return reply.code(400).send({ error: 'Ajustes inválidos' });
    }

    const [perfil] = await db
      .update(perfiles)
      .set({ ajustes: parseo.data, actualizadoEn: new Date() })
      .where(eq(perfiles.usuarioId, request.user.id))
      .returning();

    reply.send({ ajustes: perfil.ajustes });
  });
}
