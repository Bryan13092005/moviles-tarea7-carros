import type { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Estilos de texto del catálogo. Las pantallas no declaran `fontSize`:
 * usan uno de estos pasos con contraste verificado (≥4.5:1 AA).
 */
export const text = {
  /** Titular principal del hero ("Tu próximo auto, / sin rodeos."). */
  hero: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.1,
    color: colors.ink,
  },
  /** Segunda línea del hero, con tinte mineral legible sobre el fondo orgánico. */
  heroMuted: {
    color: colors.inkMuted,
    fontWeight: '700',
  },
  /** Párrafo de apoyo bajo el hero. */
  lead: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.inkBody,
  },
  /** Etiquetas contextuales breves. */
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.9,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  /** Encabezado de sección ("6 vehículos"). */
  sectionTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  /** Título de bloque compacto (identidad de la app en la barra superior). */
  barTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: colors.ink,
  },
  /** Texto del buscador. */
  search: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.ink,
  },
  /** Chips de filtro. */
  chip: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  chipActive: {
    color: colors.onInk,
    fontWeight: '600',
  },
  /** Marca en la tarjeta. */
  cardBrand: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  /** Año y metadatos de la tarjeta. */
  cardMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.inkSubtle,
  },
  /** Tipo de vehículo, título de la tarjeta. */
  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.ink,
  },
  /** "DESDE" sobre el precio. */
  priceLabel: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.inkSubtle,
    textTransform: 'uppercase',
  },
  /** Precio. */
  price: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  /** Insignia de la tarjeta ("DESTACADO" / "NUEVO"). */
  badge: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.onAccent,
  },
  /** Mensajes de estado (vacío, error, ayuda). */
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: colors.inkMuted,
  },
  /** Etiqueta de campo del formulario. */
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  /** Campo de texto del formulario. */
  input: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.ink,
  },
  /** Mensaje de error de un campo. */
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.danger,
  },
  /** Botón con etiqueta. */
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.onInk,
  },
} satisfies Record<string, TextStyle>;
