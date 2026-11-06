import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { compareScenarios } from '../../domain/calculations'
import type { BudgetCosts, ScenarioComparison, ScenarioResult } from '../../domain/types'
import { currency, formatMoneyInput, moneyField, percentage, unformatMoneyInput } from '../../lib/money'

const schema = z.object({ firstPrice: moneyField, secondPrice: moneyField })
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

const inputClass = 'mt-2 w-full border-2 border-graphite bg-white px-4 py-3 text-base text-graphite outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent aria-invalid:border-error'

interface ComparisonProps {
  costs: BudgetCosts | null
  totalCost: number | null
}

export function Comparison({ costs, totalCost }: ComparisonProps) {
  return (
    <section aria-labelledby="comparison-title" className="min-w-0 border-2 border-graphite bg-white p-5 sm:p-8">
      <p className="font-mono text-xs font-bold tracking-[0.12em] uppercase">03 / Escenarios de venta</p>
      <h2 id="comparison-title" className="mt-3 font-serif text-3xl leading-tight font-bold tracking-tight">Compara dos precios</h2>
      {costs !== null && totalCost !== null ? (
        <ComparisonForm costs={costs} totalCost={totalCost} />
      ) : (
        <p className="mt-3 text-base leading-relaxed text-graphite/90" role="status">Calcula primero el precio sugerido para comparar escenarios con los costos actuales.</p>
      )}
    </section>
  )
}

function ComparisonForm({ costs, totalCost }: { costs: BudgetCosts; totalCost: number }) {
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null)
  const [calculationError, setCalculationError] = useState('')
  const [validationSummary, setValidationSummary] = useState('')
  const { register, handleSubmit, setValue, setFocus, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { firstPrice: '', secondPrice: '' },
  })

  function onSubmit(values: FormOutput) {
    try {
      setComparison(compareScenarios(costs, values.firstPrice, values.secondPrice))
      setCalculationError('')
      setValidationSummary('')
    } catch (error) {
      setComparison(null)
      setCalculationError(error instanceof RangeError ? error.message : 'No fue posible comparar los escenarios. Revisa los datos e inténtalo de nuevo.')
    }
  }

  function onInvalid(formErrors: FieldErrors<FormInput>) {
    const firstInvalid = (['firstPrice', 'secondPrice'] as const).find((name) => formErrors[name])
    if (firstInvalid) setFocus(firstInvalid)
    setValidationSummary('Revisa los precios marcados. Ambos son obligatorios y deben tener un formato válido.')
  }

  function priceField(name: keyof FormInput, label: string) {
    const registration = register(name)
    const error = errors[name]?.message
    return (
      <div>
        <div className="flex flex-wrap items-baseline gap-x-1">
          <label htmlFor={name} className="block text-sm font-semibold break-words">{label}</label>
          <span aria-hidden="true" className="text-sm font-semibold text-terracotta">*</span>
        </div>
        <input
          id={name}
          type="text"
          inputMode="decimal"
          required
          aria-required="true"
          {...registration}
          onFocus={(event) => setValue(name, unformatMoneyInput(event.currentTarget.value))}
          onBlur={(event) => {
            const formatted = formatMoneyInput(event.currentTarget.value.trim())
            event.currentTarget.value = formatted
            void registration.onBlur(event)
            setValue(name, formatted, { shouldValidate: true })
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={inputClass}
        />
        {error && <p id={`${name}-error`} className="mt-1 text-sm font-semibold text-error">{error}</p>}
      </div>
    )
  }

  return (
    <>
      <p className="mt-3 text-base leading-relaxed text-graphite/90">Compara dos ingresos usando los costos actuales, incluida tu remuneración. Los campos marcados con * son obligatorios y los montos se formatean al salir del campo.</p>
      <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} onChange={() => { setComparison(null); setCalculationError(''); setValidationSummary('') }} className="mt-6 space-y-5">
        {validationSummary && (
          <div role="alert" className="border-2 border-error bg-white p-4">
            <p className="text-sm font-semibold text-error">{validationSummary}</p>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          {priceField('firstPrice', 'Precio de venta A (CLP)')}
          {priceField('secondPrice', 'Precio de venta B (CLP)')}
        </div>
        {calculationError && <p role="alert" className="text-sm font-semibold text-error">{calculationError}</p>}
        <button type="submit" className="w-full border-2 border-graphite bg-accent px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent sm:w-auto">Comparar escenarios</button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {comparison && (
          <div className="mt-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <ScenarioCard title="Escenario A" result={comparison.first} totalCost={totalCost} />
              <ScenarioCard title="Escenario B" result={comparison.second} totalCost={totalCost} />
            </div>
            <div className="mt-4 border-2 border-graphite bg-accent p-5">
              <p className="font-mono text-sm font-bold">Diferencia de excedente (B − A)</p>
              <p className="mt-2 font-serif text-3xl leading-tight font-bold break-words tabular-nums">{currency.format(comparison.surplusDifference)}</p>
              <p className="mt-2 text-sm">
                {comparison.surplusDifference > 0 ? 'El escenario B genera mayor excedente.' : comparison.surplusDifference < 0 ? 'El escenario A genera mayor excedente.' : 'Ambos escenarios generan el mismo excedente.'}
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed">El excedente es una estimación después de cubrir costos y remuneración, sin impuestos ni costos no ingresados. Un mayor excedente no determina por sí solo la mejor decisión comercial. Los montos se muestran redondeados a pesos.</p>
          </div>
        )}
      </div>
    </>
  )
}

function ScenarioCard({ title, result, totalCost }: { title: string; result: ScenarioResult; totalCost: number }) {
  const rows = [
    ['Precio de venta', currency.format(result.salePrice)],
    ['Costo total (incluye remuneración)', currency.format(totalCost)],
    ['Excedente estimado', currency.format(result.estimatedSurplus)],
    ['Margen efectivo', result.marginPercent === null ? 'No disponible' : `${percentage.format(result.marginPercent)} %`],
  ]
  return (
    <section aria-label={title} className="min-w-0 border-2 border-graphite bg-ivory p-5">
      <h3 className="font-mono text-sm font-bold tracking-[0.08em] uppercase">{title}</h3>
      <dl className="mt-4 space-y-3 border-t-2 border-graphite pt-4 text-sm">
        {rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="min-w-0 break-words">{label}</dt><dd className="min-w-0 font-semibold break-words tabular-nums">{value}</dd></div>)}
      </dl>
    </section>
  )
}
