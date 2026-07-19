import { perfilPorDefecto, obtenerClaveBorrado, guardarClaveBorrado, borrarDatosGuardados } from '../services/storage';
import { mostrarPantalla } from '../ui/pantallas';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaAjustes {
  abrir(): void;
}

/** `onDatosBorrados` se llama sólo tras un borrado exitoso (para refrescar
 * el menú); cerrar sin borrar vuelve directo al menú sin refrescar nada. */
export function crearPantallaAjustes(contexto: ContextoJuego, onDatosBorrados: () => void): PantallaAjustes {
  const { perfil, registro } = contexto;

  document.getElementById('btn-cerrar-ajustes')!.addEventListener('click', () => {
    mostrarPantalla('pantalla-inicio');
  });

  // La clave se guarda tal cual (sin cifrar) en localStorage: sólo busca
  // evitar que alguien borre el progreso sin querer o sin permiso, no es una
  // protección real de seguridad.
  document.getElementById('btn-borrar-datos')!.addEventListener('click', () => {
    const claveGuardada = obtenerClaveBorrado();
    if (!claveGuardada) {
      const nuevaClave = window.prompt('Esto borrará tu progreso. Crea una clave para proteger el borrado (se guarda en este navegador):');
      if (!nuevaClave) return;
      guardarClaveBorrado(nuevaClave);
    } else {
      const intento = window.prompt('Ingresa tu clave para borrar los datos guardados:');
      if (intento === null) return;
      if (intento !== claveGuardada) {
        window.alert('Clave incorrecta. No se borraron los datos.');
        return;
      }
    }

    borrarDatosGuardados();
    Object.assign(perfil, perfilPorDefecto());
    registro.mejorPuntuacion = 0;
    onDatosBorrados();
  });

  return {
    abrir(): void {
      mostrarPantalla('pantalla-ajustes');
    },
  };
}
