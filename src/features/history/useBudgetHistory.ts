import { useCallback, useState } from 'react'
import type { BudgetInput, SavedBudget } from '../../domain/types'
import { createBudget, deleteBudget, listBudgets, updateBudget } from '../../lib/budgetStorage'
import type { StorageResult } from '../../lib/budgetStorage'

interface HistoryState {
  budgets: SavedBudget[]
  error: string | null
}

function readHistory(): HistoryState {
  const result = listBudgets()
  return result.ok
    ? { budgets: result.data, error: null }
    : { budgets: [], error: result.error.message }
}

export function useBudgetHistory() {
  const [history, setHistory] = useState<HistoryState>(readHistory)

  const refresh = useCallback(() => {
    setHistory(readHistory())
  }, [])

  const save = useCallback((input: BudgetInput, editingId?: string): StorageResult<SavedBudget> => {
    const result = editingId ? updateBudget(editingId, input) : createBudget(input)
    if (result.ok) refresh()
    return result
  }, [refresh])

  const remove = useCallback((id: string): StorageResult<void> => {
    const result = deleteBudget(id)
    if (result.ok) refresh()
    return result
  }, [refresh])

  return { budgets: history.budgets, error: history.error, save, remove }
}
