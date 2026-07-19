import { and, eq, isNull, sql } from 'drizzle-orm';
import { logros, logrosUsuario, perfiles } from './schema.js';

/**
 * Evaluador genérico de logros: interpreta condiciones JSONB con dos ámbitos.
 * Agregar un logro nuevo = un INSERT en seed.ts, cero código nuevo, siempre
 * que use uno de los `campo` ya soportados abajo.
 */

export type Operador = '>=' | '>' | '<=' | '<' | '==';

export interface CondicionLogro {
  ambito: 'partida' | 'total';
  campo: string;
  op: Operador;
  valor: number;
}

export interface FilaPartida {
  puntos: number;
  monedasGanadas: number;
  duracionS: number;
}

// Cualquier objeto compatible con el `tx` que entrega db.transaction(...)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ejecutor = any;

function compara(valorReal: number, op: Operador, valorObjetivo: number): boolean {
  switch (op) {
    case '>=':
      return valorReal >= valorObjetivo;
    case '>':
      return valorReal > valorObjetivo;
    case '<=':
      return valorReal <= valorObjetivo;
    case '<':
      return valorReal < valorObjetivo;
    case '==':
      return valorReal === valorObjetivo;
    default:
      return false;
  }
}

function valorCampoPartida(campo: string, partida: FilaPartida): number | null {
  switch (campo) {
    case 'puntos':
      return partida.puntos;
    case 'monedas_ganadas':
      return partida.monedasGanadas;
    case 'duracion_s':
      return partida.duracionS;
    default:
      return null;
  }
}

export async function valorCampoTotal(tx: Ejecutor, usuarioId: number, campo: string): Promise<number | null> {
  switch (campo) {
    case 'partidas_jugadas': {
      const filas = await tx.execute(
        sql`select count(*)::int as valor from partidas where usuario_id = ${usuarioId}`,
      );
      return Number(filas[0]?.valor ?? 0);
    }
    case 'cosmeticos_comprados': {
      const filas = await tx.execute(
        sql`select count(*)::int as valor
            from inventario
            join items on items.id = inventario.item_id
            where inventario.usuario_id = ${usuarioId}
              and items.tipo = 'cosmetico'
              and inventario.cantidad > 0`,
      );
      return Number(filas[0]?.valor ?? 0);
    }
    case 'estrellas_acumuladas': {
      const filas = await tx.execute(
        sql`select coalesce(sum(estrellas), 0)::int as valor from progreso_niveles where usuario_id = ${usuarioId}`,
      );
      return Number(filas[0]?.valor ?? 0);
    }
    case 'estrellas_max_nivel': {
      const filas = await tx.execute(
        sql`select coalesce(max(estrellas), 0)::int as valor from progreso_niveles where usuario_id = ${usuarioId}`,
      );
      return Number(filas[0]?.valor ?? 0);
    }
    default:
      return null;
  }
}

export interface LogroDesbloqueado {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  recompensa: number;
}

/**
 * Evalúa todos los logros activos aún no desbloqueados por el usuario contra
 * la partida recién insertada + agregados del usuario, desbloquea los que
 * cumplan condición y acredita su recompensa en `perfiles.monedas`.
 * Debe llamarse dentro de la misma transacción que insertó la partida.
 */
export async function evaluarLogrosPendientes(
  tx: Ejecutor,
  usuarioId: number,
  partida: FilaPartida,
): Promise<LogroDesbloqueado[]> {
  const candidatos = await tx
    .select({
      id: logros.id,
      codigo: logros.codigo,
      nombre: logros.nombre,
      descripcion: logros.descripcion,
      icono: logros.icono,
      condicion: logros.condicion,
      recompensa: logros.recompensa,
    })
    .from(logros)
    .leftJoin(
      logrosUsuario,
      and(eq(logrosUsuario.logroId, logros.id), eq(logrosUsuario.usuarioId, usuarioId)),
    )
    .where(and(eq(logros.activo, true), isNull(logrosUsuario.usuarioId)));

  const desbloqueados: LogroDesbloqueado[] = [];

  for (const candidato of candidatos) {
    const condicion = candidato.condicion as CondicionLogro;
    let valorReal: number | null = null;

    if (condicion.ambito === 'partida') {
      valorReal = valorCampoPartida(condicion.campo, partida);
    } else if (condicion.ambito === 'total') {
      valorReal = await valorCampoTotal(tx, usuarioId, condicion.campo);
    }

    if (valorReal === null) continue; // campo desconocido: se ignora, no rompe la evaluación.
    if (!compara(valorReal, condicion.op, condicion.valor)) continue;

    await tx.insert(logrosUsuario).values({ usuarioId, logroId: candidato.id });

    if (candidato.recompensa > 0) {
      await tx
        .update(perfiles)
        .set({ monedas: sql`${perfiles.monedas} + ${candidato.recompensa}`, actualizadoEn: sql`now()` })
        .where(eq(perfiles.usuarioId, usuarioId));
    }

    desbloqueados.push({
      id: candidato.id,
      codigo: candidato.codigo,
      nombre: candidato.nombre,
      descripcion: candidato.descripcion,
      icono: candidato.icono,
      recompensa: candidato.recompensa,
    });
  }

  return desbloqueados;
}
