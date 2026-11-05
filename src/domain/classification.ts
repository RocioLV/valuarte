export const ARTWORK_TYPES = [
  { id: 'painting', label: 'Pintura' },
  { id: 'drawing', label: 'Dibujo' },
  { id: 'illustration', label: 'Ilustración' },
  { id: 'photography', label: 'Fotografía' },
  { id: 'sculpture', label: 'Escultura' },
  { id: 'printmaking', label: 'Grabado' },
  { id: 'digital_art', label: 'Arte digital' },
  { id: 'other', label: 'Otra' },
] as const

export const TECHNIQUES = [
  { id: 'watercolor', label: 'Acuarela' },
  { id: 'oil', label: 'Óleo' },
  { id: 'acrylic', label: 'Acrílico' },
  { id: 'gouache', label: 'Gouache' },
  { id: 'charcoal', label: 'Carboncillo' },
  { id: 'graphite', label: 'Grafito' },
  { id: 'colored_pencils', label: 'Lápices de colores' },
  { id: 'soft_pastel', label: 'Pastel seco' },
  { id: 'oil_pastel', label: 'Pastel al óleo' },
  { id: 'ink', label: 'Tinta' },
  { id: 'mixed_media', label: 'Técnicas mixtas' },
  { id: 'digital', label: 'Digital' },
  { id: 'digital_photography', label: 'Fotografía digital' },
  { id: 'analog_photography', label: 'Fotografía analógica' },
  { id: 'screen_printing', label: 'Serigrafía' },
  { id: 'linocut', label: 'Linograbado' },
  { id: 'other', label: 'Otra' },
] as const

export type ArtworkTypeId = (typeof ARTWORK_TYPES)[number]['id']
export type TechniqueId = (typeof TECHNIQUES)[number]['id']
