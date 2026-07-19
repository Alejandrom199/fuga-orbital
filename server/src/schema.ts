import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

/**
 * Las 9 tablas del modelo de datos de Fuga Orbital.
 * Principio: nada derivable se almacena (sin columna `desbloqueado` en niveles,
 * sin tabla de leaderboard, sin progreso parcial de logros persistido).
 */

// ---------- Identidad ----------

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Estado del jugador ----------

export const perfiles = pgTable('perfiles', {
  usuarioId: integer('usuario_id')
    .primaryKey()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  monedas: integer('monedas').notNull().default(0),
  ajustes: jsonb('ajustes').notNull().default({}),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Economía ----------

export const items = pgTable(
  'items',
  {
    id: serial('id').primaryKey(),
    codigo: text('codigo').notNull().unique(),
    tipo: text('tipo').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion').notNull(),
    icono: text('icono').notNull(),
    costo: integer('costo').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [check('items_tipo_check', sql`${t.tipo} in ('mejora','cosmetico')`)],
);

export const inventario = pgTable(
  'inventario',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    cantidad: integer('cantidad').notNull().default(0),
    equipado: boolean('equipado').notNull().default(false),
  },
  (t) => [uniqueIndex('inventario_usuario_item_unique').on(t.usuarioId, t.itemId)],
);

// ---------- Telemetría ----------

export const niveles = pgTable('niveles', {
  id: serial('id').primaryKey(),
  orden: integer('orden').notNull().unique(),
  nombre: text('nombre').notNull(),
  config: jsonb('config').notNull(),
  objetivo: jsonb('objetivo').notNull(),
  activo: boolean('activo').notNull().default(true),
});

export const partidas = pgTable(
  'partidas',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    modo: text('modo').notNull(),
    nivelId: integer('nivel_id').references(() => niveles.id, { onDelete: 'set null' }),
    puntos: integer('puntos').notNull(),
    monedasGanadas: integer('monedas_ganadas').notNull().default(0),
    duracionS: integer('duracion_s').notNull(),
    mejorasUsadas: jsonb('mejoras_usadas').notNull().default({}),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('partidas_modo_check', sql`${t.modo} in ('endless','nivel')`),
    index('partidas_puntos_idx').on(t.puntos.desc()),
  ],
);

// ---------- Progresión ----------

export const progresoNiveles = pgTable(
  'progreso_niveles',
  {
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    nivelId: integer('nivel_id')
      .notNull()
      .references(() => niveles.id, { onDelete: 'cascade' }),
    completado: boolean('completado').notNull().default(false),
    estrellas: integer('estrellas').notNull().default(0),
    mejorPuntuacion: integer('mejor_puntuacion').notNull().default(0),
    intentos: integer('intentos').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.nivelId] })],
);

export const logros = pgTable(
  'logros',
  {
    id: serial('id').primaryKey(),
    codigo: text('codigo').notNull().unique(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion').notNull(),
    icono: text('icono').notNull(),
    condicion: jsonb('condicion').notNull(),
    recompensa: integer('recompensa').notNull().default(0),
    secreto: boolean('secreto').notNull().default(false),
    activo: boolean('activo').notNull().default(true),
  },
);

export const logrosUsuario = pgTable(
  'logros_usuario',
  {
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    logroId: integer('logro_id')
      .notNull()
      .references(() => logros.id, { onDelete: 'cascade' }),
    desbloqueadoEn: timestamp('desbloqueado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.logroId] })],
);
