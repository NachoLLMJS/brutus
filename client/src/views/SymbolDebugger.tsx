// SymbolDebugger — herramienta dev para identificar Symbols del fork
// `brutus-fla-parser` y mapearlos a partes anatómicas en `partRegistry.ts`.
//
// Renderiza cada Symbol with SVG inline directo (las partes "hoja" del árbol).
// Symbols puramente compuestos (parts: solo sub-symbols) no se renderizan
// pero se listan con su composición.
//
// Ruta: /debug/symbols (solo accesible en dev — el route is siempre montado
// pero no hay link visible en la nav).

import { useMemo, useState } from 'react';
import * as AllSymbols from 'brutus-fla-parser';
import type { Symbol as FlaSymbol, Svg as FlaSvg } from 'brutus-fla-parser';

interface SymbolEntry {
  name: string;
  symbol: FlaSymbol;
  /** SVG strings inline directos (parts[i].type === 'svg'). */
  inlineSvgs: FlaSvg[];
  /** Sub-symbols referenciados en parts. */
  subSymbols: string[];
  /** Frames totales si tiene animación. */
  frameCount: number;
  /** Total parts (svg o symbol). */
  partsCount: number;
  partIdx?: string;
  colorIdx?: string;
}

function buildEntries(): SymbolEntry[] {
  const out: SymbolEntry[] = [];
  for (const [name, value] of Object.entries(AllSymbols)) {
    if (
      !value ||
      typeof value !== 'object' ||
      (value as { type?: string }).type !== 'symbol'
    ) {
      continue;
    }
    const sym = value as FlaSymbol;
    const inlineSvgs: FlaSvg[] = [];
    const subSymbols: string[] = [];
    if (sym.parts) {
      for (const p of sym.parts) {
        if (p.type === 'svg') inlineSvgs.push(p as FlaSvg);
        else if (p.type === 'symbol') subSymbols.push((p as FlaSymbol).name);
      }
    }
    out.push({
      name,
      symbol: sym,
      inlineSvgs,
      subSymbols,
      frameCount: sym.frames?.length ?? 0,
      partsCount: sym.parts?.length ?? 0,
      partIdx: sym.partIdx,
      colorIdx: sym.colorIdx,
    });
  }
  // Orden numérico: Symbol1, Symbol2, ..., Symbol100, ...
  return out.sort((a, b) => {
    const na = parseInt(a.name.replace('Symbol', ''), 10);
    const nb = parseInt(b.name.replace('Symbol', ''), 10);
    return na - nb;
  });
}

type FilterMode = 'all' | 'has-svg' | 'composed' | 'animated';

export function SymbolDebugger() {
  const allEntries = useMemo(() => buildEntries(), []);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('has-svg');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!e.name.toLowerCase().includes(q)) return false;
      }
      if (filterMode === 'has-svg') return e.inlineSvgs.length > 0;
      if (filterMode === 'composed') return e.subSymbols.length > 0 && e.inlineSvgs.length === 0;
      if (filterMode === 'animated') return e.frameCount > 0;
      return true;
    });
  }, [allEntries, search, filterMode]);

  const stats = useMemo(() => {
    const total = allEntries.length;
    const withSvg = allEntries.filter((e) => e.inlineSvgs.length > 0).length;
    const composed = allEntries.filter((e) => e.subSymbols.length > 0 && e.inlineSvgs.length === 0).length;
    const animated = allEntries.filter((e) => e.frameCount > 0).length;
    return { total, withSvg, composed, animated };
  }, [allEntries]);

  const selectedEntry = selected ? allEntries.find((e) => e.name === selected) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 20,
        fontFamily: 'monospace',
        color: 'var(--text-primary)',
        fontSize: 13,
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, color: 'var(--accent-gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Symbol Debugger
        </h1>
        <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 11 }}>
          Total <b style={{ color: 'var(--text-strong)' }}>{stats.total}</b> · with SVG inline{' '}
          <b style={{ color: 'var(--accent-gold)' }}>{stats.withSvg}</b> · composition only{' '}
          <b style={{ color: 'var(--hp-full)' }}>{stats.composed}</b> · animated{' '}
          <b style={{ color: 'var(--primary)' }}>{stats.animated}</b>
        </div>
      </header>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar Symbol (ej: 505)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--paper-dark)',
            border: '1px solid var(--border-inner)',
            color: 'var(--text-strong)',
            borderRadius: 3,
            fontFamily: 'monospace',
            fontSize: 12,
            width: 220,
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'has-svg', 'composed', 'animated'] as FilterMode[]).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setFilterMode(m)}
              style={{
                padding: '4px 10px',
                background: filterMode === m ? 'var(--accent-gold)' : 'var(--paper-dark)',
                color: filterMode === m ? 'var(--paper-dark)' : 'var(--text-secondary)',
                border: '1px solid var(--border-inner)',
                borderRadius: 3,
                fontSize: 11,
                fontFamily: 'monospace',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {m === 'has-svg' ? 'with SVG' : m === 'composed' ? 'composition' : m === 'animated' ? 'animated' : 'all'}
            </button>
          ))}
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
          mostrando <b style={{ color: 'var(--text-strong)' }}>{filtered.length}</b>
        </span>
      </div>

      {/* Layout: grid de thumbnails + panel detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEntry ? '1fr 320px' : '1fr', gap: 16 }}>
        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
            alignContent: 'flex-start',
          }}
        >
          {filtered.map((e) => (
            <SymbolThumb
              key={e.name}
              entry={e}
              active={selected === e.name}
              onClick={() => setSelected(e.name === selected ? null : e.name)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No resultados
            </div>
          )}
        </div>

        {/* Detalle */}
        {selectedEntry && (
          <aside
            style={{
              background: 'var(--paper)',
              border: '2px solid var(--border-inner)',
              borderRadius: 4,
              padding: 14,
              alignSelf: 'flex-start',
              position: 'sticky',
              top: 80,
              maxHeight: 'calc(100vh - 100px)',
              overflowY: 'auto',
            }}
          >
            <SymbolDetail entry={selectedEntry} onSelect={setSelected} allEntries={allEntries} />
          </aside>
        )}
      </div>
    </div>
  );
}

/** Thumbnail de un Symbol — renderiza sus SVGs inline si tiene, o un placeholder. */
function SymbolThumb({
  entry,
  active,
  onClick,
}: {
  entry: SymbolEntry;
  active: boolean;
  onClick: () => void;
}) {
  const hasInline = entry.inlineSvgs.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        background: hasInline ? 'var(--paper)' : 'var(--paper-dark)',
        border: active ? '2px solid var(--accent-gold)' : '1px solid var(--border-inner)',
        borderRadius: 3,
        padding: 6,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        boxShadow: active
          ? '0 0 12px rgba(230, 180, 80, 0.5)'
          : 'inset 0 0 0 1px var(--border-outer)',
        transition: 'all 0.12s',
      }}
    >
      <div
        style={{
          width: 92,
          height: 92,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px dashed var(--border-shadow)',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {hasInline ? (
          <ScaledSvg svg={entry.inlineSvgs[0]!.svg} />
        ) : (
          <span style={{ color: 'var(--text-secondary)', fontSize: 10, padding: 4, textAlign: 'center' }}>
            {entry.subSymbols.length > 0
              ? `compose\n${entry.subSymbols.length} sub`
              : entry.frameCount > 0
                ? `anim\n${entry.frameCount}f`
                : 'empty'}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-strong)',
          fontFamily: 'monospace',
        }}
      >
        {entry.name}
      </div>
      <div style={{ display: 'flex', gap: 3, fontSize: 9 }}>
        {hasInline && (
          <span style={{ color: 'var(--accent-gold)' }}>{entry.inlineSvgs.length}svg</span>
        )}
        {entry.subSymbols.length > 0 && (
          <span style={{ color: 'var(--hp-full)' }}>{entry.subSymbols.length}sub</span>
        )}
        {entry.frameCount > 0 && (
          <span style={{ color: 'var(--primary)' }}>{entry.frameCount}f</span>
        )}
      </div>
    </button>
  );
}

/** Renderiza un SVG string escalado to container. */
function ScaledSvg({ svg }: { svg: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      dangerouslySetInnerHTML={{
        __html: svg.replace(
          /<svg([^>]*)>/,
          '<svg$1 style="max-width:100%;max-height:100%;display:block;">',
        ),
      }}
    />
  );
}

function SymbolDetail({
  entry,
  onSelect,
  allEntries,
}: {
  entry: SymbolEntry;
  onSelect: (name: string | null) => void;
  allEntries: SymbolEntry[];
}) {
  return (
    <div>
      <h2
        style={{
          fontSize: 16,
          color: 'var(--accent-gold)',
          fontFamily: 'monospace',
          marginBottom: 8,
        }}
      >
        {entry.name}
      </h2>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {entry.partsCount} parts · {entry.frameCount} frames
        {entry.partIdx && <> · partIdx={entry.partIdx}</>}
        {entry.colorIdx && <> · colorIdx={entry.colorIdx}</>}
      </div>

      {entry.inlineSvgs.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h3
            style={{
              fontSize: 11,
              color: 'var(--text-strong)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            SVGs inline ({entry.inlineSvgs.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {entry.inlineSvgs.map((svg, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-shadow)',
                  borderRadius: 2,
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <ScaledSvg svg={svg.svg} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    fontSize: 8,
                    color: 'var(--text-secondary)',
                  }}
                >
                  #{i}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {entry.subSymbols.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h3
            style={{
              fontSize: 11,
              color: 'var(--text-strong)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Sub-symbols ({entry.subSymbols.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {entry.subSymbols.map((s, i) => {
              const exists = allEntries.some((e) => e.name === s);
              return (
                <button
                  type="button"
                  key={`${s}-${i}`}
                  onClick={() => exists && onSelect(s)}
                  disabled={!exists}
                  style={{
                    appearance: 'none',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    background: 'var(--paper-dark)',
                    border: '1px solid var(--border-shadow)',
                    color: exists ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    borderRadius: 2,
                    cursor: exists ? 'pointer' : 'not-allowed',
                    opacity: exists ? 1 : 0.5,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 12 }}>
        <h3
          style={{
            fontSize: 11,
            color: 'var(--text-strong)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          How to edit it
        </h3>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          1. Open <code>packages/brutus-fla-parser/Symbols.js</code><br />
          2. Search for <code style={{ color: 'var(--accent-gold)' }}>{`var ${entry.name} = `}</code><br />
          3. Modify los <code>svg</code> strings dentro de <code>parts</code><br />
          4. Note el Symbol en <code>client/src/lib/partRegistry.ts</code>
        </div>
      </section>

      <button
        type="button"
        onClick={() => onSelect(null)}
        style={{
          appearance: 'none',
          padding: '6px 12px',
          background: 'transparent',
          border: '1px solid var(--border-inner)',
          color: 'var(--text-secondary)',
          borderRadius: 2,
          fontSize: 10,
          cursor: 'pointer',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Cerrar
      </button>
    </div>
  );
}
