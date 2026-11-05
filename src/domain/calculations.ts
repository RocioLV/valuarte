import type { BudgetCosts, BudgetInput, BudgetResult, ScenarioComparison, ScenarioResult } from './types'

export const MAX_DESIRED_MARGIN_PERCENT = 90

function validateNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`${label} debe ser un número finito entre 0 y ${Number.MAX_SAFE_INTEGER}.`)
  }
}

function validateResult(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`${label} excede el rango numérico admitido.`)
  }
  return value
}

function calculateCosts(costs: BudgetCosts) {
  validateNonNegative(costs.materialsCost, 'El costo de materiales')
  validateNonNegative(costs.estimatedHours, 'Las horas estimadas')
  validateNonNegative(costs.hourlyRate, 'El valor por hora')
  validateNonNegative(costs.additionalExpenses, 'Los gastos adicionales')

  // La remuneración es el tiempo trabajado multiplicado por su valor por hora.
  const laborCost = validateResult(costs.estimatedHours * costs.hourlyRate, 'La remuneración')
  // El costo total incluye materiales, gastos y remuneración por trabajo.
  const totalCost = validateResult(costs.materialsCost + laborCost + costs.additionalExpenses, 'El costo total')
  return { laborCost, totalCost }
}

function scenarioFromCost(totalCost: number, salePrice: number): ScenarioResult {
  validateNonNegative(salePrice, 'El precio de venta')
  // El excedente es el ingreso menos todos los costos, incluida la remuneración.
  const estimatedSurplus = validateResult(salePrice - totalCost, 'El excedente')
  // El margen efectivo es el excedente como porcentaje del precio de venta.
  const marginPercent = salePrice === 0
    ? null
    : validateResult((estimatedSurplus / salePrice) * 100, 'El margen efectivo')
  return { salePrice, estimatedSurplus, marginPercent }
}

export function calculateBudget(input: BudgetInput): BudgetResult {
  const { desiredMarginPercent } = input
  if (!Number.isFinite(desiredMarginPercent) || desiredMarginPercent < 0 || desiredMarginPercent > MAX_DESIRED_MARGIN_PERCENT) {
    throw new RangeError(`El margen deseado debe estar entre 0 y ${MAX_DESIRED_MARGIN_PERCENT} %.`)
  }

  const { laborCost, totalCost } = calculateCosts(input)
  // Margen sobre venta: precio = costo / (1 - margen); se redondea hacia arriba al peso.
  const suggestedPrice = validateResult(Math.ceil((totalCost * 100) / (100 - desiredMarginPercent)), 'El precio sugerido')
  const { estimatedSurplus, marginPercent } = scenarioFromCost(totalCost, suggestedPrice)

  return {
    materialsCost: input.materialsCost,
    laborCost,
    additionalExpenses: input.additionalExpenses,
    totalCost,
    suggestedPrice,
    estimatedSurplus,
    marginPercent,
  }
}

export function compareScenarios(costs: BudgetCosts, firstPrice: number, secondPrice: number): ScenarioComparison {
  const { totalCost } = calculateCosts(costs)
  const first = scenarioFromCost(totalCost, firstPrice)
  const second = scenarioFromCost(totalCost, secondPrice)

  return {
    first,
    second,
    surplusDifference: validateResult(secondPrice - firstPrice, 'La diferencia entre escenarios'),
  }
}
