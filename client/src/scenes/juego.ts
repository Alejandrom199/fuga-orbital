import { crearJugador, saltar as saltarJugador } from '../entities/jugador';
import type { EstadoMundo } from '../entities/mundo';
import { reiniciarMundo, actualizarSpawns, mulberry32 } from '../systems/spawner';
import { actualizarJugador, actualizarEnemigos, actualizarMonedas } from '../systems/colisiones';
import type { CausaMuerte } from '../systems/colisiones';
import { actualizarDificultad, puntuacionTotal } from '../systems/dificultad';
import { actualizarTextosFlotantes, actualizarShake } from '../systems/particulas';
import { dibujarFondo } from '../render/fondo';
import { dibujarVagones } from '../render/tren';
import { dibujarMonedas } from '../render/monedas';
import { dibujarEnemigos } from '../render/enemigos';
import { dibujarTextos } from '../render/textos';
import { dibujarPersonaje } from '../render/personaje';
import { formatearTiempo } from '../render/util';
import { actualizarVidas, actualizarPuntuacion, actualizarTiempo } from '../ui/hud';
import { mostrarPantalla } from '../ui/pantallas';
import { guardarPerfil, guardarMejorPuntuacion } from '../services/storage';
import { enviarPartida } from '../services/api';
import type { DatosPartida } from '../services/api';
import { mostrarToast } from '../ui/toast';
import { MEJORAS, BONUS_VIDAS, BONUS_SALTO, VIDAS_BASE } from '../data/config';
import type { MejoraId, PresetJuego } from '../data/config';
import { configurarInput } from '../core/input';
import type { Escena } from '../core/scene-manager';
import type { ContextoJuego } from '../core/contexto';
import { crearPantallaPausa } from './pausa';
import { crearPantallaGameOver } from './game-over';

type EstadoPartida = 'jugando' | 'pausa' | 'gameover';

export interface EscenaJuego extends Escena {
  /** Pausa sólo si hay una partida en curso; a diferencia de alternarPausa()
   * nunca reanuda (se usa cuando el dispositivo gira a vertical). */
  pausarPorRotacion(): void;
}

/** Parámetros que recibe `gestor.cambiar('juego', params)` para jugar un
 * nivel en vez de endless (Fase 5): mismo motor, sólo cambia el preset y
 * cómo se reporta la partida al terminar. Sin params = endless (por defecto). */
export interface ParametrosNivel {
  nivelId: number;
  preset: PresetJuego;
}

function esParametrosNivel(params: unknown): params is ParametrosNivel {
  return !!params && typeof params === 'object' && 'nivelId' in params && 'preset' in params;
}

function crearEstadoInicial(preset: PresetJuego, trainBaseY: number): EstadoMundo {
  return {
    cameraX: 0,
    worldSpeed: preset.baseSpeed,
    tiempoJugado: 0,
    monedasScore: 0,
    distanciaAcc: 0,
    plataformas: [],
    monedas: [],
    enemigos: [],
    textosFlotantes: [],
    nextSpawnX: 0,
    ultimoTopY: trainBaseY,
    shakeTimer: 0,
    vidas: 0,
    player: crearJugador(preset, trainBaseY),
    // Trazado determinista (Fase 5): PRNG sembrado si el preset trae
    // `semilla` (niveles); `Math.random` normal en endless.
    rng: preset.semilla !== undefined ? mulberry32(preset.semilla) : Math.random,
  };
}

export function crearEscenaJuego(contexto: ContextoJuego): EscenaJuego {
  const { perfil, registro, gestor, canvas, sesion } = contexto;

  // Preset activo de la partida en curso: `contexto.preset` (endless) por
  // defecto, o el del nivel recibido en `enter(params)`. `nivelActivo` es el
  // id de nivel cuando corresponde reportar `modo:'nivel'` al terminar.
  let presetActivo: PresetJuego = contexto.preset;
  let nivelActivo: number | null = null;

  let estadoPartida: EstadoPartida = 'gameover';
  let mundo: EstadoMundo = crearEstadoInicial(presetActivo, 0);
  let efectosActivos: Record<MejoraId, boolean> = { vidas: false, iman: false, salto: false, multiplicador: false };

  function vidasMax(): number {
    return VIDAS_BASE + (efectosActivos.vidas ? BONUS_VIDAS : 0);
  }

  function actualizarHUDVidas(): void {
    actualizarVidas(mundo.vidas, vidasMax());
  }

  function finalizarPartida(): number {
    const total = puntuacionTotal(mundo);
    if (total > registro.mejorPuntuacion) {
      registro.mejorPuntuacion = total;
      guardarMejorPuntuacion(total);
    }
    if (mundo.monedasScore > 0) {
      perfil.monedas += mundo.monedasScore;
      guardarPerfil(perfil);
    }
    sincronizarPartidaConServidor(total);
    return total;
  }

  // Sincronización Fase 3: sólo si hay sesión activa, y siempre en segundo
  // plano — nunca bloquea el game-over ni afecta el guardado local, que
  // sigue siendo la fuente de verdad (offline-first). `enviarPartida` nunca
  // rechaza (ver services/api.ts), así que no hace falta atrapar errores aquí.
  //
  // Fase 5: si la partida fue de un nivel (`nivelActivo` no nulo) se reporta
  // `modo:'nivel'` + `nivelId` en vez de `modo:'endless'`; el servidor
  // evalúa el objetivo y devuelve estrellas/completado. Fase 6: la misma
  // respuesta trae `logrosDesbloqueados[]`, evaluado en la misma transacción
  // que insertó la partida.
  //
  // Decisión de diseño (toast vs. texto en game-over): se complementan, no
  // se reemplaza uno por el otro. `mostrarResultadoNivel` sigue escribiendo
  // el texto en la pantalla de game-over (detallado, queda visible mientras
  // esa pantalla lo esté) y AQUÍ se dispara además un toast global — porque
  // esta respuesta llega en segundo plano y, para cuando lo hace, el
  // jugador puede ya haber salido de game-over (reintentó o volvió al
  // menú); el toast es lo único garantizado de verse pase lo que pase.
  function sincronizarPartidaConServidor(total: number): void {
    if (!sesion.usuario) return;
    const datos: DatosPartida =
      nivelActivo !== null
        ? {
            modo: 'nivel',
            nivelId: nivelActivo,
            puntos: total,
            monedasGanadas: mundo.monedasScore,
            duracionS: Math.max(1, Math.round(mundo.tiempoJugado)),
            mejorasUsadas: efectosActivos,
          }
        : {
            modo: 'endless',
            puntos: total,
            monedasGanadas: mundo.monedasScore,
            duracionS: Math.max(1, Math.round(mundo.tiempoJugado)),
            mejorasUsadas: efectosActivos,
          };
    void enviarPartida(datos).then((resultado) => {
      if (!resultado.ok) return;

      if (resultado.datos.nivelCompletado) {
        pantallaGameOver.mostrarResultadoNivel(resultado.datos.nivelCompletado);
        if (resultado.datos.nivelCompletado.completado) {
          mostrarToast({ icono: '🚀', texto: '¡Nivel completado!', tipo: 'nivel' });
        }
      }

      for (const logro of resultado.datos.logrosDesbloqueados) {
        mostrarToast({ icono: logro.icono, texto: `Logro desbloqueado: ${logro.nombre}`, tipo: 'logro' });
      }
    });
  }

  function gameOver(causa: CausaMuerte): void {
    estadoPartida = 'gameover';
    const total = finalizarPartida();
    pantallaGameOver.mostrar({
      causa,
      puntuacion: total,
      tiempoJugado: mundo.tiempoJugado,
      mejorPuntuacion: registro.mejorPuntuacion,
    });
  }

  function perderVida(causa: CausaMuerte): void {
    if (mundo.player.invulnTimer > 0 || estadoPartida !== 'jugando') return;
    mundo.vidas--;
    mundo.shakeTimer = 0.3;
    actualizarHUDVidas();

    if (mundo.vidas <= 0) {
      gameOver(causa);
      return;
    }

    // Reubicar al jugador sobre la plataforma más cercana por delante de la cámara
    let destino = mundo.plataformas.find((p) => p.x2 > mundo.cameraX + 40) ?? null;
    if (!destino) destino = mundo.plataformas[mundo.plataformas.length - 1] ?? null;
    if (!destino) return;

    const objetivoX = Math.max(destino.x1 + 40, mundo.cameraX + presetActivo.playerScreenX);
    mundo.player.worldX = Math.min(objetivoX, destino.x2 - 40);
    mundo.player.y = destino.topY - presetActivo.playerH / 2;
    mundo.player.vy = 0;
    mundo.player.grounded = true;
    mundo.player.jumpsRemaining = presetActivo.maxJumps;
    mundo.player.hitStunTimer = 0;
    mundo.player.invulnTimer = presetActivo.invulnTime;
  }

  // Convierte lo preparado en la tienda en efectos de la partida: gasta una
  // carga de inventario por cada mejora preparada y la deja lista para usarse.
  function consumirMejorasPreparadas(): void {
    efectosActivos = { vidas: false, iman: false, salto: false, multiplicador: false };
    let huboConsumo = false;
    for (const id of Object.keys(MEJORAS) as MejoraId[]) {
      if (perfil.seleccion[id] && perfil.inventario[id] > 0) {
        perfil.inventario[id]--;
        perfil.seleccion[id] = false;
        efectosActivos[id] = true;
        huboConsumo = true;
      }
    }
    if (huboConsumo) guardarPerfil(perfil);
  }

  function iniciarPartida(): void {
    consumirMejorasPreparadas();
    const { W, trainBaseY } = contexto.obtenerDimensiones();
    mundo = crearEstadoInicial(presetActivo, trainBaseY);
    mundo.vidas = vidasMax();
    actualizarHUDVidas();
    reiniciarMundo(mundo, presetActivo, W, trainBaseY);
    estadoPartida = 'jugando';
    mostrarPantalla(null);
  }

  function volverAlMenuPrincipal(): void {
    if (estadoPartida === 'jugando' || estadoPartida === 'pausa') finalizarPartida();
    gestor.cambiar('menu');
  }

  function alternarPausa(): void {
    if (estadoPartida === 'jugando') {
      estadoPartida = 'pausa';
      pantallaPausa.mostrar();
    } else if (estadoPartida === 'pausa') {
      estadoPartida = 'jugando';
      pantallaPausa.ocultar();
    }
  }

  function saltar(): void {
    if (estadoPartida !== 'jugando') return;
    const boost = efectosActivos.salto ? BONUS_SALTO : 0;
    saltarJugador(mundo.player, presetActivo, boost);
  }

  const pantallaPausa = crearPantallaPausa(alternarPausa, volverAlMenuPrincipal);
  const pantallaGameOver = crearPantallaGameOver(() => iniciarPartida(), volverAlMenuPrincipal);

  configurarInput(canvas, { onSaltar: saltar, onPausa: alternarPausa });

  // El botón visual de pausa del HUD (imprescindible en móvil, sin teclado
  // para el atajo P/Esc que ya cubre configurarInput).
  document.getElementById('btn-pausa')?.addEventListener('click', alternarPausa);

  function dibujarJugadorEnPantalla(ctx: CanvasRenderingContext2D): void {
    const player = mundo.player;
    const sx = player.worldX - mundo.cameraX;
    const parpadeo = player.invulnTimer > 0 && Math.floor(mundo.tiempoJugado * 14) % 2 === 0;
    if (parpadeo) return;
    ctx.save();
    ctx.translate(sx, player.y + presetActivo.playerH / 2);
    ctx.scale(2 - player.squash, player.squash);
    dibujarPersonaje(ctx, presetActivo.playerW, presetActivo.playerH, {
      t: mundo.tiempoJugado,
      grounded: player.grounded,
      faseCarrera: player.worldX * 0.05,
      equipados: perfil.equipados,
    });
    ctx.restore();
  }

  return {
    enter(params?: unknown): void {
      // Fase 5: `gestor.cambiar('juego', { nivelId, preset })` desde
      // `scenes/seleccion-niveles.ts` juega ese nivel con el mismo motor;
      // sin params (p. ej. `btn-jugar` del menú) es el endless de siempre.
      if (esParametrosNivel(params)) {
        presetActivo = params.preset;
        nivelActivo = params.nivelId;
      } else {
        presetActivo = contexto.preset;
        nivelActivo = null;
      }
      iniciarPartida();
    },

    update(dt: number): void {
      if (estadoPartida !== 'jugando') return;
      const { W, trainBaseY } = contexto.obtenerDimensiones();

      mundo.tiempoJugado += dt;
      actualizarDificultad(mundo, dt, presetActivo);
      actualizarSpawns(mundo, presetActivo, W, trainBaseY);
      actualizarJugador(mundo, dt, presetActivo, trainBaseY, perderVida);
      if (estadoPartida !== 'jugando') return;
      actualizarEnemigos(mundo, dt, presetActivo, perderVida);
      actualizarMonedas(mundo, efectosActivos);
      actualizarTextosFlotantes(mundo, dt);
      actualizarShake(mundo, dt);

      actualizarPuntuacion(puntuacionTotal(mundo));
      actualizarTiempo(formatearTiempo(mundo.tiempoJugado));
    },

    draw(ctx: CanvasRenderingContext2D): void {
      const { W, H } = contexto.obtenerDimensiones();
      ctx.save();
      if (mundo.shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 10 * mundo.shakeTimer, (Math.random() - 0.5) * 10 * mundo.shakeTimer);
      }
      dibujarFondo({ ctx, W, H, cameraX: mundo.cameraX, tiempoJugado: mundo.tiempoJugado });
      dibujarVagones(ctx, mundo.plataformas, mundo.cameraX, W, presetActivo, mundo.tiempoJugado);
      dibujarMonedas(ctx, mundo.monedas, mundo.cameraX, W, mundo.tiempoJugado);
      dibujarEnemigos(ctx, mundo.enemigos, mundo.cameraX, W, mundo.tiempoJugado);
      dibujarJugadorEnPantalla(ctx);
      dibujarTextos(ctx, mundo.textosFlotantes, mundo.cameraX);
      ctx.restore();
    },

    exit(): void {},

    pausarPorRotacion(): void {
      if (estadoPartida === 'jugando') {
        estadoPartida = 'pausa';
        pantallaPausa.mostrar();
      }
    },
  };
}
