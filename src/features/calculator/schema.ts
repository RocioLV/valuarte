import { z } from 'zod'
import { MAX_DESIRED_MARGIN_PERCENT } from '../../domain/calculations'
import { ARTWORK_TYPES, TECHNIQUES } from '../../domain/classification'
import { moneyField } from '../../lib/money'

const numberField = z.string().trim().min(1, 'Ingresa un valor.').pipe(
  z.coerce.number<string>().finite('Ingresa un número válido.').min(0, 'Ingresa un valor igual o mayor a cero.').max(Number.MAX_SAFE_INTEGER, 'El valor es demasiado grande.'),
)

const hoursField = z.string().trim().min(1, 'Ingresa un valor.')
  .regex(/^\d+(?:[.,]\d+)?$/, 'Ingresa horas válidas, por ejemplo 1,5 o 1.5.')
  .transform((value) => Number(value.replace(',', '.')))
  .pipe(z.number().finite('Ingresa horas válidas.').max(Number.MAX_SAFE_INTEGER, 'El valor es demasiado grande.'))

export const calculatorSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre de la obra o encargo.'),
  artworkType: z.union([z.literal(''), z.enum(ARTWORK_TYPES.map((option) => option.id))]),
  artworkTypeOther: z.string(),
  technique: z.union([z.literal(''), z.enum(TECHNIQUES.map((option) => option.id))]),
  techniqueOther: z.string(),
  materialsCost: moneyField,
  estimatedHours: hoursField,
  hourlyRate: moneyField,
  additionalExpenses: moneyField,
  desiredMarginPercent: numberField.pipe(z.number().max(MAX_DESIRED_MARGIN_PERCENT, `El margen máximo es ${MAX_DESIRED_MARGIN_PERCENT} %.`)),
}).superRefine((values, context) => {
  if (values.artworkType === 'other' && !values.artworkTypeOther.trim()) {
    context.addIssue({ code: 'custom', path: ['artworkTypeOther'], message: 'Especifica el tipo de obra.' })
  }
  if (values.technique === 'other' && !values.techniqueOther.trim()) {
    context.addIssue({ code: 'custom', path: ['techniqueOther'], message: 'Especifica la técnica principal.' })
  }
}).transform(({ artworkType, artworkTypeOther, technique, techniqueOther, ...values }) => ({
  ...values,
  artworkType: artworkType || undefined,
  artworkTypeOther: artworkType === 'other' ? artworkTypeOther.trim() : undefined,
  technique: technique || undefined,
  techniqueOther: technique === 'other' ? techniqueOther.trim() : undefined,
}))
