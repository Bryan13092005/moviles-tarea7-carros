export interface Carro {
  id: number;
  tipo: string;
  marca: string;
  precio: number;
  anio: number;
  /** URL pública de la imagen en el bucket `carros_img`, o `null` si no tiene. */
  imgURL: string | null;
}

/** Datos necesarios para crear un carro (el id lo genera la base de datos). */
export type NuevoCarro = Omit<Carro, 'id'>;

/** Cambios parciales sobre un carro existente. */
export type ActualizarCarro = Partial<NuevoCarro>;
