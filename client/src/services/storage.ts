import type { MejoraId, CosmeticoId } from '../data/config';

// Única puerta a localStorage. Moneda persistente (independiente de la
// puntuación de cada partida) con la que se compran mejoras y cosméticos.

export interface Perfil {
  monedas: number;
  inventario: Record<MejoraId, number>;
  seleccion: Record<MejoraId, boolean>;
  cosmeticos: Record<CosmeticoId, boolean>;
  equipados: Record<CosmeticoId, boolean>;
}

const CLAVE_PERFIL = 'fugaOrbital_perfil';
const CLAVE_RECORD = 'fugaOrbital_mejorPuntuacion';
const CLAVE_BORRADO = 'fugaOrbital_clave';

export function perfilPorDefecto(): Perfil {
  return {
    monedas: 0,
    inventario: { vidas: 0, iman: 0, salto: 0, multiplicador: 0 },
    seleccion: { vidas: false, iman: false, salto: false, multiplicador: false },
    cosmeticos: { gorra: false, gafas: false, capa: false, antena: false, bufanda: false, corona: false },
    equipados: { gorra: false, gafas: false, capa: false, antena: false, bufanda: false, corona: false },
  };
}

export function cargarPerfil(): Perfil {
  const perfil = perfilPorDefecto();
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PERFIL) ?? 'null');
    if (guardado) {
      perfil.monedas = Number(guardado.monedas) || 0;
      Object.assign(perfil.inventario, guardado.inventario ?? {});
      Object.assign(perfil.seleccion, guardado.seleccion ?? {});
      Object.assign(perfil.cosmeticos, guardado.cosmeticos ?? {});
      Object.assign(perfil.equipados, guardado.equipados ?? {});
    }
  } catch {
    // perfil corrupto o inexistente: se usa el de por defecto
  }
  return perfil;
}

export function guardarPerfil(perfil: Perfil): void {
  localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
}

export function cargarMejorPuntuacion(): number {
  return Number(localStorage.getItem(CLAVE_RECORD) || 0);
}

export function guardarMejorPuntuacion(valor: number): void {
  localStorage.setItem(CLAVE_RECORD, String(valor));
}

export function obtenerClaveBorrado(): string | null {
  return localStorage.getItem(CLAVE_BORRADO);
}

export function guardarClaveBorrado(clave: string): void {
  localStorage.setItem(CLAVE_BORRADO, clave);
}

/** Borra perfil y mejor puntuación; la clave de borrado se conserva. */
export function borrarDatosGuardados(): void {
  localStorage.removeItem(CLAVE_PERFIL);
  localStorage.removeItem(CLAVE_RECORD);
}
