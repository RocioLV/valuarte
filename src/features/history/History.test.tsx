import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BudgetInput } from '../../domain/types'
import { BUDGETS_STORAGE_KEY, createBudget, updateBudget } from '../../lib/budgetStorage'
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
  input: BudgetInput
}

function storedBudgets(): StoredBudget[] {
  return JSON.parse(localStorage.getItem(BUDGETS_STORAGE_KEY) ?? '[]') as StoredBudget[]
}

function storedBudget(): StoredBudget {
  const [budget] = storedBudgets()
  if (!budget) throw new Error('No hay presupuestos guardados para la prueba.')
  return budget
}

async function emitStorageEvent() {
  await act(async () => {
    const event = new Event('storage')
    Object.defineProperty(event, 'key', { value: BUDGETS_STORAGE_KEY })
    window.dispatchEvent(event)
  })
}

function externalUpdate(name: string) {
  const budget = storedBudget()
  const result = updateBudget(budget.id, { ...budget.input, name })
  if (!result.ok) throw new Error('No se pudo simular el cambio externo.')
  return result.data
}

function externalUpdateNamed(currentName: string, nextName: string) {
  const budget = storedBudgets().find((item) => item.input.name === currentName)
  if (!budget) throw new Error('No se encontró el presupuesto para el cambio externo.')
  const result = updateBudget(budget.id, { ...budget.input, name: nextName })
  if (!result.ok) throw new Error('No se pudo simular el cambio externo.')
  return result.data
}

function externalCreate(name: string) {
  const result = createBudget({ ...storedBudget().input, name })
  if (!result.ok) throw new Error('No se pudo simular el presupuesto externo.')
  return result.data
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

  it('mueve el foco al formulario y anuncia la carga al editar', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)

    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    await waitFor(() => expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveFocus())
    expect(screen.getByText('Presupuesto cargado para edición.')).toBeInTheDocument()
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

  it('permite descargar un respaldo y eliminar datos dañados con confirmación', async () => {
    const user = userEvent.setup()
    const corrupt = '{"datos":'
    localStorage.setItem(BUDGETS_STORAGE_KEY, corrupt)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    render(<Calculator />)

    expect(screen.getByRole('alert')).toHaveTextContent(/datos están dañados/i)

    await user.click(screen.getByRole('button', { name: 'Descargar respaldo' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
    expect(screen.getByText(/respaldo descargado/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Borrar datos dañados' }))
    const confirmation = screen.getByRole('group', { name: 'Confirmar eliminación de datos dañados' })
    await user.click(within(confirmation).getByRole('button', { name: 'Cancelar' }))
    expect(localStorage.getItem(BUDGETS_STORAGE_KEY)).toBe(corrupt)

    await user.click(screen.getByRole('button', { name: 'Borrar datos dañados' }))
    await user.click(screen.getByRole('button', { name: 'Sí, borrar datos' }))
    expect(localStorage.getItem(BUDGETS_STORAGE_KEY)).toBeNull()
    expect(screen.getByText(/datos dañados eliminados/i)).toBeInTheDocument()

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))
    expect(storedBudgets()).toHaveLength(1)
  })

  it('actualiza el historial cuando otra pestaña modifica los datos y no hay cambios locales', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)

    externalUpdate('Versión externa')
    await emitStorageEvent()

    const history = historyRegion()
    expect(within(history).getByRole('heading', { name: 'Versión externa' })).toBeInTheDocument()
    expect(within(history).queryByRole('heading', { name: 'Paisaje' })).not.toBeInTheDocument()
  })

  it('no sobrescribe otro presupuesto editado desde una segunda pestaña', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)

    await user.click(screen.getByRole('button', { name: 'Cargar ejemplo' }))
    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Otra obra')
    await user.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))
    expect(storedBudgets()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))
    await user.clear(name)
    await user.type(name, 'Paisaje local')

    externalUpdateNamed('Otra obra', 'Otra obra externa')
    await emitStorageEvent()
    expect(screen.getByRole('alert')).toHaveTextContent(/cambios guardados desde otra pestaña/i)

    await user.click(screen.getByRole('button', { name: 'Mantener mis cambios' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))

    const records = storedBudgets()
    expect(records).toHaveLength(2)
    expect(records.find((budget) => budget.input.name === 'Paisaje local')).toBeDefined()
    expect(records.find((budget) => budget.input.name === 'Otra obra externa')).toBeDefined()
  })

  it('conserva presupuestos agregados por otra pestaña al guardar cambios locales', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    externalCreate('Agregado externo')
    await emitStorageEvent()
    expect(screen.getByRole('alert')).toHaveTextContent(/cambios guardados desde otra pestaña/i)

    await user.click(screen.getByRole('button', { name: 'Mantener mis cambios' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))

    const records = storedBudgets()
    expect(records).toHaveLength(2)
    expect(records.find((budget) => budget.input.name === 'Cambio local')).toBeDefined()
    expect(records.find((budget) => budget.input.name === 'Agregado externo')).toBeDefined()
  })

  it('advierte y mantiene los cambios locales ante modificaciones simultáneas', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    externalUpdate('Versión externa')
    await emitStorageEvent()

    expect(screen.getByRole('alert')).toHaveTextContent(/cambios guardados desde otra pestaña/i)
    expect(within(historyRegion()).getByRole('heading', { name: 'Paisaje' })).toBeInTheDocument()
    expect(within(historyRegion()).queryByRole('heading', { name: 'Versión externa' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mantener mis cambios' }))

    expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveValue('Cambio local')
    expect(within(historyRegion()).getByRole('heading', { name: 'Versión externa' })).toBeInTheDocument()
    expect(screen.queryByText(/cambios guardados desde otra pestaña/i)).not.toBeInTheDocument()
  })

  it('pide confirmación antes de sobrescribir la versión de otra pestaña', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    externalUpdate('Versión externa')
    await emitStorageEvent()
    await user.click(screen.getByRole('button', { name: 'Mantener mis cambios' }))

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(storedBudget().input.name).toBe('Versión externa')
    expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveValue('Cambio local')
    expect(screen.getByRole('button', { name: 'Actualizar presupuesto' })).toBeInTheDocument()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))
    expect(storedBudget().input.name).toBe('Cambio local')
    expect(within(historyRegion()).getByRole('heading', { name: 'Cambio local' })).toBeInTheDocument()
  })

  it('permite descartar los cambios locales y recargar la versión más reciente', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    externalUpdate('Versión externa')
    await emitStorageEvent()

    await user.click(screen.getByRole('button', { name: 'Descartar mis cambios y recargar' }))

    expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveValue('Versión externa')
    expect(screen.getByRole('button', { name: 'Actualizar presupuesto' })).toBeInTheDocument()
    expect(within(historyRegion()).getByRole('heading', { name: 'Versión externa' })).toBeInTheDocument()
  })

  it('solicita confirmación antes de cancelar una edición con cambios', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'Cancelar edición' }))

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(name).toHaveValue('Cambio local')
    expect(screen.getByRole('button', { name: 'Actualizar presupuesto' })).toBeInTheDocument()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Cancelar edición' }))

    expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Actualizar presupuesto' })).not.toBeInTheDocument()
  })

  it('detecta cambios en el tipo de obra antes de descartar la edición', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    await user.selectOptions(screen.getByLabelText('Tipo de obra (opcional)'), 'drawing')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'Cancelar edición' }))

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Actualizar presupuesto' })).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de obra (opcional)')).toHaveValue('drawing')
  })

  it('solicita confirmación antes de abrir otro presupuesto con cambios pendientes', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Cargar ejemplo' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Otra obra')
    await user.click(screen.getByRole('button', { name: 'Guardar presupuesto' }))
    expect(storedBudgets()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))
    await user.clear(name)
    await user.type(name, 'Cambio local')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'Editar Otra obra' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(name).toHaveValue('Cambio local')
    expect(screen.getByRole('button', { name: 'Actualizar presupuesto' })).toBeInTheDocument()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Editar Otra obra' }))
    expect(screen.getByLabelText('Nombre de la obra o encargo')).toHaveValue('Otra obra')
  })

  it('activa la advertencia del navegador cuando hay cambios sin guardar', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('detecta un conflicto al guardar y permite resolverlo explícitamente', async () => {
    const user = userEvent.setup()
    render(<Calculator />)
    await saveCurrentBudget(user)
    await user.click(screen.getByRole('button', { name: 'Editar Paisaje' }))

    const name = screen.getByLabelText('Nombre de la obra o encargo')
    await user.clear(name)
    await user.type(name, 'Cambio local')

    const before = storedBudget()
    const external = updateBudget(before.id, { ...before.input, name: 'Versión externa' })
    expect(external.ok).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))

    expect(screen.getByText(/cambió en otra pestaña/i)).toBeInTheDocument()
    expect(screen.getByText(/cambios guardados desde otra pestaña/i)).toBeInTheDocument()
    const stored = storedBudgets().find((budget) => budget.id === before.id)
    expect(stored?.input.name).toBe('Versión externa')

    await user.click(screen.getByRole('button', { name: 'Mantener mis cambios' }))
    await user.click(screen.getByRole('button', { name: 'Actualizar presupuesto' }))

    expect(storedBudget().input.name).toBe('Cambio local')
  })
})
