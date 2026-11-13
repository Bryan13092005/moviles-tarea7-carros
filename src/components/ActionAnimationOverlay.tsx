import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import carroDeleteAnimation from '../../assets/animaciones/carroDelete.json';
import crearCarroAnimation from '../../assets/animaciones/crearCarro.json';
import editarCarroAnimation from '../../assets/animaciones/editarCarro.json';
import { colors, EASE_OUT, radius, shadows, spacing } from '../theme';

export type ActionAnimationVariant = 'crear' | 'editar' | 'eliminar';

type ConfigVariante = {
  source:
    | typeof crearCarroAnimation
    | typeof editarCarroAnimation
    | typeof carroDeleteAnimation;
  badge: string;
  title: string;
  subtitle: string;
  fallbackMs: number;
  aspectRatio: number;
  tone: 'success' | 'danger';
};

const VARIANTES: Record<ActionAnimationVariant, ConfigVariante> = {
  crear: {
    source: crearCarroAnimation,
    badge: 'Registro completado',
    title: 'Vehículo agregado',
    subtitle: 'El nuevo auto ya está disponible en tu garaje.',
    fallbackMs: 1850,
    aspectRatio: 400 / 225,
    tone: 'success',
  },
  editar: {
    source: editarCarroAnimation,
    badge: 'Actualización exitosa',
    title: 'Cambios guardados',
    subtitle: 'La ficha del vehículo se actualizó correctamente.',
    fallbackMs: 2650,
    aspectRatio: 240 / 160,
    tone: 'success',
  },
  eliminar: {
    source: carroDeleteAnimation,
    badge: 'Baja completada',
    title: 'Vehículo eliminado',
    subtitle: 'La unidad se retiró del catálogo de forma permanente.',
    fallbackMs: 2150,
    aspectRatio: 1,
    tone: 'danger',
  },
};

type Props = {
  visible: boolean;
  variant: ActionAnimationVariant;
  title?: string;
  subtitle?: string;
  /** Tiempo máximo de respaldo en ms por si `onAnimationFinish` no dispara. */
  fallbackMs?: number;
  onFinish: () => void;
};

/**
 * Overlay reutilizable para celebrar o confirmar la creación, edición o
 * eliminación de un vehículo en Supabase.
 *
 * - Anima su entrada en el UI thread con `withSpring` (desde `scale: 0.92` y
 *   `translateY: 14`, nunca `scale(0)`).
 * - Dispara `Haptics.notificationAsync(NotificationFeedbackType.Success)` en el
 *   mismo frame de aparición.
 * - Cierra al terminar el Lottie (`onAnimationFinish`) con un timeout de
 *   seguridad para garantizar que nunca bloquee la pantalla.
 */
export function ActionAnimationOverlay({
  visible,
  variant,
  title,
  subtitle,
  fallbackMs,
  onFinish,
}: Props) {
  const reducedMotion = useReducedMotion();
  const finalizadoRef = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const config = VARIANTES[variant];
  const tituloFinal = title ?? config.title;
  const subtituloFinal = subtitle ?? config.subtitle;
  const tiempoRespaldo = fallbackMs ?? config.fallbackMs;
  const esPeligro = config.tone === 'danger';

  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardTranslateY = useSharedValue(14);
  const cardOpacity = useSharedValue(0);

  const dispararSalida = useCallback(() => {
    if (finalizadoRef.current) return;
    finalizadoRef.current = true;

    const notificarFin = () => {
      onFinishRef.current();
    };

    backdropOpacity.set(withTiming(0, { duration: 150, easing: EASE_OUT }));
    cardScale.set(withTiming(0.96, { duration: 150, easing: EASE_OUT }));
    cardOpacity.set(
      withTiming(0, { duration: 150, easing: EASE_OUT }, (done) => {
        if (done) scheduleOnRN(notificarFin);
      }),
    );
  }, [backdropOpacity, cardOpacity, cardScale]);

  useEffect(() => {
    if (!visible) {
      finalizadoRef.current = false;
      return;
    }

    finalizadoRef.current = false;

    if (process.env.EXPO_OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    }

    backdropOpacity.set(withTiming(1, { duration: 180, easing: EASE_OUT }));
    cardOpacity.set(withTiming(1, { duration: 180, easing: EASE_OUT }));
    cardScale.set(
      withSpring(1, {
        duration: 340,
        dampingRatio: 0.82,
        reduceMotion: ReduceMotion.System,
      }),
    );
    cardTranslateY.set(
      withSpring(0, {
        duration: 340,
        dampingRatio: 0.85,
        reduceMotion: ReduceMotion.System,
      }),
    );

    const espera = reducedMotion ? 650 : tiempoRespaldo;
    const timer = setTimeout(() => {
      dispararSalida();
    }, espera);

    return () => {
      clearTimeout(timer);
    };
  }, [
    backdropOpacity,
    cardOpacity,
    cardScale,
    cardTranslateY,
    dispararSalida,
    reducedMotion,
    tiempoRespaldo,
    visible,
  ]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.get(),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.get(),
    transform: [{ translateY: cardTranslateY.get() }, { scale: cardScale.get() }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.raiz} accessibilityLiveRegion="assertive">
        <Animated.View style={[styles.backdrop, backdropStyle]} />

        <Animated.View style={[styles.tarjeta, cardStyle]}>
          <View
            style={[
              styles.escenaContenedor,
              esPeligro && styles.escenaContenedorPeligro,
            ]}
          >
            <LottieView
              source={config.source}
              autoPlay
              loop={false}
              resizeMode="contain"
              style={[styles.lottie, { aspectRatio: config.aspectRatio }]}
              onAnimationFinish={(isCancelled) => {
                if (!isCancelled) {
                  dispararSalida();
                }
              }}
            />
          </View>

          <View
            style={[
              styles.pildoraEstado,
              esPeligro ? styles.pildoraPeligro : styles.pildoraExito,
            ]}
          >
            <View
              style={[
                styles.puntoEstado,
                esPeligro ? styles.puntoPeligro : styles.puntoExito,
              ]}
            />
            <Text
              style={[
                styles.textoPildora,
                esPeligro ? styles.textoPildoraPeligro : styles.textoPildoraExito,
              ]}
            >
              {config.badge}
            </Text>
          </View>

          <View style={styles.textos}>
            <Text style={styles.titulo}>{tituloFinal}</Text>
            <Text style={styles.subtitulo}>{subtituloFinal}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(16, 18, 16, 0.48)',
  },
  tarjeta: {
    width: '100%',
    maxWidth: 330,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl + 4,
    borderRadius: radius.xxl,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.heroBorder,
    boxShadow: shadows.floating,
    gap: spacing.md,
  },
  escenaContenedor: {
    width: '100%',
    height: 136,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: colors.heroWash,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  escenaContenedorPeligro: {
    backgroundColor: colors.dangerSoft,
  },
  lottie: {
    height: 116,
  },
  pildoraEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pildoraExito: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successBorder,
  },
  pildoraPeligro: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  puntoExito: {
    backgroundColor: colors.success,
  },
  puntoPeligro: {
    backgroundColor: colors.danger,
  },
  textoPildora: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  textoPildoraExito: {
    color: colors.success,
  },
  textoPildoraPeligro: {
    color: colors.danger,
  },
  textos: {
    alignItems: 'center',
    gap: spacing.xxs + 2,
  },
  titulo: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
    textAlign: 'center',
    maxWidth: 250,
  },
});
