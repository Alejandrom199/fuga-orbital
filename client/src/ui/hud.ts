export function actualizarVidas(vidas: number, vidasMax: number): void {
  const cont = document.getElementById('vidas');
  if (!cont) return;
  cont.innerHTML = '';
  for (let i = 0; i < vidasMax; i++) {
    const span = document.createElement('span');
    span.className = 'corazon' + (i < vidas ? '' : ' perdido');
    span.innerHTML = '<i class="fa-solid fa-heart" aria-hidden="true"></i>';
    cont.appendChild(span);
  }
}

export function actualizarPuntuacion(puntos: number): void {
  const el = document.getElementById('puntuacion');
  if (el) el.textContent = `${puntos} pts`;
}

export function actualizarTiempo(texto: string): void {
  const el = document.getElementById('tiempo');
  if (el) el.textContent = texto;
}
