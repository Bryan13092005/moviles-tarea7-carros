import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, text } from '../theme';
import type { Carro } from '../types/carro';
import { formatearPrecio } from '../utils/formato';
import { Icon } from './Icon';

/** Insignia derivada del catálogo (no hay columna en la base de datos). */
export type Insignia = 'DESTACADO' | 'NUEVO';

type Props = {
  carro: Carro;
  insignia?: Insignia;
  /** Ancho fijo de la columna de la cuadrícula. */
  ancho: number;
  onEditar: (carro: Carro) => void;
  onAcciones: (carro: Carro) => void;
  style?: StyleProp<ViewStyle>;
};

export function CarroCard({ carro, insignia, ancho, onEditar, onAcciones, style }: Props) {
  return (
    <View style={[styles.contenedor, { width: ancho }, style]}>
      <View style={styles.tarjeta}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${carro.marca} ${carro.tipo} ${carro.anio}. Editar vehículo`}
          onPress={() => onEditar(carro)}
          style={({ pressed }) => pressed && styles.presionada}
        >
          <View style={styles.media}>
            {carro.imgURL ? (
              <Image
                source={{ uri: carro.imgURL }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={180}
                cachePolicy="memory-disk"
                accessibilityLabel={`Foto del ${carro.marca} ${carro.tipo}`}
              />
            ) : (
              <View style={styles.sinImagen}>
                <Icon ios="car.fill" android="directions_car" size={26} color={colors.inkSubtle} />
              </View>
            )}

            {insignia ? (
              <View style={styles.insignia}>
                <Text style={text.badge}>{insignia}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cuerpo}>
            <View style={styles.filaMarca}>
              <Text style={[text.cardBrand, styles.marca]} numberOfLines={1}>
                {carro.marca}
              </Text>
              <Text style={text.cardMeta}>{carro.anio}</Text>
            </View>

            <Text style={text.cardTitle} numberOfLines={1}>
              {carro.tipo}
            </Text>

            <View style={styles.divisor} />

            <View>
              <Text style={text.priceLabel}>Desde</Text>
              <Text style={text.price}>{formatearPrecio(carro.precio)}</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Acciones de ${carro.marca} ${carro.tipo}`}
          onPress={() => onAcciones(carro)}
          hitSlop={8}
          style={({ pressed }) => [styles.menu, pressed && styles.presionada]}
        >
          <Icon ios="ellipsis" android="more_horiz" size={16} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    boxShadow: shadows.card,
  },
  tarjeta: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  presionada: {
    opacity: 0.75,
  },
  media: {
    width: '100%',
    aspectRatio: 1.45,
    backgroundColor: colors.surfaceMuted,
  },
  sinImagen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insignia: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  menu: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.soft,
  },
  cuerpo: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filaMarca: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  marca: {
    flexShrink: 1,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
});
