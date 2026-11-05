import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Comparison } from './Comparison'
import { Calculator } from '../calculator/Calculator'

const costs = { materialsCost: 20_000, additionalExpenses: 5_000, estimatedHours: 5, hourlyRate: 5_000 }

describe('Comparador de escenarios', () => {
  it('muestra los resultados de ambos escenarios, incluidas pérdidas y formato CLP', async () => {
    const user = userEvent.setup()
    render(<Comparison costs={costs} totalCost={50_000} />)
    await user.type(screen.getByLabelText('Precio de venta A (CLP)'), '40000')
    await user.tab()
    expect(screen.getByLabelText('Precio de venta A (CLP)')).toHaveValue('40.000')
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), '80000')
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))
    const a = screen.getByRole('region', { name: 'Escenario A' })
    const b = screen.getByRole('region', { name: 'Escenario B' })
    for (const value of ['$40.000', '$50.000', '$-10.000', '-25 %']) expect(within(a).getByText(value)).toBeInTheDocument()
    for (const value of ['$80.000', '$50.000', '$30.000', '37,5 %']) expect(within(b).getByText(value)).toBeInTheDocument()
    expect(screen.getByText('El escenario B genera mayor excedente.')).toBeInTheDocument()
    expect(screen.getByText('Diferencia de excedente (B − A)').nextElementSibling).toHaveTextContent('$40.000')
  })

  it.each([
    ['80000', '40000', '$-40.000', 'El escenario A genera mayor excedente.'],
    ['50000', '50000', '$0', 'Ambos escenarios generan el mismo excedente.'],
    ['0', '50000', '$50.000', 'El escenario B genera mayor excedente.'],
  ])('informa correctamente la diferencia entre %s y %s', async (first, second, difference, explanation) => {
    const user = userEvent.setup()
    render(<Comparison costs={costs} totalCost={50_000} />)
    await user.type(screen.getByLabelText('Precio de venta A (CLP)'), first)
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), second)
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))
    expect(screen.getByText('Diferencia de excedente (B − A)').nextElementSibling).toHaveTextContent(difference)
    expect(screen.getByText(explanation)).toBeInTheDocument()
    if (first === '0') expect(within(screen.getByRole('region', { name: 'Escenario A' })).getByText('No disponible')).toBeInTheDocument()
  })

  it.each(['-1', 'abc', '1.23'])('rechaza el precio inválido %s', async (value) => {
    const user = userEvent.setup()
    render(<Comparison costs={costs} totalCost={50_000} />)
    const first = screen.getByLabelText('Precio de venta A (CLP)')
    await user.type(first, value)
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), '1000')
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))
    expect(first).toHaveAttribute('aria-invalid', 'true')
    expect(first).toHaveAccessibleDescription(/ingresa un monto válido/i)
    expect(screen.queryByRole('region', { name: 'Escenario A' })).not.toBeInTheDocument()
  })

  it('identifica los precios obligatorios y enfoca el primero inválido', async () => {
    const user = userEvent.setup()
    render(<Comparison costs={costs} totalCost={50_000} />)
    const first = screen.getByLabelText('Precio de venta A (CLP)')
    const second = screen.getByLabelText('Precio de venta B (CLP)')
    expect(first).toBeRequired()
    expect(second).toBeRequired()
    expect(first).toHaveAttribute('aria-required', 'true')

    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))

    expect(first).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent(/revisa los precios marcados/i)
  })

  it('permite comparar usando el teclado', async () => {
    const user = userEvent.setup()
    render(<Comparison costs={costs} totalCost={50_000} />)
    await user.tab()
    expect(screen.getByLabelText('Precio de venta A (CLP)')).toHaveFocus()
    await user.keyboard('40000')
    await user.tab()
    await user.keyboard('80000')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Comparar escenarios' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('region', { name: 'Escenario B' })).toBeInTheDocument()
  })

  it('descarta resultados al editar precios', async () => {
    const user = userEvent.setup()
    render(<Comparison costs={costs} totalCost={50_000} />)
    await user.type(screen.getByLabelText('Precio de venta A (CLP)'), '40000')
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), '80000')
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), '1')
    expect(screen.queryByRole('region', { name: 'Escenario B' })).not.toBeInTheDocument()
  })

  it('descarta la comparación al cambiar costos y utiliza los nuevos al recalcular', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    expect(screen.getByText(/calcula primero el precio sugerido/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cargar ejemplo' }))
    await user.click(screen.getByRole('button', { name: /calcular precio sugerido/i }))
    await user.type(screen.getByLabelText('Precio de venta A (CLP)'), '40000')
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), '80000')
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))
    expect(within(screen.getByRole('region', { name: 'Escenario A' })).getByText('$52.500')).toBeInTheDocument()
    const materials = screen.getByLabelText('Costo de materiales (CLP)')
    await user.clear(materials)
    await user.type(materials, '30000')
    expect(screen.queryByRole('region', { name: 'Escenario A' })).not.toBeInTheDocument()
    expect(screen.getByText(/calcula primero el precio sugerido/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /calcular precio sugerido/i }))
    await user.type(screen.getByLabelText('Precio de venta A (CLP)'), '40000')
    await user.type(screen.getByLabelText('Precio de venta B (CLP)'), '80000')
    await user.click(screen.getByRole('button', { name: 'Comparar escenarios' }))
    expect(within(screen.getByRole('region', { name: 'Escenario A' })).getByText('$62.500')).toBeInTheDocument()
  })
})
