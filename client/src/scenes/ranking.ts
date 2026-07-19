import { obtenerRanking } from '../services/api';
import { mostrarPantalla } from '../ui/pantallas';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaRanking {
  abrir(): void;
}

function escapeHtml(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/** Pantalla de ranking global (Fase 3): `GET /ranking`, mejor puntuación por
 * usuario en modo endless. No requiere sesión para verse. */
export function crearPantallaRanking(_contexto: ContextoJuego, onCerrar: () => void): PantallaRanking {
  const listaEl = document.getElementById('ranking-lista')!;
  const estadoEl = document.getElementById('ranking-estado')!;

  async function cargarRanking(): Promise<void> {
    listaEl.innerHTML = '';
    estadoEl.textContent = 'Cargando…';
    estadoEl.classList.remove('oculto');

    const resultado = await obtenerRanking(20);

    if (!resultado.ok) {
      estadoEl.textContent = 'No se pudo cargar el ranking (revisa tu conexión).';
      return;
    }

    const filas = resultado.datos.ranking;
    if (filas.length === 0) {
      estadoEl.textContent = 'Todavía no hay partidas registradas.';
      return;
    }

    estadoEl.classList.add('oculto');
    listaEl.innerHTML = filas
      .map(
        (fila, indice) => `
        <div class="tienda-item ranking-item">
          <div class="ranking-puesto">#${indice + 1}</div>
          <div class="tienda-item-info">
            <div class="tienda-item-nombre">${escapeHtml(fila.nombre)}</div>
          </div>
          <div class="ranking-puntos">${fila.mejorPuntuacion} pts</div>
        </div>`,
      )
      .join('');
  }

  document.getElementById('btn-cerrar-ranking')!.addEventListener('click', () => {
    onCerrar();
  });

  return {
    abrir(): void {
      mostrarPantalla('pantalla-ranking');
      void cargarRanking();
    },
  };
}
