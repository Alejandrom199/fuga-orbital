import 'dotenv/config';
import { client, db } from './db.js';
import { items, logros, niveles } from './schema.js';

/**
 * Seed idempotente: usa upsert por columna única (codigo / orden) así que se
 * puede correr varias veces sin duplicar filas.
 */

// ---------- Items: trasplante literal de MEJORAS/COSMETICOS del HTML original ----------

const mejoras = [
  { codigo: 'vidas', nombre: 'Vidas extra', descripcion: 'Un corazón extra para esta partida', icono: '❤', costo: 400 },
  {
    codigo: 'iman',
    nombre: 'Imán de monedas',
    descripcion: 'Recoge monedas desde más lejos en esta partida',
    icono: '🧲',
    costo: 250,
  },
  { codigo: 'salto', nombre: 'Salto reforzado', descripcion: 'Salta más alto en esta partida', icono: '⬆', costo: 300 },
  {
    codigo: 'multiplicador',
    nombre: 'Monedas con valor',
    descripcion: 'Las monedas valen x1.4 en esta partida',
    icono: '✨',
    costo: 350,
  },
] as const;

const cosmeticos = [
  { codigo: 'gorra', nombre: 'Gorra', descripcion: 'Un gorro con estilo', icono: '🧢', costo: 450 },
  { codigo: 'gafas', nombre: 'Gafas', descripcion: 'Para verse genial', icono: '🕶️', costo: 500 },
  { codigo: 'capa', nombre: 'Capa', descripcion: 'Ondea al correr y saltar', icono: '🦸', costo: 700 },
  { codigo: 'antena', nombre: 'Antena alien', descripcion: 'Una antenita que brilla', icono: '📡', costo: 400 },
  { codigo: 'bufanda', nombre: 'Bufanda', descripcion: 'Ondea con el viento', icono: '🧣', costo: 420 },
  { codigo: 'corona', nombre: 'Corona', descripcion: 'Para sentirte de la realeza', icono: '👑', costo: 650 },
] as const;

async function seedItems() {
  const filas = [
    ...mejoras.map((m) => ({ ...m, tipo: 'mejora' as const, metadata: {}, activo: true })),
    ...cosmeticos.map((c) => ({ ...c, tipo: 'cosmetico' as const, metadata: {}, activo: true })),
  ];

  for (const fila of filas) {
    await db
      .insert(items)
      .values(fila)
      .onConflictDoUpdate({
        target: items.codigo,
        set: {
          tipo: fila.tipo,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          icono: fila.icono,
          costo: fila.costo,
          activo: fila.activo,
        },
      });
  }

  console.log(`Items sembrados: ${filas.length} (${mejoras.length} mejoras + ${cosmeticos.length} cosméticos)`);
}

// ---------- Niveles: preset "endless" del HTML como base, variando dificultad ----------

// Preset base tomado literal de las constantes del motor en fuga-orbital.html.
const presetBase = {
  gravity: 2200,
  jumpVelocity: -780,
  doubleJumpVelocity: -660,
  maxJumps: 2,
  baseSpeed: 330,
  maxSpeedBonus: 300,
  speedRamp: 3.2,
  gapMin: 90,
  gapMaxAbs: 340,
};

const nivelesSeed = [
  {
    orden: 1,
    nombre: 'Órbita baja',
    config: { ...presetBase, baseSpeed: 300, maxSpeedBonus: 200, speedRamp: 2.4, gapMin: 80, gapMaxAbs: 260, semilla: 1001 },
    objetivo: { tipo: 'distancia', valor: 800 },
  },
  {
    orden: 2,
    nombre: 'Cinturón de asteroides',
    config: { ...presetBase, gapMaxAbs: 320, semilla: 2002 },
    objetivo: { tipo: 'monedas', valor: 40 },
  },
  {
    orden: 3,
    nombre: 'Fuga final',
    config: { ...presetBase, baseSpeed: 360, maxSpeedBonus: 380, speedRamp: 4.0, gapMin: 100, gapMaxAbs: 340, semilla: 3003 },
    objetivo: { tipo: 'sobrevivir_s', valor: 90 },
  },
] as const;

async function seedNiveles() {
  for (const nivel of nivelesSeed) {
    await db
      .insert(niveles)
      .values({ ...nivel, activo: true })
      .onConflictDoUpdate({
        target: niveles.orden,
        set: { nombre: nivel.nombre, config: nivel.config, objetivo: nivel.objetivo, activo: true },
      });
  }
  console.log(`Niveles sembrados: ${nivelesSeed.length}`);
}

// ---------- Logros ----------

const logrosSeed = [
  {
    codigo: 'primer_salto',
    nombre: 'Primer salto',
    descripcion: 'Juega tu primera partida',
    icono: '🚀',
    condicion: { ambito: 'total', campo: 'partidas_jugadas', op: '>=', valor: 1 },
    recompensa: 20,
    secreto: false,
  },
  {
    codigo: 'superviviente',
    nombre: 'Superviviente',
    descripcion: 'Sobrevive 60 segundos en una partida',
    icono: '🛡️',
    condicion: { ambito: 'partida', campo: 'duracion_s', op: '>=', valor: 60 },
    recompensa: 40,
    secreto: false,
  },
  {
    codigo: 'cazarrecompensas',
    nombre: 'Cazarrecompensas',
    descripcion: 'Consigue 100 monedas en una sola partida',
    icono: '💰',
    condicion: { ambito: 'partida', campo: 'monedas_ganadas', op: '>=', valor: 100 },
    recompensa: 50,
    secreto: false,
  },
  {
    codigo: 'maratonista',
    nombre: 'Maratonista',
    descripcion: 'Juega 50 partidas',
    icono: '🏃',
    condicion: { ambito: 'total', campo: 'partidas_jugadas', op: '>=', valor: 50 },
    recompensa: 150,
    secreto: false,
  },
  {
    codigo: 'coleccionista',
    nombre: 'Coleccionista',
    descripcion: 'Compra los 6 cosméticos',
    icono: '🎁',
    condicion: { ambito: 'total', campo: 'cosmeticos_comprados', op: '>=', valor: 6 },
    recompensa: 200,
    secreto: false,
  },
  {
    codigo: 'estrella_fugaz',
    nombre: 'Estrella fugaz',
    descripcion: 'Consigue 3 estrellas en un nivel',
    icono: '⭐',
    condicion: { ambito: 'total', campo: 'estrellas_max_nivel', op: '>=', valor: 3 },
    recompensa: 60,
    secreto: false,
  },
  {
    codigo: 'constelacion',
    nombre: 'Constelación',
    descripcion: 'Acumula 15 estrellas entre todos los niveles',
    icono: '✨',
    condicion: { ambito: 'total', campo: 'estrellas_acumuladas', op: '>=', valor: 15 },
    recompensa: 300,
    secreto: true,
  },
] as const;

async function seedLogros() {
  for (const logro of logrosSeed) {
    await db
      .insert(logros)
      .values({ ...logro, activo: true })
      .onConflictDoUpdate({
        target: logros.codigo,
        set: {
          nombre: logro.nombre,
          descripcion: logro.descripcion,
          icono: logro.icono,
          condicion: logro.condicion,
          recompensa: logro.recompensa,
          secreto: logro.secreto,
          activo: true,
        },
      });
  }
  console.log(`Logros sembrados: ${logrosSeed.length}`);
}

async function main() {
  console.log('Sembrando base de datos de Fuga Orbital...');
  await seedItems();
  await seedNiveles();
  await seedLogros();
  console.log('Seed completo.');
}

main()
  .catch((err) => {
    console.error('Error al sembrar la base de datos:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
