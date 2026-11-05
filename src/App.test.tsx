import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('muestra la presentación inicial de Valuarte', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /tu trabajo creativo tiene valor/i })).toBeInTheDocument()
  })
})
