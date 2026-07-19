import { trazarRectRedondeado } from './util';
import type { Vagon } from '../entities/tren';
import type { PresetJuego } from '../data/config';

export function dibujarVagones(
  ctx: CanvasRenderingContext2D,
  plataformas: Vagon[],
  cameraX: number,
  W: number,
  preset: PresetJuego,
  tiempoJugado: number,
): void {
  for (const p of plataformas) {
    const sx1 = p.x1 - cameraX;
    const sx2 = p.x2 - cameraX;
    if (sx2 < -50 || sx1 > W + 50) continue;
    const w = sx2 - sx1;
    if (w < 4) continue;
    const hue = 260 + p.tinte;
    const bodyTop = p.topY + 10;
    const bodyBottom = p.topY + preset.carThick + 40;
    const bodyH = bodyBottom - bodyTop;

    // Casco principal del vagón (metálico, con extremos redondeados)
    const gradCasco = ctx.createLinearGradient(0, bodyTop, 0, bodyBottom);
    gradCasco.addColorStop(0, `hsl(${hue},40%,46%)`);
    gradCasco.addColorStop(0.5, `hsl(${hue},34%,30%)`);
    gradCasco.addColorStop(1, `hsl(${hue},44%,15%)`);
    ctx.fillStyle = gradCasco;
    trazarRectRedondeado(ctx, sx1, bodyTop, w, bodyH, Math.min(10, w * 0.4));
    ctx.fill();

    // Franjas de advertencia diagonales cerca de cada extremo (recortadas al casco)
    ctx.save();
    trazarRectRedondeado(ctx, sx1, bodyTop, w, bodyH, Math.min(10, w * 0.4));
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,200,60,0.5)';
    ctx.lineWidth = 5;
    [sx1 + 6, sx2 - 6].forEach((cx) => {
      for (let d = -18; d < 26; d += 9) {
        ctx.beginPath();
        ctx.moveTo(cx + d, bodyTop - 4);
        ctx.lineTo(cx + d - bodyH * 0.5, bodyBottom + 4);
        ctx.stroke();
      }
    });
    ctx.restore();

    // Costillas/paneles verticales del casco
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let x = sx1 + 46; x < sx2 - 24; x += 74) {
      ctx.beginPath();
      ctx.moveTo(x, bodyTop + 8);
      ctx.lineTo(x, bodyBottom - 10);
      ctx.stroke();
    }

    // Ventanas iluminadas (alternan tono cálido/frío)
    let vi = 0;
    for (let x = sx1 + 26; x < sx2 - 46; x += 74, vi++) {
      const ww = 38;
      const wh = 20;
      const wy = bodyTop + 16;
      const calido = vi % 2 === 0;
      const colorLuz = calido ? '255,205,120' : '150,225,255';
      const gradV = ctx.createLinearGradient(0, wy, 0, wy + wh);
      gradV.addColorStop(0, `rgba(${colorLuz},0.95)`);
      gradV.addColorStop(1, `rgba(${colorLuz},0.4)`);
      ctx.fillStyle = gradV;
      trazarRectRedondeado(ctx, x, wy, ww, wh, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,8,25,0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = `rgba(${colorLuz},0.9)`;
      ctx.fillRect(x + ww * 0.42, wy + 3, 2, wh - 6);
    }

    // Tira de energía antigravedad bajo el vagón
    const gradEnergia = ctx.createLinearGradient(0, bodyBottom - 10, 0, bodyBottom);
    gradEnergia.addColorStop(0, 'rgba(140,220,255,0)');
    gradEnergia.addColorStop(1, `rgba(140,220,255,${0.55 + 0.25 * Math.sin(tiempoJugado * 3 + p.x1)})`);
    ctx.fillStyle = gradEnergia;
    trazarRectRedondeado(ctx, sx1 + 6, bodyBottom - 10, w - 12, 8, 4);
    ctx.fill();

    // Techo (franja superior por donde corre el jugador)
    const gradTecho = ctx.createLinearGradient(0, p.topY, 0, bodyTop + 4);
    gradTecho.addColorStop(0, '#f4f7fb');
    gradTecho.addColorStop(1, `hsl(${hue},22%,68%)`);
    ctx.fillStyle = gradTecho;
    trazarRectRedondeado(ctx, sx1, p.topY, w, 12, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Remaches del techo
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    for (let x = sx1 + 16; x < sx2 - 10; x += 30) {
      ctx.beginPath();
      ctx.arc(x, p.topY + 6, 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Escotilla/respiradero central sobre el techo (detalle decorativo)
    if (w > 150) {
      const hx = sx1 + w / 2;
      ctx.fillStyle = `hsl(${hue},20%,55%)`;
      trazarRectRedondeado(ctx, hx - 16, p.topY - 6, 32, 8, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      for (let gx = hx - 11; gx < hx + 12; gx += 6) {
        ctx.beginPath();
        ctx.moveTo(gx, p.topY - 5);
        ctx.lineTo(gx, p.topY - 1);
        ctx.stroke();
      }
    }
  }
}
