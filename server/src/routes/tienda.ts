import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db.js';
import { inventario, items, perfiles } from '../schema.js';

const bodyItemId = z.object({ itemId: z.number().int().positive() });

/**
 * Forma que le damos al jsonb `perfiles.ajustes` para guardar qué mejoras
 * están "preparadas" para la próxima partida.
 *
 * Decisión: el schema (Fase 2) no tiene una columna `preparado` en
 * `inventario`, y las mejoras son cargas consumibles sin un slot de "equipo"
 * como los cosméticos — preparar una mejora es una preferencia de sesión del
 * jugador, no un dato de inventario. `perfiles.ajustes` ya es el jsonb libre
 * pensado para preferencias del jugador (ver routes/perfil.ts), así que
 * guardamos ahí `mejorasPreparadas: number[]` (ids de `items`). Alternativa
 * descartada: reutilizar la columna `inventario.equipado` también para
 * mejoras — funciona, pero conflate dos significados distintos bajo el mismo
 * nombre de columna (cosmético puesto vs. mejora activada), lo cual es más
 * confuso de mantener que un campo propio en `ajustes`.
 */
interface AjustesPerfil {
  mejorasPreparadas?: number[];
  [clave: string]: unknown;
}

function leerPreparadas(ajustes: unknown): Set<number> {
  const lista = (ajustes as AjustesPerfil | null)?.mejorasPreparadas;
  return new Set(Array.isArray(lista) ? lista.filter((n) => Number.isInteger(n)) : []);
}

export default async function tiendaRoutes(fastify: FastifyInstance) {
  // Requiere sesión siempre: el cliente sólo llama esta ruta estando logueado
  // (sin sesión, la tienda funciona 100% local con el catálogo embebido).
  fastify.get('/tienda', { preHandler: fastify.autenticar }, async (request, reply) => {
    const usuarioId = request.user.id;

    const catalogo = await db.select().from(items).where(eq(items.activo, true));
    const [perfil] = await db.select().from(perfiles).where(eq(perfiles.usuarioId, usuarioId));
    const inventarioUsuario = await db.select().from(inventario).where(eq(inventario.usuarioId, usuarioId));

    const porItemId = new Map(inventarioUsuario.map((i) => [i.itemId, i]));
    const preparadas = leerPreparadas(perfil?.ajustes);

    reply.send({
      monedas: perfil?.monedas ?? 0,
      items: catalogo.map((item) => {
        const poseido = porItemId.get(item.id);
        return {
          ...item,
          cantidad: poseido?.cantidad ?? 0,
          equipado: item.tipo === 'cosmetico' ? (poseido?.equipado ?? false) : false,
          preparado: item.tipo === 'mejora' ? preparadas.has(item.id) : false,
        };
      }),
    });
  });

  // Comprar un item: el servidor relee el costo desde `items` (nunca confía
  // en lo que mande el cliente) y todo el movimiento de saldo + inventario
  // ocurre en una única transacción.
  fastify.post('/tienda/comprar', { preHandler: fastify.autenticar }, async (request, reply) => {
    const parseo = bodyItemId.safeParse(request.body);
    if (!parseo.success) {
      return reply.code(400).send({ error: 'itemId inválido' });
    }
    const usuarioId = request.user.id;
    const { itemId } = parseo.data;

    try {
      const resultado = await db.transaction(async (tx) => {
        const [item] = await tx.select().from(items).where(and(eq(items.id, itemId), eq(items.activo, true)));
        if (!item) throw new Error('ITEM_NO_ENCONTRADO');

        const [poseido] = await tx
          .select()
          .from(inventario)
          .where(and(eq(inventario.usuarioId, usuarioId), eq(inventario.itemId, itemId)));

        if (item.tipo === 'cosmetico' && poseido && poseido.cantidad > 0) {
          throw new Error('YA_POSEIDO');
        }

        const [perfil] = await tx.select().from(perfiles).where(eq(perfiles.usuarioId, usuarioId));
        if (!perfil || perfil.monedas < item.costo) throw new Error('SALDO_INSUFICIENTE');

        const nuevoSaldo = perfil.monedas - item.costo;
        await tx
          .update(perfiles)
          .set({ monedas: nuevoSaldo, actualizadoEn: new Date() })
          .where(eq(perfiles.usuarioId, usuarioId));

        let filaInventario: typeof inventario.$inferSelect;
        if (poseido) {
          const [actualizado] = await tx
            .update(inventario)
            .set({
              cantidad: item.tipo === 'mejora' ? poseido.cantidad + 1 : 1,
              // Un cosmético se equipa automáticamente al comprarlo la primera vez.
              equipado: item.tipo === 'cosmetico' ? true : poseido.equipado,
            })
            .where(eq(inventario.id, poseido.id))
            .returning();
          filaInventario = actualizado;
        } else {
          const [creado] = await tx
            .insert(inventario)
            .values({
              usuarioId,
              itemId,
              cantidad: 1,
              equipado: item.tipo === 'cosmetico',
            })
            .returning();
          filaInventario = creado;
        }

        return { item, nuevoSaldo, filaInventario };
      });

      reply.send({
        monedas: resultado.nuevoSaldo,
        inventario: {
          itemId: resultado.item.id,
          tipo: resultado.item.tipo,
          cantidad: resultado.filaInventario.cantidad,
          equipado: resultado.filaInventario.equipado,
        },
      });
    } catch (err) {
      const codigo = err instanceof Error ? err.message : 'ERROR';
      if (codigo === 'ITEM_NO_ENCONTRADO') return reply.code(404).send({ error: 'Item no encontrado' });
      if (codigo === 'YA_POSEIDO') return reply.code(400).send({ error: 'Ya tienes ese cosmético' });
      if (codigo === 'SALDO_INSUFICIENTE') return reply.code(400).send({ error: 'Saldo insuficiente' });
      throw err;
    }
  });

  // Equipar/quitar un cosmético ya comprado. Sin slots exclusivos: varios
  // cosméticos pueden estar equipados a la vez (gorra + gafas + capa, etc.),
  // igual que en el juego original.
  fastify.post('/tienda/equipar', { preHandler: fastify.autenticar }, async (request, reply) => {
    const parseo = bodyItemId.safeParse(request.body);
    if (!parseo.success) {
      return reply.code(400).send({ error: 'itemId inválido' });
    }
    const usuarioId = request.user.id;
    const { itemId } = parseo.data;

    try {
      const resultado = await db.transaction(async (tx) => {
        const [item] = await tx.select().from(items).where(eq(items.id, itemId));
        if (!item || item.tipo !== 'cosmetico') throw new Error('NO_ES_COSMETICO');

        const [poseido] = await tx
          .select()
          .from(inventario)
          .where(and(eq(inventario.usuarioId, usuarioId), eq(inventario.itemId, itemId)));
        if (!poseido || poseido.cantidad <= 0) throw new Error('NO_POSEIDO');

        const [actualizado] = await tx
          .update(inventario)
          .set({ equipado: !poseido.equipado })
          .where(eq(inventario.id, poseido.id))
          .returning();

        return actualizado;
      });

      reply.send({ itemId, equipado: resultado.equipado });
    } catch (err) {
      const codigo = err instanceof Error ? err.message : 'ERROR';
      if (codigo === 'NO_ES_COSMETICO') return reply.code(400).send({ error: 'El item no es un cosmético' });
      if (codigo === 'NO_POSEIDO') return reply.code(400).send({ error: 'No posees ese cosmético' });
      throw err;
    }
  });

  // "Preparar" una mejora = activarla para la próxima partida. Ver el
  // comentario de AjustesPerfil arriba para la decisión de dónde vive este
  // estado (perfiles.ajustes.mejorasPreparadas, no inventario).
  fastify.post('/tienda/preparar', { preHandler: fastify.autenticar }, async (request, reply) => {
    const parseo = bodyItemId.safeParse(request.body);
    if (!parseo.success) {
      return reply.code(400).send({ error: 'itemId inválido' });
    }
    const usuarioId = request.user.id;
    const { itemId } = parseo.data;

    try {
      const preparada = await db.transaction(async (tx) => {
        const [item] = await tx.select().from(items).where(eq(items.id, itemId));
        if (!item || item.tipo !== 'mejora') throw new Error('NO_ES_MEJORA');

        const [poseido] = await tx
          .select()
          .from(inventario)
          .where(and(eq(inventario.usuarioId, usuarioId), eq(inventario.itemId, itemId)));
        if (!poseido || poseido.cantidad <= 0) throw new Error('SIN_CARGAS');

        const [perfil] = await tx.select().from(perfiles).where(eq(perfiles.usuarioId, usuarioId));
        const ajustesActuales = (perfil?.ajustes as AjustesPerfil | undefined) ?? {};
        const preparadas = leerPreparadas(ajustesActuales);

        let resultado: boolean;
        if (preparadas.has(itemId)) {
          preparadas.delete(itemId);
          resultado = false;
        } else {
          preparadas.add(itemId);
          resultado = true;
        }

        const nuevosAjustes: AjustesPerfil = { ...ajustesActuales, mejorasPreparadas: [...preparadas] };
        await tx
          .update(perfiles)
          .set({ ajustes: nuevosAjustes, actualizadoEn: new Date() })
          .where(eq(perfiles.usuarioId, usuarioId));

        return resultado;
      });

      reply.send({ itemId, preparada });
    } catch (err) {
      const codigo = err instanceof Error ? err.message : 'ERROR';
      if (codigo === 'NO_ES_MEJORA') return reply.code(400).send({ error: 'El item no es una mejora' });
      if (codigo === 'SIN_CARGAS') return reply.code(400).send({ error: 'No tienes cargas de esa mejora' });
      throw err;
    }
  });
}
