import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { AccessibilityRole, AccessibilityState, Insets, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  SPRING_PRESS_IN,
  SPRING_PRESS_OUT,
  triggerHaptic,
  type HapticKind,
} from '../theme/motion';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Escala objetivo al presionar (0.97 por defecto para botones, 0.98 para tarjetas). */
  scaleTo?: number;
  /** Tipo de feedback háptico al presionar o hacer commit. */
  haptic?: HapticKind;
  /** Momento del disparo háptico: al tocar ('pressIn') o al confirmar ('press'). */
  hapticOn?: 'pressIn' | 'press';
  hitSlop?: number | Insets;
  pressRetentionOffset?: number | Insets;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Botón/contenedor táctil animado en el UI thread con `withSpring` y `expo-haptics`.
 * - Feedback visual inmediato en `onPressIn` y liberación elástica en `onPressOut`.
 * - Usa `.get()` / `.set()` para compatibilidad con React Compiler.
 * - Respeta `useReducedMotion()` atenuando únicamente la opacidad si el usuario
 *   activó reducir movimiento en el sistema.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.97,
  haptic = 'light',
  hapticOn = 'press',
  hitSlop = 8,
  pressRetentionOffset = 16,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  style,
  contentStyle,
}: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  function handlePressIn() {
    if (disabled) return;
    if (!reducedMotion) {
      scale.set(withSpring(scaleTo, SPRING_PRESS_IN));
    }
    opacity.set(withSpring(0.9, SPRING_PRESS_IN));

    if (hapticOn === 'pressIn') {
      triggerHaptic(haptic);
    }
  }

  function handlePressOut() {
    scale.set(withSpring(1, SPRING_PRESS_OUT));
    opacity.set(withSpring(1, SPRING_PRESS_OUT));
  }

  function handlePress() {
    if (disabled) return;
    if (hapticOn === 'press') {
      triggerHaptic(haptic);
    }
    onPress?.();
  }

  function handleLongPress() {
    if (disabled || !onLongPress) return;
    triggerHaptic('medium');
    onLongPress();
  }

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState ?? (disabled ? { disabled: true } : undefined)}
      disabled={disabled}
      hitSlop={hitSlop}
      pressRetentionOffset={pressRetentionOffset}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      style={style}
    >
      <Animated.View style={[contentStyle, disabled && { opacity: 0.55 }, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
