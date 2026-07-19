import { registrarCuenta, iniciarSesion, cerrarSesion, migrarPerfilLocal } from '../services/api';
import type { DatosMigracionPerfil } from '../services/api';
import { sincronizarPerfilDesdeServidor } from '../services/sincronizacion';
import { mostrarPantalla } from '../ui/pantallas';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaCuenta {
  abrir(): void;
}

type Modo = 'login' | 'registro';

/** Pantalla de login/registro (Fase 3). Offline-first: sin backend o sin red
 * las peticiones fallan con un mensaje y el juego sigue como siempre — no
 * hay nada que dependa de tener sesión. */
export function crearPantallaCuenta(contexto: ContextoJuego, onCerrar: () => void): PantallaCuenta {
  const { sesion, perfil } = contexto;

  let modo: Modo = 'login';

  const sesionActivaEl = document.getElementById('cuenta-sesion-activa')!;
  const nombreActivoEl = document.getElementById('cuenta-nombre-activo')!;
  const formWrapEl = document.getElementById('cuenta-formulario-wrap')!;
  const formEl = document.getElementById('form-cuenta') as HTMLFormElement;
  const nombreInput = document.getElementById('cuenta-nombre') as HTMLInputElement;
  const passwordInput = document.getElementById('cuenta-password') as HTMLInputElement;
  const errorEl = document.getElementById('cuenta-error')!;
  const btnEnviar = document.getElementById('btn-enviar-cuenta') as HTMLButtonElement;
  const tabsEl = document.querySelectorAll<HTMLButtonElement>('#cuenta-formulario-wrap .tab-btn');

  function mostrarError(mensaje: string | null): void {
    errorEl.textContent = mensaje ?? '';
    errorEl.classList.toggle('oculto', !mensaje);
  }

  function actualizarVista(): void {
    const conectado = !!sesion.usuario;
    sesionActivaEl.classList.toggle('oculto', !conectado);
    formWrapEl.classList.toggle('oculto', conectado);
    if (conectado) nombreActivoEl.textContent = sesion.usuario!.nombre;
    mostrarError(null);
  }

  function cambiarModo(nuevoModo: Modo): void {
    modo = nuevoModo;
    tabsEl.forEach((btn) => btn.classList.toggle('activo', btn.dataset.modo === modo));
    btnEnviar.textContent = modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    mostrarError(null);
  }

  tabsEl.forEach((btn) => {
    btn.addEventListener('click', () => cambiarModo(btn.dataset.modo as Modo));
  });

  // Al registrarse por primera vez se intenta migrar el perfil local
  // (monedas, mejoras compradas, cosméticos) al servidor. El endpoint aún
  // no existe del lado servidor (ver comentario en services/api.ts): la
  // llamada falla en silencio y el perfil local sigue siendo la fuente de
  // verdad, tal como exige el flujo offline-first.
  function migrarPerfilSiAplica(): void {
    const datos: DatosMigracionPerfil = {
      monedas: perfil.monedas,
      inventario: perfil.inventario,
      cosmeticos: perfil.cosmeticos,
      equipados: perfil.equipados,
    };
    void migrarPerfilLocal(datos);
  }

  formEl.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nombre = nombreInput.value.trim();
    const password = passwordInput.value;
    if (!nombre || !password) return;

    btnEnviar.disabled = true;
    mostrarError(null);

    const resultado = modo === 'login' ? await iniciarSesion(nombre, password) : await registrarCuenta(nombre, password);

    btnEnviar.disabled = false;

    if (!resultado.ok) {
      mostrarError(resultado.error);
      return;
    }

    sesion.usuario = resultado.datos;
    passwordInput.value = '';
    if (modo === 'registro') {
      // Cuenta nueva: el servidor arranca en 0. Hasta que exista el endpoint
      // de migración (ver comentario en services/api.ts), el perfil local
      // sigue siendo la fuente de verdad — sincronizar acá pisaría el
      // progreso local con el 0 del servidor, así que no se hace.
      migrarPerfilSiAplica();
    } else {
      // Cuenta existente: el servidor sí es la fuente de verdad.
      void sincronizarPerfilDesdeServidor(contexto);
    }
    actualizarVista();
  });

  document.getElementById('btn-cerrar-sesion')!.addEventListener('click', () => {
    void cerrarSesion();
    sesion.usuario = null;
    actualizarVista();
  });

  document.getElementById('btn-cerrar-cuenta')!.addEventListener('click', () => {
    onCerrar();
  });

  cambiarModo('login');

  return {
    abrir(): void {
      actualizarVista();
      mostrarPantalla('pantalla-cuenta');
    },
  };
}
