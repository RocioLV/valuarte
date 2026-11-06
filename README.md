# Valuarte

Aplicación web para artistas visuales independientes. Permite calcular el precio sugerido de una obra, comparar escenarios de venta y conservar un historial de presupuestos en el navegador.

## Funcionalidades

- Calculadora de costos, remuneración, precio sugerido y margen efectivo en pesos chilenos (CLP).
- Comparador de dos precios de venta a partir de los costos calculados.
- Clasificación opcional por tipo de obra y técnica principal, con opciones personalizadas.
- Historial de presupuestos guardados en LocalStorage, con edición y eliminación.

Los presupuestos se guardan únicamente en el navegador. No hay backend, autenticación ni sincronización entre dispositivos.

## Sistema tipográfico

Valuarte usa pilas tipográficas del sistema, sin fuentes externas ni dependencias adicionales:

- **Serif** (`ui-serif`, Georgia, Cambria, Times New Roman): títulos principales, nombres de obras y montos destacados.
- **Sans serif** (`system-ui`, Segoe UI, Roboto, Helvetica Neue, Arial): contenido, formularios, mensajes y texto de apoyo.
- **Monoespaciada** (`ui-monospace`, SF Mono, Menlo, Consolas): numeración de secciones, etiquetas técnicas, botones y metadatos.

Criterio editorial de encabezados:

- Número de sección → título: `0,75rem` (`mt-3`).
- Título → descripción: `0,75rem` (`mt-3`).
- Descripción → contenido: `1,5rem` (`mt-6`).

Las descripciones principales usan `1rem` con interlineado amplio; las etiquetas y textos auxiliares se mantienen en `0.875rem` para conservar densidad sin perder legibilidad.

## Requisitos

- Node.js `^22.22.2`, `^24.15.0` o `>=26.0.0` (rango declarado en `engines`).
- npm.

El rango corresponde a la intersección de los requisitos de las dependencias principales de desarrollo: Vite 8, Vitest 5 y jsdom 31. La versión de Node usada en el despliegue de Netlify es `22.22.2`.

## Desarrollo

```sh
npm install
npm run dev
```

## Compilación local

```sh
npm run build
npm run preview
```

El resultado de la compilación se genera en `dist/`.

## Despliegue en Netlify

El repositorio incluye `netlify.toml` con la configuración de despliegue:

- Node.js `22.22.2`.
- Comando de compilación `npm run build`.
- Directorio publicado `dist`.
- Redirección de aplicación de página única: todas las rutas se resuelven en `/index.html` con estado `200`.

Procedimiento:

1. Sube el repositorio a un proveedor de Git compatible con Netlify (por ejemplo, GitHub).
2. En Netlify, selecciona **Add new site** → **Import an existing project** y elige el repositorio.
3. Verifica que el comando de compilación sea `npm run build` y el directorio de publicación sea `dist`. Ambos valores se toman de `netlify.toml`.
4. Confirma la creación del sitio. Netlify instalará las dependencias y ejecutará la compilación.
5. La aplicación queda publicada en la raíz del dominio. Los recursos usan la base `/` y la redirección de `netlify.toml` mantiene las rutas del cliente.

No se requiere configuración adicional de variables de entorno ni backend.

## Notas de compatibilidad de formularios

Los controles `select` de «Tipo de obra» y «Técnica principal» conservan el comportamiento nativo del navegador y del sistema operativo. La hoja de estilos fija un tamaño mínimo de `1rem` (16 px) para el control y para sus `option`, y define fondo y color de las opciones cuando el navegador permite personalizarlas.

La apariencia del menú desplegable abierto sigue dependiendo del sistema:

- En navegadores de escritorio basados en Chromium y Firefox, los estilos de `option` suelen aplicarse parcialmente.
- En Safari y en los selectores nativos de iOS, el menú puede ignorar el tamaño, el color y el fondo definidos en CSS.
- En Android, el selector puede adoptar el tema del sistema.

No se reemplazan los controles nativos para no perder accesibilidad, navegación por teclado ni compatibilidad con lectores de pantalla.

## Comprobaciones

```sh
npm run lint
npm test
npm run build
npm audit
npm audit --omit=dev
```

`npm audit` incluye las dependencias de desarrollo; `npm audit --omit=dev` permite revisar únicamente las dependencias de producción.
