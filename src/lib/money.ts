import { z } from 'zod'

const moneyPattern = /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/

export const moneyField = z.string().trim().min(1, 'Ingresa un valor.')
  .regex(moneyPattern, 'Ingresa un monto válido, por ejemplo 5.000.')
  .transform((value) => Number(value.replaceAll('.', '').replace(',', '.')))
  .pipe(z.number().finite('Ingresa un monto válido.').max(Number.MAX_SAFE_INTEGER, 'El valor es demasiado grande.'))

export function formatMoneyInput(value: string): string {
  if (!moneyPattern.test(value)) return value
  const [integer, decimals] = value.replaceAll('.', '').split(',')
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimals === undefined ? formatted : `${formatted},${decimals}`
}

export function unformatMoneyInput(value: string): string {
  return moneyPattern.test(value) ? value.replaceAll('.', '') : value
}

export const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
export const percentage = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })
