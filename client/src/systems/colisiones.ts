import { actualizarPatrulla } from '../entities/enemigo';
import { plataformaEn } from './spawner';
import { BONUS_IMAN, MULT_MONEDAS_ACTIVO } from '../data/config';
import type { PresetJuego, MejoraId } from '../data/config';
import type { EstadoMundo } from '../entities/mundo';

export type CausaMuerte = 'enemigo' | 'vacio' | 'camara';

/** Física del jugador (auto-run + knockback, gravedad, aterrizaje) y las
 * condiciones de muerte por vacío o por quedar fuera de cámara. */
export function actualizarJugador(
  estado: EstadoMundo,
  dt: number,
  preset: PresetJuego,
  trainBaseY: number,
  perderVida: (causa: CausaMuerte) => void,
): void {
  const player = estado.player;

  let vx = estado.worldSpeed;
  if (player.hitStunTimer > 0) {
    if (player.hitStunTimer > preset.hitStunTime - preset.hitKnockbackTime) {
      vx = -preset.knockbackSpeed;
    } else {
      vx = 0;
    }
    player.hitStunTimer -= dt;
  }
  player.worldX += vx * dt;

  player.vy += preset.gravity * dt;
  player.y += player.vy * dt;

  const plat = plataformaEn(estado.plataformas, player.worldX);
  const pies = player.y + preset.playerH / 2;
  if (plat && player.vy >= 0 && pies >= plat.topY && pies <= plat.topY + preset.landingTolerance) {
    player.y = plat.topY - preset.playerH / 2;
    player.vy = 0;
    if (!player.grounded) player.squash = 0.8;
    player.grounded = true;
    player.jumpsRemaining = preset.maxJumps;
  } else {
    player.grounded = false;
  }

  player.squash += (1 - player.squash) * Math.min(1, dt * 10);

  if (player.invulnTimer > 0) player.invulnTimer -= dt;

  if (pies > trainBaseY + preset.voidMargin) {
    perderVida('vacio');
    return;
  }

  const screenX = player.worldX - estado.cameraX;
  if (screenX < -preset.playerW) {
    perderVida('camara');
  }
}

export function actualizarEnemigos(
  estado: EstadoMundo,
  dt: number,
  preset: PresetJuego,
  perderVida: (causa: CausaMuerte) => void,
): void {
  const player = estado.player;
  for (const en of estado.enemigos) {
    actualizarPatrulla(en, dt);

    if (player.invulnTimer <= 0) {
      const dx = Math.abs(player.worldX - en.x);
      const dy = Math.abs(player.y - en.y);
      if (dx < (preset.playerW + en.def.w) * 0.36 && dy < (preset.playerH + en.def.h) * 0.36) {
        player.hitStunTimer = preset.hitStunTime;
        perderVida('enemigo');
      }
    }
  }
}

export function actualizarMonedas(
  estado: EstadoMundo,
  efectosActivos: Record<MejoraId, boolean>,
): void {
  const player = estado.player;
  const bonus = efectosActivos.iman ? BONUS_IMAN : 0;
  const multiplicador = efectosActivos.multiplicador ? MULT_MONEDAS_ACTIVO : 1;
  for (const m of estado.monedas) {
    if (m.tomada) continue;
    const dx = Math.abs(player.worldX - m.x);
    const dy = Math.abs(player.y - m.y);
    if (dx < 46 + bonus && dy < 50 + bonus * 0.8) {
      m.tomada = true;
      const valor = Math.round(m.tipo.valor * multiplicador);
      estado.monedasScore += valor;
      estado.textosFlotantes.push({ x: m.x, y: m.y, texto: `+${valor}`, vida: 0.8 });
    }
  }
  estado.monedas = estado.monedas.filter((m) => !m.tomada);
}
