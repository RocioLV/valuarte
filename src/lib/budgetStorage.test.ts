import { describe, expect, it } from 'vitest'
import type { BudgetInput } from '../domain/types'
import { BUDGETS_STORAGE_KEY, createBudget, deleteBudget, listBudgets, updateBudget } from './budgetStorage'
import type { StorageLike } from './budgetStorage'

const baseInput: BudgetInput = {
  name: 'Paisaje',
  artworkType: 'painting',
  technique: 'watercolor',
  materialsCost: 20_000,
  estimatedHours: 5,
  hourlyRate: 5_000,
  additionalExpenses: 5_000,
  desiredMarginPercent: 20,
}

function memoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('almacenamiento de presupuestos', () => {
  it('crea y recupera presupuestos bajo la clave versionada', () => {
    const storage = memoryStorage()
    const created = createBudget(baseInput, storage)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(storage.values.has(BUDGETS_STORAGE_KEY)).toBe(true)
    expect(created.data.id).toBeTruthy()
    expect(created.data.createdAt).toBe(created.data.updatedAt)
    expect(created.data.input).toEqual(baseInput)

    const listed = listBudgets(storage)
    expect(listed.ok).toBe(true)
    if (listed.ok) expect(listed.data).toEqual([created.data])
  })

  it('conserva identificadores, createdAt y actualiza updatedAt sin duplicar', () => {
    const storage = memoryStorage()
    const created = createBudget(baseInput, storage)
    if (!created.ok) throw new Error('No se pudo preparar la prueba.')

    const updated = updateBudget(created.data.id, { ...baseInput, name: 'Paisaje editado' }, storage)
    expect(updated.ok).toBe(true)
    if (!updated.ok) return

    expect(updated.data.id).toBe(created.data.id)
    expect(updated.data.createdAt).toBe(created.data.createdAt)
    expect(updated.data.updatedAt).not.toBe(created.data.updatedAt)
    expect(updated.data.input.name).toBe('Paisaje editado')

    const listed = listBudgets(storage)
    if (listed.ok) {
      expect(listed.data).toHaveLength(1)
      expect(listed.data[0]?.input.name).toBe('Paisaje editado')
    }
  })

  it('elimina presupuestos y avisa cuando ya no existen', () => {
    const storage = memoryStorage()
    const first = createBudget(baseInput, storage)
    const second = createBudget({ ...baseInput, name: 'Otra obra' }, storage)
    if (!first.ok || !second.ok) throw new Error('No se pudo preparar la prueba.')

    expect(deleteBudget(first.data.id, storage).ok).toBe(true)
    const listed = listBudgets(storage)
    if (listed.ok) {
      expect(listed.data).toHaveLength(1)
      expect(listed.data[0]?.id).toBe(second.data.id)
    }

    const missing = deleteBudget(first.data.id, storage)
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.error.code).toBe('not-found')
  })

  it('conserva las clasificaciones personalizadas', () => {
    const storage = memoryStorage()
    const input: BudgetInput = {
      ...baseInput,
      artworkType: 'other',
      artworkTypeOther: 'Instalación',
      technique: 'other',
      techniqueOther: 'Bordado',
    }
    const created = createBudget(input, storage)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const listed = listBudgets(storage)
    if (listed.ok) expect(listed.data[0]?.input).toMatchObject({
      artworkType: 'other',
      artworkTypeOther: 'Instalación',
      technique: 'other',
      techniqueOther: 'Bordado',
    })
  })

  it('no sobrescribe datos dañados ni presupuestos inválidos', () => {
    const storage = memoryStorage()
    storage.setItem(BUDGETS_STORAGE_KEY, '{"datos":')

    const read = listBudgets(storage)
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.error.code).toBe('invalid')

    const rejected = createBudget(baseInput, storage)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.error.code).toBe('invalid')
    expect(storage.getItem(BUDGETS_STORAGE_KEY)).toBe('{"datos":')

    const invalidInput = createBudget({ ...baseInput, materialsCost: -1 }, storage)
    expect(invalidInput.ok).toBe(false)
    if (!invalidInput.ok) expect(invalidInput.error.code).toBe('invalid-input')
  })

  it('informa cuando LocalStorage no está disponible o no tiene espacio', () => {
    const blocked: StorageLike = {
      getItem: () => { throw new DOMException('Bloqueado', 'SecurityError') },
      setItem: () => undefined,
    }
    const unavailable = listBudgets(blocked)
    expect(unavailable.ok).toBe(false)
    if (!unavailable.ok) expect(unavailable.error.code).toBe('unavailable')

    const full: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Sin espacio', 'QuotaExceededError') },
    }
    const fullResult = createBudget(baseInput, full)
    expect(fullResult.ok).toBe(false)
    if (!fullResult.ok) expect(fullResult.error.code).toBe('quota')
  })

  it('rechaza registros almacenados con campos incompletos o inconsistentes', () => {
    const storage = memoryStorage()
    storage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify([{ id: 'uno', createdAt: new Date().toISOString() }]))

    const read = listBudgets(storage)
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.error.code).toBe('invalid')
  })
})
