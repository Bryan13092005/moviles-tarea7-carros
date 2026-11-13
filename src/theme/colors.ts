/**
 * Paleta del catálogo.
 *
 * El diseño es un catálogo claro de vehículos con atmósfera botánica/mineral
 * en la cabecera. Los valores son fijos para preservar el contraste sobre
 * superficies claras independientemente del modo del sistema.
 *
 * Todos los tonos de texto cumplen AA (≥4.5:1) sobre `surface` (#FFFFFF),
 * `background` (#F4F5F3) y el lavado orgánico del hero (`heroWash` #E8F0E3):
 *   ink       #101210 → >15:1
 *   inkSoft   #252925 → >11:1
 *   inkBody   #394038 → >8.2:1
 *   inkMuted  #4E564D → >6.1:1
 *   inkSubtle #616960 → >4.7:1
 */
export const colors = {
  /** Fondo general de la pantalla. */
  background: '#F4F5F3',
  /** Lavado base superior del hero. */
  heroWash: '#E7EFE2',
  /** Tonos de las ondas orgánicas y manchas difuminadas (SVG). */
  heroSky: '#DCE9D5',
  heroGlow: '#D6F865',
  heroMist: '#D4E6DC',
  heroSand: '#ECEFE8',
  heroContour: 'rgba(68, 94, 24, 0.14)',

  /** Superficie de tarjetas, buscador y controles elevados. */
  surface: '#FFFFFF',
  /** Superficie translúcida de alto contraste sobre el hero. */
  surfaceElevated: 'rgba(255, 255, 255, 0.94)',
  /** Superficie neutra para huecos de imagen y placeholders. */
  surfaceMuted: '#E9ECE6',

  /** Texto principal (tinta con matiz bosque profundo). */
  ink: '#101210',
  /** Texto secundario con peso (títulos de tarjeta, controles). */
  inkSoft: '#252925',
  /** Párrafos largos sobre el fondo claro o lavado del hero. */
  inkBody: '#394038',
  /** Texto de apoyo (metadatos, etiquetas, iconos). */
  inkMuted: '#4E564D',
  /** Placeholders y texto terciario (≥4.7:1 sobre blanco y hero). */
  inkSubtle: '#616960',

  /** Bordes de chips y contenedores. */
  border: '#DFE3DC',
  /** Borde sutil para controles flotantes sobre las ondas del hero. */
  heroBorder: '#CFD7CA',
  /** Línea divisoria interna de la tarjeta. */
  divider: '#EAECE7',
  /** Borde de campos de formulario (≥3.1:1 sobre blanco). */
  fieldBorder: '#8A9086',

  /** Verde lima de la insignia ("DESTACADO" / "NUEVO") y acentos del hero. */
  accent: '#C9F44D',
  /** Verde profundo para iconografía y detalles sobre fondo claro. */
  accentInk: '#4D6A12',
  /** Superficie suave de acento para píldoras del hero. */
  accentSoft: 'rgba(201, 244, 77, 0.34)',
  /** Texto sobre `accent`. */
  onAccent: '#101210',
  /** Texto sobre superficies tinta (`ink`). */
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
  skeleton: '#E4E7E0',
} as const;
