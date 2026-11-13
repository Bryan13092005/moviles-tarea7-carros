import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors, EASE_IN_OUT, EASE_OUT } from '../theme';

type Props = {
  /**
   * 'hero' dibuja la composición completa de la pantalla principal.
   * 'header' dibuja una franja superior compacta para la barra de navegación de `_layout`.
   */
  variant?: 'hero' | 'header';
};

/**
 * Fondo artístico superior con ondas orgánicas, manchas difuminadas (`RadialGradient`)
 * y líneas aerodinámicas en `react-native-svg`, adaptado dinámicamente al ancho
 * de ventana (`useWindowDimensions`) y al área segura (`useSafeAreaInsets`).
 *
 * Incluye entrada fluida y respiración ambiental en el UI thread con Reanimated.
 */
export function HeroBackdrop({ variant = 'hero' }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const canvasWidth = Math.max(320, width);
  const canvasHeight = variant === 'hero' ? insets.top + 410 : insets.top + 68;

  // Entrada inicial suave + deriva ambiental en dos capas independientes (UI thread).
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const driftA = useSharedValue(0);
  const driftB = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      entrance.set(1);
      driftA.set(0);
      driftB.set(0);
      return;
    }

    entrance.set(withTiming(1, { duration: 620, easing: EASE_OUT }));

    driftA.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4400, easing: EASE_IN_OUT }),
          withTiming(-1, { duration: 4400, easing: EASE_IN_OUT }),
        ),
        -1,
        true,
      ),
    );

    driftB.set(
      withRepeat(
        withSequence(
          withTiming(-1, { duration: 5200, easing: EASE_IN_OUT }),
          withTiming(1, { duration: 5200, easing: EASE_IN_OUT }),
        ),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(entrance);
      cancelAnimation(driftA);
      cancelAnimation(driftB);
    };
  }, [driftA, driftB, entrance, reducedMotion]);

  const containerEntranceStyle = useAnimatedStyle(() => {
    const p = entrance.get();
    return {
      opacity: p,
      transform: [{ translateY: (1 - p) * -10 }, { scale: 0.97 + p * 0.03 }],
    };
  });

  const auraLayerStyle = useAnimatedStyle(() => {
    const a = driftA.get();
    return {
      transform: [
        { translateX: a * 12 },
        { translateY: a * -6 },
        { scale: 1 + a * 0.03 },
      ],
    };
  });

  const waveLayerStyle = useAnimatedStyle(() => {
    const b = driftB.get();
    return {
      transform: [
        { translateX: b * -9 },
        { translateY: b * 5 },
        { scale: 1.02 - b * 0.015 },
      ],
    };
  });

  const w = canvasWidth;
  const h = canvasHeight;

  // Coordenadas proporcionales al ancho y alto reales del dispositivo.
  const wavePrimary = [
    `M ${-w * 0.12} ${h * 0.18}`,
    `C ${w * 0.22} ${h * 0.02}, ${w * 0.54} ${h * 0.36}, ${w * 1.12} ${h * 0.14}`,
    `L ${w * 1.12} ${h * 0.72}`,
    `C ${w * 0.74} ${h * 0.88}, ${w * 0.32} ${h * 0.54}, ${-w * 0.12} ${h * 0.76}`,
    'Z',
  ].join(' ');

  const waveSecondary = [
    `M ${-w * 0.1} ${h * 0.42}`,
    `C ${w * 0.28} ${h * 0.26}, ${w * 0.68} ${h * 0.62}, ${w * 1.12} ${h * 0.38}`,
    `L ${w * 1.12} ${h * 0.94}`,
    `C ${w * 0.66} ${h * 1.02}, ${w * 0.26} ${h * 0.78}, ${-w * 0.1} ${h * 0.92}`,
    'Z',
  ].join(' ');

  const contourTop = [
    `M ${-w * 0.06} ${h * 0.26}`,
    `C ${w * 0.28} ${h * 0.08}, ${w * 0.62} ${h * 0.42}, ${w * 1.06} ${h * 0.2}`,
  ].join(' ');

  const contourBottom = [
    `M ${-w * 0.06} ${h * 0.52}`,
    `C ${w * 0.34} ${h * 0.34}, ${w * 0.7} ${h * 0.66}, ${w * 1.06} ${h * 0.44}`,
  ].join(' ');

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        { height: canvasHeight },
        variant === 'header' && styles.headerWrapper,
        containerEntranceStyle,
      ]}
    >
      {/* Capa base con transición vertical continua hacia colors.background */}
      <Svg width={w} height={h} style={styles.layer}>
        <Defs>
          <SvgLinearGradient id="baseWash" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.heroSky} stopOpacity="0.95" />
            <Stop offset="58%" stopColor={colors.heroWash} stopOpacity="0.72" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#baseWash)" />
      </Svg>

      {/* Capa 1: Manchas orgánicas difuminadas (auras radiales lima y salvia) */}
      <Animated.View style={[styles.layer, auraLayerStyle]}>
        <Svg width={w} height={h}>
          <Defs>
            <RadialGradient id="limeOrb" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={colors.heroGlow} stopOpacity="0.52" />
              <Stop offset="48%" stopColor={colors.heroGlow} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={colors.heroGlow} stopOpacity="0" />
            </RadialGradient>

            <RadialGradient id="sageOrb" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={colors.heroMist} stopOpacity="0.75" />
              <Stop offset="55%" stopColor={colors.heroSky} stopOpacity="0.32" />
              <Stop offset="100%" stopColor={colors.heroSky} stopOpacity="0" />
            </RadialGradient>

            <RadialGradient id="warmOrb" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.68" />
              <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.18" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Ellipse
            cx={w * 0.84}
            cy={insets.top + (variant === 'hero' ? 68 : 18)}
            rx={w * 0.46}
            ry={variant === 'hero' ? 148 : 56}
            fill="url(#limeOrb)"
          />
          <Ellipse
            cx={w * 0.16}
            cy={insets.top + (variant === 'hero' ? 124 : 28)}
            rx={w * 0.52}
            ry={variant === 'hero' ? 164 : 62}
            fill="url(#sageOrb)"
          />
          {variant === 'hero' ? (
            <Circle cx={w * 0.48} cy={h * 0.46} r={w * 0.38} fill="url(#warmOrb)" />
          ) : null}
        </Svg>
      </Animated.View>

      {/* Capa 2: Ondas orgánicas fluidas y trazos aerodinámicos */}
      <Animated.View style={[styles.layer, waveLayerStyle]}>
        <Svg width={w} height={h}>
          <Defs>
            <SvgLinearGradient id="waveFillPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.heroSky} stopOpacity="0.62" />
              <Stop offset="52%" stopColor={colors.heroGlow} stopOpacity="0.26" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0.05" />
            </SvgLinearGradient>

            <SvgLinearGradient id="waveFillSecondary" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.58" />
              <Stop offset="60%" stopColor={colors.heroSand} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          <Path d={wavePrimary} fill="url(#waveFillPrimary)" />
          <Path d={waveSecondary} fill="url(#waveFillSecondary)" />

          <Path
            d={contourTop}
            stroke={colors.heroContour}
            strokeWidth={1.25}
            fill="none"
          />
          {variant === 'hero' ? (
            <Path
              d={contourBottom}
              stroke="rgba(255, 255, 255, 0.65)"
              strokeWidth={1.5}
              fill="none"
            />
          ) : null}
        </Svg>
      </Animated.View>

      {variant === 'header' ? <View style={styles.headerDivider} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  headerWrapper: {
    bottom: 0,
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.heroBorder,
  },
});
