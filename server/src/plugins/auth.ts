import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface PayloadJwt {
  id: number;
  nombre: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: PayloadJwt;
    user: PayloadJwt;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Guard: exige JWT válido en la cookie de sesión. Rellena request.user. */
    autenticar: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Igual que autenticar pero no falla si no hay sesión (request.user queda undefined). */
    autenticarOpcional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const NOMBRE_COOKIE_SESION = 'sesion';

/**
 * Auth con JWT firmado en cookie httpOnly, sin @fastify/session ni store de
 * sesiones (Redis, etc.) — el JWT es autocontenido y basta para un juego
 * single-player sin necesidad de revocación server-side.
 */
async function authPlugin(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET;
  const cookieSecret = process.env.COOKIE_SECRET;

  if (!jwtSecret) throw new Error('JWT_SECRET no está definida.');
  if (!cookieSecret) throw new Error('COOKIE_SECRET no está definida.');

  await fastify.register(fastifyCookie, {
    secret: cookieSecret,
  });

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: NOMBRE_COOKIE_SESION,
      signed: true,
    },
  });

  fastify.decorate('autenticar', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'No autenticado' });
    }
  });

  fastify.decorate('autenticarOpcional', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      // Sin sesión: se continúa como invitado.
    }
  });
}

export default fp(authPlugin, { name: 'auth-plugin' });
