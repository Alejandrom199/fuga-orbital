import type { PresetJuego } from '../data/config';
import type { EstadoMundo } from '../entities/mundo';

/** Rampa de velocidad, avance de cámara y acumulación de puntuación por distancia. */
export function actualizarDificultad(estado: EstadoMundo, dt: number, preset: PresetJuego): void {
  estado.worldSpeed = preset.baseSpeed + Math.min(preset.maxSpeedBonus, estado.tiempoJugado * preset.speedRamp);
  estado.cameraX += estado.worldSpeed * dt;
  estado.distanciaAcc += estado.worldSpeed * dt * 0.04;
}

export function puntuacionTotal(estado: EstadoMundo): number {
  return estado.monedasScore + Math.floor(estado.distanciaAcc);
}
