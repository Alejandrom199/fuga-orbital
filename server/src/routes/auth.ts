import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';
import { z } from 'zod';
import { db } from '../db.js';
import { usuarios, perfiles } from '../schema.js';
import { NOMBRE_COOKIE_SESION } from '../plugins/auth.js';

const credenciales = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(32, 'El nombre debe tener máximo 32 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'El nombre sólo admite letras, números y guion bajo'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(72),
});

const MAX_EDAD_COOKIE_S = 60 * 60 * 24 * 7; // 7 días

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/registro', async (request, reply) => {
    const parseo = credenciales.safeParse(request.body);
    if (!parseo.success) {
      return reply.code(400).send({ error: parseo.error.issues[0]?.message ?? 'Datos inválidos' });
    }
    const { nombre, password } = parseo.data;

    const existente = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.nombre, nombre));
    if (existente.length > 0) {
      return reply.code(409).send({ error: 'Ese nombre de usuario ya existe' });
    }

    const passwordHash = await argon2.hash(password);

    const usuario = await db.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(usuarios)
        .values({ nombre, passwordHash })
        .returning({ id: usuarios.id, nombre: usuarios.nombre });
      await tx.insert(perfiles).values({ usuarioId: nuevo.id });
      return nuevo;
    });

    const token = await reply.jwtSign({ id: usuario.id, nombre: usuario.nombre });
    reply
      .setCookie(NOMBRE_COOKIE_SESION, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        signed: true,
        maxAge: MAX_EDAD_COOKIE_S,
      })
      .code(201)
      .send({ id: usuario.id, nombre: usuario.nombre });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const parseo = credenciales.safeParse(request.body);
    if (!parseo.success) {
      return reply.code(400).send({ error: 'Nombre o contraseña inválidos' });
    }
    const { nombre, password } = parseo.data;

    const [usuario] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, passwordHash: usuarios.passwordHash })
      .from(usuarios)
      .where(eq(usuarios.nombre, nombre));

    if (!usuario) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    const valido = await argon2.verify(usuario.passwordHash, password);
    if (!valido) {
      return reply.code(401).send({ error: 'Credenciales inválidas' });
    }

    const token = await reply.jwtSign({ id: usuario.id, nombre: usuario.nombre });
    reply
      .setCookie(NOMBRE_COOKIE_SESION, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        signed: true,
        maxAge: MAX_EDAD_COOKIE_S,
      })
      .send({ id: usuario.id, nombre: usuario.nombre });
  });

  fastify.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(NOMBRE_COOKIE_SESION, { path: '/' }).send({ ok: true });
  });

  fastify.get('/auth/yo', { preHandler: fastify.autenticar }, async (request, reply) => {
    reply.send({ id: request.user.id, nombre: request.user.nombre });
  });
}
