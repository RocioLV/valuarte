import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

window.confirm = () => true

if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: () => 'blob:valuarte',
  })
}

if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: () => undefined,
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})
