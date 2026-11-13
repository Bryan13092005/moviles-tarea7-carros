import LottieView from 'lottie-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useReducedMotion,
} from 'react-native-reanimated';

import cargaAnimation from '../../assets/animaciones/carga.json';
import { colors, EASE_OUT, radius, shadows, spacing, text } from '../theme';

const ENTER_LOADER = FadeIn.duration(220)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);

const EXIT_LOADER = FadeOut.duration(240)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);

type Props = {
  /** Mantiene compatibilidad de firma con llamadas previas en el catálogo. */
  ancho?: number;
  mensaje?: string;
  detalle?: string;
};

/**
 * Estado de carga inicial del catálogo con ilustración vectorial Lottie (`carga.json`)
 * en bucle y transición de salida fluida (`FadeOut`) en el UI thread con Reanimated.
 */
export function CatalogoSkeleton({
  mensaje = 'Cargando tu garaje...',
  detalle = 'Sincronizando los vehículos verificados del catálogo.',
}: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={ENTER_LOADER}
      exiting={EXIT_LOADER}
      style={styles.contenedor}
      accessibilityRole="progressbar"
      accessibilityLabel={mensaje}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.tarjeta}>
        <View style={styles.escena}>
          <LottieView
            source={cargaAnimation}
            autoPlay={!reducedMotion}
            loop={!reducedMotion}
            resizeMode="contain"
            style={styles.lottie}
          />
        </View>

        <View style={styles.textos}>
          <Text style={styles.titulo}>{mensaje}</Text>
          <Text style={[text.body, styles.detalle]}>{detalle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radius.xxl,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
    gap: spacing.md,
  },
  escena: {
    width: 220,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  textos: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  titulo: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.ink,
    textAlign: 'center',
  },
  detalle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
