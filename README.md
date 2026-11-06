# Valuarte

Valuarte es una aplicación web para artistas visuales independientes que ayuda a calcular el precio sugerido de una obra, comparar escenarios de venta y guardar presupuestos en el navegador.

**Aplicación publicada:** <https://proyectovaluarte.netlify.app/>

## El problema

Muchos artistas visuales definen precios de forma intuitiva, sin un método claro para cubrir materiales, tiempo de trabajo, gastos adicionales y margen. Valuarte propone un proceso simple y transparente: ingresar costos, obtener una estimación desglosada y comparar alternativas de venta antes de decidir.

## Funcionalidades

- **Calculadora de precios** para obras artísticas: materiales, horas estimadas, valor por hora, gastos adicionales y margen deseado.
- **Desglose económico** con costo total, excedente estimado, margen efectivo y precio sugerido redondeado hacia arriba, todo en pesos chilenos (CLP).
- **Comparación de escenarios de venta**: dos precios frente a los costos calculados, con excedente, diferencia entre escenarios y margen efectivo.
- **Clasificación opcional** por tipo de obra y técnica principal, con opciones predefinidas y personalizadas.
- **Historial de presupuestos con LocalStorage**: guardar, editar y eliminar presupuestos en el navegador.
- **Protección de cambios**: confirmación antes de eliminar, aviso de cambios sin guardar, recuperación con respaldo descargable ante datos dañados y detección de ediciones concurrentes en varias pestañas.

## Stack tecnológico

- **React 19** + **TypeScript** + **Vite 8** — aplicación frontend y compilación.
- **Tailwind CSS 4** — estilos con identidad plana/2D (borde grafito, acento amarillo verdoso, fondo marfil).
- **React Hook Form** + **Zod** — formularios y validación de datos.
- **Vitest** + **Testing Library** + **jsdom** — pruebas automatizadas (85 pruebas en 7 archivos).
- **ESLint** + **TypeScript ESLint** — análisis estático de código.
- **Netlify** — despliegue estático a partir de `dist/`.

No se utilizan fuentes externas: la tipografía se basa en pilas del sistema.

## Arquitectura

```
src/
├── domain/        # Lógica de negocio pura
│   ├── calculations.ts   # Fórmulas económicas
│   ├── classification.ts # Tipos de obra y técnicas
│   └── types.ts          # Tipos del dominio
├── lib/           # Utilidades
│   ├── money.ts          # Formato y validación de montos CLP
│   ├── budgetStorage.ts  # Persistencia en LocalStorage
│   └── download.ts       # Descarga de respaldo
├── features/      # Componentes por funcionalidad
│   ├── calculator/       # Formulario y resultado
│   ├── comparison/       # Comparador de escenarios
│   └── history/          # Historial de presupuestos
├── App.tsx
├── main.tsx
└── index.css      # Tema (colores y tipografías)
```

El historial se guarda bajo la clave `valuarte.budgets.v1` en LocalStorage. Las fórmulas de cálculo viven en `src/domain/calculations.ts` y no dependen de la interfaz.

## Capturas de pantalla

![Valuarte en escritorio: cabecera y inicio de la calculadora](docs/screenshots/valuarte-desktop.png)

![Valuarte en móvil: resultado con precio sugerido y desglose económico](docs/screenshots/valuarte-mobile.png)

## Requisitos

- Node.js `^22.22.2`, `^24.15.0` o `>=26.0.0` (rango declarado en `engines`).
- npm.

El rango corresponde a la intersección de los requisitos de las dependencias principales de desarrollo: Vite 8, Vitest 5 y jsdom 31. La versión de Node usada en el despliegue de Netlify es `22.22.2`.

## Instalación y ejecución

```sh
npm install
npm run dev
```

La aplicación queda disponible en la URL indicada por Vite (por defecto, `http://localhost:5173/`).

## Comprobaciones y compilación

```sh
npm run lint   # análisis estático
npm test       # pruebas (85 en 7 archivos)
npm run build  # TypeScript + Vite, genera dist/
npm run preview
npm audit
npm audit --omit=dev
```

`npm audit` incluye las dependencias de desarrollo; `npm audit --omit=dev` permite revisar únicamente las dependencias de producción.

El resultado de la compilación se genera en `dist/`. La aplicación también está publicada en Netlify:

<https://proyectovaluarte.netlify.app/>

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

## Notas de compatibilidad de formularios

Los controles `select` de «Tipo de obra» y «Técnica principal» conservan el comportamiento nativo del navegador y del sistema operativo. La hoja de estilos fija un tamaño mínimo de `1rem` (16 px) para el control y para sus `option`, y define fondo y color de las opciones cuando el navegador permite personalizarlas.

La apariencia del menú desplegable abierto sigue dependiendo del sistema:

- En navegadores de escritorio basados en Chromium y Firefox, los estilos de `option` suelen aplicarse parcialmente.
- En Safari y en los selectores nativos de iOS, el menú puede ignorar el tamaño, el color y el fondo definidos en CSS.
- En Android, el selector puede adoptar el tema del sistema.

No se reemplazan los controles nativos para no perder accesibilidad, navegación por teclado ni compatibilidad con lectores de pantalla.

## Limitaciones actuales

- **Sin backend ni autenticación:** la aplicación es 100 % frontend.
- **Datos locales:** los presupuestos permanecen en el LocalStorage del navegador (`valuarte.budgets.v1`).
- **Sin sincronización:** no hay cuentas ni sincronización entre dispositivos o navegadores.
- **Sin impuestos ni costos adicionales:** el excedente es una estimación sin impuestos ni costos no ingresados.
- **Alcance de una persona:** no hay roles, permisos ni colaboración en equipo.

## Mejoras futuras (no implementadas)

Estas ideas se listan para orientar el trabajo posterior; ninguna está incluida en la v1.0.0:

- Backend y autenticación para sincronizar presupuestos entre dispositivos.
- Exportación de presupuestos en PDF o CSV.
- Plantillas de cálculo por tipo de obra o técnica.
- Historial con filtros y búsqueda.
- Integración con pasarelas de pago o facturación electrónica.
- Fórmulas opcionales con impuestos o comisiones.
- Internacionalización y conversión de moneda.
