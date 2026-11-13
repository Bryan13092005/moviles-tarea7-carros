import { File } from 'expo-file-system';
import { supabase } from '../db/supabase';

const BUCKET = 'carros_img';
const MARCADOR_PUBLICO = `/storage/v1/object/public/${BUCKET}/`;

function extensionDesdeUri(uri: string, mimeType?: string | null): string {
  const sinQuery = uri.split('?')[0];
  const extension = sinQuery.split('.').pop()?.toLowerCase();

  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) return extension;

  const desdeMime = mimeType?.split('/')[1]?.toLowerCase();
  if (desdeMime && /^[a-z0-9]{2,5}$/.test(desdeMime)) return desdeMime;

  return 'jpg';
}

/**
 * Extrae la ruta del objeto dentro del bucket a partir de su URL pública.
 * Devuelve `null` si la URL no pertenece al bucket.
 */
export function pathDesdeUrlPublica(url: string): string | null {
  const indice = url.indexOf(MARCADOR_PUBLICO);
  if (indice === -1) return null;

  const path = url.slice(indice + MARCADOR_PUBLICO.length).split('?')[0];
  return path ? decodeURIComponent(path) : null;
}

/** Sube una imagen local (galería/cámara) y devuelve su URL pública. */
export async function subirImagenCarro(
  uri: string,
  mimeType?: string | null,
): Promise<string> {
  // Instancia el archivo nativo desde la URI y extrae sus bytes directamente
  const archivo = new File(uri);
  const arrayBuffer = await archivo.arrayBuffer();

  if (arrayBuffer.byteLength === 0) {
    throw new Error('La imagen seleccionada está vacía o no se pudo leer.');
  }

  const extension = extensionDesdeUri(uri, mimeType);
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(nombre, arrayBuffer, {
    contentType: mimeType ?? 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
  return data.publicUrl;
}

/** Elimina un objeto del bucket a partir de su ruta interna. */
export async function eliminarImagen(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`No se pudo eliminar la imagen: ${error.message}`);
}

/**
 * Elimina la imagen asociada a una URL pública.
 * Si la URL no pertenece al bucket, no hace nada.
 */
export async function eliminarImagenPorUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;

  const path = pathDesdeUrlPublica(url);
  if (!path) return;

  await eliminarImagen(path);
}
