import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BUDGETS_STORAGE_KEY } from '../../lib/budgetStorage'
import { Calculator } from '../calculator/Calculator'

async function fillCosts(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Costo de materiales (CLP)'), '20000')
  await user.type(screen.getByLabelText('Gastos adicionales (CLP)'), '5000')
  await user.type(screen.getByLabelText('Horas estimadas'), '5')
  await user.type(screen.getByLabelText('Valor por hora (CLP)'), '5000')
  await user.type(screen.getByLabelText('Margen deseado (%)'), '20')
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, name = 'Paisaje') {
  await user.type(screen.getByLabelText('Nombre de la obra o encargo'), name)
  await user.selectOptions(screen.getByLabelText('Tipo de obra (opcional)'), 'painting')
  await user.selectOptions(screen.getByLabelText('Técnica principal (opcional)'), 'watercolor')
  await fillCosts(user)
}

async function saveCurrentBudget(user: ReturnType<typeof userEvent.setup>, name = 'Paisaje') {
  await fillForm(user, name)
  await user.click(screen.getByRole('button', { name: /calcular precio sugerido/i }))
  await user.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))
}

function historyRegion() {
  return screen.getByRole('region', { name: 'Presupuestos guardados' })
}

interface StoredBudget {
  id: string
  createdAt: string
  updatedAt: string
  input: { name: string }
}

function storedBudgets(): StoredBudget[] {
  return JSON.parse(localStorage.getItem(BUDGETS_STORAGE_KEY) ?? '[]') as StoredBudget[]
}

describe('historial de presupuestos', () => {
  it('guarda un presupuesto y lo conserva al recargar la aplicación', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Calculator />)
    await saveCurrentBudget(user)

    expect(screen.getByText('Presupuesto guardado.')).toBeInTheDocument()
    const history = historyRegion()
    expect(within(history).getByRole('heading', { name: 'Paisaje' })).toBeInTheDocument()
    expect(within(history).getByText('Pintura · Acuarela')).toBeInTheDocument()
    expect(within(history).getByText('$62.500')).toBeInTheDocument()

    unmount()
    render(<Calculator />)

    const reloaded = historyRegion()
    expect(within(reloaded).getByRole('heading', { name: 'Paisaje' })).toBeInTheDocument()
    expect(within(reloaded).getByText('$62.500')).toBeInTheDocument()
  })

  it('edita el presupuesto existente sin duplicarlo y conserva createdAt', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    const before = storedBudgets()[0]

    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))
    expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveValue('Paisaje')
    expect(screen.getByRole('button', { name: 'Actualizar presupuesto' })).toBeInTheDocument()

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Paisaje editado')
    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))

    expect(screen.getByText('Presupuesto actualizado.')).toBeInTheDocument()
    const records = storedBudgets()
    expect(records).toHaveLength(1)
    expect(records[0]?.id).toBe(before?.id)
    expect(records[0]?.createdAt).toBe(before?.createdAt)
    expect(records[0]?.updatedAt).not.toBe(before?.updatedAt)
    expect(within(historyRegion()).getByRole('heading', { name: 'Paisaje editado' })).toBeInTheDocument()
  })

  it('elimina con confirmación en línea, permite cancelar y funciona con teclado', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    const history = historyRegion()

    await user.click(within(history).getByRole('button', { name: 'Eliminar Paisaje' }))
    const confirmation = within(history).getByRole('group', { name: 'Confirmar eliminación de Paisaje' })
    await user.click(within(confirmation).getByRole('button', { name: 'Cancelar' }))
    expect(within(history).queryByRole('group', { name: 'Confirmar eliminación de Paisaje' })).not.toBeInTheDocument()
    expect(within(history).getByRole('heading', { name: 'Paisaje' })).toBeInTheDocument()

    const deleteButton = within(history).getByRole('button', { name: 'Eliminar Paisaje' })
    deleteButton.focus()
    await user.keyboard('{Enter}')
    expect(within(history).getByRole('button', { name: 'Sí, eliminar' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(within(history).queryByRole('group', { name: 'Confirmar eliminación de Paisaje' })).not.toBeInTheDocument()
    expect(deleteButton).toHaveFocus()

    await user.click(deleteButton)
    await user.click(within(history).getByRole('button', { name: 'Sí, eliminar' }))
    expect(within(history).getByText(/todavía no hay presupuestos/i)).toBeInTheDocument()
    expect(storedBudgets()).toHaveLength(0)
  })

  it('conserva el tipo, la técnica y las opciones personalizadas al guardar y editar', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await user.type(screen.getByLabelText('Nombre de la obra o encargo'), 'Bordado')
    await user.selectOptions(screen.getByLabelText('Tipo de obra (opcional)'), 'other')
    await user.type(screen.getByLabelText('Especifica el tipo de obra'), 'Instalación')
    await user.selectOptions(screen.getByLabelText('Técnica principal (opcional)'), 'other')
    await user.type(screen.getByLabelText('Especifica la técnica principal'), 'Bordado sobre tela')
    await fillCosts(user)
    await user.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))

    const history = historyRegion()
    expect(within(history).getByText('Instalación · Bordado sobre tela')).toBeInTheDocument()

    await user.click(within(history).getByRole('button', { name: 'Editar Bordado' }))
    expect(screen.getByLabelText('Tipo de obra (opcional)')).toHaveValue('other')
    expect(screen.getByLabelText('Especifica el tipo de obra')).toHaveValue('Instalación')
    expect(screen.getByLabelText('Técnica principal (opcional)')).toHaveValue('other')
    expect(screen.getByLabelText('Especifica la técnica principal')).toHaveValue('Bordado sobre tela')
  })

  it('informa y no sobrescribe cuando los datos almacenados están dañados', async () => {
    const user = userEvent.setup()
    localStorage.setItem(BUDGETS_STORAGE_KEY, '{"datos":')
    render(<Calculator />)

    expect(screen.getByRole('alert')).toHaveTextContent(/datos están dañados/i)
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))

    expect(screen.getAllByRole('alert').some((alert) => /datos están dañados/i.test(alert.textContent ?? ''))).toBe(true)
    expect(localStorage.getItem(BUDGETS_STORAGE_KEY)).toBe('{"datos":')
  })
})
