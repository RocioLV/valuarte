export function downloadTextFile(filename: string, content: string): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false

  let url: string
  try {
    url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  } catch {
    return false
  }

  let anchor: HTMLAnchorElement | null = null
  try {
    anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.append(anchor)
    anchor.click()
    return true
  } catch {
    return false
  } finally {
    anchor?.remove()
    if (typeof URL.revokeObjectURL === 'function') {
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }
}
