import { obtenerNiveles } from '../services/api';
import type { NivelApi } from '../services/api';
import { presetDesdeNivel } from '../data/config';
import { mostrarPantalla } from '../ui/pantallas';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaNiveles {
  abrir(): void;
}

function escapeHtml(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function estrellasHtml(cantidad: number): string {
  let out = '';
  for (let i = 0; i < 3; i++) out += i < cantidad ? '★' : '☆';
  return out;
}

/** Pantalla de selección de niveles (Fase 5): `GET /niveles` (catálogo +
 * progreso + `desbloqueado`, calculado en el servidor). Requiere sesión: el
 * progreso vive ahí, no tiene sentido jugar niveles sin cuenta — a
 * diferencia del endless, que sigue siendo 100% offline-first. */
export function crearPantallaNiveles(contexto: ContextoJuego, onCerrar: () => void): PantallaNiveles {
  const { sesion, gestor } = contexto;

  const listaEl = document.getElementById('niveles-lista')!;
  const estadoEl = document.getElementById('niveles-estado')!;

  let ultimosNiveles: NivelApi[] = [];

  async function cargarNiveles(): Promise<void> {
    listaEl.innerHTML = '';
    ultimosNiveles = [];

    if (!sesion.usuario) {
      estadoEl.textContent = 'Inicia sesión para jugar por niveles: tu progreso y estrellas se guardan en tu cuenta.';
      estadoEl.classList.remove('oculto');
      return;
    }

    estadoEl.textContent = 'Cargando…';
    estadoEl.classList.remove('oculto');

    const resultado = await obtenerNiveles();

    if (!resultado.ok) {
      estadoEl.textContent = 'No se pudieron cargar los niveles (revisa tu conexión).';
      return;
    }

    const niveles = resultado.datos.niveles;
    if (niveles.length === 0) {
      estadoEl.textContent = 'Todavía no hay niveles disponibles.';
      return;
    }

    ultimosNiveles = niveles;
    estadoEl.classList.add('oculto');
    listaEl.innerHTML = niveles.map((nivel) => tarjetaHtml(nivel)).join('');
  }

  function tarjetaHtml(nivel: NivelApi): string {
    const bloqueado = !nivel.desbloqueado;
    return `
      <div class="tarjeta-nivel${bloqueado ? ' bloqueada' : ''}" data-id="${nivel.id}"${bloqueado ? '' : ' role="button" tabindex="0"'}>
        <div class="tarjeta-nivel-num">${nivel.orden}</div>
        <div class="tarjeta-nivel-info">
          <div class="tarjeta-nivel-nombre">${escapeHtml(nivel.nombre)}</div>
          <div class="tarjeta-nivel-estrellas">${estrellasHtml(nivel.estrellas)}</div>
        </div>
        ${bloqueado ? '<div class="tarjeta-nivel-candado" aria-label="Bloqueado">🔒</div>' : ''}
      </div>`;
  }

  function jugarNivel(nivel: NivelApi): void {
    // Mismo motor que endless (scenes/juego.ts): sólo cambia el preset que
    // recibe vía `enter(params)` y que se identifique como partida de nivel.
    const preset = presetDesdeNivel(nivel.config);
    gestor.cambiar('juego', { nivelId: nivel.id, preset });
  }

  listaEl.addEventListener('click', (evento) => {
    const tarjeta = (evento.target as HTMLElement).closest<HTMLElement>('.tarjeta-nivel');
    if (!tarjeta || tarjeta.classList.contains('bloqueada')) return;
    const id = Number(tarjeta.dataset.id);
    const nivel = ultimosNiveles.find((n) => n.id === id);
    if (nivel) jugarNivel(nivel);
  });

  document.getElementById('btn-cerrar-niveles')!.addEventListener('click', () => {
    onCerrar();
  });

  return {
    abrir(): void {
      mostrarPantalla('pantalla-niveles');
      void cargarNiveles();
    },
  };
}
