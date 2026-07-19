import type { Jugador } from './jugador';
import type { Enemigo } from './enemigo';
import type { Moneda } from './moneda';
import type { Vagon } from './tren';

export interface TextoFlotante {
  x: number;
  y: number;
  texto: string;
  vida: number;
}

/** Estado runtime de una partida (endless o nivel): agrupa todo lo que hoy
 * eran variables sueltas a nivel de módulo en el HTML original. */
export interface EstadoMundo {
  cameraX: number;
  worldSpeed: number;
  tiempoJugado: number;
  monedasScore: number;
  distanciaAcc: number;

  plataformas: Vagon[];
  monedas: Moneda[];
  enemigos: Enemigo[];
  textosFlotantes: TextoFlotante[];

  nextSpawnX: number;
  ultimoTopY: number;
  shakeTimer: number;

  vidas: number;
  player: Jugador;
}
