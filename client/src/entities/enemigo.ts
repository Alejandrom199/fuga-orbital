// La definición del sprite (medidas, velocidad de patrulla y su función de
// dibujo) vive conceptualmente junto al render, pero el tipo se declara aquí
// para que la entidad no dependa del módulo de render.
export interface EnemyDef {
  w: number;
  h: number;
  vel: number;
  tipo: string;
  dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
}

export interface Enemigo {
  def: EnemyDef;
  x: number;
  y: number;
  dir: 1 | -1;
  minX: number;
  maxX: number;
  vivo: boolean;
}

/** Patrulla de ida y vuelta entre minX/maxX; rebota al llegar a un extremo. */
export function actualizarPatrulla(enemigo: Enemigo, dt: number): void {
  enemigo.x += enemigo.def.vel * enemigo.dir * dt;
  if (enemigo.x < enemigo.minX) {
    enemigo.x = enemigo.minX;
    enemigo.dir = 1;
  }
  if (enemigo.x > enemigo.maxX) {
    enemigo.x = enemigo.maxX;
    enemigo.dir = -1;
  }
}
