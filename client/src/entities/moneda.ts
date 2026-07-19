export interface TipoMoneda {
  valor: number;
  peso: number;
  r: number;
  claro: string;
  medio: string;
  oscuro: string;
  rim: string;
  brillo: string;
}

export interface Moneda {
  x: number;
  y: number;
  tipo: TipoMoneda;
  fase: number;
  tomada: boolean;
}
