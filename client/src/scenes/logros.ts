import { obtenerLogros } from '../services/api';
import type { LogroApi } from '../services/api';
import { mostrarPantalla } from '../ui/pantallas';
import { mostrarToast } from '../ui/toast';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaLogros {
  abrir(): void;
}

function escapeHtml(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/** Pantalla de logros (Fase 6): `GET /logros` (catálogo visible +
 * desbloqueados + progreso de los acumulativos, calculado al vuelo en el
 * servidor). Requiere sesión: los logros persisten en la cuenta, igual que
 * niveles/ranking por usuario — no tiene sentido offline. Los `secreto` no
 * desbloqueados ya llegan ocultos (nombre '???', icono ❔) del servidor, así
 * que no hay lógica de ocultamiento aquí, sólo una variante visual `.secreta`
 * un poco más atenuada. */
export function crearPantallaLogros(contexto: ContextoJuego, onCerrar: () => void): PantallaLogros {
  const { sesion } = contexto;

  const listaEl = document.getElementById('logros-lista')!;
  const estadoEl = document.getElementById('logros-estado')!;

  function tarjetaHtml(logro: LogroApi): string {
    const secretoOculto = logro.secreto && !logro.desbloqueado;
    const clases = ['tarjeta-logro'];
    if (logro.desbloqueado) clases.push('desbloqueada');
    if (secretoOculto) clases.push('secreta');

    let progresoHtml = '';
    if (logro.progreso) {
      const pct = logro.progreso.objetivo > 0
        ? Math.max(0, Math.min(100, Math.round((logro.progreso.actual / logro.progreso.objetivo) * 100)))
        : 0;
      progresoHtml = `
        <div class="tarjeta-logro-barra"><div class="tarjeta-logro-barra-fill" style="width:${pct}%"></div></div>
        <div class="tarjeta-logro-progreso">${logro.progreso.actual}/${logro.progreso.objetivo}</div>`;
    }

    return `
      <div class="${clases.join(' ')}">
        <div class="tarjeta-logro-icono">${logro.icono}</div>
        <div class="tarjeta-logro-info">
          <div class="tarjeta-logro-nombre">${escapeHtml(logro.nombre)}</div>
          <div class="tarjeta-logro-desc">${escapeHtml(logro.descripcion)}</div>
          ${progresoHtml}
        </div>
        ${logro.desbloqueado ? '<div class="tarjeta-logro-check" aria-label="Desbloqueado">✔</div>' : ''}
      </div>`;
  }

  async function cargarLogros(): Promise<void> {
    listaEl.innerHTML = '';

    if (!sesion.usuario) {
      estadoEl.textContent = 'Inicia sesión para ver tus logros: se guardan en tu cuenta.';
      estadoEl.classList.remove('oculto');
      return;
    }

    estadoEl.textContent = 'Cargando…';
    estadoEl.classList.remove('oculto');

    const resultado = await obtenerLogros();

    if (!resultado.ok) {
      estadoEl.textContent = 'No se pudieron cargar los logros (revisa tu conexión).';
      mostrarToast({ icono: '⚠️', texto: 'Sin conexión con el servidor', tipo: 'error' });
      return;
    }

    const logros = resultado.datos.logros;
    if (logros.length === 0) {
      estadoEl.textContent = 'Todavía no hay logros disponibles.';
      return;
    }

    estadoEl.classList.add('oculto');
    listaEl.innerHTML = logros.map((logro) => tarjetaHtml(logro)).join('');
  }

  document.getElementById('btn-cerrar-logros')!.addEventListener('click', () => {
    onCerrar();
  });

  return {
    abrir(): void {
      mostrarPantalla('pantalla-logros');
      void cargarLogros();
    },
  };
}
