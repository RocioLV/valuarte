import type { ArtworkTypeId, TechniqueId } from './classification'

/** Importes expresados en pesos chilenos (CLP). */
export interface BudgetCosts {
  materialsCost: number
  estimatedHours: number
  hourlyRate: number
  additionalExpenses: number
}

export interface BudgetInput extends BudgetCosts {
  name: string
  artworkType?: ArtworkTypeId
  artworkTypeOther?: string
  technique?: TechniqueId
  techniqueOther?: string
  desiredMarginPercent: number
}

/** Presupuesto persistido con sus datos normalizados, sin resultados derivados. */
export interface SavedBudget {
  id: string
  createdAt: string
  updatedAt: string
  input: BudgetInput
}

export interface ScenarioResult {
  salePrice: number
  estimatedSurplus: number
  // No está definido cuando el precio de venta es cero.
  marginPercent: number | null
}

export interface BudgetResult {
  materialsCost: number
  laborCost: number
  additionalExpenses: number
  totalCost: number
  suggestedPrice: number
  estimatedSurplus: number
  marginPercent: number | null
}

export interface ScenarioComparison {
  first: ScenarioResult
  second: ScenarioResult
  // Excedente del segundo escenario menos el del primero, en CLP.
  surplusDifference: number
}
