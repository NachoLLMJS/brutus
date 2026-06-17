// Mapping manual de Symbols → partes anatómicas/de armadura.
//
// El package `brutus-fla-parser` exporta Symbols numerados (Symbol1, Symbol505,
// Symbol940...) sin nombres descriptivos. Este registry sirve como "diccionario"
// para que cuando queramos re-skinear partes específicas (ej. "todos los cascos
// frontales masculinos") sepamos qué Symbols editar en el `Symbols.js` forkeado.
//
// **Workflow para extender este registry**:
// 1. Abrir el debug viewer en `/debug/symbols` (solo en dev).
// 2. Buscar visualmente el Symbol que corresponde a la parte (cascos, capas, etc).
// 3. Anotar el Symbol number en la categoría correspondiente acá.
// 4. Si querés re-skinear esa parte: editar `packages/brutus-fla-parser/Symbols.js`,
//    buscar `var SymbolXXX = {` y modificar el campo `svg` string del part.
//
// **Estado**: empezamos vacío. Se llena incrementalmente a medida que el usuario
// re-skinea partes. No hace falta llenar todo de una.

export interface PartCategory {
  /** Lista de Symbol names (ej: ['Symbol505', 'Symbol506']) que pertenecen a esta parte. */
  symbols: string[];
  /** Notas humanas — variantes, peculiaridades, qué es exactamente. */
  notes?: string;
}

export interface ModelRegistry {
  /** Cabeza/yelmo frontal. */
  helmet_front?: PartCategory;
  /** Cabeza/yelmo lateral o trasero. */
  helmet_side?: PartCategory;
  /** Hombrera izquierda. */
  pauldron_left?: PartCategory;
  /** Hombrera derecha. */
  pauldron_right?: PartCategory;
  /** Pectoral / chestplate. */
  chestplate?: PartCategory;
  /** Brazos. */
  arms?: PartCategory;
  /** Manos / guantes. */
  hands?: PartCategory;
  /** Piernas / leg guards. */
  legs?: PartCategory;
  /** Pies / botas. */
  boots?: PartCategory;
  /** Capa / cape. */
  cape?: PartCategory;
  /** Cinturón. */
  belt?: PartCategory;
  /** Catch-all para partes no clasificadas todavía. */
  unclassified?: PartCategory;
}

export interface SymbolRegistry {
  male: ModelRegistry;
  female: ModelRegistry;
  dog: ModelRegistry;
  bear: ModelRegistry;
  panther: ModelRegistry;
}

/**
 * Registry vacío. Se llena por el usuario a medida que identifica partes.
 *
 * Ejemplo de uso futuro:
 * ```ts
 * SYMBOL_REGISTRY.male.helmet_front = {
 *   symbols: ['Symbol505', 'Symbol506', 'Symbol507'],
 *   notes: 'Las 3 variantes de yelmo frontal (sin pluma, con pluma, con cuernos).',
 * };
 * ```
 */
export const SYMBOL_REGISTRY: SymbolRegistry = {
  male: {},
  female: {},
  dog: {},
  bear: {},
  panther: {},
};
