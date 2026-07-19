// Constantes de gameplay, antes hardcodeadas en el HTML. Se agrupan en un
// "preset" para que la escena de juego pueda recibir distintos presets
// (endless hoy, niveles con `semilla` más adelante) reutilizando el mismo motor.

export interface PresetJuego {
  gravity: number;
  jumpVelocity: number;
  doubleJumpVelocity: number;
  maxJumps: number;

  baseSpeed: number;
  maxSpeedBonus: number;
  speedRamp: number;

  knockbackSpeed: number;
  hitKnockbackTime: number;
  hitStunTime: number;
  invulnTime: number;

  playerScreenX: number;
  playerW: number;
  playerH: number;

  carMinW: number;
  carMaxW: number;
  carThick: number;
  gapMin: number;
  gapMaxAbs: number;
  topYVariance: number;

  voidMargin: number;
  landingTolerance: number;

  /** PRNG sembrado (mulberry32) para trazado determinista; sin definir = Math.random */
  semilla?: number;
}

export const PRESET_ENDLESS: PresetJuego = {
  gravity: 2200,
  jumpVelocity: -780,
  doubleJumpVelocity: -660,
  maxJumps: 2,

  baseSpeed: 330,
  maxSpeedBonus: 300,
  speedRamp: 3.2,

  knockbackSpeed: 230,
  hitKnockbackTime: 0.18,
  hitStunTime: 0.7,
  invulnTime: 1.6,

  playerScreenX: 220,
  playerW: 60,
  playerH: 86,

  carMinW: 260,
  carMaxW: 430,
  carThick: 120,
  gapMin: 90,
  gapMaxAbs: 340,
  topYVariance: 34,

  voidMargin: 320,
  landingTolerance: 64,
};

export type MejoraId = 'vidas' | 'iman' | 'salto' | 'multiplicador';
export type CosmeticoId = 'gorra' | 'gafas' | 'capa' | 'antena' | 'bufanda' | 'corona';

export interface DefinicionItem {
  nombre: string;
  desc: string;
  icono: string;
  costo: number;
}

// MEJORAS: consumibles de un solo uso (cargas). COSMETICOS: permanentes,
// se compran una vez y se equipan/quitan libremente.
export const MEJORAS: Record<MejoraId, DefinicionItem> = {
  vidas: { nombre: 'Vidas extra', desc: 'Un corazón extra para esta partida', icono: '❤', costo: 400 },
  iman: { nombre: 'Imán de monedas', desc: 'Recoge monedas desde más lejos en esta partida', icono: '🧲', costo: 250 },
  salto: { nombre: 'Salto reforzado', desc: 'Salta más alto en esta partida', icono: '⬆', costo: 300 },
  multiplicador: { nombre: 'Monedas con valor', desc: 'Las monedas valen x1.4 en esta partida', icono: '✨', costo: 350 },
};

export const COSMETICOS: Record<CosmeticoId, DefinicionItem> = {
  gorra: { nombre: 'Gorra', desc: 'Un gorro con estilo', icono: '🧢', costo: 450 },
  gafas: { nombre: 'Gafas', desc: 'Para verse genial', icono: '🕶️', costo: 500 },
  capa: { nombre: 'Capa', desc: 'Ondea al correr y saltar', icono: '🦸', costo: 700 },
  antena: { nombre: 'Antena alien', desc: 'Una antenita que brilla', icono: '📡', costo: 400 },
  bufanda: { nombre: 'Bufanda', desc: 'Ondea con el viento', icono: '🧣', costo: 420 },
  corona: { nombre: 'Corona', desc: 'Para sentirte de la realeza', icono: '👑', costo: 650 },
};

export const BONUS_VIDAS = 1;
export const BONUS_IMAN = 30;
export const BONUS_SALTO = 70;
export const MULT_MONEDAS_ACTIVO = 1.4;

export const VIDAS_BASE = 3;
