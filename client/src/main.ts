import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './style.css';
import { GestorEscenas } from './core/scene-manager';
import { iniciarLoop } from './core/loop';
import { crearEscenaMenu } from './scenes/menu';
import { crearEscenaJuego } from './scenes/juego';
import { cargarPerfil, cargarMejorPuntuacion } from './services/storage';
import { sincronizarPerfilDesdeServidor } from './services/sincronizacion';
import { obtenerSesionActual } from './services/api';
import { PRESET_ENDLESS } from './data/config';
import type { ContextoJuego } from './core/contexto';

const canvas = document.getElementById('lienzo') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Los tamaños del juego están calibrados para una ventana de ~720px de alto.
// En móviles la altura visible es mucho menor y, al dibujar todo con los
// mismos píxeles absolutos, se veía "acercado"/en zoom. Por eso se calcula
// un factor de escala: en pantallas bajas se agranda el mundo lógico (W/H)
// y se compensa al dibujar, mostrando más mundo (efecto zoom-out).
const ALTURA_REFERENCIA = 720;
const FACTOR_ALEJAR = 0.85;

let W = 0;
let H = 0;
let trainBaseY = 0;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const realW = window.innerWidth;
  const realH = window.innerHeight;
  const escalaRender = Math.max(0.45, Math.min(1, realH / ALTURA_REFERENCIA)) * FACTOR_ALEJAR;
  W = realW / escalaRender;
  H = realH / escalaRender;
  canvas.width = Math.round(realW * dpr);
  canvas.height = Math.round(realH * dpr);
  ctx.setTransform(dpr * escalaRender, 0, 0, dpr * escalaRender, 0, 0);
  trainBaseY = H * 0.6;
}
window.addEventListener('resize', resize);
resize();

// ---------- Contexto compartido + escenas ----------
const gestor = new GestorEscenas();
const contexto: ContextoJuego = {
  canvas,
  gestor,
  obtenerDimensiones: () => ({ W, H, trainBaseY }),
  perfil: cargarPerfil(),
  registro: { mejorPuntuacion: cargarMejorPuntuacion() },
  preset: PRESET_ENDLESS,
  sesion: { usuario: null },
};

const escenaJuego = crearEscenaJuego(contexto);
gestor.registrar('menu', crearEscenaMenu(contexto));
gestor.registrar('juego', escenaJuego);
gestor.cambiar('menu');

// Consulta la sesión activa en segundo plano (Fase 3): nunca bloquea el
// arranque ni el primer frame; si no hay backend o no hay cookie válida,
// `contexto.sesion.usuario` simplemente queda en null (modo offline).
void obtenerSesionActual().then((resultado) => {
  if (!resultado.ok) return;
  contexto.sesion.usuario = resultado.datos;
  // Con sesión ya activa al recargar la página, trae monedas/inventario
  // reales del servidor antes de que el jugador llegue a la tienda o a jugar.
  void sincronizarPerfilDesdeServidor(contexto);
});

// ---------- Orientación (aviso de girar el móvil) ----------
let enPortrait = false;
const avisoRotar = document.getElementById('aviso-rotar')!;

function actualizarOrientacion(): void {
  const antesPortrait = enPortrait;
  enPortrait = window.innerHeight > window.innerWidth;
  avisoRotar.classList.toggle('visible', enPortrait);

  // Si gira a vertical estando en juego, se pasa a pausa: al volver a
  // horizontal el jugador ve la pantalla de pausa en vez de seguir sin más.
  if (enPortrait && !antesPortrait && gestor.nombreActual === 'juego') {
    escenaJuego.pausarPorRotacion();
  }
}
window.addEventListener('resize', actualizarOrientacion);
window.addEventListener('orientationchange', actualizarOrientacion);
actualizarOrientacion();

// ---------- Pantalla completa ----------
// Nota: algunos navegadores (sobre todo versiones antiguas con prefijo
// "webkit"/"moz") no devuelven una Promise en requestFullscreen/exitFullscreen,
// así que hay que comprobarlo antes de encadenar .then/.catch; si no, la
// llamada lanza un error síncrono y el botón queda "sin hacer nada".
const btnFullscreen = document.getElementById('btn-fullscreen')!;

function comoPromesa(resultado: unknown): Promise<void> {
  return resultado && typeof (resultado as Promise<void>).then === 'function'
    ? (resultado as Promise<void>)
    : Promise.resolve();
}

function hayFullscreenActivo(): boolean {
  const d = document as any;
  return !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
}

function solicitarFullscreen(el: HTMLElement): Promise<void> {
  const e = el as any;
  const fn = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen;
  if (!fn) return Promise.reject(new Error('Fullscreen no soportado'));
  return comoPromesa(fn.call(el));
}

function salirFullscreen(): Promise<void> {
  const d = document as any;
  const fn = d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen;
  if (!fn) return Promise.resolve();
  return comoPromesa(fn.call(document));
}

function alternarFullscreen(): void {
  try {
    if (!hayFullscreenActivo()) {
      solicitarFullscreen(document.documentElement)
        .then(() => {
          const orientacion = (screen as any).orientation;
          orientacion?.lock?.('landscape')?.catch(() => {});
        })
        .catch(() => {});
    } else {
      salirFullscreen().catch(() => {});
    }
  } catch {
    // El navegador rechazó la solicitud (p. ej. Safari antiguo en iPhone); no hay más que hacer.
  }
}

btnFullscreen.addEventListener('click', alternarFullscreen);

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((evento) => {
  document.addEventListener(evento, () => {
    const icono = btnFullscreen.querySelector('i');
    icono?.classList.toggle('fa-expand', !hayFullscreenActivo());
    icono?.classList.toggle('fa-compress', hayFullscreenActivo());
  });
});

// ---------- Bucle principal ----------
gestor.draw(ctx); // primer frame inmediato (fondo del menú) antes del primer rAF

const btnPausaHud = document.getElementById('btn-pausa')!;

iniciarLoop((dt) => {
  if (enPortrait) return;
  gestor.update(dt);
  gestor.draw(ctx);
  // Pausar sólo tiene sentido durante una partida (la propia escena 'juego'
  // cubre jugando/pausa/game-over); pantalla completa sí tiene sentido en
  // cualquier pantalla, así que ese botón queda siempre visible.
  btnPausaHud.classList.toggle('oculto', gestor.nombreActual !== 'juego');
});
