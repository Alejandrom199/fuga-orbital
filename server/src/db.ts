import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL no está definida. Copia .env.example a .env y completa tus credenciales de Supabase.');
}

// Cliente persistente (no serverless): un único pool para toda la vida del proceso.
export const client = postgres(databaseUrl, { max: 10 });

export const db = drizzle(client, { schema });

export type Db = typeof db;
