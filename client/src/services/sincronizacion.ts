import { obtenerTienda } from './api';
import type { ItemTienda } from './api';
import { guardarPerfil } from './storage';
import type { MejoraId, CosmeticoId } from '../data/config';
import type { ContextoJuego } from '../core/contexto';

/**
 * Con sesión activa, el servidor es dueño de monedas/inventario/equipo. Esto
 * trae ese estado real y lo escribe sobre `contexto.perfil` (mismo objeto
 * que ya lee toda la UI y el motor de juego — `scenes/juego.ts` usa
 * `perfil.equipados`/`perfil.seleccion` sin saber si vino de local o del
 * servidor), así que un sólo punto de sincronización alcanza para que todo
 * el juego quede al día: menú, tienda y la partida en sí.
 *
 * Se llama al arrancar con sesión ya activa, justo tras loguearse/registrarse,
 * y cada vez que se abre la tienda. No lanza: si falla, `perfil` se queda
 * como estaba (offline-first) y el llamador decide si avisa algo.
 */
export async function sincronizarPerfilDesdeServidor(contexto: ContextoJuego): Promise<ItemTienda[] | null> {
  const resultado = await obtenerTienda();
  if (!resultado.ok) return null;

  const { perfil } = contexto;
  perfil.monedas = resultado.datos.monedas;

  for (const item of resultado.datos.items) {
    if (item.tipo === 'mejora' && item.codigo in perfil.inventario) {
      const id = item.codigo as MejoraId;
      perfil.inventario[id] = item.cantidad;
      perfil.seleccion[id] = item.preparado;
    } else if (item.tipo === 'cosmetico' && item.codigo in perfil.cosmeticos) {
      const id = item.codigo as CosmeticoId;
      perfil.cosmeticos[id] = item.cantidad > 0;
      perfil.equipados[id] = item.equipado;
    }
  }

  guardarPerfil(perfil);
  return resultado.datos.items;
}
