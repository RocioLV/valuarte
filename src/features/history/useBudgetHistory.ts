import { useCallback, useEffect, useRef, useState } from 'react'
import type { BudgetInput, SavedBudget } from '../../domain/types'
import { BUDGETS_STORAGE_KEY, createBudget, deleteBudget, discardBudgetData, getBudgetBackup, listBudgets, updateBudget } from '../../lib/budgetStorage'
import type { BudgetBackup, BudgetStorageError, StorageResult } from '../../lib/budgetStorage'

interface HistorySnapshot {
  budgets: SavedBudget[]
  error: BudgetStorageError | null
}

function readHistory(): HistorySnapshot {
  const result = listBudgets()
  return result.ok ? { budgets: result.data, error: null } : { budgets: [], error: result.error }
}

export function useBudgetHistory({ hasUnsavedChanges }: { hasUnsavedChanges: boolean }) {
  const [history, setHistory] = useState<HistorySnapshot>(readHistory)
  const [conflict, setConflict] = useState(false)
  const pendingExternal = useRef<HistorySnapshot | null>(null)

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== null && event.key !== BUDGETS_STORAGE_KEY) return

      const fresh = readHistory()
      if (hasUnsavedChanges) {
        pendingExternal.current = fresh
        setConflict(true)
      } else {
        pendingExternal.current = null
        setHistory(fresh)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (hasUnsavedChanges || !pendingExternal.current) return

    const pending = pendingExternal.current
    pendingExternal.current = null
    setConflict(false)
    setHistory(pending)
  }, [hasUnsavedChanges])

  const refresh = useCallback(() => {
    setHistory(readHistory())
  }, [])

  const save = useCallback((input: BudgetInput, editingId?: string, expectedUpdatedAt?: string): StorageResult<SavedBudget> => {
    const result = editingId
      ? updateBudget(editingId, input, undefined, expectedUpdatedAt)
      : createBudget(input)

    if (result.ok) {
      pendingExternal.current = null
      setConflict(false)
      refresh()
    } else if (result.error.code === 'conflict') {
      pendingExternal.current = readHistory()
      setConflict(true)
    }

    return result
  }, [refresh])

  const remove = useCallback((id: string): StorageResult<void> => {
    const result = deleteBudget(id)
    if (result.ok) {
      pendingExternal.current = null
      setConflict(false)
      refresh()
    }
    return result
  }, [refresh])

  const resolveConflict = useCallback((): HistorySnapshot => {
    const fresh = pendingExternal.current ?? readHistory()
    pendingExternal.current = null
    setConflict(false)
    setHistory(fresh)
    return fresh
  }, [])

  const discardCorruptData = useCallback((): StorageResult<void> => {
    const result = discardBudgetData()
    if (result.ok) {
      pendingExternal.current = null
      setConflict(false)
      refresh()
    }
    return result
  }, [refresh])

  const backup = useCallback((): StorageResult<BudgetBackup> => getBudgetBackup(), [])

  return {
    budgets: history.budgets,
    error: history.error?.message ?? null,
    errorCode: history.error?.code ?? null,
    conflict,
    save,
    remove,
    resolveConflict,
    discardCorruptData,
    backup,
  }
}
