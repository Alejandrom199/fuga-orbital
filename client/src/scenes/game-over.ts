import { mostrarPantalla } from '../ui/pantallas';
import { formatearTiempo } from '../render/util';
import type { CausaMuerte } from '../systems/colisiones';

export interface DatosGameOver {
  causa: CausaMuerte;
  puntuacion: number;
  tiempoJugado: number;
  mejorPuntuacion: number;
}

export interface ResultadoNivel {
  completado: boolean;
  estrellas: number;
}

export interface PantallaGameOver {
  mostrar(datos: DatosGameOver): void;
  /** Feedback de nivel (Fase 5), llega en segundo plano tras `POST
   * /partidas` — la pantalla ya está mostrada cuando esto se resuelve, así
   * que sólo actualiza un texto simple; no hay diseño elaborado para esto
   * todavía (queda pendiente para una fase posterior). */
  mostrarResultadoNivel(resultado: ResultadoNivel | null): void;
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
  const resultadoNivelEl = document.getElementById('resultado-nivel')!;

  return {
    mostrar(datos: DatosGameOver): void {
      motivoEl.textContent = MOTIVOS[datos.causa] ?? '';
      puntuacionEl.textContent = String(datos.puntuacion);
      tiempoEl.textContent = formatearTiempo(datos.tiempoJugado);
      recordEl.textContent = String(datos.mejorPuntuacion);
      resultadoNivelEl.textContent = '';
      resultadoNivelEl.classList.add('oculto');
      mostrarPantalla('pantalla-gameover');
    },
    mostrarResultadoNivel(resultado: ResultadoNivel | null): void {
      if (!resultado) return;
      const estrellas = '⭐'.repeat(resultado.estrellas) + '☆'.repeat(3 - resultado.estrellas);
      resultadoNivelEl.textContent = resultado.completado
        ? `¡Nivel completado! ${estrellas}`
        : `Objetivo no alcanzado todavía. ${estrellas}`;
      resultadoNivelEl.classList.remove('oculto');
    },
  };
}
