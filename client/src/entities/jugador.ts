import type { PresetJuego } from '../data/config';

export interface Jugador {
  worldX: number;
  y: number;
  vy: number;
  grounded: boolean;
  jumpsRemaining: number;
  hitStunTimer: number;
  invulnTimer: number;
  squash: number;
}

export function crearJugador(preset: PresetJuego, trainBaseY: number): Jugador {
  return {
    worldX: preset.playerScreenX,
    y: trainBaseY - preset.playerH / 2,
    vy: 0,
    grounded: true,
    jumpsRemaining: preset.maxJumps,
    hitStunTimer: 0,
    invulnTimer: preset.invulnTime * 0.4,
    squash: 1,
  };
}

/** Consume un salto (simple o doble); saltoBonus llega de la mejora "salto reforzado". */
export function saltar(jugador: Jugador, preset: PresetJuego, saltoBonus: number): void {
  if (jugador.jumpsRemaining <= 0) return;
  const esPrimerSalto = jugador.jumpsRemaining === preset.maxJumps;
  jugador.vy = (esPrimerSalto ? preset.jumpVelocity : preset.doubleJumpVelocity) - saltoBonus;
  jugador.jumpsRemaining--;
  jugador.grounded = false;
  jugador.squash = 1.25;
}
