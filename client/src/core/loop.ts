/** rAF con dt en segundos, acotado a 0.033s (~30fps mínimo) para evitar saltos
 * grandes de física tras un frame largo (cambio de pestaña, hitch, etc.). */
export function iniciarLoop(callback: (dt: number) => void): void {
  let lastT = performance.now();
  function loop(now: number): void {
    const dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;
    callback(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
