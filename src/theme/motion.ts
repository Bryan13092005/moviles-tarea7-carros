import * as Haptics from 'expo-haptics';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

const ES_NATIVO = process.env.EXPO_OS !== 'web';

/**
 * Curvas de tiempo para animaciones sin gesto directo (animate-expo).
 * Nunca se usa ease-in en elementos de interfaz.
 */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

/**
 * Configuraciones de resorte de Apple (duration + dampingRatio) ejecutadas en el UI thread.
 */
export const SPRING_PRESS_IN = {
  duration: 120,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
} as const;

export const SPRING_PRESS_OUT = {
  duration: 220,
  dampingRatio: 0.8,
  reduceMotion: ReduceMotion.System,
} as const;

export const SPRING_SETTLE = {
  duration: 350,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
} as const;

export const SPRING_SNAP = {
  duration: 320,
  dampingRatio: 0.8,
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * Constructores de Layout Animations en ámbito de módulo para no recrearlos en cada render.
 */
export const ENTER_FADE = FadeIn.duration(180).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
export const EXIT_FADE = FadeOut.duration(140).easing(EASE_OUT).reduceMotion(ReduceMotion.System);

export const ENTER_DOWN_FAST = FadeInDown.duration(220)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
export const ENTER_DOWN = FadeInDown.duration(260)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
export const EXIT_DOWN = FadeOutDown.duration(200)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
export const EXIT_UP = FadeOutUp.duration(180)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);

export const LAYOUT_SPRING = LinearTransition.springify()
  .dampingRatio(0.9)
  .duration(260)
  .reduceMotion(ReduceMotion.System);

/** Entrada escalonada para bloques estáticos de pantalla (nunca filas recicladas de FlatList). */
export function enterStagger(index: number, baseDelay = 35) {
  return FadeInDown.duration(250)
    .delay(index * baseDelay)
    .easing(EASE_OUT)
    .reduceMotion(ReduceMotion.System);
}

export type HapticKind = 'none' | 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

/**
 * Feedback háptico seguro en cualquier plataforma. Se dispara en el mismo frame
 * de la interacción visual y una sola vez por acción del usuario.
 */
export function triggerHaptic(kind: HapticKind = 'light'): void {
  if (!ES_NATIVO || kind === 'none') return;

  switch (kind) {
    case 'selection':
      void Haptics.selectionAsync().catch(() => undefined);
      break;
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      break;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => undefined,
      );
      break;
    case 'error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      break;
  }
}
