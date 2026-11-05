# Valuarte

Aplicación web para artistas visuales independientes. Permite calcular el precio sugerido de una obra, comparar escenarios de venta y conservar un historial de presupuestos en el navegador.

## Funcionalidades

- Calculadora de costos, remuneración, precio sugerido y margen efectivo en pesos chilenos (CLP).
- Comparador de dos precios de venta a partir de los costos calculados.
- Clasificación opcional por tipo de obra y técnica principal, con opciones personalizadas.
- Historial de presupuestos guardados en LocalStorage, con edición y eliminación.

Los presupuestos se guardan únicamente en el navegador. No hay backend, autenticación ni sincronización entre dispositivos.

## Requisitos

Node.js compatible con las dependencias instaladas: actualmente `^22.22.2`, `^24.15.0` o `>=26.0.0`, y npm.

## Desarrollo

```sh
npm install
npm run dev
```

## Comprobaciones

```sh
npm run lint
npm test
npm run build
```
