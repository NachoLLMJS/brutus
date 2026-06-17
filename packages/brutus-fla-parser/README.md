# brutus-fla-parser

Fork local de [labrute-fla-parser](https://github.com/Zenoo/labrute-fla-parser) (v1.0.13).

## Por qué existe este fork

`labrute-fla-parser` exporta los Symbols (sprites animados) de los brutos y pets de
LaBrute como SVGs inline dentro de `Symbols.js`. Para hacer un reskin visual del juego
necesitamos **editar esos SVGs** — cosa imposible si el package vive en `node_modules`.

Forkearlo a `packages/` permite:

- Editar `Symbols.js` directamente para cambiar partes específicas (cascos, capas, armaduras…)
- Mantener las animaciones (`frames` arrays con timeline) intactas
- Hot-reload con Vite cuando se modifica un Symbol

## ⚠️ NO modificar la estructura de los Symbols

Solo cambiá el campo `svg: '...'` (string) dentro de los `parts`. Si modificás
la forma del objeto (ej: agregás un nuevo campo o cambiás `partIdx`), TS rompe
y/o el renderer Pixi falla.

## Workflow

1. Identificar qué Symbol corresponde a qué parte usando el debug viewer
   (`/debug/symbols` en dev mode).
2. Anotar el Symbol number en `client/src/lib/partRegistry.ts`.
3. Hacer find del Symbol en `Symbols.js` y editar el `svg` string.
4. Refresh — el cambio se ve inmediatamente.

## Updates upstream

Si el package upstream recibe updates relevantes (raro, repo activo pero
estable), hay que mergear manualmente. Aceptable porque:

- El upstream cambia poco
- Mergear es solo `git diff` entre versiones del Symbols.js

## Origen

```
package: labrute-fla-parser
version: 1.0.13
url:     https://github.com/Zenoo/labrute-fla-parser
license: MIT (preservada)
```
