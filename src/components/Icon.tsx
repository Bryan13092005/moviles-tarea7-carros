import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

type Props = {
  /** SF Symbol (iOS). */
  ios: SFSymbol;
  /** Material Symbol (Android y web): expo-symbols no dibuja SF Symbols fuera de iOS. */
  android: AndroidSymbol;
  color: string;
  size?: number;
};

/**
 * Icono multiplataforma: SF Symbols en iOS y Material Symbols en Android/web.
 * Se usa `expo-symbols` (ya instalado) en lugar de `@expo/vector-icons`.
 */
export function Icon({ ios, android, color, size = 20 }: Props) {
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
