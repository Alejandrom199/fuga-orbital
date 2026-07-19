import { mostrarPantalla } from '../ui/pantallas';
import { formatearTiempo } from '../render/util';
import type { CausaMuerte } from '../systems/colisiones';

export interface DatosGameOver {
  causa: CausaMuerte;
  puntuacion: number;
  tiempoJugado: number;
  mejorPuntuacion: number;
}

export interface PantallaGameOver {
  mostrar(datos: DatosGameOver): void;
}

const MOTIVOS: Record<CausaMuerte, string> = {
  enemigo: 'Un enemigo alienígena te alcanzó.',
  vacio: 'Caíste al vacío entre los vagones.',
  camara: 'Te quedaste fuera de cámara.',
};

export function crearPantallaGameOver(onReintentar: () => void, onMenuPrincipal: () => void): PantallaGameOver {
  document.getElementById('btn-reintentar')!.addEventListener('click', onReintentar);
  document.getElementById('btn-menu-principal-gameover')!.addEventListener('click', onMenuPrincipal);

  const motivoEl = document.getElementById('motivo-muerte')!;
  const puntuacionEl = document.getElementById('puntuacion-final')!;
  const tiempoEl = document.getElementById('tiempo-final')!;
  const recordEl = document.getElementById('record-final')!;

  return {
    mostrar(datos: DatosGameOver): void {
      motivoEl.textContent = MOTIVOS[datos.causa] ?? '';
      puntuacionEl.textContent = String(datos.puntuacion);
      tiempoEl.textContent = formatearTiempo(datos.tiempoJugado);
      recordEl.textContent = String(datos.mejorPuntuacion);
      mostrarPantalla('pantalla-gameover');
    },
  };
}
