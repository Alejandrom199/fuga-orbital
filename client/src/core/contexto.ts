import type { GestorEscenas } from './scene-manager';
import type { Perfil } from '../services/storage';
import type { PresetJuego } from '../data/config';
import type { UsuarioSesion } from '../services/api';

export interface Dimensiones {
  W: number;
  H: number;
  trainBaseY: number;
}

/** Dependencias compartidas que reciben todas las escenas: evita variables
 * globales sueltas sin introducir un contenedor de inyección de dependencias. */
export interface ContextoJuego {
  canvas: HTMLCanvasElement;
  gestor: GestorEscenas;
  obtenerDimensiones: () => Dimensiones;
  perfil: Perfil;
  registro: { mejorPuntuacion: number };
  preset: PresetJuego;
  /** Sesión de backend (Fase 3): null = jugando offline/sin cuenta. Se
   * consulta una vez al arrancar (`GET /auth/yo`) y se actualiza al
   * iniciar/cerrar sesión desde `scenes/cuenta.ts`. */
  sesion: { usuario: UsuarioSesion | null };
}
