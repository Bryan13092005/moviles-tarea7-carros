import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { DimensionValue } from 'react-native';

import { colors, radius, spacing } from '../theme';

/** `useNativeDriver` no existe en web: ahí la animación cae a JS sin ruido en consola. */
const USAR_DRIVER_NATIVO = process.env.EXPO_OS !== 'web';

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
 * Estado de carga del catálogo: tarjetas vacías con la misma geometría que
 * `CarroCard`, para que la cuadrícula no salte al llegar los datos.
 */
export function CatalogoSkeleton({ ancho, filas = 2 }: Props) {
  const [opacidad] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const pulso = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, {
          toValue: 1,
          duration: 700,
          useNativeDriver: USAR_DRIVER_NATIVO,
        }),
        Animated.timing(opacidad, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: USAR_DRIVER_NATIVO,
        }),
      ]),
    );

    pulso.start();
    return () => pulso.stop();
  }, [opacidad]);

  return (
    <View style={{ gap: spacing.md }} accessibilityLabel="Cargando vehículos">
      {Array.from({ length: filas }, (_, fila) => (
        <View key={fila} style={{ flexDirection: 'row', gap: spacing.md }}>
          {[0, 1].map((columna) => (
            <Animated.View
              key={columna}
              style={{
                width: ancho,
                opacity: opacidad,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                overflow: 'hidden',
              }}
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
    </View>
  );
}
