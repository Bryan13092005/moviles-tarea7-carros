const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

/** Precio de catálogo: `$128,900` (sin decimales si el monto es entero). */
export function formatearPrecio(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return 'Consultar';

  return `$${valor.toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Mes y año actuales en mayúsculas para la etiqueta del hero. */
export function mesActual(fecha: Date = new Date()): string {
  return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/** Pluraliza el conteo del catálogo: "1 vehículo" / "6 vehículos". */
export function contarVehiculos(total: number): string {
  return `${total} ${total === 1 ? 'vehículo' : 'vehículos'}`;
}

/** Quita acentos y normaliza para comparar búsquedas. */
export function normalizarTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
