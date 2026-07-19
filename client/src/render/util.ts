// Helpers compartidos por los módulos de render y de sistemas.

export function trazarRectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** `azar` es inyectable (Fase 5): por defecto `Math.random`, pero el spawner
 * pasa el PRNG sembrado (`mulberry32`) cuando el preset activo trae `semilla`
 * para que el trazado de un nivel sea idéntico entre intentos. */
export function rand(min: number, max: number, azar: () => number = Math.random): number {
  return min + azar() * (max - min);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function hashNoise(x: number): number {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function formatearTiempo(seg: number): string {
  const m = Math.floor(seg / 60).toString().padStart(2, '0');
  const s = Math.floor(seg % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
