import { trazarRectRedondeado } from './util';
import type { EnemyDef, Enemigo } from '../entities/enemigo';

// Enemigos: diseños 100% procedurales (canvas), sin imagen. Cada uno define
// su tamaño de hitbox, velocidad de patrulla y su propia función de dibujo.

function dibujarRobot(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const swing = Math.sin(t * 8) * 6;

  ctx.strokeStyle = '#7d8791';
  ctx.lineWidth = w * 0.1;
  ctx.beginPath(); ctx.moveTo(-w * 0.16, -h * 0.34); ctx.lineTo(-w * 0.16 + swing * 0.3, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.16, -h * 0.34); ctx.lineTo(w * 0.16 - swing * 0.3, -2); ctx.stroke();
  ctx.fillStyle = '#565f68';
  ctx.beginPath(); ctx.ellipse(-w * 0.16 + swing * 0.3, 0, w * 0.14, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w * 0.16 - swing * 0.3, 0, w * 0.14, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();

  const gradCuerpo = ctx.createLinearGradient(0, -h * 0.74, 0, -h * 0.3);
  gradCuerpo.addColorStop(0, '#eef1f4');
  gradCuerpo.addColorStop(1, '#9aa4ad');
  ctx.fillStyle = gradCuerpo;
  trazarRectRedondeado(ctx, -w * 0.33, -h * 0.74, w * 0.66, h * 0.46, w * 0.15);
  ctx.fill();
  ctx.strokeStyle = '#5c6670';
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();

  const headR = w * 0.3;
  const headY = -h * 0.86;
  const gradCabeza = ctx.createRadialGradient(-headR * 0.3, headY - headR * 0.3, headR * 0.1, 0, headY, headR);
  gradCabeza.addColorStop(0, '#f4f7f8');
  gradCabeza.addColorStop(1, '#b7c0c8');
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = gradCabeza; ctx.fill();
  ctx.strokeStyle = '#5c6670'; ctx.stroke();

  ctx.save();
  ctx.shadowColor = '#3fd0ff';
  ctx.shadowBlur = w * 0.25;
  const ojoGrad = ctx.createRadialGradient(headR * 0.15, headY - headR * 0.1, headR * 0.05, headR * 0.2, headY, headR * 0.42);
  ojoGrad.addColorStop(0, '#eafcff');
  ojoGrad.addColorStop(0.55, '#3fd0ff');
  ojoGrad.addColorStop(1, '#0b6f96');
  ctx.beginPath(); ctx.arc(headR * 0.2, headY, headR * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = ojoGrad; ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#8a949d';
  ctx.lineWidth = Math.max(1, w * 0.035);
  ctx.beginPath(); ctx.moveTo(0, headY - headR); ctx.lineTo(0, headY - headR * 1.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, headY - headR * 1.7, w * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff5d5d' : '#8a2626';
  ctx.fill();
}

function dibujarBronce(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const bob = Math.sin(t * 2) * 3;

  ctx.strokeStyle = '#5a3218';
  ctx.lineWidth = w * 0.085;
  [-w * 0.34, -w * 0.12, w * 0.12, w * 0.34].forEach((px, i) => {
    const sway = Math.sin(t * 3 + i) * 4;
    ctx.beginPath(); ctx.moveTo(px, -h * 0.42); ctx.lineTo(px + sway * 0.4, -4); ctx.stroke();
    ctx.fillStyle = '#3d2210';
    ctx.beginPath();
    ctx.moveTo(px + sway * 0.4 - w * 0.05, 0);
    ctx.lineTo(px + sway * 0.4 + w * 0.05, 0);
    ctx.lineTo(px + sway * 0.4, h * 0.07);
    ctx.closePath(); ctx.fill();
  });

  const gradCuerpo = ctx.createRadialGradient(-w * 0.15, -h * 0.78, w * 0.1, 0, -h * 0.55 + bob, w * 0.55);
  gradCuerpo.addColorStop(0, '#d69a5c');
  gradCuerpo.addColorStop(0.6, '#8a5525');
  gradCuerpo.addColorStop(1, '#5a3416');
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.55 + bob, w * 0.5, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradCuerpo; ctx.fill();
  ctx.strokeStyle = '#3d2210';
  ctx.lineWidth = Math.max(1, w * 0.018);
  ctx.stroke();

  ctx.fillStyle = '#6b3d1c';
  for (let i = -2; i <= 2; i++) {
    const px = i * w * 0.16;
    ctx.beginPath();
    ctx.moveTo(px - w * 0.05, -h * 0.82 + bob);
    ctx.lineTo(px, -h * 0.99 + bob);
    ctx.lineTo(px + w * 0.05, -h * 0.82 + bob);
    ctx.closePath(); ctx.fill();
  }

  const headX = w * 0.42;
  const headY = -h * 0.52 + bob;
  const gradCabeza = ctx.createRadialGradient(headX - w * 0.06, headY - h * 0.06, w * 0.03, headX, headY, w * 0.28);
  gradCabeza.addColorStop(0, '#dda062');
  gradCabeza.addColorStop(1, '#7a4a20');
  ctx.beginPath(); ctx.ellipse(headX, headY, w * 0.26, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradCabeza; ctx.fill();
  ctx.strokeStyle = '#3d2210'; ctx.stroke();

  ctx.save();
  ctx.shadowColor = '#5cff8a';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#8bffb0';
  [[-w * 0.05, -h * 0.05], [w * 0.03, -h * 0.08], [w * 0.1, -h * 0.03]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.arc(headX + dx, headY + dy, w * 0.035, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();

  ctx.fillStyle = '#3d2210';
  ctx.beginPath();
  ctx.moveTo(headX + w * 0.2, headY + h * 0.05);
  ctx.lineTo(headX + w * 0.34, headY + h * 0.03);
  ctx.lineTo(headX + w * 0.22, headY + h * 0.13);
  ctx.closePath(); ctx.fill();
}

function dibujarVerde(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const hop = Math.abs(Math.sin(t * 4)) * 6;

  ctx.fillStyle = '#3d6b3a';
  [-w * 0.28, w * 0.28].forEach((px) => {
    ctx.beginPath(); ctx.ellipse(px, -hop * 0.2, w * 0.12, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  });

  const gradCuerpo = ctx.createRadialGradient(-w * 0.1, -h * 0.7 - hop, w * 0.1, 0, -h * 0.5 - hop, w * 0.5);
  gradCuerpo.addColorStop(0, '#8fd66b');
  gradCuerpo.addColorStop(0.6, '#4f9142');
  gradCuerpo.addColorStop(1, '#2e5c28');
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.5 - hop, w * 0.48, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradCuerpo; ctx.fill();
  ctx.strokeStyle = '#234a1e';
  ctx.lineWidth = Math.max(1, w * 0.018);
  ctx.stroke();

  ctx.fillStyle = 'rgba(40,80,35,0.55)';
  [[-w * 0.15, -h * 0.12], [w * 0.1, -h * 0.2], [0, h * 0.05], [w * 0.18, h * 0.07]].forEach(([dx, dy]) => {
    ctx.beginPath(); ctx.arc(dx, -h * 0.5 - hop + dy, w * 0.045, 0, Math.PI * 2); ctx.fill();
  });

  [-w * 0.14, w * 0.1].forEach((ex) => {
    const ey = -h * 0.86 - hop;
    ctx.beginPath(); ctx.arc(ex, ey, w * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = '#e9e06a'; ctx.fill();
    ctx.strokeStyle = '#234a1e'; ctx.stroke();
    ctx.beginPath(); ctx.arc(ex + w * 0.02, ey, w * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a'; ctx.fill();
  });

  const mouthY = -h * 0.42 - hop;
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, mouthY);
  ctx.quadraticCurveTo(0, mouthY + h * 0.12, w * 0.3, mouthY);
  ctx.lineWidth = Math.max(1, w * 0.022);
  ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) {
    const tx = i * w * 0.1;
    ctx.beginPath();
    ctx.moveTo(tx - w * 0.02, mouthY + 2);
    ctx.lineTo(tx + w * 0.02, mouthY + 2);
    ctx.lineTo(tx, mouthY + w * 0.06);
    ctx.closePath(); ctx.fill();
  }
}

export const ENEMY_SPRITES: EnemyDef[] = [
  { w: 46, h: 74, vel: 95, tipo: 'robot', dibujar: dibujarRobot },
  { w: 92, h: 86, vel: 32, tipo: 'bronce', dibujar: dibujarBronce },
  { w: 96, h: 80, vel: 58, tipo: 'verde', dibujar: dibujarVerde },
];

export function dibujarEnemigos(
  ctx: CanvasRenderingContext2D,
  enemigos: Enemigo[],
  cameraX: number,
  W: number,
  tiempoJugado: number,
): void {
  for (const en of enemigos) {
    const sx = en.x - cameraX;
    if (sx < -140 || sx > W + 140) continue;
    const w = en.def.w;
    const h = en.def.h;
    const footY = en.y + h / 2;
    const fase = tiempoJugado + en.x * 0.01;
    ctx.save();
    ctx.translate(sx, footY);
    if (en.dir < 0) ctx.scale(-1, 1);
    en.def.dibujar(ctx, w, h, fase);
    ctx.restore();
  }
}
