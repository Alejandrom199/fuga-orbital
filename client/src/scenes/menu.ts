import { dibujarFondo } from '../render/fondo';
import { MEJORAS } from '../data/config';
import type { MejoraId } from '../data/config';
import { mostrarPantalla } from '../ui/pantallas';
import { crearPantallaTienda } from './tienda';
import { crearPantallaAjustes } from './ajustes';
import { crearPantallaCuenta } from './cuenta';
import { crearPantallaRanking } from './ranking';
import { crearPantallaNiveles } from './seleccion-niveles';
import { crearPantallaLogros } from './logros';
import type { Escena } from '../core/scene-manager';
import type { ContextoJuego } from '../core/contexto';

export function crearEscenaMenu(contexto: ContextoJuego): Escena {
  const { perfil, registro, gestor, sesion } = contexto;
  let cameraX = 0;
  let tiempoJugado = 0;

  const recordEl = document.getElementById('record-inicio')!;
  const saldoEl = document.getElementById('saldo-inicio')!;
  const mejorasListasEl = document.getElementById('mejoras-listas')!;
  const estadoSesionEl = document.getElementById('cuenta-estado-inicio')!;

  function actualizarInicio(): void {
    recordEl.textContent = String(registro.mejorPuntuacion);
    saldoEl.textContent = String(perfil.monedas);
    const iconos = (Object.entries(MEJORAS) as [MejoraId, (typeof MEJORAS)[MejoraId]][])
      .filter(([id]) => perfil.seleccion[id] && perfil.inventario[id] > 0)
      .map(([, def]) => def.icono);
    mejorasListasEl.textContent = iconos.length
      ? `Preparadas para la próxima partida: ${iconos.join(' ')}`
      : '';
    const usuario = sesion.usuario;
    estadoSesionEl.textContent = usuario ? `Conectado como ${usuario.nombre}` : '';
    estadoSesionEl.classList.toggle('oculto', !usuario);
  }

  function volverAlInicio(): void {
    actualizarInicio();
    mostrarPantalla('pantalla-inicio');
  }

  const tienda = crearPantallaTienda(contexto, volverAlInicio);
  const ajustes = crearPantallaAjustes(contexto, volverAlInicio);
  const cuenta = crearPantallaCuenta(contexto, volverAlInicio);
  const ranking = crearPantallaRanking(contexto, volverAlInicio);
  const niveles = crearPantallaNiveles(contexto, volverAlInicio);
  const logros = crearPantallaLogros(contexto, volverAlInicio);

  document.getElementById('btn-jugar')!.addEventListener('click', () => gestor.cambiar('juego'));
  document.getElementById('btn-tienda')!.addEventListener('click', () => tienda.abrir());
  document.getElementById('btn-ajustes')!.addEventListener('click', () => ajustes.abrir());
  document.getElementById('btn-cuenta')!.addEventListener('click', () => cuenta.abrir());
  document.getElementById('btn-ranking')!.addEventListener('click', () => ranking.abrir());
  document.getElementById('btn-niveles')!.addEventListener('click', () => niveles.abrir());
  document.getElementById('btn-logros')!.addEventListener('click', () => logros.abrir());

  // "Cómo se juega": info estática, no amerita un módulo de pantalla propio.
  document.getElementById('btn-como-jugar')!.addEventListener('click', () => {
    mostrarPantalla('pantalla-como-jugar');
  });
  document.getElementById('btn-cerrar-como-jugar')!.addEventListener('click', () => {
    mostrarPantalla('pantalla-inicio');
  });

  return {
    enter(): void {
      actualizarInicio();
      mostrarPantalla('pantalla-inicio');
    },
    update(dt: number): void {
      // Deriva lenta y puramente decorativa del fondo mientras se ve el menú.
      tiempoJugado += dt;
      cameraX += dt * 22;
    },
    draw(ctx: CanvasRenderingContext2D): void {
      const { W, H } = contexto.obtenerDimensiones();
      dibujarFondo({ ctx, W, H, cameraX, tiempoJugado });
    },
    exit(): void {},
  };
}
