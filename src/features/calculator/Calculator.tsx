import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calculateBudget, MAX_DESIRED_MARGIN_PERCENT } from '../../domain/calculations'
import type { BudgetCosts, BudgetResult } from '../../domain/types'
import { currency, formatMoneyInput, moneyField, percentage, unformatMoneyInput } from '../../lib/money'
import { Comparison } from '../comparison/Comparison'

const numberField = z.string().trim().min(1, 'Ingresa un valor.').pipe(
  z.coerce.number<string>().finite('Ingresa un número válido.').min(0, 'Ingresa un valor igual o mayor a cero.').max(Number.MAX_SAFE_INTEGER, 'El valor es demasiado grande.'),
)

const hoursField = z.string().trim().min(1, 'Ingresa un valor.')
  .regex(/^\d+(?:[.,]\d+)?$/, 'Ingresa horas válidas, por ejemplo 1,5 o 1.5.')
  .transform((value) => Number(value.replace(',', '.')))
  .pipe(z.number().finite('Ingresa horas válidas.').max(Number.MAX_SAFE_INTEGER, 'El valor es demasiado grande.'))

const schema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre de la obra o encargo.'),
  technique: z.string().trim().min(1, 'Selecciona una técnica.'),
  materialsCost: moneyField,
  estimatedHours: hoursField,
  hourlyRate: moneyField,
  additionalExpenses: moneyField,
  desiredMarginPercent: numberField.pipe(z.number().max(MAX_DESIRED_MARGIN_PERCENT, `El margen máximo es ${MAX_DESIRED_MARGIN_PERCENT} %.`)),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>
type FieldName = keyof FormInput

const inputClass = 'mt-2 w-full border-2 border-graphite bg-white px-4 py-3 text-base text-graphite outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent aria-invalid:border-error'

const example: FormInput = {
  name: 'Paisaje en calma',
  technique: 'Pintura',
  materialsCost: '20000',
  estimatedHours: '5.5',
  hourlyRate: '5000',
  additionalExpenses: '5000',
  desiredMarginPercent: '20',
}

export function Calculator() {
  const [result, setResult] = useState<BudgetResult | null>(null)
  const [costs, setCosts] = useState<BudgetCosts | null>(null)
  const [calculationError, setCalculationError] = useState('')
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', technique: '', materialsCost: '', estimatedHours: '', hourlyRate: '', additionalExpenses: '', desiredMarginPercent: '' },
  })

  function onSubmit(values: FormOutput) {
    try {
      setResult(calculateBudget(values))
      setCosts(values)
      setCalculationError('')
    } catch (error) {
      setResult(null)
      setCalculationError(error instanceof RangeError ? error.message : 'No fue posible calcular el precio. Revisa los datos e inténtalo de nuevo.')
    }
  }

  function field(name: FieldName, label: string, options: { type?: string; hint?: string; money?: boolean; decimal?: boolean } = {}) {
    const error = errors[name]?.message
    const hintId = options.hint ? `${name}-hint` : undefined
    const errorId = error ? `${name}-error` : undefined
    const registration = register(name)
    return (
      <div>
        <label htmlFor={name} className="block text-sm font-semibold">{label}</label>
        {options.hint && <p id={hintId} className="mt-1 text-sm text-graphite/80">{options.hint}</p>}
        <input
          id={name}
          type={options.type ?? 'text'}
          {...(options.type === 'number' ? { min: 0, step: 'any' } : {})}
          inputMode={options.money || options.decimal || options.type === 'number' ? 'decimal' : undefined}
          {...registration}
          onFocus={options.money ? (event) => {
            setValue(name, unformatMoneyInput(event.currentTarget.value))
          } : undefined}
          onBlur={options.money ? (event) => {
            const formatted = formatMoneyInput(event.currentTarget.value.trim())
            event.currentTarget.value = formatted
            void registration.onBlur(event)
            setValue(name, formatted, { shouldValidate: true })
          } : registration.onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={inputClass}
        />
        {error && <p id={errorId} className="mt-1 text-sm font-semibold text-error">{error}</p>}
      </div>
    )
  }

  return (
    <section aria-labelledby="calculator-title" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
      <div className="min-w-0 border-2 border-graphite bg-white p-5 sm:p-8">
        <div className="mb-8 border-b-2 border-graphite pb-5">
          <p className="font-mono text-xs font-bold tracking-[0.12em] uppercase">01 / Tu obra</p>
          <h2 id="calculator-title" className="mt-3 font-serif text-3xl font-bold">Calcula tu precio</h2>
          <p className="mt-3 text-sm leading-relaxed">Todos los campos son obligatorios. Los montos en pesos chilenos se formatean al salir del campo.</p>
        </div>
        <form noValidate onSubmit={handleSubmit(onSubmit, () => { setResult(null); setCalculationError('') })} onChange={() => { setResult(null); setCalculationError('') }} className="space-y-6">
          <fieldset className="space-y-6">
            <legend className="mb-4 w-full border-b-2 border-graphite pb-3 font-mono text-sm font-bold uppercase">Información de la obra</legend>
            {field('name', 'Nombre de la obra o encargo')}
            <div>
            <label htmlFor="technique" className="block text-sm font-semibold">Técnica artística</label>
            <select id="technique" {...register('technique')} aria-invalid={Boolean(errors.technique)} aria-describedby={errors.technique ? 'technique-error' : undefined} className={inputClass}>
              <option value="">Selecciona una técnica</option>
              <option value="Pintura">Pintura</option>
              <option value="Ilustración">Ilustración</option>
              <option value="Escultura">Escultura</option>
              <option value="Fotografía">Fotografía</option>
              <option value="Otra">Otra</option>
            </select>
            {errors.technique && <p id="technique-error" className="mt-1 text-sm font-semibold text-error">{errors.technique.message}</p>}
            </div>
          </fieldset>
          <fieldset className="space-y-6 pt-2">
            <legend className="mb-4 w-full border-b-2 border-graphite pb-3 font-mono text-sm font-bold uppercase">Costos de producción</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              {field('materialsCost', 'Costo de materiales (CLP)', { money: true })}
              {field('additionalExpenses', 'Gastos adicionales (CLP)', { money: true })}
              {field('estimatedHours', 'Horas estimadas', { decimal: true, hint: 'Puedes usar coma o punto para fracciones: 1,5 o 1.5.' })}
              {field('hourlyRate', 'Valor por hora (CLP)', { money: true })}
            </div>
            {field('desiredMarginPercent', 'Margen deseado (%)', { type: 'number', hint: `Entre 0 y ${MAX_DESIRED_MARGIN_PERCENT} % del precio de venta.` })}
          </fieldset>
          {calculationError && <p role="alert" className="text-sm font-semibold text-error">{calculationError}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="submit" className="border-2 border-graphite bg-accent px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent">
              Calcular precio sugerido
            </button>
            <button type="button" onClick={() => { reset(example); setResult(null); setCalculationError('') }} className="border-2 border-graphite bg-white px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent">
              Cargar ejemplo
            </button>
          </div>
        </form>
      </div>
      <aside aria-labelledby="result-title" className="h-fit min-w-0 border-2 border-graphite bg-ivory p-5 sm:p-8">
        <p className="font-mono text-xs font-bold tracking-[0.12em] uppercase">02 / Tu estimación</p>
        <h2 id="result-title" className="mt-3 font-serif text-3xl font-bold">El valor de tu trabajo</h2>
        <div aria-live="polite" aria-atomic="true">
          {result ? (
            <div className="mt-7">
              <div className="border-2 border-graphite bg-accent p-5">
                <p className="text-sm font-semibold">Precio sugerido</p>
                <p className="mt-2 font-serif text-4xl break-words sm:text-5xl">{currency.format(result.suggestedPrice)}</p>
                <p className="mt-2 text-sm">Redondeado hacia arriba al peso.</p>
              </div>
              <h3 className="mt-7 font-serif text-xl">Desglose económico</h3>
              <dl className="mt-4 space-y-3 border-t-2 border-graphite pt-5 text-sm">
                {([
                  ['Materiales', currency.format(result.materialsCost)],
                  ['Remuneración estimada', currency.format(result.laborCost)],
                  ['Gastos adicionales', currency.format(result.additionalExpenses)],
                  ['Costo total', currency.format(result.totalCost)],
                  ['Excedente estimado', currency.format(result.estimatedSurplus)],
                  ['Margen efectivo', result.marginPercent === null ? 'No disponible' : `${percentage.format(result.marginPercent)} %`],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>
                ))}
              </dl>
              <p className="mt-6 border-t-2 border-graphite pt-5 text-sm leading-relaxed">El excedente queda después de cubrir los costos y remunerar tu trabajo. Es una estimación sin impuestos ni costos no ingresados. Los montos se muestran redondeados a pesos.</p>
            </div>
          ) : <p className="mt-7 text-sm leading-relaxed">Completa los datos y calcula para conocer el precio sugerido y el detalle de tu estimación.</p>}
        </div>
      </aside>
      <div className="lg:col-span-2">
        <Comparison costs={result ? costs : null} totalCost={result?.totalCost ?? null} />
      </div>
    </section>
  )
}
