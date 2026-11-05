import { describe, expect, it } from 'vitest'
import type { BudgetInput } from '../domain/types'
import { BUDGETS_STORAGE_KEY, createBudget, deleteBudget, discardBudgetData, getBudgetBackup, listBudgets, updateBudget } from './budgetStorage'
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
    removeItem: (key) => { values.delete(key) },
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
      removeItem: () => undefined,
    }
    const unavailable = listBudgets(blocked)
    expect(unavailable.ok).toBe(false)
    if (!unavailable.ok) expect(unavailable.error.code).toBe('unavailable')

    const full: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Sin espacio', 'QuotaExceededError') },
      removeItem: () => undefined,
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

  it('permite respaldar y descartar explícitamente datos dañados', () => {
    const storage = memoryStorage()
    const corrupt = '{"datos":'
    storage.setItem(BUDGETS_STORAGE_KEY, corrupt)

    const backup = getBudgetBackup(storage)
    expect(backup.ok).toBe(true)
    if (backup.ok) {
      expect(backup.data.content).toBe(corrupt)
      expect(backup.data.filename).toMatch(/^valuarte-presupuestos-.*\.txt$/)
    }

    expect(discardBudgetData(storage).ok).toBe(true)
    expect(storage.getItem(BUDGETS_STORAGE_KEY)).toBeNull()

    const after = listBudgets(storage)
    expect(after.ok).toBe(true)
    if (after.ok) expect(after.data).toEqual([])
    expect(createBudget(baseInput, storage).ok).toBe(true)
  })

  it('no permite respaldar cuando no hay datos guardados', () => {
    const backup = getBudgetBackup(memoryStorage())
    expect(backup.ok).toBe(false)
    if (!backup.ok) expect(backup.error.code).toBe('empty')
  })

  it('preserva las ediciones de presupuestos distintos realizadas desde dos pestañas', () => {
    const storage = memoryStorage()
    const first = createBudget({ ...baseInput, name: 'Primera obra' }, storage)
    const second = createBudget({ ...baseInput, name: 'Segunda obra' }, storage)
    if (!first.ok || !second.ok) throw new Error('No se pudo preparar la prueba.')

    const firstVersion = first.data.updatedAt
    const secondVersion = second.data.updatedAt

    const firstEdit = updateBudget(first.data.id, { ...first.data.input, name: 'Primera editada' }, storage, firstVersion)
    const secondEdit = updateBudget(second.data.id, { ...second.data.input, name: 'Segunda editada' }, storage, secondVersion)

    expect(firstEdit.ok).toBe(true)
    expect(secondEdit.ok).toBe(true)

    const listed = listBudgets(storage)
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.data).toHaveLength(2)
    expect(listed.data.find((budget) => budget.id === first.data.id)?.input.name).toBe('Primera editada')
    expect(listed.data.find((budget) => budget.id === second.data.id)?.input.name).toBe('Segunda editada')
  })

  it('conserva registros agregados por otra pestaña al actualizar un presupuesto', () => {
    const storage = memoryStorage()
    const first = createBudget({ ...baseInput, name: 'Paisaje' }, storage)
    if (!first.ok) throw new Error('No se pudo preparar la prueba.')

    const external = createBudget({ ...baseInput, name: 'Agregado externo' }, storage)
    if (!external.ok) throw new Error('No se pudo preparar la prueba.')

    const updated = updateBudget(first.data.id, { ...first.data.input, name: 'Paisaje editado' }, storage, first.data.updatedAt)
    expect(updated.ok).toBe(true)

    const listed = listBudgets(storage)
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.data).toHaveLength(2)
    expect(listed.data.find((budget) => budget.id === first.data.id)?.input.name).toBe('Paisaje editado')
    expect(listed.data.find((budget) => budget.id === external.data.id)?.input).toEqual(external.data.input)
  })

  it('rechaza actualizaciones basadas en una versión desactualizada', () => {
    const storage = memoryStorage()
    const created = createBudget(baseInput, storage)
    if (!created.ok) throw new Error('No se pudo preparar la prueba.')

    const updated = updateBudget(created.data.id, { ...baseInput, name: 'Primera edición' }, storage, created.data.updatedAt)
    expect(updated.ok).toBe(true)
    if (!updated.ok) return

    const stale = updateBudget(created.data.id, { ...baseInput, name: 'Edición desactualizada' }, storage, created.data.updatedAt)
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error.code).toBe('conflict')

    const afterConflict = listBudgets(storage)
    if (afterConflict.ok) expect(afterConflict.data[0]?.input.name).toBe('Primera edición')

    const fresh = updateBudget(created.data.id, { ...baseInput, name: 'Segunda edición' }, storage, updated.data.updatedAt)
    expect(fresh.ok).toBe(true)
    if (fresh.ok) expect(fresh.data.input.name).toBe('Segunda edición')
  })
})
