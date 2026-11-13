import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, EASE_IN_OUT, ENTER_FADE, EXIT_FADE, radius, spacing } from '../theme';

type Props = {
  /** Ancho de cada columna, para que el esqueleto mida igual que las tarjetas. */
  ancho: number;
  /** Filas de tarjetas a dibujar. */
  filas?: number;
};

function Bloque({ alto, ancho }: { alto: number; ancho: DimensionValue }) {
  return (
    <View
      style={{
        height: alto,
        width: ancho,
        borderRadius: 4,
        backgroundColor: colors.skeleton,
      }}
    />
  );
}

/**
 * Estado de carga del catálogo en el UI thread con Reanimated:
 * tarjetas vacías con la misma geometría que `CarroCard`, para que la cuadrícula
 * no salte al llegar los datos y el pulso siga corriendo aunque el hilo JS trabaje.
 */
export function CatalogoSkeleton({ ancho, filas = 2 }: Props) {
  const reducedMotion = useReducedMotion();
  const opacidad = useSharedValue(0.6);

  useEffect(() => {
    if (reducedMotion) {
      opacidad.set(0.8);
      return;
    }

    opacidad.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 680, easing: EASE_IN_OUT }),
          withTiming(0.52, { duration: 680, easing: EASE_IN_OUT }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(opacidad);
    };
  }, [opacidad, reducedMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacidad.get(),
  }));

  return (
    <Animated.View
      entering={ENTER_FADE}
      exiting={EXIT_FADE}
      style={{ gap: spacing.md }}
      accessibilityLabel="Cargando vehículos"
    >
      {Array.from({ length: filas }, (_, fila) => (
        <View key={fila} style={{ flexDirection: 'row', gap: spacing.md }}>
          {[0, 1].map((columna) => (
            <Animated.View
              key={columna}
              style={[
                {
                  width: ancho,
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  overflow: 'hidden',
                },
                pulseStyle,
              ]}
            >
              <View
                style={{
                  width: '100%',
                  aspectRatio: 1.45,
                  backgroundColor: colors.skeleton,
                }}
              />
              <View style={{ padding: spacing.md, gap: spacing.sm }}>
                <Bloque alto={10} ancho="45%" />
                <Bloque alto={16} ancho="70%" />
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
                <Bloque alto={18} ancho="55%" />
              </View>
            </Animated.View>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}
