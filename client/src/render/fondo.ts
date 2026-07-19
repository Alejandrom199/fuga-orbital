import { hashNoise } from './util';

export interface ContextoFondo {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  cameraX: number;
  tiempoJugado: number;
}

// Nubes de nebulosa muy lejanas y lentas, dan color al cielo
function dibujarNebulosas({ ctx, W, H, cameraX }: ContextoFondo): void {
  const factor = 0.015;
  const tile = 1900;
  const offset = (cameraX * factor) % tile;
  const inicio = -tile - offset;
  ctx.save();
  for (let base = inicio; base < W + tile; base += tile) {
    const seed = Math.floor((base + cameraX * factor) / tile);
    const cx = base + tile * 0.5;
    const cy = H * (0.1 + hashNoise(seed * 3) * 0.2);
    const r = tile * 0.55;
    const hue = hashNoise(seed * 7) > 0.5 ? '130,70,210' : '40,190,195';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${hue},0.18)`);
    grad.addColorStop(0.6, `rgba(${hue},0.07)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dibujarEstrellas({ ctx, W, H, cameraX, tiempoJugado }: ContextoFondo): void {
  const factor = 0.03;
  const tile = 260;
  const offset = (cameraX * factor) % tile;
  const inicio = -Math.floor(offset / tile) * tile - tile;
  ctx.save();
  for (let base = inicio; base < W + tile; base += tile) {
    for (let i = 0; i < 6; i++) {
      const seed = Math.floor((base + cameraX * factor) / tile) * 13 + i;
      const px = base - offset + hashNoise(seed) * tile;
      const py = hashNoise(seed * 3.1) * H * 0.7;
      const r = 1 + hashNoise(seed * 7.7) * 1.6;
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(tiempoJugado * 2 + seed));
      const tinte = hashNoise(seed * 4.4);
      const color = tinte > 0.85 ? `rgba(180,210,255,${alpha.toFixed(2)})`
        : tinte > 0.7 ? `rgba(255,210,220,${alpha.toFixed(2)})`
        : `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Lluvia de meteoros: varios trazos simultáneos y frecuentes por tramo
function dibujarLluviaMeteoros({ ctx, W, H, tiempoJugado }: ContextoFondo): void {
  const periodo = 1.3;
  const duracion = 0.55;
  const idx = Math.floor(tiempoJugado / periodo);
  const slotStart = idx * periodo;
  const seedBase = idx * 137.9;
  const cantidad = 1 + Math.floor(hashNoise(seedBase) * 3);

  for (let i = 0; i < cantidad; i++) {
    const seed = seedBase + i * 17.3;
    const offset = hashNoise(seed * 1.7) * (periodo - duracion);
    const tLocal = tiempoJugado - slotStart - offset;
    if (tLocal < 0 || tLocal > duracion) continue;

    const prog = tLocal / duracion;
    const startX = W * (0.05 + hashNoise(seed * 2) * 0.9);
    const startY = H * (0.03 + hashNoise(seed * 3) * 0.25);
    const largo = 130 + hashNoise(seed * 4) * 110;
    const ang = 0.45 + hashNoise(seed * 5) * 0.4;
    const x = startX + Math.cos(ang) * largo * prog;
    const y = startY + Math.sin(ang) * largo * prog;
    const dx = Math.cos(ang) * largo * 0.4;
    const dy = Math.sin(ang) * largo * 0.4;
    const alpha = Math.sin(prog * Math.PI);

    ctx.save();
    const grad = ctx.createLinearGradient(x - dx, y - dy, x, y);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(1, `rgba(255,255,255,${alpha.toFixed(2)})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Planeta gaseoso adicional, más lejano que las dos lunas principales
function dibujarPlanetaLejano({ ctx, H, cameraX }: ContextoFondo): void {
  const factor = 0.06;
  const tile = 2600;
  const offset = (cameraX * factor) % tile;
  const px = 1500 - offset;
  const py = H * 0.3;
  const r = 38;
  ctx.save();
  ctx.globalAlpha = 0.85;
  const grad = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.1, px, py, r);
  grad.addColorStop(0, '#a6dcd6');
  grad.addColorStop(1, '#3f7a78');
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 3;
  [-0.4, 0, 0.35].forEach((dy) => {
    ctx.beginPath();
    ctx.ellipse(px, py + dy * r, r * 0.95, r * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// Planeta con anillo detallado: sombreado esférico, bandas atmosféricas y
// el anillo partido en mitad trasera/delantera para que rodee la esfera.
function dibujarPlanetaAnillado(ctx: CanvasRenderingContext2D, px: number, py: number, r: number): void {
  ctx.save();

  const halo = ctx.createRadialGradient(px, py, r * 0.7, px, py, r * 2.3);
  halo.addColorStop(0, 'rgba(255,217,160,0.28)');
  halo.addColorStop(1, 'rgba(255,217,160,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(px, py, r * 2.3, 0, Math.PI * 2); ctx.fill();

  // Mitad trasera del anillo (pasa detrás del planeta)
  ctx.strokeStyle = 'rgba(255,220,160,0.45)';
  ctx.lineWidth = r * 0.24;
  ctx.beginPath();
  ctx.ellipse(px, py, r * 1.75, r * 0.37, -0.3, Math.PI * 0.05, Math.PI * 0.95);
  ctx.stroke();

  // Esfera con degradado (luz superior izquierda)
  const gradEsfera = ctx.createRadialGradient(px - r * 0.35, py - r * 0.35, r * 0.1, px, py, r);
  gradEsfera.addColorStop(0, '#fff2d6');
  gradEsfera.addColorStop(0.55, '#ffd9a0');
  gradEsfera.addColorStop(1, '#c98a3e');
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = gradEsfera;
  ctx.fill();

  // Bandas atmosféricas + terminador (sombra del lado oscuro), recortadas al disco
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.clip();
  ([[-0.6, 'rgba(190,110,40,0.28)'], [-0.15, 'rgba(255,235,190,0.22)'],
    [0.25, 'rgba(180,100,40,0.25)'], [0.55, 'rgba(255,225,170,0.2)']] as const).forEach(([dy, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(px, py + dy * r, r * 1.05, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  const sombra = ctx.createLinearGradient(px - r, py, px + r, py);
  sombra.addColorStop(0, 'rgba(60,30,10,0)');
  sombra.addColorStop(1, 'rgba(50,20,10,0.45)');
  ctx.fillStyle = sombra;
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Mitad delantera del anillo + anillo fino exterior
  ctx.strokeStyle = 'rgba(255,225,175,0.65)';
  ctx.lineWidth = r * 0.24;
  ctx.beginPath();
  ctx.ellipse(px, py, r * 1.75, r * 0.37, -0.3, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,225,175,0.3)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.ellipse(px, py, r * 2, r * 0.44, -0.3, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();

  ctx.restore();
}

function dibujarLunas({ ctx, H, cameraX }: ContextoFondo): void {
  const factor = 0.1;
  const tile = 1600;
  const offset = (cameraX * factor) % tile;

  const px1 = 260 - offset;
  dibujarPlanetaAnillado(ctx, px1, H * 0.18, 60);

  const px2 = px1 + 720;
  ctx.fillStyle = '#cdd6e6';
  ctx.beginPath();
  ctx.arc(px2, H * 0.12, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,160,180,0.5)';
  ([[-8, -4, 6], [10, 6, 4], [2, 12, 5]] as const).forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(px2 + dx, H * 0.12 + dy, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Cinturón de rocas/asteroides flotando en el cielo lejano
function dibujarAsteroides({ ctx, W, H, cameraX }: ContextoFondo): void {
  const factor = 0.2;
  const tile = 340;
  const offset = (cameraX * factor) % tile;
  const inicio = -tile - offset;
  ctx.save();
  for (let base = inicio; base < W + tile; base += tile) {
    const seed = Math.floor((base + cameraX * factor) / tile) + 4000;
    if (hashNoise(seed) < 0.55) continue;
    const px = base + hashNoise(seed * 2) * tile;
    const py = H * (0.2 + hashNoise(seed * 3) * 0.28);
    const r = 4 + hashNoise(seed * 4) * 7;
    ctx.fillStyle = 'rgba(70,50,85,0.65)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const rr = r * (0.7 + hashNoise(seed * 5 + i) * 0.5);
      const x = px + Math.cos(ang) * rr;
      const y = py + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Cordillera trasera, más lejana y tenue, da sensación de profundidad
function dibujarMontanasFondo({ ctx, W, H, cameraX }: ContextoFondo): void {
  const factor = 0.25;
  const paso = 110;
  const baseY = H * 0.68;
  const offset = cameraX * factor;
  ctx.save();
  ctx.fillStyle = '#241040';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = -paso; x <= W + paso; x += paso) {
    const seed = Math.floor((x + offset) / paso) + 500;
    const alto = 40 + hashNoise(seed) * 95;
    ctx.lineTo(x, baseY - alto);
  }
  ctx.lineTo(W, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarMontanas({ ctx, W, H, cameraX }: ContextoFondo): void {
  const factor = 0.35;
  const paso = 90;
  const baseY = H * 0.66;
  const offset = cameraX * factor;
  ctx.save();
  ctx.fillStyle = '#2c1245';
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  const picos: [number, number, number][] = [];
  for (let x = -paso; x <= W + paso; x += paso) {
    const seed = Math.floor((x + offset) / paso);
    const alto = 60 + hashNoise(seed) * 130;
    ctx.lineTo(x, baseY - alto);
    picos.push([x, baseY - alto, seed]);
  }
  ctx.lineTo(W, baseY);
  ctx.closePath();
  ctx.fill();

  // Filo iluminado en la cara izquierda de cada pico (luz de las lunas)
  ctx.strokeStyle = 'rgba(200,170,255,0.22)';
  ctx.lineWidth = 3;
  for (let i = 1; i < picos.length; i++) {
    const [x0, y0] = picos[i - 1]!;
    const [x1, y1] = picos[i]!;
    if (y1 < y0) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
  // Pequeñas grietas/cráteres oscuros en las laderas
  ctx.fillStyle = 'rgba(10,3,20,0.35)';
  picos.forEach(([x, y, seed]) => {
    if (hashNoise(seed * 6.6) < 0.5) return;
    const cx = x + hashNoise(seed * 7.7) * paso * 0.6 - paso * 0.3;
    const cy = y + 18 + hashNoise(seed * 8.8) * 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

// Ruinas alienígenas dispersas entre las montañas y la vegetación
function dibujarRuinas({ ctx, W, H, cameraX }: ContextoFondo): void {
  const factor = 0.45;
  const tile = 900;
  const offset = (cameraX * factor) % tile;
  const baseY = H * 0.7;
  ctx.save();
  for (let base = -tile; base < W + tile; base += tile) {
    const seed = Math.floor((base + cameraX * factor) / tile) + 900;
    if (hashNoise(seed) < 0.6) continue;
    const px = base - offset + hashNoise(seed * 2) * tile * 0.6;
    const alto = 50 + hashNoise(seed * 3) * 70;
    const ancho = 14 + hashNoise(seed * 4) * 10;
    ctx.fillStyle = 'rgba(30,15,45,0.85)';
    ctx.fillRect(px - ancho / 2, baseY - alto, ancho, alto);
    ctx.beginPath();
    ctx.moveTo(px - ancho / 2, baseY - alto);
    ctx.lineTo(px, baseY - alto - hashNoise(seed * 5) * 24);
    ctx.lineTo(px + ancho / 2, baseY - alto + hashNoise(seed * 6) * 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(140,240,255,0.28)';
    ctx.fillRect(px - 2, baseY - alto * 0.6, 4, alto * 0.3);
  }
  ctx.restore();
}

// Esporas/polvo bioluminiscente flotando lentamente hacia arriba
function dibujarParticulas({ ctx, W, H, cameraX, tiempoJugado }: ContextoFondo): void {
  const factor = 0.5;
  const tile = 140;
  const offset = (cameraX * factor) % tile;
  ctx.save();
  for (let base = -tile; base < W + tile; base += tile) {
    const seed = Math.floor((base + cameraX * factor) / tile) + 3000;
    const px = base - offset + hashNoise(seed) * tile;
    const recorrido = 300;
    const cicloY = (tiempoJugado * 14 + hashNoise(seed * 2) * recorrido) % recorrido;
    const py = H * 0.85 - cicloY;
    const alpha = Math.sin((cicloY / recorrido) * Math.PI) * 0.6;
    const r = 1.5 + hashNoise(seed * 3) * 1.5;
    const hue = hashNoise(seed * 4) > 0.5 ? '140,255,210' : '255,180,230';
    ctx.fillStyle = `rgba(${hue},${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dibujarVegetacion(c: ContextoFondo): void {
  const { ctx, W, H, cameraX } = c;
  const factor = 0.55;
  const tile = 200;
  const offset = (cameraX * factor) % tile;
  const baseY = H * 0.74;
  ctx.save();
  for (let base = -tile; base < W + tile; base += tile) {
    const seed = Math.floor((base + cameraX * factor) / tile);
    const r0 = hashNoise(seed);
    if (r0 < 0.3) continue;
    const px = base - offset + hashNoise(seed * 2.3) * tile * 0.7;

    if (r0 < 0.62) {
      // planta bioluminiscente
      const alto = 20 + hashNoise(seed * 5.1) * 34;
      const hue = hashNoise(seed * 9.3) > 0.5 ? '120,255,220' : '255,120,220';
      const grad = ctx.createLinearGradient(0, baseY, 0, baseY - alto);
      grad.addColorStop(0, `rgba(${hue},0.05)`);
      grad.addColorStop(1, `rgba(${hue},0.8)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(px - 7, baseY);
      ctx.lineTo(px, baseY - alto);
      ctx.lineTo(px + 7, baseY);
      ctx.closePath();
      ctx.fill();
    } else if (r0 < 0.85) {
      // cristal facetado brillante
      const alto = 26 + hashNoise(seed * 6.2) * 30;
      const ancho = alto * 0.42;
      const hue = hashNoise(seed * 8.1) > 0.5 ? '150,210,255' : '255,150,240';
      ctx.save();
      ctx.translate(px, baseY);
      ctx.beginPath();
      ctx.moveTo(0, -alto);
      ctx.lineTo(ancho, -alto * 0.45);
      ctx.lineTo(ancho * 0.55, 0);
      ctx.lineTo(-ancho * 0.55, 0);
      ctx.lineTo(-ancho, -alto * 0.45);
      ctx.closePath();
      const gradC = ctx.createLinearGradient(0, -alto, 0, 0);
      gradC.addColorStop(0, `rgba(${hue},0.9)`);
      gradC.addColorStop(1, `rgba(${hue},0.25)`);
      ctx.fillStyle = gradC;
      ctx.fill();
      ctx.strokeStyle = `rgba(${hue},0.9)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -alto);
      ctx.lineTo(0, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
      ctx.restore();
    } else {
      // roca pequeña
      const r = 8 + hashNoise(seed * 4.4) * 10;
      ctx.fillStyle = '#241338';
      ctx.beginPath();
      ctx.ellipse(px, baseY - r * 0.4, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  dibujarParticulas(c);
}

export function dibujarFondo(c: ContextoFondo): void {
  const { ctx, H } = c;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#170830');
  grad.addColorStop(0.45, '#391259');
  grad.addColorStop(0.78, '#5c2065');
  grad.addColorStop(1, '#180a26');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.W, H);

  dibujarNebulosas(c);
  dibujarEstrellas(c);
  dibujarLluviaMeteoros(c);
  dibujarPlanetaLejano(c);
  dibujarLunas(c);
  dibujarAsteroides(c);
  dibujarMontanasFondo(c);
  dibujarMontanas(c);
  dibujarRuinas(c);
  dibujarVegetacion(c);
}
