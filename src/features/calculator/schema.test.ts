import { describe, expect, it } from 'vitest'
import { calculatorSchema } from './schema'

const input = {
  name: 'Obra', artworkType: '', artworkTypeOther: '', technique: '', techniqueOther: '',
  materialsCost: '1000', estimatedHours: '1', hourlyRate: '1000', additionalExpenses: '0', desiredMarginPercent: '20',
} as const

describe('clasificación del presupuesto', () => {
  it('conserva identificadores independientes y descripciones personalizadas normalizadas', () => {
    const result = calculatorSchema.parse({ ...input, artworkType: 'other', artworkTypeOther: '  Instalación  ', technique: 'other', techniqueOther: '  Bordado  ' })
    expect(result).toMatchObject({ artworkType: 'other', artworkTypeOther: 'Instalación', technique: 'other', techniqueOther: 'Bordado' })
    expect(calculatorSchema.parse({ ...input, artworkType: 'sculpture', technique: 'watercolor' })).toMatchObject({ artworkType: 'sculpture', technique: 'watercolor' })
  })

  it('omite descripciones antiguas cuando ya no está seleccionada la opción otra', () => {
    const result = calculatorSchema.parse({ ...input, artworkType: 'painting', artworkTypeOther: 'Anterior', techniqueOther: 'Anterior' })
    expect(result.artworkTypeOther).toBeUndefined()
    expect(result.technique).toBeUndefined()
    expect(result.techniqueOther).toBeUndefined()
  })

  it('rechaza descripciones vacías para otra y los identificadores desconocidos', () => {
    expect(calculatorSchema.safeParse({ ...input, artworkType: 'other', artworkTypeOther: '  ' }).success).toBe(false)
    expect(calculatorSchema.safeParse({ ...input, technique: 'other', techniqueOther: '  ' }).success).toBe(false)
    expect(calculatorSchema.safeParse({ ...input, technique: 'desconocida' }).success).toBe(false)
  })
})
