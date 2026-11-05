import { describe, expect, it } from 'vitest'
import { calculateBudget, compareScenarios, MAX_DESIRED_MARGIN_PERCENT } from './calculations'
import type { BudgetInput } from './types'

const budget: BudgetInput = {
  name: 'Obra',
  technique: 'watercolor',
  materialsCost: 20_000,
  estimatedHours: 5,
  hourlyRate: 5_000,
  additionalExpenses: 5_000,
  desiredMarginPercent: 20,
}

describe('calculateBudget', () => {
  it('distingue costos, remuneración y excedente sobre el precio sugerido', () => {
    expect(calculateBudget(budget)).toEqual({
      materialsCost: 20_000,
      laborCost: 25_000,
      additionalExpenses: 5_000,
      totalCost: 50_000,
      suggestedPrice: 62_500,
      estimatedSurplus: 12_500,
      marginPercent: 20,
    })
  })

  it('maneja costos cero sin dividir por un precio cero', () => {
    const result = calculateBudget({ ...budget, materialsCost: 0, estimatedHours: 0, additionalExpenses: 0 })
    expect(result.totalCost).toBe(0)
    expect(result.suggestedPrice).toBe(0)
    expect(result.estimatedSurplus).toBe(0)
    expect(result.marginPercent).toBeNull()
  })

  it('acepta margen cero y redondea el precio hacia arriba', () => {
    const result = calculateBudget({ ...budget, materialsCost: 20_000.25, desiredMarginPercent: 0 })
    expect(result.totalCost).toBe(50_000.25)
    expect(result.suggestedPrice).toBe(50_001)
    expect(result.estimatedSurplus).toBe(0.75)
  })

  it('redondea hacia arriba solo cuando el precio con margen es fraccionario', () => {
    const base = { ...budget, estimatedHours: 0, additionalExpenses: 0, desiredMarginPercent: 20 }
    expect(calculateBudget({ ...base, materialsCost: 1 }).suggestedPrice).toBe(2)
    expect(calculateBudget({ ...base, materialsCost: 4 }).suggestedPrice).toBe(5)
  })

  it('acepta el margen máximo del 90 %', () => {
    const result = calculateBudget({ ...budget, desiredMarginPercent: MAX_DESIRED_MARGIN_PERCENT })
    expect(result.suggestedPrice).toBe(500_000)
    expect(result.marginPercent).toBe(90)
  })

  it.each([-1, 90.01, 100, NaN, Infinity, -Infinity])('rechaza margen inválido %s', (margin) => {
    expect(() => calculateBudget({ ...budget, desiredMarginPercent: margin })).toThrow(RangeError)
  })

  it.each(['materialsCost', 'estimatedHours', 'hourlyRate', 'additionalExpenses'] as const)(
    'rechaza valores negativos y no finitos para %s', (field) => {
      for (const value of [-1, NaN, Infinity, -Infinity]) {
        expect(() => calculateBudget({ ...budget, [field]: value })).toThrow(RangeError)
      }
    },
  )

  it('rechaza resultados fuera del rango numérico seguro', () => {
    expect(() => calculateBudget({ ...budget, estimatedHours: Number.MAX_SAFE_INTEGER, hourlyRate: 2 })).toThrow(RangeError)
    expect(() => calculateBudget({ ...budget, materialsCost: Number.MAX_SAFE_INTEGER, estimatedHours: 0, additionalExpenses: 0 })).toThrow(RangeError)
  })
})

describe('compareScenarios', () => {
  it('compara excedentes y calcula la diferencia del segundo menos el primero', () => {
    const result = compareScenarios(budget, 40_000, 80_000)
    expect(result.first).toEqual({ salePrice: 40_000, estimatedSurplus: -10_000, marginPercent: -25 })
    expect(result.second).toEqual({ salePrice: 80_000, estimatedSurplus: 30_000, marginPercent: 37.5 })
    expect(result.surplusDifference).toBe(40_000)
    expect(compareScenarios(budget, 80_000, 40_000).surplusDifference).toBe(-40_000)
  })

  it('indica que el margen de un precio cero no está definido', () => {
    expect(compareScenarios(budget, 0, 50_000).first).toEqual({
      salePrice: 0,
      estimatedSurplus: -50_000,
      marginPercent: null,
    })
  })

  it.each([-1, NaN, Infinity, -Infinity])('rechaza precios inválidos: %s', (price) => {
    expect(() => compareScenarios(budget, price, 1)).toThrow(RangeError)
    expect(() => compareScenarios(budget, 1, price)).toThrow(RangeError)
  })

  it('valida los costos también al comparar', () => {
    expect(() => compareScenarios({ ...budget, materialsCost: -1 }, 0, 1)).toThrow(RangeError)
  })

  it('rechaza márgenes efectivos imposibles de representar de forma segura', () => {
    expect(() => compareScenarios(budget, Number.MIN_VALUE, 1)).toThrow(RangeError)
  })
})
