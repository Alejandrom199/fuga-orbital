import { MEJORAS, COSMETICOS } from '../data/config';
import type { MejoraId, CosmeticoId } from '../data/config';
import { guardarPerfil } from '../services/storage';
import { comprarItem, equiparItem, prepararItem } from '../services/api';
import type { ItemTienda } from '../services/api';
import { sincronizarPerfilDesdeServidor } from '../services/sincronizacion';
import { mostrarPantalla } from '../ui/pantallas';
import { mostrarToast } from '../ui/toast';
import type { ContextoJuego } from '../core/contexto';

export interface PantallaTienda {
  abrir(): void;
}

export function crearPantallaTienda(contexto: ContextoJuego, onCerrar: () => void): PantallaTienda {
  const { perfil, sesion } = contexto;

  const listaMejorasEl = document.getElementById('tienda-lista-mejoras')!;
  const listaCosmeticosEl = document.getElementById('tienda-lista-cosmeticos')!;
  const saldoEl = document.getElementById('tienda-saldo')!;

  // Con sesión, cada item del catálogo online lleva su id numérico real del
  // servidor en `data-id` (en vez del código local) para poder llamar
  // /tienda/comprar|equipar|preparar directamente desde el clic.
  function renderOnline(items: ItemTienda[]): void {
    const mejoras = items.filter((i) => i.tipo === 'mejora');
    const cosmeticos = items.filter((i) => i.tipo === 'cosmetico');

    listaMejorasEl.innerHTML = mejoras
      .map((item) => {
        const sinFondos = perfil.monedas < item.costo;
        const textoPreparar = item.cantidad > 0 ? (item.preparado ? 'Preparada ✓' : 'Preparar') : 'Sin cargas';
        return `
          <div class="tienda-item">
            <div class="tienda-item-icono">${item.icono}</div>
            <div class="tienda-item-info">
              <div class="tienda-item-nombre">${item.nombre}</div>
              <div class="tienda-item-desc">${item.descripcion}</div>
              <div class="tienda-item-nivel">En inventario: ${item.cantidad}</div>
            </div>
            <div class="tienda-item-acciones">
              <button class="tienda-item-btn" data-tipo="comprar" data-id="${item.id}"${sinFondos ? ' disabled' : ''}>Comprar &middot; ${item.costo}</button>
              <button class="tienda-item-btn secundario${item.preparado ? ' equipado' : ''}" data-tipo="preparar" data-id="${item.id}"${item.cantidad <= 0 ? ' disabled' : ''}>${textoPreparar}</button>
            </div>
          </div>`;
      })
      .join('');

    listaCosmeticosEl.innerHTML = cosmeticos
      .map((item) => {
        const comprado = item.cantidad > 0;
        const disabled = !comprado && perfil.monedas < item.costo;
        const textoBtn = !comprado ? `Comprar &middot; ${item.costo}` : item.equipado ? 'Quitar' : 'Equipar';
        return `
          <div class="tienda-item">
            <div class="tienda-item-icono">${item.icono}</div>
            <div class="tienda-item-info">
              <div class="tienda-item-nombre">${item.nombre}</div>
              <div class="tienda-item-desc">${item.descripcion}</div>
            </div>
            <button class="tienda-item-btn${item.equipado ? ' equipado' : ''}" data-tipo="${comprado ? 'equipar' : 'comprar'}" data-id="${item.id}"${disabled ? ' disabled' : ''}>${textoBtn}</button>
          </div>`;
      })
      .join('');
  }

  function renderOffline(): void {
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
              <button class="tienda-item-btn" data-tipo="comprar-mejora-local" data-id="${id}"${sinFondos ? ' disabled' : ''}>Comprar &middot; ${def.costo}</button>
              <button class="tienda-item-btn secundario${preparada ? ' equipado' : ''}" data-tipo="preparar-mejora-local" data-id="${id}"${cantidad <= 0 ? ' disabled' : ''}>${textoPreparar}</button>
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
            <button class="tienda-item-btn${equipado ? ' equipado' : ''}" data-tipo="cosmetico-local" data-id="${id}"${disabled ? ' disabled' : ''}>${textoBtn}</button>
          </div>`;
      })
      .join('');
  }

  function actualizarSaldo(): void {
    saldoEl.textContent = String(perfil.monedas);
  }

  async function cargarOnline(): Promise<void> {
    const items = await sincronizarPerfilDesdeServidor(contexto);
    actualizarSaldo();
    if (!items) {
      mostrarToast({ icono: '⚠️', texto: 'No se pudo cargar la tienda del servidor', tipo: 'error' });
      renderOffline(); // último recurso: al menos mostrar algo usable
      return;
    }
    renderOnline(items);
  }

  async function manejarAccionOnline(itemId: number, tipo: string): Promise<void> {
    let resultado: { ok: boolean; error?: string };
    if (tipo === 'comprar') resultado = await comprarItem(itemId);
    else if (tipo === 'equipar') resultado = await equiparItem(itemId);
    else resultado = await prepararItem(itemId);

    if (!resultado.ok) {
      mostrarToast({ icono: '⚠️', texto: resultado.error ?? 'No se pudo completar la acción', tipo: 'error' });
      return;
    }
    await cargarOnline();
  }

  // ---------- Mejoras/cosméticos 100% locales (sin sesión) ----------

  function comprarMejoraLocal(id: MejoraId): void {
    const def = MEJORAS[id];
    if (perfil.monedas < def.costo) return;
    perfil.monedas -= def.costo;
    perfil.inventario[id]++;
    guardarPerfil(perfil);
    renderOffline();
    actualizarSaldo();
  }

  function prepararMejoraLocal(id: MejoraId): void {
    if (perfil.inventario[id] <= 0) return;
    perfil.seleccion[id] = !perfil.seleccion[id];
    guardarPerfil(perfil);
    renderOffline();
  }

  function alternarCosmeticoLocal(id: CosmeticoId): void {
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
    renderOffline();
    actualizarSaldo();
  }

  function manejarClic(e: Event): void {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.tienda-item-btn');
    if (!btn || btn.disabled) return;
    const tipo = btn.dataset.tipo!;
    const id = btn.dataset.id!;

    if (sesion.usuario) {
      void manejarAccionOnline(Number(id), tipo);
      return;
    }
    if (tipo === 'comprar-mejora-local') comprarMejoraLocal(id as MejoraId);
    else if (tipo === 'preparar-mejora-local') prepararMejoraLocal(id as MejoraId);
    else if (tipo === 'cosmetico-local') alternarCosmeticoLocal(id as CosmeticoId);
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
      actualizarSaldo();
      mostrarPantalla('pantalla-tienda');
      if (sesion.usuario) void cargarOnline();
      else renderOffline();
    },
  };
}
