export interface Escena {
  enter(params?: unknown): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  exit(): void;
}

export class GestorEscenas {
  private escenas = new Map<string, Escena>();
  private actual: Escena | null = null;
  private actualNombre: string | null = null;

  registrar(nombre: string, escena: Escena): void {
    this.escenas.set(nombre, escena);
  }

  cambiar(nombre: string, params?: unknown): void {
    const siguiente = this.escenas.get(nombre);
    if (!siguiente) throw new Error(`Escena no registrada: ${nombre}`);
    this.actual?.exit();
    this.actual = siguiente;
    this.actualNombre = nombre;
    siguiente.enter(params);
  }

  get nombreActual(): string | null {
    return this.actualNombre;
  }

  update(dt: number): void {
    this.actual?.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.actual?.draw(ctx);
  }
}
