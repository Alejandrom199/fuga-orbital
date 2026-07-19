import { clamp } from './util';
import type { TextoFlotante } from '../entities/mundo';

export function dibujarTextos(ctx: CanvasRenderingContext2D, textos: TextoFlotante[], cameraX: number): void {
  ctx.save();
  ctx.font = 'bold 20px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  for (const t of textos) {
    const sx = t.x - cameraX;
    ctx.globalAlpha = clamp(t.vida / 0.8, 0, 1);
    ctx.fillStyle = '#ffe27c';
    ctx.fillText(t.texto, sx, t.y);
  }
  ctx.restore();
}
