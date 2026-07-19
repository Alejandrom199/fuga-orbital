import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import perfilRoutes from './routes/perfil.js';
import tiendaRoutes from './routes/tienda.js';
import partidasRoutes from './routes/partidas.js';
import nivelesRoutes from './routes/niveles.js';
import logrosRoutes from './routes/logros.js';

const fastify = Fastify({
  logger: true,
});

async function bootstrap() {
  await fastify.register(fastifyCors, {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // Rate limiting básico global; POST /partidas además tiene su propio límite más estricto.
  await fastify.register(fastifyRateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  await fastify.register(authPlugin);

  await fastify.register(authRoutes);
  await fastify.register(perfilRoutes);
  await fastify.register(tiendaRoutes);
  await fastify.register(partidasRoutes);
  await fastify.register(nivelesRoutes);
  await fastify.register(logrosRoutes);

  fastify.get('/salud', async () => ({ ok: true }));

  const port = Number(process.env.PORT ?? 3001);
  await fastify.listen({ port, host: '0.0.0.0' });
}

bootstrap().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
