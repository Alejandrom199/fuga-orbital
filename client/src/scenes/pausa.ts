import { mostrarPantalla } from '../ui/pantallas';

export interface PantallaPausa {
  mostrar(): void;
  ocultar(): void;
}

export function crearPantallaPausa(onReanudar: () => void, onMenuPrincipal: () => void): PantallaPausa {
  document.getElementById('btn-reanudar')!.addEventListener('click', onReanudar);
  document.getElementById('btn-menu-principal')!.addEventListener('click', onMenuPrincipal);

  return {
    mostrar(): void {
      mostrarPantalla('pantalla-pausa');
    },
    ocultar(): void {
      mostrarPantalla(null);
    },
  };
}
