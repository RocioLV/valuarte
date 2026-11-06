import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calculateBudget, MAX_DESIRED_MARGIN_PERCENT } from '../../domain/calculations'
import { ARTWORK_TYPES, TECHNIQUES } from '../../domain/classification'
import type { BudgetCosts, BudgetInput, BudgetResult, SavedBudget } from '../../domain/types'
import { currency, formatMoneyInput, percentage, unformatMoneyInput } from '../../lib/money'
import { Comparison } from '../comparison/Comparison'
import { History } from '../history/History'
import { useBudgetHistory } from '../history/useBudgetHistory'
import { calculatorSchema } from './schema'

type FormInput = z.input<typeof calculatorSchema>
type FormOutput = z.output<typeof calculatorSchema>
type FieldName = Exclude<keyof FormInput, 'artworkType' | 'technique'>
type ConflictAction = 'reload' | 'keep'

const inputClass = 'mt-2 w-full border-2 border-graphite bg-white px-4 py-3 text-base text-graphite outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent aria-invalid:border-error'

const example: FormInput = {
  name: 'Paisaje en calma',
  artworkType: 'painting',
  artworkTypeOther: '',
  technique: 'watercolor',
  techniqueOther: '',
  materialsCost: '20000',
  estimatedHours: '5.5',
  hourlyRate: '5000',
  additionalExpenses: '5000',
  desiredMarginPercent: '20',
}

const emptyValues: FormInput = {
  name: '',
  artworkType: '',
  artworkTypeOther: '',
  technique: '',
  techniqueOther: '',
  materialsCost: '',
  estimatedHours: '',
  hourlyRate: '',
  additionalExpenses: '',
  desiredMarginPercent: '',
}

const fieldOrder: FieldName[] = ['name', 'artworkTypeOther', 'techniqueOther', 'materialsCost', 'additionalExpenses', 'estimatedHours', 'hourlyRate', 'desiredMarginPercent']
const comparisonFields: (keyof FormInput)[] = ['name', 'artworkType', 'artworkTypeOther', 'technique', 'techniqueOther', 'materialsCost', 'additionalExpenses', 'estimatedHours', 'hourlyRate', 'desiredMarginPercent']

function decimalString(value: number, locale: 'es-CL' | 'en-US'): string {
  return value.toLocaleString(locale, { useGrouping: false, maximumFractionDigits: 20 })
}

function toFormInput(input: BudgetInput): FormInput {
  return {
    name: input.name,
    artworkType: input.artworkType ?? '',
    artworkTypeOther: input.artworkTypeOther ?? '',
    technique: input.technique ?? '',
    techniqueOther: input.techniqueOther ?? '',
    materialsCost: formatMoneyInput(decimalString(input.materialsCost, 'es-CL')),
    estimatedHours: decimalString(input.estimatedHours, 'es-CL'),
    hourlyRate: formatMoneyInput(decimalString(input.hourlyRate, 'es-CL')),
    additionalExpenses: formatMoneyInput(decimalString(input.additionalExpenses, 'es-CL')),
    desiredMarginPercent: decimalString(input.desiredMarginPercent, 'en-US'),
  }
}

function canonicalValue(field: keyof FormInput, value: string | undefined): string {
  const text = (value ?? '').trim()
  if (!text) return ''

  if (field === 'materialsCost' || field === 'hourlyRate' || field === 'additionalExpenses') {
    const number = Number(text.replaceAll('.', '').replace(',', '.'))
    return Number.isFinite(number) ? String(number) : text
  }

  if (field === 'estimatedHours' || field === 'desiredMarginPercent') {
    const number = Number(text.replace(',', '.'))
    return Number.isFinite(number) ? String(number) : text
  }

  return text
}

function formValuesEqual(current: Partial<FormInput>, baseline: Partial<FormInput>): boolean {
  return comparisonFields.every((field) => canonicalValue(field, current[field]) === canonicalValue(field, baseline[field]))
}

export function Calculator() {
  const [result, setResult] = useState<BudgetResult | null>(null)
  const [costs, setCosts] = useState<BudgetCosts | null>(null)
  const [calculationError, setCalculationError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingUpdatedAt, setEditingUpdatedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [validationSummary, setValidationSummary] = useState('')
  const [baseline, setBaseline] = useState<FormInput>(emptyValues)
  const [acknowledgedConflict, setAcknowledgedConflict] = useState(false)
  const { register, handleSubmit, reset, setValue, setFocus, getValues, control, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: emptyValues,
  })
  const artworkType = useWatch({ control, name: 'artworkType' })
  const technique = useWatch({ control, name: 'technique' })
  const watchedValues = useWatch({ control })
  const isDirty = useMemo(() => !formValuesEqual(watchedValues, baseline), [watchedValues, baseline])
  const {
    budgets,
    error: historyError,
    errorCode: historyErrorCode,
    conflict: storageConflict,
    save: persistBudget,
    remove: removeBudget,
    resolveConflict,
    discardCorruptData,
    backup,
  } = useBudgetHistory({ hasUnsavedChanges: isDirty })

  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  function onSubmit(values: FormOutput) {
    try {
      setResult(calculateBudget(values))
      setCosts(values)
      setCalculationError('')
      setValidationSummary('')
    } catch (error) {
      setResult(null)
      setCosts(null)
      setCalculationError(error instanceof RangeError ? error.message : 'No fue posible calcular el precio. Revisa los datos e inténtalo de nuevo.')
    }
  }

  function onInvalid(formErrors: FieldErrors<FormInput>) {
    const firstInvalid = fieldOrder.find((name) => formErrors[name])
    if (firstInvalid) setFocus(firstInvalid)
    setValidationSummary('Revisa los campos marcados. Hay campos obligatorios vacíos o con un formato inválido.')
  }

  function confirmDiscardChanges(): boolean {
    if (!isDirty) return true
    return window.confirm('Tienes cambios sin guardar. Si continúas, se descartarán.')
  }

  function onSave(values: FormOutput) {
    if (acknowledgedConflict && !window.confirm('Otra pestaña modificó los presupuestos guardados. Si guardas ahora, podrías sobrescribir esos cambios. ¿Continuar?')) {
      return
    }

    const stored = persistBudget(values, editingId ?? undefined, acknowledgedConflict ? undefined : editingUpdatedAt ?? undefined)
    if (!stored.ok) {
      setSaveError(stored.error.message)
      setSaveMessage('')
      return
    }

    setSaveError('')
    setSaveMessage(editingId ? 'Presupuesto actualizado.' : 'Presupuesto guardado.')
    setValidationSummary('')
    setAcknowledgedConflict(false)
    if (editingId) setEditingUpdatedAt(stored.data.updatedAt)
    setBaseline(getValues())
  }

  function loadBudgetIntoForm(budget: SavedBudget) {
    const values = toFormInput(budget.input)
    setEditingId(budget.id)
    setEditingUpdatedAt(budget.updatedAt)
    setAcknowledgedConflict(false)
    reset(values)
    setBaseline(values)
    setSaveError('')
    setSaveMessage('')
    setValidationSummary('')
    try {
      setResult(calculateBudget(budget.input))
      setCosts(budget.input)
      setCalculationError('')
    } catch (error) {
      setResult(null)
      setCosts(null)
      setCalculationError(error instanceof RangeError ? error.message : 'No fue posible calcular el precio. Revisa los datos e inténtalo de nuevo.')
    }
  }

  function editSavedBudget(budget: SavedBudget) {
    if (!confirmDiscardChanges()) return
    loadBudgetIntoForm(budget)
    setSaveMessage('Presupuesto cargado para edición.')
    document.getElementById('name')?.focus()
  }

  function resetEditor() {
    setEditingId(null)
    setEditingUpdatedAt(null)
    setAcknowledgedConflict(false)
    reset(emptyValues)
    setBaseline(emptyValues)
    setResult(null)
    setCosts(null)
    setCalculationError('')
    setSaveError('')
    setSaveMessage('')
    setValidationSummary('')
  }

  function cancelEdit() {
    if (!confirmDiscardChanges()) return
    resetEditor()
  }

  function loadExample() {
    if (!confirmDiscardChanges()) return
    setEditingId(null)
    setEditingUpdatedAt(null)
    setAcknowledgedConflict(false)
    reset(example)
    setBaseline(example)
    setResult(null)
    setCosts(null)
    setCalculationError('')
    setSaveError('')
    setSaveMessage('')
    setValidationSummary('')
  }

  function deleteSavedBudget(id: string) {
    const removal = removeBudget(id)
    if (removal.ok && editingId === id) resetEditor()
    return removal
  }

  function clearResults() {
    setResult(null)
    setCosts(null)
    setCalculationError('')
    setSaveError('')
    setSaveMessage('')
    setValidationSummary('')
  }

  function handleResolveConflict(action: ConflictAction) {
    const fresh = resolveConflict()
    setSaveError('')

    if (action === 'keep') {
      setAcknowledgedConflict(true)
      setSaveMessage('Se mantuvieron tus cambios locales. Revisa el historial antes de guardar.')
      return
    }

    setAcknowledgedConflict(false)
    const latest = editingId ? fresh.budgets.find((budget) => budget.id === editingId) : undefined

    if (latest) {
      loadBudgetIntoForm(latest)
      setSaveMessage('Historial actualizado. Se cargó la versión más reciente del presupuesto.')
      document.getElementById('name')?.focus()
      return
    }

    const wasEditing = editingId !== null
    resetEditor()
    setSaveMessage(wasEditing ? 'El presupuesto que estabas editando ya no existe.' : 'Historial actualizado. Se descartaron los cambios locales.')
  }

  function field(name: FieldName, label: string, options: { type?: string; hint?: string; money?: boolean; decimal?: boolean; required?: boolean } = {}) {
    const error = errors[name]?.message
    const hintId = options.hint ? `${name}-hint` : undefined
    const errorId = error ? `${name}-error` : undefined
    const registration = register(name)
    return (
      <div>
        <div className="flex flex-wrap items-baseline gap-x-1">
          <label htmlFor={name} className="block text-sm font-semibold break-words">{label}</label>
          {options.required && <span aria-hidden="true" className="text-sm font-semibold text-terracotta">*</span>}
        </div>
        {options.hint && <p id={hintId} className="mt-1 text-sm text-graphite/80">{options.hint}</p>}
        <input
          id={name}
          type={options.type ?? 'text'}
          {...(options.type === 'number' ? { min: 0, step: 'any' } : {})}
          {...(options.required ? { required: true } : {})}
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
          aria-required={options.required || undefined}
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
        <div className="mb-6 border-b-2 border-graphite pb-5">
          <p className="font-mono text-xs font-bold tracking-[0.12em] uppercase">01 / Tu obra</p>
          <h2 id="calculator-title" className="mt-3 font-serif text-3xl leading-tight font-bold tracking-tight">Calcula tu precio</h2>
          <p className="mt-3 text-base leading-relaxed text-graphite/90">El tipo de obra y la técnica son opcionales; los demás campos son obligatorios y se marcan con *. Los montos en pesos chilenos se formatean al salir del campo.</p>
        </div>
        <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} onChange={clearResults} className="space-y-6">
          {validationSummary && (
            <div role="alert" className="border-2 border-error bg-white p-4">
              <p className="text-sm font-semibold text-error">{validationSummary}</p>
            </div>
          )}
          <fieldset className="space-y-6">
            <legend className="mb-4 w-full border-b-2 border-graphite pb-3 font-mono text-sm font-bold tracking-[0.08em] uppercase">Información de la obra</legend>
            {field('name', 'Nombre de la obra o encargo', { required: true })}
            <div>
              <label htmlFor="artworkType" className="block text-sm font-semibold">Tipo de obra (opcional)</label>
              <select id="artworkType" {...register('artworkType')} className={inputClass}>
                <option value="">Sin especificar</option>
                {ARTWORK_TYPES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            {artworkType === 'other' && field('artworkTypeOther', 'Especifica el tipo de obra', { required: true })}
            <div>
              <label htmlFor="technique" className="block text-sm font-semibold">Técnica principal (opcional)</label>
              <select id="technique" {...register('technique')} className={inputClass}>
                <option value="">Sin especificar</option>
                {TECHNIQUES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            {technique === 'other' && field('techniqueOther', 'Especifica la técnica principal', { required: true })}
          </fieldset>
          <fieldset className="space-y-6 pt-2">
            <legend className="mb-4 w-full border-b-2 border-graphite pb-3 font-mono text-sm font-bold tracking-[0.08em] uppercase">Costos de producción</legend>
            <div className="grid gap-6 sm:grid-cols-2">
              {field('materialsCost', 'Costo de materiales (CLP)', { money: true, required: true })}
              {field('additionalExpenses', 'Gastos adicionales (CLP)', { money: true, required: true })}
              {field('estimatedHours', 'Horas estimadas', { decimal: true, required: true, hint: 'Puedes usar coma o punto para fracciones: 1,5 o 1.5.' })}
              {field('hourlyRate', 'Valor por hora (CLP)', { money: true, required: true })}
            </div>
            {field('desiredMarginPercent', 'Margen deseado (%)', { type: 'number', required: true, hint: `Entre 0 y ${MAX_DESIRED_MARGIN_PERCENT} % del precio de venta.` })}
          </fieldset>
          {calculationError && <p role="alert" className="text-sm font-semibold text-error">{calculationError}</p>}
          {saveError && <p role="alert" className="text-sm font-semibold text-error">{saveError}</p>}
          <p role="status" aria-live="polite" className={saveMessage ? 'text-sm font-semibold' : 'sr-only'}>{saveMessage}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="submit" className="border-2 border-graphite bg-accent px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent">
              Calcular precio sugerido
            </button>
            <button type="button" onClick={loadExample} className="border-2 border-graphite bg-white px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent">
              Cargar ejemplo
            </button>
            <button type="button" onClick={handleSubmit(onSave, onInvalid)} className="border-2 border-graphite bg-white px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent">
              {editingId ? 'Actualizar presupuesto' : 'Guardar presupuesto'}
            </button>
            {editingId && <button type="button" onClick={cancelEdit} className="border-2 border-graphite bg-white px-6 py-4 font-mono text-sm font-bold text-graphite hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent">
              Cancelar edición
            </button>}
          </div>
        </form>
      </div>
      <aside aria-labelledby="result-title" className="h-fit min-w-0 border-2 border-graphite bg-ivory p-5 sm:p-8">
        <p className="font-mono text-xs font-bold tracking-[0.12em] uppercase">02 / Tu estimación</p>
        <h2 id="result-title" className="mt-3 font-serif text-3xl leading-tight font-bold tracking-tight">El valor de tu trabajo</h2>
        <p className="mt-3 text-base leading-relaxed text-graphite/90">
          {result ? 'Este es el desglose económico de tu estimación.' : 'Completa los datos y calcula para conocer el precio sugerido y el detalle de tu estimación.'}
        </p>
        <div aria-live="polite" aria-atomic="true">
          {result ? (
            <div className="mt-6">
              <div className="border-2 border-graphite bg-accent p-5">
                <p className="font-mono text-xs font-bold tracking-[0.08em] uppercase">Precio sugerido</p>
                <p className="mt-2 font-serif text-4xl leading-tight break-words tabular-nums sm:text-5xl">{currency.format(result.suggestedPrice)}</p>
                <p className="mt-2 text-sm">Redondeado hacia arriba al peso.</p>
              </div>
              <h3 className="mt-6 font-serif text-xl leading-snug font-bold">Desglose económico</h3>
              <dl className="mt-4 space-y-3 border-t-2 border-graphite pt-5 text-sm">
                {([
                  ['Materiales', currency.format(result.materialsCost)],
                  ['Remuneración estimada', currency.format(result.laborCost)],
                  ['Gastos adicionales', currency.format(result.additionalExpenses)],
                  ['Costo total', currency.format(result.totalCost)],
                  ['Excedente estimado', currency.format(result.estimatedSurplus)],
                  ['Margen efectivo', result.marginPercent === null ? 'No disponible' : `${percentage.format(result.marginPercent)} %`],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="min-w-0 break-words">{label}</dt><dd className="min-w-0 font-semibold break-words tabular-nums">{value}</dd></div>
                ))}
              </dl>
              <p className="mt-6 border-t-2 border-graphite pt-5 text-sm leading-relaxed">El excedente queda después de cubrir los costos y remunerar tu trabajo. Es una estimación sin impuestos ni costos no ingresados. Los montos se muestran redondeados a pesos.</p>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="min-w-0 lg:col-span-2">
        <Comparison costs={result ? costs : null} totalCost={result?.totalCost ?? null} />
      </div>
      <div className="min-w-0 lg:col-span-2">
        <History
          budgets={budgets}
          error={historyError}
          errorCode={historyErrorCode}
          editingId={editingId}
          externalConflict={storageConflict}
          onEdit={editSavedBudget}
          onDelete={deleteSavedBudget}
          onDownloadBackup={backup}
          onDiscardCorruptData={discardCorruptData}
          onResolveConflict={handleResolveConflict}
        />
      </div>
    </section>
  )
}
