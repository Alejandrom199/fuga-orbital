import { trazarRectRedondeado } from './util';
import type { CosmeticoId } from '../data/config';

// Personaje: diseño 100% procedural y animado. El origen (0,0) es el punto
// donde toca la plataforma (pies); se dibuja hacia arriba (Y negativa).
// Cosméticos comprables en la tienda: se dibujan sobre el personaje base.
// La capa va detrás del cuerpo; la gorra y las gafas, sobre la cabeza.

export interface InfoPersonaje {
  t: number;
  grounded: boolean;
  faseCarrera: number;
  equipados: Partial<Record<CosmeticoId, boolean>>;
}

function dibujarCapa(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, enAire: boolean): void {
  const balanceo = Math.sin(t * 5) * (enAire ? 14 : 8);
  ctx.save();
  const grad = ctx.createLinearGradient(0, -h * 0.85, 0, -h * 0.02);
  grad.addColorStop(0, '#7c5cff');
  grad.addColorStop(1, '#33206b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, -h * 0.76);
  ctx.quadraticCurveTo(-w * 0.62 + balanceo * 0.6, -h * 0.42, -w * 0.4 + balanceo, -h * 0.01);
  ctx.lineTo(-w * 0.1, -h * 0.12);
  ctx.quadraticCurveTo(-w * 0.22, -h * 0.42, -w * 0.1, -h * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function dibujarGorra(ctx: CanvasRenderingContext2D, headR: number, headY: number): void {
  ctx.save();
  const gradGorra = ctx.createLinearGradient(0, headY - headR * 1.35, 0, headY - headR * 0.5);
  gradGorra.addColorStop(0, '#ff8a3d');
  gradGorra.addColorStop(1, '#c85a1a');
  ctx.fillStyle = gradGorra;
  ctx.beginPath();
  ctx.arc(0, headY - headR * 0.12, headR * 1.05, Math.PI * 1.06, Math.PI * 1.94);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#c85a1a';
  ctx.beginPath();
  ctx.ellipse(headR * 0.58, headY - headR * 0.22, headR * 0.42, headR * 0.16, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf9e';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 1.3, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarGafas(ctx: CanvasRenderingContext2D, headR: number, headY: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(20,20,30,0.88)';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  [-1, 1].forEach((lado) => {
    ctx.beginPath();
    ctx.ellipse(lado * headR * 0.36, headY - headR * 0.02, headR * 0.24, headR * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-headR * 0.12, headY - headR * 0.02);
  ctx.lineTo(headR * 0.12, headY - headR * 0.02);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  [-1, 1].forEach((lado) => {
    ctx.beginPath();
    ctx.ellipse(lado * headR * 0.3, headY - headR * 0.08, headR * 0.08, headR * 0.05, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

function dibujarAntena(ctx: CanvasRenderingContext2D, headR: number, headY: number): void {
  ctx.save();
  ctx.strokeStyle = '#c9d0d8';
  ctx.lineWidth = Math.max(1.5, headR * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, headY - headR * 0.95);
  ctx.lineTo(headR * 0.18, headY - headR * 1.55);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = '#ffe27c';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(headR * 0.18, headY - headR * 1.6, headR * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe27c';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function dibujarBufanda(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const balanceo = Math.sin(t * 5) * 6;
  ctx.save();
  const grad = ctx.createLinearGradient(-w * 0.3, -h * 0.62, w * 0.3, -h * 0.5);
  grad.addColorStop(0, '#ff5c7a');
  grad.addColorStop(1, '#ffd166');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.58, w * 0.34, h * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.22, -h * 0.55);
  ctx.quadraticCurveTo(w * 0.42 + balanceo * 0.5, -h * 0.3, w * 0.3 + balanceo, -h * 0.05);
  ctx.lineTo(w * 0.14, -h * 0.1);
  ctx.quadraticCurveTo(w * 0.28, -h * 0.32, w * 0.12, -h * 0.53);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function dibujarCorona(ctx: CanvasRenderingContext2D, headR: number, headY: number): void {
  ctx.save();
  const gradCorona = ctx.createLinearGradient(0, headY - headR * 1.5, 0, headY - headR * 0.95);
  gradCorona.addColorStop(0, '#fff3b0');
  gradCorona.addColorStop(1, '#e0a832');
  ctx.fillStyle = gradCorona;
  ctx.beginPath();
  ctx.moveTo(-headR * 0.55, headY - headR * 0.95);
  ctx.lineTo(-headR * 0.55, headY - headR * 1.15);
  ctx.lineTo(-headR * 0.28, headY - headR * 0.98);
  ctx.lineTo(0, headY - headR * 1.4);
  ctx.lineTo(headR * 0.28, headY - headR * 0.98);
  ctx.lineTo(headR * 0.55, headY - headR * 1.15);
  ctx.lineTo(headR * 0.55, headY - headR * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath();
  ctx.arc(0, headY - headR * 1.1, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function dibujarPersonaje(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  info: InfoPersonaje,
): void {
  const t = info.t;
  const enAire = !info.grounded;
  const cicloPierna = Math.sin(info.faseCarrera);
  const cicloBrazo = Math.sin(info.faseCarrera + Math.PI);
  const equip = info.equipados;

  // Parpadeo periódico (achatamiento breve de los ojos cada ~3.2s)
  const cicloParpadeo = t % 3.2;
  const factorOjo = cicloParpadeo > 3.02 && cicloParpadeo < 3.16 ? 0.12 : 1;

  // Balanceo de orejas tipo resorte: más marcado en el aire
  const balanceoOreja = Math.sin(t * 3.2) * (enAire ? 0.12 : 0.07) + (enAire ? -0.32 : 0);

  ctx.save();

  // Sombra de contacto
  ctx.globalAlpha = enAire ? 0.15 : 0.32;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.015, w * 0.34, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (equip.capa) dibujarCapa(ctx, w, h, t, enAire);

  // ----- Piernas / botas -----
  const alturaBota = h * 0.16;
  const pasoAmp = enAire ? w * 0.02 : w * 0.16;
  [-1, 1].forEach((lado) => {
    const fase = lado > 0 ? cicloPierna : -cicloPierna;
    const desplaza = fase * pasoAmp;
    const levante = enAire ? h * 0.05 : Math.max(0, fase) * h * 0.05;
    ctx.save();
    ctx.translate(lado * w * 0.15 + desplaza * 0.4, -levante);
    const gradBota = ctx.createLinearGradient(0, -alturaBota, 0, 0);
    gradBota.addColorStop(0, '#8a5b89');
    gradBota.addColorStop(1, '#3d2049');
    ctx.fillStyle = gradBota;
    trazarRectRedondeado(ctx, -w * 0.12, -alturaBota, w * 0.24, alturaBota, w * 0.07);
    ctx.fill();
    ctx.strokeStyle = '#2a1530';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#e9ddd2';
    ctx.beginPath();
    ctx.ellipse(0, -1, w * 0.135, h * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // ----- Cuerpo (verde) -----
  const bodyY = -h * 0.46;
  const bodyRX = w * 0.4;
  const bodyRY = h * 0.3;
  const gradBody = ctx.createRadialGradient(-bodyRX * 0.3, bodyY - bodyRY * 0.35, bodyRX * 0.2, 0, bodyY, bodyRX * 1.2);
  gradBody.addColorStop(0, '#68cf83');
  gradBody.addColorStop(0.6, '#2f9a52');
  gradBody.addColorStop(1, '#1b6b38');
  ctx.beginPath();
  ctx.ellipse(0, bodyY, bodyRX, bodyRY, 0, 0, Math.PI * 2);
  ctx.fillStyle = gradBody;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,60,30,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.012);
  ctx.stroke();

  // ----- Brazos -----
  function brazo(lado: number, fase: number): void {
    const hombroX = lado * bodyRX * 0.82;
    const hombroY = bodyY - bodyRY * 0.15;
    const angulo = enAire ? lado * -0.7 : lado * 0.22 + fase * 0.5;
    const largo = h * 0.32;
    ctx.save();
    ctx.translate(hombroX, hombroY);
    ctx.rotate(angulo);
    const gradManga = ctx.createLinearGradient(0, 0, 0, largo);
    gradManga.addColorStop(0, '#fbfbf8');
    gradManga.addColorStop(1, '#d3d1c8');
    ctx.fillStyle = gradManga;
    trazarRectRedondeado(ctx, -w * 0.09, 0, w * 0.18, largo * 0.72, w * 0.09);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ef8fc0';
    ctx.beginPath();
    ctx.ellipse(0, largo * 0.68, w * 0.11, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3778b5';
    ctx.beginPath();
    ctx.arc(0, largo * 0.82, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#204d78';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  brazo(-1, cicloBrazo);
  brazo(1, -cicloBrazo);

  // ----- Collar de pompones rosas -----
  const collarY = bodyY - bodyRY * 0.92;
  for (let i = -2; i <= 2; i++) {
    const px = i * w * 0.15;
    const bounce = Math.sin(t * 5 + i) * h * 0.006;
    ctx.beginPath();
    ctx.arc(px, collarY + Math.abs(i) * h * 0.02 + bounce, w * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#ef7fc5';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,30,100,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (equip.bufanda) dibujarBufanda(ctx, w, h, t);

  // ----- Cabeza -----
  const headR = w * 0.46;
  const headY = -h * 0.86;

  // Orejas azules (detrás de la cabeza, con balanceo)
  [-1, 1].forEach((lado) => {
    ctx.save();
    ctx.translate(lado * headR * 0.7, headY - headR * 0.15);
    ctx.rotate(lado * 0.45 + balanceoOreja * lado);
    const gradOreja = ctx.createLinearGradient(0, -headR * 0.3, 0, headR * 1.3);
    gradOreja.addColorStop(0, '#4a8fc4');
    gradOreja.addColorStop(1, '#1d4a73');
    ctx.fillStyle = gradOreja;
    ctx.beginPath();
    ctx.ellipse(0, headR * 0.5, headR * 0.34, headR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,30,50,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });

  // Cabeza (blanca, con degradado)
  const gradCabeza = ctx.createRadialGradient(-headR * 0.3, headY - headR * 0.3, headR * 0.15, 0, headY, headR * 1.1);
  gradCabeza.addColorStop(0, '#ffffff');
  gradCabeza.addColorStop(0.7, '#f2f0ec');
  gradCabeza.addColorStop(1, '#d8d4cc');
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = gradCabeza;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Brillo
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-headR * 0.4, headY - headR * 0.45, headR * 0.22, headR * 0.13, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Mejillas sonrosadas
  ctx.fillStyle = 'rgba(255,140,190,0.55)';
  [-1, 1].forEach((lado) => {
    ctx.beginPath();
    ctx.ellipse(lado * headR * 0.56, headY + headR * 0.16, headR * 0.22, headR * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Naricita (3 rayitas rosas)
  ctx.strokeStyle = 'rgba(220,90,150,0.75)';
  ctx.lineWidth = Math.max(1, headR * 0.045);
  ctx.lineCap = 'round';
  [-1, 0, 1].forEach((i) => {
    const x = i * headR * 0.11;
    ctx.beginPath();
    ctx.moveTo(x, headY + headR * 0.04);
    ctx.lineTo(x, headY + headR * 0.17);
    ctx.stroke();
  });

  // Ojos felices (se achatan al parpadear)
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = Math.max(1.5, headR * 0.09);
  ctx.lineCap = 'round';
  [-1, 1].forEach((lado) => {
    ctx.save();
    ctx.translate(lado * headR * 0.36, headY - headR * 0.02);
    ctx.scale(1, factorOjo);
    ctx.beginPath();
    ctx.arc(0, headR * 0.1, headR * 0.17, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  });

  // Sonrisa
  ctx.strokeStyle = '#c05a8f';
  ctx.lineWidth = Math.max(1.5, headR * 0.07);
  ctx.beginPath();
  ctx.arc(0, headY + headR * 0.32, headR * 0.28, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  if (equip.gafas) dibujarGafas(ctx, headR, headY);
  if (equip.corona) dibujarCorona(ctx, headR, headY);
  if (equip.gorra) dibujarGorra(ctx, headR, headY);
  if (equip.antena) dibujarAntena(ctx, headR, headY);

  ctx.restore();
}
