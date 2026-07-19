/**
 * Toast de notificación (Fase 6). No intrusivo, esquina superior derecha,
 * auto-cierre. Vive en un contenedor global (`#toasts` en index.html, fuera
 * de cualquier `.pantalla`) para poder mostrarse sobre cualquier escena —
 * necesario porque `POST /partidas` responde en segundo plano y, para
 * cuando llega, el jugador puede estar en game-over o de vuelta en el menú.
 *
 * Uso: mostrarToast({ icono: 'trophy', texto: 'Logro: Primer salto', tipo: 'logro' }).
 * `icono` es un nombre de ícono de Font Awesome ("solid"), sin el prefijo
 * `fa-`. Tres variantes previstas (sólo cambian el acento): 'logro'
 * (default), 'nivel', 'error'.
 */

export type TipoToast = 'logro' | 'nivel' | 'error';

export interface OpcionesToast {
  icono: string;
  texto: string;
  tipo?: TipoToast;
}

const DURACION_MS = 3500;
const TRANSICION_MS = 250;

export function mostrarToast(opciones: OpcionesToast): void {
  const contenedor = document.getElementById('toasts');
  if (!contenedor) return; // defensivo: si el HTML no lo trae, no rompe el flujo del juego.

  const { icono, texto, tipo = 'logro' } = opciones;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;

  const iconoEl = document.createElement('span');
  iconoEl.className = 'toast-icono';
  iconoEl.innerHTML = `<i class="fa-solid fa-${icono}" aria-hidden="true"></i>`;

  const textoEl = document.createElement('span');
  textoEl.className = 'toast-texto';
  textoEl.textContent = texto;

  toast.append(iconoEl, textoEl);
  contenedor.appendChild(toast);

  // Se añade la clase en el frame siguiente para que la transición de
  // entrada (opacity/transform) se dispare en vez de arrancar ya en su
  // estado final.
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), TRANSICION_MS);
  }, DURACION_MS);
}
