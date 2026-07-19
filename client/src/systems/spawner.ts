import { rand, clamp } from '../render/util';
import { ENEMY_SPRITES } from '../render/enemigos';
import { elegirMoneda } from '../render/monedas';
import type { PresetJuego } from '../data/config';
import type { EstadoMundo } from '../entities/mundo';
import type { Vagon } from '../entities/tren';

/** PRNG determinista (mulberry32) para el trazado de niveles con `semilla`
 * (Fase 5); en modo endless no se usa y el spawn sigue con Math.random. */
export function mulberry32(semilla: number): () => number {
  let a = semilla;
  return function siguiente() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function anchoAleatorioVagon(preset: PresetJuego, azar: () => number): number {
  return rand(preset.carMinW, preset.carMaxW, azar);
}

function maxHuecoSaltable(preset: PresetJuego, worldSpeed: number): number {
  const airTime = (2 * Math.abs(preset.jumpVelocity)) / preset.gravity;
  return worldSpeed * airTime * 0.78;
}

function crearVagon(estado: EstadoMundo, preset: PresetJuego, trainBaseY: number, startX: number): Vagon {
  const azar = estado.rng;
  const w = anchoAleatorioVagon(preset, azar);
  estado.ultimoTopY = clamp(
    estado.ultimoTopY + rand(-preset.topYVariance, preset.topYVariance, azar),
    trainBaseY - 70,
    trainBaseY + 70,
  );
  const car: Vagon = {
    x1: startX,
    x2: startX + w,
    topY: estado.ultimoTopY,
    tinte: Math.floor(rand(0, 40, azar)),
  };
  estado.plataformas.push(car);

  // Monedas sobre el vagón
  if (azar() < 0.4 && w > 160) {
    const n = Math.floor(rand(1, 3, azar));
    const margen = 40;
    for (let i = 0; i < n; i++) {
      const cx = startX + margen + (w - margen * 2) * (n === 1 ? 0.5 : i / (n - 1));
      const tipo = elegirMoneda(azar);
      estado.monedas.push({ x: cx, y: car.topY - 78 - Math.sin(i) * 10, tipo, fase: azar() * Math.PI * 2, tomada: false });
    }
  }

  // Enemigo sobre el vagón
  const pEnemigo = clamp(0.16 + estado.tiempoJugado * 0.008, 0.16, 0.55);
  if (w > 200 && azar() < pEnemigo) {
    const def = ENEMY_SPRITES[Math.floor(azar() * ENEMY_SPRITES.length)]!;
    const margen = def.w / 2 + 20;
    const centro = startX + w / 2;
    estado.enemigos.push({
      def,
      x: centro,
      y: car.topY - def.h / 2,
      dir: azar() < 0.5 ? 1 : -1,
      minX: Math.max(startX + margen, centro - w / 2 + margen),
      maxX: Math.min(startX + w - margen, centro + w / 2 - margen),
      vivo: true,
    });
  }

  return car;
}

/** Crea el mundo inicial: primer vagón fijo bajo el jugador + vagones hasta llenar la pantalla. */
export function reiniciarMundo(estado: EstadoMundo, preset: PresetJuego, W: number, trainBaseY: number): void {
  estado.ultimoTopY = trainBaseY;
  estado.plataformas.push({ x1: -400, x2: 480, topY: trainBaseY, tinte: 0 });
  estado.nextSpawnX = 480;
  while (estado.nextSpawnX < W + 700) {
    const gap = rand(preset.gapMin, Math.min(preset.gapMaxAbs, maxHuecoSaltable(preset, estado.worldSpeed)), estado.rng);
    estado.nextSpawnX += gap;
    const car = crearVagon(estado, preset, trainBaseY, estado.nextSpawnX);
    estado.nextSpawnX = car.x2;
  }
}

export function actualizarSpawns(estado: EstadoMundo, preset: PresetJuego, W: number, trainBaseY: number): void {
  while (estado.nextSpawnX < estado.cameraX + W + 700) {
    const gap = rand(preset.gapMin, Math.min(preset.gapMaxAbs, maxHuecoSaltable(preset, estado.worldSpeed)), estado.rng);
    estado.nextSpawnX += gap;
    const car = crearVagon(estado, preset, trainBaseY, estado.nextSpawnX);
    estado.nextSpawnX = car.x2;
  }
  const limite = estado.cameraX - 500;
  estado.plataformas = estado.plataformas.filter((p) => p.x2 > limite);
  estado.monedas = estado.monedas.filter((m) => m.x > limite);
  estado.enemigos = estado.enemigos.filter((e) => e.x > limite);
}

export function plataformaEn(plataformas: Vagon[], worldX: number): Vagon | null {
  for (const p of plataformas) {
    if (worldX >= p.x1 && worldX <= p.x2) return p;
  }
  return null;
}
