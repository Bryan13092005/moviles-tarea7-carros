/**
 * Paleta del catálogo.
 *
 * El diseño es un catálogo claro de vehículos, así que los valores son fijos
 * (no semánticos del sistema): si se usaran colores que se adaptan al modo
 * oscuro, la tarjeta blanca y el texto tinta se romperían en dark mode.
 */
export const colors = {
  /** Fondo de la pantalla. */
  background: '#F4F5F3',
  /** Lavado verdoso del hero (extremo superior del degradado). */
  heroWash: '#EDF2E9',
  /** Superficie de tarjetas, buscador y chips. */
  surface: '#FFFFFF',
  /** Superficie neutra para huecos de imagen y placeholders. */
  surfaceMuted: '#E9EBE6',

  /** Texto principal. */
  ink: '#101010',
  /** Texto secundario con peso (títulos de tarjeta). */
  inkSoft: '#2C2E2C',
  /** Párrafos largos sobre el fondo claro. */
  inkBody: '#41443F',
  /** Texto de apoyo. */
  inkMuted: '#6C6F6C',
  /** Etiquetas, metadatos y texto terciario. */
  inkSubtle: '#8B8F8B',

  /** Bordes de chips y contenedores. */
  border: '#E3E5E0',
  /** Línea divisoria interna de la tarjeta. */
  divider: '#ECEDE9',

  /** Verde lima de la insignia ("DESTACADO" / "NUEVO"). */
  accent: '#C9F44D',
  /** Verde de acento para iconografía decorativa (destello del hero). */
  accentInk: '#87B01F',
  /** Texto sobre `accent`. */
  onAccent: '#101010',
  /** Texto sobre superficies tinta (botón "Todos", botón de orden). */
  onInk: '#FFFFFF',

  /** Acciones destructivas. */
  danger: '#C0392B',

  /** Bloques de carga. */
  skeleton: '#E5E7E1',
} as const;
