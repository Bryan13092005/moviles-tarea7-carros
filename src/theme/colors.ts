/**
 * Paleta del catálogo.
 *
 * El diseño es un catálogo claro de vehículos, así que los valores son fijos
 * (no semánticos del sistema): si se usaran colores que se adaptan al modo
 * oscuro, la tarjeta blanca y el texto tinta se romperían en dark mode.
 *
 * Todos los grises de texto están calibrados para cumplir AA (≥4.5:1) sobre
 * `surface` (blanco) y sobre `background` (#F4F5F3):
 *   inkMuted  #575B57 → 6.08:1 sobre heroWash, 5.85:1 sobre surface
 *   inkSubtle #6B6F6B → 5.11:1 sobre surface,  4.67:1 sobre background
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
  /** Texto de apoyo (metadatos, etiquetas, iconos). */
  inkMuted: '#575B57',
  /** Etiquetas y texto terciario. */
  inkSubtle: '#6B6F6B',

  /** Bordes de chips y contenedores. */
  border: '#E3E5E0',
  /** Línea divisoria interna de la tarjeta. */
  divider: '#ECEDE9',
  /** Borde de campos de formulario (3.1:1 sobre blanco para delimitar el control). */
  fieldBorder: '#8F938B',

  /** Verde lima de la insignia ("DESTACADO" / "NUEVO"). */
  accent: '#C9F44D',
  /** Verde de acento para iconografía decorativa (destello del hero). */
  accentInk: '#6B8E1F',
  /** Texto sobre `accent`. */
  onAccent: '#101010',
  /** Texto sobre superficies tinta (botón "Todos", botón de orden). */
  onInk: '#FFFFFF',

  /** Acciones destructivas. */
  danger: '#B3261E',
  /** Fondo y borde de avisos destructivos. */
  dangerSoft: '#FBEDEB',
  dangerBorder: '#F0C2BC',

  /** Confirmación (imagen nítida). */
  success: '#1A6B3C',
  successSoft: '#EAF7EE',
  successBorder: '#A8D5B5',

  /** Advertencia no bloqueante. */
  warning: '#7A5B00',
  warningSoft: '#FFF8E5',
  warningBorder: '#E8D49A',

  /** Bloques de carga. */
  skeleton: '#E5E7E1',
} as const;