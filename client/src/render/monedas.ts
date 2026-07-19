import type { TipoMoneda, Moneda } from '../entities/moneda';

// Monedas: diseño 100% procedural (canvas), sin imagen. Cada tier tiene su
// propia paleta metálica y radio (las de más valor se ven más grandes).
export const COIN_TYPES: TipoMoneda[] = [
  {
    valor: 5, peso: 0.68, r: 17,
    claro: '#f6fafc', medio: '#c7d3db', oscuro: '#8a97a2', rim: '#57626b', brillo: 'rgba(255,255,255,0.55)',
  },
  {
    valor: 50, peso: 0.24, r: 21,
    claro: '#fff3c2', medio: '#f0c04a', oscuro: '#b3801f', rim: '#785816', brillo: 'rgba(255,250,220,0.6)',
  },
  {
    valor: 100, peso: 0.08, r: 25,
    claro: '#f3c9a1', medio: '#c97a42', oscuro: '#87491f', rim: '#5a2f14', brillo: 'rgba(255,230,200,0.55)',
  },
];

/** `azar` inyectable (Fase 5) igual que `rand()` en `render/util.ts`: por
 * defecto `Math.random`, el spawner pasa el PRNG sembrado cuando aplica. */
export function elegirMoneda(azar: () => number = Math.random): TipoMoneda {
  const r = azar();
  let acc = 0;
  for (const c of COIN_TYPES) {
    acc += c.peso;
    if (r <= acc) return c;
  }
  return COIN_TYPES[0]!;
}

function dibujarEstrella(ctx: CanvasRenderingContext2D, r: number, colorClaro: string, colorOscuro: string): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, colorClaro);
  grad.addColorStop(1, colorOscuro);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(0.6, r * 0.06);
  ctx.strokeStyle = colorOscuro;
  ctx.stroke();
}

function dibujarMonedaProc(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tipo: TipoMoneda,
  fase: number,
  tiempoJugado: number,
): void {
  const r = tipo.r;
  const giro = Math.cos(tiempoJugado * 2.3 + fase);
  const escalaX = Math.max(0.16, Math.abs(giro));

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(escalaX, 1);

  // Cuerpo metálico con degradado radial (efecto abombado)
  const gradCuerpo = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  gradCuerpo.addColorStop(0, tipo.claro);
  gradCuerpo.addColorStop(0.55, tipo.medio);
  gradCuerpo.addColorStop(1, tipo.rim);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = gradCuerpo;
  ctx.fill();

  // Muescas del canto, como una moneda real
  ctx.strokeStyle = tipo.oscuro;
  ctx.lineWidth = Math.max(1, r * 0.1);
  const marcas = 14;
  for (let i = 0; i < marcas; i++) {
    const ang = (i / marcas) * Math.PI * 2;
    const x1 = Math.cos(ang) * r * 0.88;
    const y1 = Math.sin(ang) * r * 0.88;
    const x2 = Math.cos(ang) * r * 0.99;
    const y2 = Math.sin(ang) * r * 0.99;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Cara interior
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
  ctx.fillStyle = tipo.medio;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = tipo.oscuro;
  ctx.stroke();

  // La estrella y el brillo solo se ven de frente (simula el giro 3D)
  if (Math.abs(giro) > 0.3) {
    dibujarEstrella(ctx, r * 0.42, tipo.claro, tipo.oscuro);
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.32, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = tipo.brillo;
    ctx.fill();
  }

  ctx.restore();
}

export function dibujarMonedas(
  ctx: CanvasRenderingContext2D,
  monedas: Moneda[],
  cameraX: number,
  W: number,
  tiempoJugado: number,
): void {
  for (const m of monedas) {
    const sx = m.x - cameraX;
    if (sx < -40 || sx > W + 40) continue;
    const bob = Math.sin(tiempoJugado * 4 + m.x) * 5;
    dibujarMonedaProc(ctx, sx, m.y + bob, m.tipo, m.fase, tiempoJugado);
  }
}
