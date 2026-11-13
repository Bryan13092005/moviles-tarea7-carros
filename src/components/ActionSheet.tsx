import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  colors,
  EASE_OUT,
  ENTER_DOWN_FAST,
  EXIT_UP,
  radius,
  shadows,
  spacing,
  text,
  triggerHaptic,
} from '../theme';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

const SHEET_TRAVEL = 420;

/** Proyección de desaceleración exponencial de Apple (animate-expo RECIPES.md). */
function project(velocity: number, decelerationRate = 0.998): number {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistencia elástica al arrastrar por encima del tope superior. */
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export type SheetOption = {
  id: string;
  label: string;
  description?: string;
  ios: SFSymbol;
  android: AndroidSymbol;
  active?: boolean;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Cabecera opcional (ej. resumen visual del vehículo seleccionado). */
  header?: ReactNode;
  /** Contenido personalizado opcional (ej. confirmación de borrado). */
  children?: ReactNode;
  options?: SheetOption[];
  cancelLabel?: string;
  onClose: () => void;
};

/**
 * Hoja de acciones y filtros con estética editorial del catálogo, animada en el
 * UI thread con `Gesture.Pan()`, proyección de inercia (`project`), resistencia
 * `rubberband` y feedback háptico (`expo-haptics`).
 */
export function ActionSheet({
  visible,
  eyebrow,
  title,
  subtitle,
  header,
  children,
  options,
  cancelLabel = 'Cancelar',
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);

  const translateY = useSharedValue(SHEET_TRAVEL);
  const context = useSharedValue(0);

  const finishClose = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const animateClose = useCallback(
    (velocity = 0) => {
      if (reducedMotion) {
        translateY.set(withTiming(SHEET_TRAVEL, { duration: 150, easing: EASE_OUT }, (done) => {
          if (done) scheduleOnRN(finishClose);
        }));
        return;
      }

      translateY.set(
        withSpring(
          SHEET_TRAVEL,
          {
            duration: 260,
            dampingRatio: 1,
            velocity,
            overshootClamping: true,
            reduceMotion: ReduceMotion.System,
          },
          (done) => {
            if (done) scheduleOnRN(finishClose);
          },
        ),
      );
    },
    [finishClose, reducedMotion, translateY],
  );

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      translateY.set(reducedMotion ? 0 : SHEET_TRAVEL);
      if (!reducedMotion) {
        translateY.set(
          withSpring(0, {
            duration: 300,
            dampingRatio: 0.86,
            reduceMotion: ReduceMotion.System,
          }),
        );
      }
    } else if (mounted) {
      animateClose();
    }
  }, [animateClose, mounted, reducedMotion, translateY, visible]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onStart(() => {
          context.set(translateY.get());
        })
        .onUpdate((e) => {
          const next = context.get() + e.translationY;
          translateY.set(next >= 0 ? next : rubberband(next, SHEET_TRAVEL));
        })
        .onEnd((e) => {
          const projected = translateY.get() + project(e.velocityY);
          if (projected > SHEET_TRAVEL * 0.32) {
            scheduleOnRN(triggerHaptic, 'selection');
            translateY.set(
              withSpring(
                SHEET_TRAVEL,
                {
                  duration: 260,
                  dampingRatio: 1,
                  velocity: e.velocityY,
                  overshootClamping: true,
                  reduceMotion: ReduceMotion.System,
                },
                (finished) => {
                  if (finished) scheduleOnRN(finishClose);
                },
              ),
            );
          } else {
            translateY.set(
              withSpring(0, {
                duration: 300,
                dampingRatio: 0.8,
                velocity: e.velocityY,
                reduceMotion: ReduceMotion.System,
              }),
            );
            scheduleOnRN(triggerHaptic, 'light');
          }
        }),
    [context, finishClose, translateY],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, SHEET_TRAVEL], [1, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => animateClose()}
    >
      <GestureHandlerRootView style={styles.raiz}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            style={StyleSheet.absoluteFill}
            onPress={() => {
              triggerHaptic('selection');
              animateClose();
            }}
          />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              styles.hoja,
              { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
              sheetStyle,
            ]}
          >
            <View style={styles.indicadorArrastreContenedor}>
              <View style={styles.indicadorArrastre} />
            </View>

            {header ? <View style={styles.cabeceraExtra}>{header}</View> : null}

            <View style={styles.encabezado}>
              {eyebrow ? <Text style={text.eyebrow}>{eyebrow}</Text> : null}
              <Text style={text.sectionTitle}>{title}</Text>
              {subtitle ? <Text style={styles.subtitulo}>{subtitle}</Text> : null}
            </View>

            {children ? (
              <Animated.View entering={ENTER_DOWN_FAST} exiting={EXIT_UP}>
                {children}
              </Animated.View>
            ) : null}

            {options && options.length > 0 ? (
              <Animated.View entering={ENTER_DOWN_FAST} exiting={EXIT_UP} style={styles.lista}>
                {options.map((op) => {
                  const esDestructiva = Boolean(op.destructive);
                  const esActiva = Boolean(op.active);

                  return (
                    <PressableScale
                      key={op.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: esActiva }}
                      onPress={op.onPress}
                      scaleTo={0.98}
                      haptic={esDestructiva ? 'warning' : 'selection'}
                      contentStyle={[
                        styles.opcion,
                        esActiva && styles.opcionActiva,
                        esDestructiva && styles.opcionDestructiva,
                      ]}
                    >
                      <View
                        style={[
                          styles.iconoContenedor,
                          esActiva && styles.iconoActivo,
                          esDestructiva && styles.iconoDestructivo,
                        ]}
                      >
                        <Icon
                          ios={op.ios}
                          android={op.android}
                          size={19}
                          color={
                            esDestructiva
                              ? colors.danger
                              : esActiva
                                ? colors.onAccent
                                : colors.ink
                          }
                        />
                      </View>

                      <View style={styles.opcionTextos}>
                        <Text
                          style={[
                            styles.opcionTitulo,
                            esDestructiva && styles.opcionTituloDestructivo,
                          ]}
                        >
                          {op.label}
                        </Text>
                        {op.description ? (
                          <Text
                            style={[
                              styles.opcionDescripcion,
                              esDestructiva && styles.opcionDescripcionDestructiva,
                            ]}
                          >
                            {op.description}
                          </Text>
                        ) : null}
                      </View>

                      {esActiva ? (
                        <View style={styles.checkPildora}>
                          <Icon ios="checkmark" android="check" size={14} color={colors.onInk} />
                        </View>
                      ) : (
                        <Icon
                          ios="chevron.right"
                          android="chevron_right"
                          size={16}
                          color={esDestructiva ? colors.danger : colors.inkSubtle}
                        />
                      )}
                    </PressableScale>
                  );
                })}
              </Animated.View>
            ) : null}

            {!children ? (
              <PressableScale
                accessibilityRole="button"
                onPress={() => animateClose()}
                scaleTo={0.98}
                haptic="selection"
                contentStyle={styles.botonCancelar}
              >
                <Text style={styles.textoCancelar}>{cancelLabel}</Text>
              </PressableScale>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(16, 16, 16, 0.42)',
  },
  hoja: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.floating,
    gap: spacing.md,
  },
  indicadorArrastreContenedor: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  indicadorArrastre: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  cabeceraExtra: {
    marginTop: spacing.xxs,
  },
  encabezado: {
    gap: spacing.xxs,
  },
  subtitulo: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  lista: {
    gap: spacing.sm,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opcionActiva: {
    backgroundColor: colors.heroWash,
    borderColor: colors.ink,
  },
  opcionDestructiva: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
  },
  iconoContenedor: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActivo: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  iconoDestructivo: {
    backgroundColor: colors.surface,
    borderColor: colors.dangerBorder,
  },
  opcionTextos: {
    flex: 1,
    gap: 2,
  },
  opcionTitulo: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  opcionTituloDestructivo: {
    color: colors.danger,
  },
  opcionDescripcion: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.inkMuted,
  },
  opcionDescripcionDestructiva: {
    color: colors.danger,
    opacity: 0.85,
  },
  checkPildora: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCancelar: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCancelar: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
  },
});
