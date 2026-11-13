import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  colors,
  EASE_IN_OUT,
  ENTER_DOWN_FAST,
  ENTER_FADE,
  EXIT_FADE,
  EXIT_UP,
  LAYOUT_SPRING,
  radius,
  spacing,
  triggerHaptic,
} from '../theme';
import { analizarNitidez, UMBRAL_NITIDEZ, type ResultadoNitidez } from '../utils/nitidez';
import { PressableScale } from './PressableScale';

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

  const reducedMotion = useReducedMotion();
  const pulso = useSharedValue(1);

  // Se guardan en refs para no reiniciar el análisis en cada render del padre.
  const onResultadoRef = useRef(onResultado);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onResultadoRef.current = onResultado;
    onErrorRef.current = onError;
  }, [onResultado, onError]);

  useEffect(() => {
    if (estado !== 'analizando' || reducedMotion) {
      pulso.set(1);
      return;
    }

    pulso.set(
      withRepeat(
        withSequence(
          withTiming(0.96, { duration: 520, easing: EASE_IN_OUT }),
          withTiming(1, { duration: 520, easing: EASE_IN_OUT }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(pulso);
    };
  }, [estado, pulso, reducedMotion]);

  const badgePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulso.get() }],
  }));

  useEffect(() => {
    let activo = true;

    // Reinicio intencional del análisis al cambiar la URI.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado('analizando');
    setResultado(null);
    setMensajeError(null);

    analizarNitidez(uri, umbral)
      .then((r) => {
        if (!activo) return;
        setResultado(r);
        setEstado(r.esBorrosa ? 'borrosa' : 'nitida');
        triggerHaptic(r.esBorrosa ? 'warning' : 'success');
        onResultadoRef.current?.(r);
      })
      .catch((e: unknown) => {
        if (!activo) return;
        const mensaje = e instanceof Error ? e.message : 'No se pudo analizar la imagen.';
        setMensajeError(mensaje);
        setEstado('error');
        triggerHaptic('error');
        onErrorRef.current?.(mensaje);
      });

    return () => {
      activo = false;
    };
  }, [uri, umbral, intento]);

  return (
    <Animated.View layout={LAYOUT_SPRING} style={styles.contenedor}>
      <View style={styles.preview}>
        <Image source={{ uri }} style={styles.imagen} contentFit="cover" transition={180} />

        {estado === 'analizando' ? (
          <Animated.View entering={ENTER_FADE} exiting={EXIT_FADE} style={styles.overlay}>
            <Animated.View style={[styles.pildoraCarga, badgePulseStyle]}>
              <ActivityIndicator color={colors.ink} />
              <Text style={styles.textoOverlay}>Analizando nitidez...</Text>
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>

      {estado === 'nitida' && resultado ? (
        <Animated.View
          entering={ENTER_DOWN_FAST}
          exiting={EXIT_UP}
          style={[styles.estado, styles.estadoOk]}
        >
          <Text style={styles.textoOk}>Imagen nítida</Text>
          <Text style={styles.textoDetalle}>Nitidez: {Math.round(resultado.puntuacion)}</Text>
        </Animated.View>
      ) : null}

      {estado === 'borrosa' && resultado ? (
        <Animated.View
          entering={ENTER_DOWN_FAST}
          exiting={EXIT_UP}
          style={[styles.estado, styles.estadoError]}
        >
          <Text style={styles.textoError}>
            Imagen borrosa: no se puede subir. Toma otra foto con mejor luz y sin mover el
            teléfono.
          </Text>
          <Text style={styles.textoDetalle}>
            Nitidez: {Math.round(resultado.puntuacion)} (mínimo {Math.round(resultado.umbral)})
          </Text>
        </Animated.View>
      ) : null}

      {estado === 'error' ? (
        <Animated.View
          entering={ENTER_DOWN_FAST}
          exiting={EXIT_UP}
          style={[styles.estado, styles.estadoAviso]}
        >
          <Text style={styles.textoAviso}>No se pudo verificar la nitidez: {mensajeError}</Text>
          <PressableScale
            accessibilityRole="button"
            onPress={() => setIntento((n) => n + 1)}
            haptic="selection"
            style={styles.botonReintentarContenedor}
            contentStyle={styles.botonReintentar}
          >
            <Text style={styles.textoReintentar}>Reintentar análisis</Text>
          </PressableScale>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.sm,
  },
  preview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceMuted,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  pildoraCarga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textoOverlay: {
    fontSize: 14,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  estado: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: spacing.md,
    gap: 2,
  },
  estadoOk: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  estadoError: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  estadoAviso: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
  },
  textoOk: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 14,
  },
  textoError: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  textoAviso: {
    color: colors.warning,
    fontSize: 14,
  },
  textoDetalle: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  botonReintentarContenedor: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  botonReintentar: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  textoReintentar: {
    color: colors.inkSoft,
    fontWeight: '600',
    fontSize: 13,
  },
});
