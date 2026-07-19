import type { EstadoMundo } from '../entities/mundo';

export function actualizarTextosFlotantes(estado: EstadoMundo, dt: number): void {
  for (const t of estado.textosFlotantes) {
    t.y -= 40 * dt;
    t.vida -= dt;
  }
  estado.textosFlotantes = estado.textosFlotantes.filter((t) => t.vida > 0);
}

export function actualizarShake(estado: EstadoMundo, dt: number): void {
  if (estado.shakeTimer > 0) estado.shakeTimer -= dt;
}
