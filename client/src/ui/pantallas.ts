const IDS_PANTALLA = [
  'pantalla-inicio',
  'pantalla-pausa',
  'pantalla-gameover',
  'pantalla-tienda',
  'pantalla-ajustes',
  'pantalla-cuenta',
  'pantalla-ranking',
] as const;

/** Muestra la pantalla (overlay) con ese id y oculta el resto. `null` las oculta todas. */
export function mostrarPantalla(id: string | null): void {
  for (const pid of IDS_PANTALLA) {
    document.getElementById(pid)?.classList.toggle('oculto', pid !== id);
  }
}
