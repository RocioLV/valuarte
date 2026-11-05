import { z } from 'zod'
import { MAX_DESIRED_MARGIN_PERCENT } from '../domain/calculations'
import { ARTWORK_TYPES, TECHNIQUES } from '../domain/classification'
import type { BudgetInput, SavedBudget } from '../domain/types'

export const BUDGETS_STORAGE_KEY = 'valuarte.budgets.v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type BudgetStorageErrorCode = 'unavailable' | 'invalid' | 'invalid-input' | 'quota' | 'not-found' | 'conflict' | 'empty' | 'unknown'

export interface BudgetStorageError {
  code: BudgetStorageErrorCode
  message: string
}

export type StorageResult<T> = { ok: true; data: T } | { ok: false; error: BudgetStorageError }

export interface BudgetBackup {
  filename: string
  content: string
}

const budgetInputSchema = z.object({
  name: z.string().trim().min(1),
  artworkType: z.enum(ARTWORK_TYPES.map((option) => option.id)).optional(),
  artworkTypeOther: z.string().trim().min(1).optional(),
  technique: z.enum(TECHNIQUES.map((option) => option.id)).optional(),
  techniqueOther: z.string().trim().min(1).optional(),
  materialsCost: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  estimatedHours: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  hourlyRate: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  additionalExpenses: z.number().finite().min(0).max(Number.MAX_SAFE_INTEGER),
  desiredMarginPercent: z.number().finite().min(0).max(MAX_DESIRED_MARGIN_PERCENT),
}).superRefine((value, context) => {
  if (value.artworkType === 'other' && !value.artworkTypeOther) {
    context.addIssue({ code: 'custom', path: ['artworkTypeOther'], message: 'Falta la descripción del tipo de obra.' })
  }
  if (value.artworkType !== 'other' && value.artworkTypeOther !== undefined) {
    context.addIssue({ code: 'custom', path: ['artworkTypeOther'], message: 'La descripción del tipo de obra no corresponde.' })
  }
  if (value.technique === 'other' && !value.techniqueOther) {
    context.addIssue({ code: 'custom', path: ['techniqueOther'], message: 'Falta la descripción de la técnica.' })
  }
  if (value.technique !== 'other' && value.techniqueOther !== undefined) {
    context.addIssue({ code: 'custom', path: ['techniqueOther'], message: 'La descripción de la técnica no corresponde.' })
  }
})

const savedBudgetSchema = z.object({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  input: budgetInputSchema,
})

const savedBudgetsSchema = z.array(savedBudgetSchema)

const messages = {
  unavailable: 'LocalStorage no está disponible en este navegador. No es posible guardar ni consultar presupuestos.',
  invalid: 'Los presupuestos guardados no se pudieron leer porque los datos están dañados. No se modificará la información existente.',
  'invalid-input': 'El presupuesto contiene datos inválidos y no se puede guardar.',
  quota: 'No hay espacio suficiente en LocalStorage. Elimina algún presupuesto o libera espacio e inténtalo de nuevo.',
  'not-found': 'El presupuesto ya no existe. Actualiza el historial e inténtalo de nuevo.',
  conflict: 'El presupuesto cambió en otra pestaña. Recarga el historial e inténtalo de nuevo.',
  empty: 'No hay datos guardados para respaldar.',
  unknown: 'No fue posible acceder a LocalStorage. Inténtalo de nuevo.',
} as const

function failure(code: BudgetStorageErrorCode): { ok: false; error: BudgetStorageError } {
  return { ok: false, error: { code, message: messages[code] } }
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('name' in error)) return undefined
  const name = (error as { name: unknown }).name
  return typeof name === 'string' ? name : undefined
}

function errorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('message' in error)) return ''
  const message = (error as { message: unknown }).message
  return typeof message === 'string' ? message : ''
}

function isQuotaError(error: unknown): boolean {
  const name = errorName(error)
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(errorMessage(error))
}

function isSecurityError(error: unknown): boolean {
  return errorName(error) === 'SecurityError'
}

function readStoredBudgets(storage?: StorageLike): StorageResult<SavedBudget[]> {
  const store = resolveStorage(storage)
  if (!store) return failure('unavailable')

  let raw: string | null
  try {
    raw = store.getItem(BUDGETS_STORAGE_KEY)
  } catch {
    return failure('unavailable')
  }

  if (raw === null) return { ok: true, data: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return failure('invalid')
  }

  const validated = savedBudgetsSchema.safeParse(parsed)
  if (!validated.success) return failure('invalid')

  return {
    ok: true,
    data: [...validated.data].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
  }
}

function writeStoredBudgets(budgets: SavedBudget[], storage?: StorageLike): StorageResult<void> {
  const store = resolveStorage(storage)
  if (!store) return failure('unavailable')

  try {
    store.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets))
    return { ok: true, data: undefined }
  } catch (error) {
    if (isQuotaError(error)) return failure('quota')
    if (isSecurityError(error)) return failure('unavailable')
    return failure('unknown')
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function nextTimestamp(previous: string): string {
  const now = Date.now()
  const previousTime = Date.parse(previous)
  return new Date(Number.isFinite(previousTime) && now <= previousTime ? previousTime + 1 : now).toISOString()
}

export function listBudgets(storage?: StorageLike): StorageResult<SavedBudget[]> {
  return readStoredBudgets(storage)
}

export function createBudget(input: BudgetInput, storage?: StorageLike): StorageResult<SavedBudget> {
  const validated = budgetInputSchema.safeParse(input)
  if (!validated.success) return failure('invalid-input')

  const current = readStoredBudgets(storage)
  if (!current.ok) return current

  const now = new Date().toISOString()
  const budget: SavedBudget = {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    input: validated.data,
  }

  const written = writeStoredBudgets([...current.data, budget], storage)
  return written.ok ? { ok: true, data: budget } : written
}

export function updateBudget(id: string, input: BudgetInput, storage?: StorageLike, expectedUpdatedAt?: string): StorageResult<SavedBudget> {
  const validated = budgetInputSchema.safeParse(input)
  if (!validated.success) return failure('invalid-input')

  const current = readStoredBudgets(storage)
  if (!current.ok) return current

  const existing = current.data.find((budget) => budget.id === id)
  if (!existing) return failure('not-found')
  if (expectedUpdatedAt !== undefined && existing.updatedAt !== expectedUpdatedAt) return failure('conflict')

  const budget: SavedBudget = {
    ...existing,
    updatedAt: nextTimestamp(existing.updatedAt),
    input: validated.data,
  }
  const next = current.data.map((item) => (item.id === id ? budget : item))

  const written = writeStoredBudgets(next, storage)
  return written.ok ? { ok: true, data: budget } : written
}

export function deleteBudget(id: string, storage?: StorageLike): StorageResult<void> {
  const current = readStoredBudgets(storage)
  if (!current.ok) return current

  const next = current.data.filter((budget) => budget.id !== id)
  if (next.length === current.data.length) return failure('not-found')

  return writeStoredBudgets(next, storage)
}

function backupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `valuarte-presupuestos-${stamp}.txt`
}

export function getBudgetBackup(storage?: StorageLike): StorageResult<BudgetBackup> {
  const store = resolveStorage(storage)
  if (!store) return failure('unavailable')

  let raw: string | null
  try {
    raw = store.getItem(BUDGETS_STORAGE_KEY)
  } catch {
    return failure('unavailable')
  }

  if (raw === null) return failure('empty')

  return { ok: true, data: { filename: backupFilename(), content: raw } }
}

/** Elimina datos solo mediante una acción explícita del usuario. */
export function discardBudgetData(storage?: StorageLike): StorageResult<void> {
  const store = resolveStorage(storage)
  if (!store) return failure('unavailable')

  try {
    store.removeItem(BUDGETS_STORAGE_KEY)
    return { ok: true, data: undefined }
  } catch (error) {
    if (isSecurityError(error)) return failure('unavailable')
    return failure('unknown')
  }
}
