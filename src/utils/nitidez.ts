import { Buffer } from 'buffer';
import { ImageManipulator, SaveFormat, type ImageResult } from 'expo-image-manipulator';
import { decode } from 'jpeg-js';

/**
 * Detección de desenfoque por "varianza del laplaciano".
 *
 * La imagen se reduce a 640 px de ancho, se convierte a escala de grises y se
 * le aplica el kernel laplaciano (4 vecinos). Una imagen nítida tiene bordes
 * fuertes y por lo tanto una varianza alta; una imagen borrosa tiene
 * transiciones suaves y una varianza baja.
 *
 * Por qué 640 px: el desenfoque real de cámara (10-30 px en la foto original)
 * desaparece casi por completo al reducir a 320 px (queda en 1-2 px), así que
 * una foto claramente borrosa puntuaba casi como una nítida (16 vs 25). A
 * 640 px el desenfoque se conserva y la separación es mucho mayor.
 *
 * IMPORTANTE: antes del laplaciano se aplica un suavizado 3x3 (dos pasadas).
 * Sin él, el ruido del sensor domina la métrica: para ruido gaussiano de
 * desviación σ, el laplaciano crudo mide ~20·σ², así que una foto nocturna
 * totalmente desenfocada puntuaba ~2000 y se clasificaba como nítida.
 * El filtro elimina ese ruido de alta frecuencia y conserva los bordes reales.
 *
 * La puntuación no es la varianza de toda la imagen, sino la de la mejor
 * región de 64x64. Una foto nítida siempre tiene alguna zona con detalle
 * (matrícula, faro, llanta); promediar toda la imagen diluye ese detalle en
 * fondos lisos y hacía que una foto buena puntuara bajo.
 *
 * Es una heurística: escenas con muy poco detalle (paredes lisas, niebla)
 * también producen varianza baja. El umbral es ajustable por parámetro.
 */
export const ANCHO_ANALISIS = 640;

/** Varianza mínima (tras suavizar) para considerar la imagen nítida. */
export const UMBRAL_NITIDEZ = 35;

/** Lado de la región que se usa para medir el detalle local. */
export const TAMANO_REGION = 64;

/** Desplazamiento entre regiones (se solapan para no perder detalles). */
export const PASO_REGION = 32;

export type ResultadoNitidez = {
  esBorrosa: boolean;
  /** Varianza del laplaciano. Cuanto más alta, más nítida. */
  puntuacion: number;
  umbral: number;
  ancho: number;
  alto: number;
};

function convertirAGrises(data: Uint8Array, pixeles: number): Float32Array {
  const grises = new Float32Array(pixeles);

  for (let i = 0, p = 0; i < pixeles; i++, p += 4) {
    grises[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  return grises;
}

/** Dos pasadas de un box blur 3x3 separable: elimina ruido y conserva bordes. */
function suavizar(grises: Float32Array, ancho: number, alto: number): Float32Array {
  let actual = grises;

  for (let pasada = 0; pasada < 2; pasada++) {
    const horizontal = new Float32Array(actual.length);

    for (let y = 0; y < alto; y++) {
      const fila = y * ancho;
      for (let x = 0; x < ancho; x++) {
        const izquierda = actual[fila + (x > 0 ? x - 1 : x)];
        const centro = actual[fila + x];
        const derecha = actual[fila + (x < ancho - 1 ? x + 1 : x)];
        horizontal[fila + x] = (izquierda + centro + derecha) / 3;
      }
    }

    const vertical = new Float32Array(actual.length);

    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const i = y * ancho + x;
        const arriba = horizontal[(y > 0 ? y - 1 : y) * ancho + x];
        const centro = horizontal[i];
        const abajo = horizontal[(y < alto - 1 ? y + 1 : y) * ancho + x];
        vertical[i] = (arriba + centro + abajo) / 3;
      }
    }

    actual = vertical;
  }

  return actual;
}

/** Calcula una sola vez el mapa del laplaciano (4 vecinos) de la imagen suavizada. */
function mapaLaplaciano(grises: Float32Array, ancho: number, alto: number): Float32Array {
  const laplacianos = new Float32Array(ancho * alto);

  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;

      laplacianos[i] =
        4 * grises[i] - grises[i - 1] - grises[i + 1] - grises[i - ancho] - grises[i + ancho];
    }
  }

  return laplacianos;
}

/** Varianza del laplaciano dentro de una región (ignorando el borde laplaciano). */
function varianzaRegion(
  laplacianos: Float32Array,
  ancho: number,
  alto: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let suma = 0;
  let sumaCuadrados = 0;
  let total = 0;

  const desdeX = Math.max(1, x0);
  const hastaX = Math.min(ancho - 1, x1);
  const desdeY = Math.max(1, y0);
  const hastaY = Math.min(alto - 1, y1);

  for (let y = desdeY; y < hastaY; y++) {
    const fila = y * ancho;

    for (let x = desdeX; x < hastaX; x++) {
      const laplaciano = laplacianos[fila + x];
      suma += laplaciano;
      sumaCuadrados += laplaciano * laplaciano;
      total++;
    }
  }

  if (total === 0) return 0;

  const media = suma / total;
  return Math.max(0, sumaCuadrados / total - media * media);
}

/**
 * Puntuación final: la varianza de la mejor región de 64x64. Si la imagen es
 * más pequeña que una región, se usa la varianza global.
 */
function puntuacionNitidez(grises: Float32Array, ancho: number, alto: number): number {
  const laplacianos = mapaLaplaciano(grises, ancho, alto);

  if (ancho < TAMANO_REGION || alto < TAMANO_REGION) {
    return varianzaRegion(laplacianos, ancho, alto, 0, 0, ancho, alto);
  }

  let mejor = 0;

  for (let y = 0; y + TAMANO_REGION <= alto; y += PASO_REGION) {
    for (let x = 0; x + TAMANO_REGION <= ancho; x += PASO_REGION) {
      const puntuacion = varianzaRegion(
        laplacianos,
        ancho,
        alto,
        x,
        y,
        x + TAMANO_REGION,
        y + TAMANO_REGION,
      );

      if (puntuacion > mejor) mejor = puntuacion;
    }
  }

  return mejor;
}

async function generarAnalizable(
  uri: string,
  width: number,
  height: number | null,
): Promise<ImageResult> {
  const contexto = ImageManipulator.manipulate(uri);
  contexto.resize({ width, height });

  const imagen = await contexto.renderAsync();

  try {
    return await imagen.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.85,
      base64: true,
    });
  } finally {
    imagen.release();
    contexto.release();
  }
}

/**
 * Analiza una imagen local y determina si está borrosa.
 * @param uri URI local (galería o cámara).
 * @param umbral Varianza mínima para aceptar la imagen.
 */
export async function analizarNitidez(
  uri: string,
  umbral: number = UMBRAL_NITIDEZ,
): Promise<ResultadoNitidez> {
  let guardada = await generarAnalizable(uri, ANCHO_ANALISIS, null);

  // Salvaguarda: si la plataforma ignoró el alto nulo y no redimensionó,
  // se repite con dimensiones explícitas para que la escala sea predecible.
  if (guardada.width > ANCHO_ANALISIS) {
    const proporcion = guardada.height / guardada.width;
    guardada = await generarAnalizable(
      uri,
      ANCHO_ANALISIS,
      Math.max(1, Math.round(ANCHO_ANALISIS * proporcion)),
    );
  }

  if (!guardada.base64) {
    throw new Error('No se pudo leer la imagen para analizarla.');
  }

  const bytes = Buffer.from(guardada.base64, 'base64');
  const { data, width, height } = decode(bytes, {
    useTArray: true,
    formatAsRGBA: true,
  });

  if (width < 3 || height < 3) {
    throw new Error('La imagen es demasiado pequeña para analizarla.');
  }

  const grises = convertirAGrises(data, width * height);
  const suavizada = suavizar(grises, width, height);
  const puntuacion = puntuacionNitidez(suavizada, width, height);

  return {
    esBorrosa: puntuacion < umbral,
    puntuacion,
    umbral,
    ancho: width,
    alto: height,
  };
}
