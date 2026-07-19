export interface ManejadoresInput {
  onSaltar: () => void;
  onPausa: () => void;
}

/** Teclado (Espacio/↑ para saltar, P/Esc para pausa) + touch (tap para saltar).
 * Los manejadores deciden internamente si la acción es válida en el estado actual,
 * igual que hacía `saltar()` en el HTML original. */
export function configurarInput(canvas: HTMLCanvasElement, manejadores: ManejadoresInput): void {
  const teclas = new Set<string>();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (!teclas.has(e.code)) manejadores.onSaltar();
      teclas.add(e.code);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      manejadores.onPausa();
    }
  });

  window.addEventListener('keyup', (e) => teclas.delete(e.code));

  canvas.addEventListener('pointerdown', () => manejadores.onSaltar());
}
