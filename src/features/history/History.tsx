import { useEffect, useRef, useState } from 'react'
import { calculateBudget } from '../../domain/calculations'
import { ARTWORK_TYPES, TECHNIQUES } from '../../domain/classification'
import type { BudgetInput, SavedBudget } from '../../domain/types'
import type { StorageResult } from '../../lib/budgetStorage'
import { currency } from '../../lib/money'

interface HistoryProps {
  budgets: SavedBudget[]
  error: string | null
  editingId: string | null
  onEdit: (budget: SavedBudget) => void
  onDelete: (id: string) => StorageResult<void>
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' })

const secondaryButton = 'border-2 border-graphite bg-white px-4 py-2 font-mono text-xs font-bold text-graphite hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite focus-visible:ring-4 focus-visible:ring-accent'
const dangerButton = 'border-2 border-error bg-white px-4 py-2 font-mono text-xs font-bold text-error hover:bg-error hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-error focus-visible:ring-4 focus-visible:ring-accent'

function artworkTypeLabel(input: BudgetInput): string {
  if (!input.artworkType) return 'Tipo sin especificar'
  if (input.artworkType === 'other') return input.artworkTypeOther ?? 'Otra'
  return ARTWORK_TYPES.find((option) => option.id === input.artworkType)?.label ?? input.artworkType
}

function techniqueLabel(input: BudgetInput): string {
  if (!input.technique) return 'Técnica sin especificar'
  if (input.technique === 'other') return input.techniqueOther ?? 'Otra'
  return TECHNIQUES.find((option) => option.id === input.technique)?.label ?? input.technique
}

function suggestedPrice(input: BudgetInput): string {
  try {
    return currency.format(calculateBudget(input).suggestedPrice)
  } catch {
    return 'No disponible'
  }
}

export function History({ budgets, error, editingId, onEdit, onDelete }: HistoryProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (confirmingId) confirmButtonRef.current?.focus()
  }, [confirmingId])

  function closeConfirmation(id: string) {
    setConfirmingId(null)
    setActionError('')
    document.getElementById(`delete-budget-${id}`)?.focus()
  }

  function confirmDelete(id: string) {
    const result = onDelete(id)
    if (!result.ok) {
      setActionError(result.error.message)
      return
    }
    setConfirmingId(null)
    setActionError('')
    headingRef.current?.focus()
  }

  function editBudget(budget: SavedBudget) {
    setConfirmingId(null)
    setActionError('')
    onEdit(budget)
  }

  return (
    <section aria-labelledby="history-title" className="border-2 border-graphite bg-white p-5 sm:p-8">
      <div className="mb-6 border-b-2 border-graphite pb-5">
        <p className="font-mono text-xs font-bold tracking-[0.12em] uppercase">03 / Tu historial</p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 ref={headingRef} tabIndex={-1} id="history-title" className="font-serif text-3xl font-bold">Presupuestos guardados</h2>
          {budgets.length > 0 && <p className="font-mono text-xs font-bold uppercase">{budgets.length} {budgets.length === 1 ? 'presupuesto' : 'presupuestos'}</p>}
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-2 border-error bg-white p-4 text-sm font-semibold text-error">{error}</p>
      ) : budgets.length === 0 ? (
        <div className="border-2 border-dashed border-graphite/50 bg-ivory p-6">
          <p className="text-sm leading-relaxed">Todavía no hay presupuestos guardados. Completa la calculadora y usa «Guardar presupuesto» para conservar una obra.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {budgets.map((budget) => {
            const isEditing = editingId === budget.id
            return (
              <li key={budget.id} className={`border-2 border-graphite p-4 sm:p-5 ${isEditing ? 'bg-accent/25' : 'bg-ivory'}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-xl font-bold break-words">{budget.input.name}</h3>
                      {isEditing && <span className="border-2 border-graphite bg-accent px-2 py-1 font-mono text-[0.65rem] font-bold uppercase">En edición</span>}
                    </div>
                    <p className="mt-1 font-mono text-xs font-bold uppercase">{artworkTypeLabel(budget.input)} · {techniqueLabel(budget.input)}</p>
                    <p className="mt-2 text-sm">Actualizado el <time dateTime={budget.updatedAt}>{dateFormatter.format(new Date(budget.updatedAt))}</time></p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="font-mono text-xs font-bold uppercase">Precio sugerido</p>
                    <p className="mt-1 font-serif text-2xl font-bold">{suggestedPrice(budget.input)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={() => editBudget(budget)} aria-label={`Editar ${budget.input.name}`} className={secondaryButton}>
                    Editar
                  </button>
                  <button
                    type="button"
                    id={`delete-budget-${budget.id}`}
                    onClick={() => { setActionError(''); setConfirmingId(budget.id) }}
                    aria-label={`Eliminar ${budget.input.name}`}
                    aria-expanded={confirmingId === budget.id}
                    aria-controls={confirmingId === budget.id ? `delete-confirmation-${budget.id}` : undefined}
                    className={secondaryButton}
                  >
                    Eliminar
                  </button>
                </div>

                {confirmingId === budget.id && (
                  <div
                    id={`delete-confirmation-${budget.id}`}
                    role="group"
                    aria-label={`Confirmar eliminación de ${budget.input.name}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        closeConfirmation(budget.id)
                      }
                    }}
                    className="mt-4 border-2 border-error bg-white p-4"
                  >
                    <p className="text-sm font-semibold">¿Eliminar «{budget.input.name}»? Esta acción no se puede deshacer.</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <button ref={confirmButtonRef} type="button" onClick={() => confirmDelete(budget.id)} className={dangerButton}>
                        Sí, eliminar
                      </button>
                      <button type="button" onClick={() => closeConfirmation(budget.id)} className={secondaryButton}>
                        Cancelar
                      </button>
                    </div>
                    {actionError && <p role="alert" className="mt-3 text-sm font-semibold text-error">{actionError}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
