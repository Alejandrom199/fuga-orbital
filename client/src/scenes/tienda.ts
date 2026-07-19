import { MEJORAS, COSMETICOS } from '../data/config';
import type { MejoraId, CosmeticoId } from '../data/config';
import { guardarPerfil } from '../services/storage';
import { mostrarPantalla } from '../ui/pantallas';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaTienda {
  abrir(): void;
}

export function crearPantallaTienda(contexto: ContextoJuego, onCerrar: () => void): PantallaTienda {
  const { perfil } = contexto;

  const listaMejorasEl = document.getElementById('tienda-lista-mejoras')!;
  const listaCosmeticosEl = document.getElementById('tienda-lista-cosmeticos')!;
  const saldoEl = document.getElementById('tienda-saldo')!;

  function renderTienda(): void {
    listaMejorasEl.innerHTML = (Object.entries(MEJORAS) as [MejoraId, (typeof MEJORAS)[MejoraId]][])
      .map(([id, def]) => {
        const cantidad = perfil.inventario[id];
        const preparada = perfil.seleccion[id] && cantidad > 0;
        const sinFondos = perfil.monedas < def.costo;
        const textoPreparar = cantidad > 0 ? (preparada ? 'Preparada ✓' : 'Preparar') : 'Sin cargas';
        return `
          <div class="tienda-item">
            <div class="tienda-item-icono">${def.icono}</div>
            <div class="tienda-item-info">
              <div class="tienda-item-nombre">${def.nombre}</div>
              <div class="tienda-item-desc">${def.desc}</div>
              <div class="tienda-item-nivel">En inventario: ${cantidad}</div>
            </div>
            <div class="tienda-item-acciones">
              <button class="tienda-item-btn" data-tipo="comprar-mejora" data-id="${id}"${sinFondos ? ' disabled' : ''}>Comprar &middot; ${def.costo}</button>
              <button class="tienda-item-btn secundario${preparada ? ' equipado' : ''}" data-tipo="preparar-mejora" data-id="${id}"${cantidad <= 0 ? ' disabled' : ''}>${textoPreparar}</button>
            </div>
          </div>`;
      })
      .join('');

    listaCosmeticosEl.innerHTML = (Object.entries(COSMETICOS) as [CosmeticoId, (typeof COSMETICOS)[CosmeticoId]][])
      .map(([id, def]) => {
        const comprado = perfil.cosmeticos[id];
        const equipado = perfil.equipados[id];
        const disabled = !comprado && perfil.monedas < def.costo;
        const textoBtn = !comprado ? `Comprar &middot; ${def.costo}` : equipado ? 'Quitar' : 'Equipar';
        return `
          <div class="tienda-item">
            <div class="tienda-item-icono">${def.icono}</div>
            <div class="tienda-item-info">
              <div class="tienda-item-nombre">${def.nombre}</div>
              <div class="tienda-item-desc">${def.desc}</div>
            </div>
            <button class="tienda-item-btn${equipado ? ' equipado' : ''}" data-tipo="cosmetico" data-id="${id}"${disabled ? ' disabled' : ''}>${textoBtn}</button>
          </div>`;
      })
      .join('');
  }

  function actualizarSaldo(): void {
    saldoEl.textContent = String(perfil.monedas);
  }

  function comprarMejora(id: MejoraId): void {
    const def = MEJORAS[id];
    if (perfil.monedas < def.costo) return;
    perfil.monedas -= def.costo;
    perfil.inventario[id]++;
    guardarPerfil(perfil);
    renderTienda();
    actualizarSaldo();
  }

  function prepararMejora(id: MejoraId): void {
    if (perfil.inventario[id] <= 0) return;
    perfil.seleccion[id] = !perfil.seleccion[id];
    guardarPerfil(perfil);
    renderTienda();
  }

  function alternarCosmetico(id: CosmeticoId): void {
    const def = COSMETICOS[id];
    if (!perfil.cosmeticos[id]) {
      if (perfil.monedas < def.costo) return;
      perfil.monedas -= def.costo;
      perfil.cosmeticos[id] = true;
      perfil.equipados[id] = true;
    } else {
      perfil.equipados[id] = !perfil.equipados[id];
    }
    guardarPerfil(perfil);
    renderTienda();
    actualizarSaldo();
  }

  function manejarClic(e: Event): void {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.tienda-item-btn');
    if (!btn || btn.disabled) return;
    const tipo = btn.dataset.tipo;
    const id = btn.dataset.id!;
    if (tipo === 'comprar-mejora') comprarMejora(id as MejoraId);
    else if (tipo === 'preparar-mejora') prepararMejora(id as MejoraId);
    else if (tipo === 'cosmetico') alternarCosmetico(id as CosmeticoId);
  }
  listaMejorasEl.addEventListener('click', manejarClic);
  listaCosmeticosEl.addEventListener('click', manejarClic);

  // Escopado a #pantalla-tienda: `.tab-btn` es una clase genérica del sistema
  // de diseño (también la usa la pantalla de cuenta para login/registro), un
  // selector global aquí interferiría con esas otras pestañas.
  document.querySelectorAll<HTMLButtonElement>('#pantalla-tienda .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pantalla-tienda .tab-btn').forEach((b) => b.classList.remove('activo'));
      btn.classList.add('activo');
      const tab = btn.dataset.tab;
      listaMejorasEl.classList.toggle('oculto', tab !== 'mejoras');
      listaCosmeticosEl.classList.toggle('oculto', tab !== 'cosmeticos');
    });
  });

  document.getElementById('btn-cerrar-tienda')!.addEventListener('click', () => {
    onCerrar();
  });

  return {
    abrir(): void {
      renderTienda();
      actualizarSaldo();
      mostrarPantalla('pantalla-tienda');
    },
  };
}
