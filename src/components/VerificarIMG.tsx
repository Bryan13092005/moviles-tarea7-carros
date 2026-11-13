import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { analizarNitidez, UMBRAL_NITIDEZ, type ResultadoNitidez } from '../utils/nitidez';

type Estado = 'analizando' | 'nitida' | 'borrosa' | 'error';

type Props = {
  /** URI local de la imagen recién tomada o seleccionada. */
  uri: string;
  /** Varianza mínima del laplaciano para aceptar la imagen. */
  umbral?: number;
  /** Se invoca al terminar cada análisis (nítida o borrosa). */
  onResultado?: (resultado: ResultadoNitidez) => void;
  /** Se invoca si el análisis no se pudo completar. */
  onError?: (mensaje: string) => void;
};

export function VerificarIMG({ uri, umbral = UMBRAL_NITIDEZ, onResultado, onError }: Props) {
  const [estado, setEstado] = useState<Estado>('analizando');
  const [resultado, setResultado] = useState<ResultadoNitidez | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  // Se guardan en refs para no reiniciar el análisis en cada render del padre.
  const onResultadoRef = useRef(onResultado);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onResultadoRef.current = onResultado;
    onErrorRef.current = onError;
  }, [onResultado, onError]);

  useEffect(() => {
    let activo = true;

    setEstado('analizando');
    setResultado(null);
    setMensajeError(null);

    analizarNitidez(uri, umbral)
      .then((r) => {
        if (!activo) return;
        setResultado(r);
        setEstado(r.esBorrosa ? 'borrosa' : 'nitida');
        onResultadoRef.current?.(r);
      })
      .catch((e: unknown) => {
        if (!activo) return;
        const mensaje = e instanceof Error ? e.message : 'No se pudo analizar la imagen.';
        setMensajeError(mensaje);
        setEstado('error');
        onErrorRef.current?.(mensaje);
      });

    return () => {
      activo = false;
    };
  }, [uri, umbral, intento]);

  return (
    <View style={styles.contenedor}>
      <View style={styles.preview}>
        <Image source={{ uri }} style={styles.imagen} contentFit="cover" />

        {estado === 'analizando' ? (
          <View style={styles.overlay}>
            <ActivityIndicator />
            <Text style={styles.textoOverlay}>Analizando nitidez...</Text>
          </View>
        ) : null}
      </View>

      {estado === 'nitida' && resultado ? (
        <View style={[styles.estado, styles.estadoOk]}>
          <Text style={styles.textoOk}>Imagen nítida</Text>
          <Text style={styles.textoDetalle}>Nitidez: {Math.round(resultado.puntuacion)}</Text>
        </View>
      ) : null}

      {estado === 'borrosa' && resultado ? (
        <View style={[styles.estado, styles.estadoError]}>
          <Text style={styles.textoError}>
            Imagen borrosa: no se puede subir. Toma otra foto con mejor luz y sin mover el
            teléfono.
          </Text>
          <Text style={styles.textoDetalle}>
            Nitidez: {Math.round(resultado.puntuacion)} (mínimo {Math.round(resultado.umbral)})
          </Text>
        </View>
      ) : null}

      {estado === 'error' ? (
        <View style={[styles.estado, styles.estadoAviso]}>
          <Text style={styles.textoAviso}>No se pudo verificar la nitidez: {mensajeError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIntento((n) => n + 1)}
            style={({ pressed }) => [styles.botonReintentar, pressed && styles.pressed]}
          >
            <Text style={styles.textoReintentar}>Reintentar análisis</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 8,
  },
  preview: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#eeeeee',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  textoOverlay: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  estado: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  estadoOk: {
    backgroundColor: '#eaf7ee',
    borderColor: '#a8d5b5',
  },
  estadoError: {
    backgroundColor: '#fff0f0',
    borderColor: '#f2b8bd',
  },
  estadoAviso: {
    backgroundColor: '#fff8e5',
    borderColor: '#e8d49a',
  },
  textoOk: {
    color: '#1a6b3c',
    fontWeight: '600',
    fontSize: 14,
  },
  textoError: {
    color: '#d1242f',
    fontWeight: '600',
    fontSize: 14,
  },
  textoAviso: {
    color: '#7a5b00',
    fontSize: 14,
  },
  textoDetalle: {
    color: '#666666',
    fontSize: 12,
  },
  botonReintentar: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4c4c4',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textoReintentar: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
});
