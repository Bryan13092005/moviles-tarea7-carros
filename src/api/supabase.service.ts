import { supabase } from '../db/supabase';
import { eliminarImagenPorUrl } from './storage.service';
import type { ActualizarCarro, Carro, NuevoCarro } from '../types/carro';

export type { ActualizarCarro, Carro, NuevoCarro };

const TABLA = 'carros';

/**
 * Forma en la que PostgREST puede devolver una fila: los campos `numeric`
 * llegan como string en algunas configuraciones, así que se normalizan.
 */
type CarroRow = {
  id: number | string;
  tipo: string;
  marca: string;
  precio: number | string;
  anio: number | string;
  imgURL?: string | null;
};

function normalizarCarro(row: CarroRow): Carro {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    marca: row.marca,
    precio: Number(row.precio),
    anio: Number(row.anio),
    imgURL: row.imgURL ?? null,
  };
}

function lanzarError(accion: string, error: { message: string }): never {
  throw new Error(`No se pudo ${accion}: ${error.message}`);
}

/** Borra una imagen sin romper la operación principal si el archivo ya no existe. */
async function borrarImagenSilenciosa(url: string | null | undefined): Promise<void> {
  if (!url) return;

  try {
    await eliminarImagenPorUrl(url);
  } catch (error) {
    console.warn('No se pudo borrar la imagen del carro:', error);
  }
}

/** READ: un carro por id. */
async function obtenerCarroPorId(id: number): Promise<Carro> {
  const { data, error } = await supabase
    .from(TABLA)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) lanzarError(`obtener el carro con id ${id}`, error);
  if (!data) throw new Error(`No existe un carro con id ${id}.`);

  return normalizarCarro(data as CarroRow);
}

export const carrosService = {
  /** READ: todos los carros, del más reciente al más antiguo. */
  async getAll(): Promise<Carro[]> {
    const { data, error } = await supabase
      .from(TABLA)
      .select('*')
      .order('id', { ascending: false });

    if (error) lanzarError('obtener los carros', error);

    return ((data ?? []) as CarroRow[]).map(normalizarCarro);
  },

  getById: obtenerCarroPorId,

  /** CREATE: inserta un carro y devuelve la fila creada. */
  async create(carro: NuevoCarro): Promise<Carro> {
    const { data, error } = await supabase
      .from(TABLA)
      .insert([carro])
      .select()
      .single();

    if (error) lanzarError('crear el carro', error);
    if (!data) throw new Error('No se pudo crear el carro: la base de datos no devolvió datos.');

    return normalizarCarro(data as CarroRow);
  },

  /** UPDATE: actualiza un carro y devuelve la fila resultante. */
  async update(id: number, cambios: ActualizarCarro): Promise<Carro> {
    // Se lee la imagen anterior para no dejar archivos huérfanos en el bucket.
    const actual = await obtenerCarroPorId(id);

    const { data, error } = await supabase
      .from(TABLA)
      .update(cambios)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) lanzarError(`actualizar el carro con id ${id}`, error);
    if (!data) throw new Error(`No existe un carro con id ${id}.`);

    const actualizado = normalizarCarro(data as CarroRow);

    if (actual.imgURL && actual.imgURL !== actualizado.imgURL) {
      await borrarImagenSilenciosa(actual.imgURL);
    }

    return actualizado;
  },

  /** DELETE: elimina el carro y su imagen del bucket. */
  async remove(id: number): Promise<void> {
    const actual = await obtenerCarroPorId(id);

    const { error } = await supabase.from(TABLA).delete().eq('id', id);
    if (error) lanzarError(`eliminar el carro con id ${id}`, error);

    await borrarImagenSilenciosa(actual.imgURL);
  },
};
