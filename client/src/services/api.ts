import type { MejoraId, CosmeticoId, PresetJuego } from '../data/config';

// Capa de acceso al backend (Fase 3). Offline-first: cualquier error de red
// o de servidor se atrapa aquí y se devuelve como resultado tipado, nunca se
// lanza — así una llamada a la API jamás rompe el flujo del juego sin
// conexión o sin backend levantado.

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3001';

export interface UsuarioSesion {
  id: number;
  nombre: string;
}

export type ResultadoApi<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number };

async function peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<ResultadoApi<T>> {
  try {
    const respuesta = await fetch(`${BASE_URL}${ruta}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opciones.headers ?? {}) },
      ...opciones,
    });

    let cuerpo: unknown = null;
    try {
      cuerpo = await respuesta.json();
    } catch {
      cuerpo = null;
    }

    if (!respuesta.ok) {
      const mensaje = (cuerpo as { error?: string } | null)?.error ?? `Error ${respuesta.status}`;
      return { ok: false, error: mensaje, status: respuesta.status };
    }
    return { ok: true, datos: cuerpo as T };
  } catch {
    // Sin red, servidor caído o CORS: se trata como "sin conexión" y no
    // interrumpe nada — el llamador decide si eso importa o no.
    return { ok: false, error: 'Sin conexión con el servidor' };
  }
}

// ---------- Auth ----------

export function registrarCuenta(nombre: string, password: string): Promise<ResultadoApi<UsuarioSesion>> {
  return peticion<UsuarioSesion>('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre, password }) });
}

export function iniciarSesion(nombre: string, password: string): Promise<ResultadoApi<UsuarioSesion>> {
  return peticion<UsuarioSesion>('/auth/login', { method: 'POST', body: JSON.stringify({ nombre, password }) });
}

export function cerrarSesion(): Promise<ResultadoApi<{ ok: boolean }>> {
  return peticion<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export function obtenerSesionActual(): Promise<ResultadoApi<UsuarioSesion>> {
  return peticion<UsuarioSesion>('/auth/yo');
}

// ---------- Perfil ----------

export interface PerfilServidor {
  usuarioId: number;
  nombre: string;
  monedas: number;
  ajustes: Record<string, unknown>;
  actualizadoEn: string;
}

export function obtenerPerfilServidor(): Promise<ResultadoApi<PerfilServidor>> {
  return peticion<PerfilServidor>('/perfil');
}

export interface DatosMigracionPerfil {
  monedas: number;
  inventario: Record<MejoraId, number>;
  cosmeticos: Record<CosmeticoId, boolean>;
  equipados: Record<CosmeticoId, boolean>;
}

/**
 * NOTA DE COORDINACIÓN (Fase 3 → Fase 4/servidor): `POST /perfil/migrar`
 * **todavía no existe** en `/server`. Hoy `POST /auth/registro` crea el
 * perfil vacío (monedas=0, sin inventario) y `PUT /perfil/ajustes` sólo
 * toca la columna jsonb `ajustes`, no saldo ni inventario — no hay forma de
 * que el cliente entregue el perfil local sin un endpoint nuevo.
 *
 * Propuesta para quien lo implemente del lado servidor: un endpoint
 * autenticado que, sólo si el usuario no tiene aún ninguna partida ni fila
 * en `inventario` (para no pisar progreso real con datos locales viejos),
 * en una transacción: fije `perfiles.monedas = monedas` y haga upsert en
 * `inventario` por cada entrada de `inventario`/`cosmeticos` cuyo código
 * coincida con `items.codigo` (los códigos de MEJORAS/COSMETICOS del
 * cliente son literalmente los `codigo` sembrados en `seed.ts`).
 *
 * Hasta que exista, esta llamada devuelve 404 y se ignora en el llamador
 * (ver `scenes/cuenta.ts`) — el perfil local sigue siendo la fuente de
 * verdad y no se pierde nada.
 */
export function migrarPerfilLocal(datos: DatosMigracionPerfil): Promise<ResultadoApi<{ ok: boolean }>> {
  return peticion<{ ok: boolean }>('/perfil/migrar', { method: 'POST', body: JSON.stringify(datos) });
}

// ---------- Partidas / ranking ----------

export interface DatosPartida {
  modo: 'endless' | 'nivel';
  nivelId?: number;
  puntos: number;
  monedasGanadas: number;
  duracionS: number;
  mejorasUsadas?: Record<string, unknown>;
}

export interface RespuestaPartida {
  partida: { id: number; puntos: number; monedasGanadas: number; duracionS: number };
  logrosDesbloqueados: unknown[];
  nivelCompletado?: { nivelId: number; completado: boolean; estrellas: number };
}

export function enviarPartida(datos: DatosPartida): Promise<ResultadoApi<RespuestaPartida>> {
  return peticion<RespuestaPartida>('/partidas', { method: 'POST', body: JSON.stringify(datos) });
}

export interface FilaRanking {
  usuarioId: number;
  nombre: string;
  mejorPuntuacion: number;
}

export function obtenerRanking(limite = 20): Promise<ResultadoApi<{ ranking: FilaRanking[] }>> {
  return peticion<{ ranking: FilaRanking[] }>(`/ranking?limite=${limite}`);
}

// ---------- Niveles ----------

export interface ObjetivoNivel {
  tipo: 'distancia' | 'monedas' | 'sobrevivir_s';
  valor: number;
}

export interface NivelApi {
  id: number;
  orden: number;
  nombre: string;
  /** Preset parcial (jsonb): sólo los campos que ese nivel varía respecto al
   * endless, + `semilla` opcional para el trazado determinista. Se completa
   * con `presetDesdeNivel()` (`data/config.ts`) antes de jugarlo. */
  config: Partial<PresetJuego>;
  objetivo: ObjetivoNivel;
  desbloqueado: boolean;
  completado: boolean;
  estrellas: number;
  mejorPuntuacion: number;
  intentos: number;
}

/** Requiere sesión para tener sentido (el progreso vive en el servidor), pero
 * el propio endpoint acepta llamarse sin cookie (`autenticarOpcional`) — el
 * llamador (`scenes/seleccion-niveles.ts`) decide no invocarla sin sesión. */
export function obtenerNiveles(): Promise<ResultadoApi<{ niveles: NivelApi[] }>> {
  return peticion<{ niveles: NivelApi[] }>('/niveles');
}
