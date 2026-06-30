import { useMemo, useState } from 'react';
import * as AllSymbols from 'labrute-static-fla-parser';
import type { Symbol as FlaSymbol, Svg as FlaSvg, FramePart } from 'labrute-static-fla-parser';
import type { BruteGender } from 'core';

type Filter = 'head' | 'body';

type PartDef = {
  key: string;
  symbolKey: string;
  group: Filter;
  title: string;
  note: string;
};

const PARTS: Record<BruteGender, PartDef[]> = {
  male: [
    { key: 'p1', symbolKey: '_p1', group: 'head', title: 'p1 · cabeza/cara base', note: 'piezas faciales/cabeza' },
    { key: 'p1a', symbolKey: '_p1a', group: 'head', title: 'p1a · detalle cabeza/cara', note: 'detalle facial' },
    { key: 'p1b', symbolKey: '_p1b', group: 'head', title: 'p1b · detalle cabeza/cara', note: 'detalle facial' },
    { key: 'p3', symbolKey: '_p3', group: 'head', title: 'p3 · pelo/cabeza', note: 'variaciones principales de pelo/cabeza' },
    { key: 'p6', symbolKey: '_p6', group: 'head', title: 'p6 · detalle cabeza', note: 'detalle de cabeza/cara' },
    { key: 'p8', symbolKey: '_p8', group: 'head', title: 'p8 · accesorio/cabeza', note: 'accesorios o detalle superior' },
    { key: 'p2', symbolKey: '_p2', group: 'body', title: 'p2 · cuerpo/torso', note: 'formas de torso/cuerpo' },
    { key: 'p4', symbolKey: '_p4', group: 'body', title: 'p4 · cuerpo/ropa', note: 'ropa/torso' },
    { key: 'p5', symbolKey: '_p5', group: 'body', title: 'p5 · cuerpo extra', note: 'pieza corporal extra' },
    { key: 'p7', symbolKey: '_p7', group: 'body', title: 'p7 · piernas/ropa', note: 'piernas/parte baja' },
    { key: 'p7b', symbolKey: '_p7b', group: 'body', title: 'p7b · detalle piernas', note: 'detalle de parte baja' },
  ],
  female: [
    { key: 'p1', symbolKey: '_p1', group: 'head', title: 'p1 · cabeza/cara base', note: 'piezas faciales/cabeza' },
    { key: 'p1a', symbolKey: '_p1a', group: 'head', title: 'p1a · detalle cabeza/cara', note: 'detalle facial' },
    { key: 'p1b', symbolKey: '_p1b', group: 'head', title: 'p1b · detalle cabeza/cara', note: 'detalle facial' },
    { key: 'p3', symbolKey: '_p3', group: 'head', title: 'p3 · pelo/cabeza', note: 'variaciones principales de pelo/cabeza' },
    { key: 'p6', symbolKey: '_p6', group: 'head', title: 'p6 · detalle cabeza', note: 'detalle de cabeza/cara' },
    { key: 'p8', symbolKey: '_p8', group: 'head', title: 'p8 · accesorio/cabeza', note: 'accesorios o detalle superior' },
    { key: 'p2', symbolKey: '_p2', group: 'body', title: 'p2 · cuerpo/torso', note: 'torso/cuerpo' },
    { key: 'p4', symbolKey: '_p4', group: 'body', title: 'p4 · cuerpo/ropa', note: 'ropa/torso' },
    { key: 'p5', symbolKey: '_p5', group: 'body', title: 'p5 · cuerpo extra', note: 'pieza corporal extra' },
    { key: 'p7', symbolKey: '_p7', group: 'body', title: 'p7 · piernas/ropa', note: 'piernas/parte baja' },
    { key: 'p7b', symbolKey: '_p7b', group: 'body', title: 'p7b · detalle piernas', note: 'detalle de parte baja' },
  ],
};

interface FramePreview {
  idx: number;
  svgNames: string[];
  svgs: FlaSvg[];
}

function isSymbol(value: unknown): value is FlaSymbol {
  return Boolean(value && typeof value === 'object' && (value as { type?: string }).type === 'symbol');
}

function mainSymbol(gender: BruteGender): FlaSymbol {
  return (gender === 'male' ? AllSymbols.Symbol460 : AllSymbols.Symbol752) as FlaSymbol;
}

function findSymbolsWithPartIdx(root: FlaSymbol, partIdx: string, seen = new Set<string>()): FlaSymbol[] {
  if (seen.has(root.name)) return [];
  seen.add(root.name);
  const out: FlaSymbol[] = [];
  if (root.partIdx === partIdx) out.push(root);
  for (const p of root.parts ?? []) {
    if (isSymbol(p)) out.push(...findSymbolsWithPartIdx(p, partIdx, seen));
  }
  return out;
}

function collectSvgsFromFrame(owner: FlaSymbol, frame: FramePart[] | undefined): FlaSvg[] {
  const out: FlaSvg[] = [];
  if (!frame) return out;

  function collectFromSymbol(sym: FlaSymbol) {
    const first = sym.frames?.[0];
    if (first) {
      out.push(...collectSvgsFromFrame(sym, first));
      return;
    }
    for (const p of sym.parts ?? []) {
      if (p.type === 'svg') out.push(p as FlaSvg);
      else if (isSymbol(p)) collectFromSymbol(p);
    }
  }

  for (const framePart of frame) {
    const part = owner.parts?.find((p) => p.name === framePart.name);
    if (!part) continue;
    if (part.type === 'svg') out.push(part as FlaSvg);
    else if (isSymbol(part)) collectFromSymbol(part);
  }
  return out;
}

function previewsFor(gender: BruteGender, part: PartDef): FramePreview[] {
  const root = mainSymbol(gender);
  const symbols = findSymbolsWithPartIdx(root, part.symbolKey);
  const seen = new Set<string>();
  const previews: FramePreview[] = [];
  for (const sym of symbols) {
    for (let i = 0; i < (sym.frames?.length ?? 0); i += 1) {
      const svgs = collectSvgsFromFrame(sym, sym.frames?.[i]);
      const sig = `${sym.name}-${i}-${svgs.map((s) => s.name).join(',')}`;
      if (seen.has(sig) || svgs.length === 0) continue;
      seen.add(sig);
      previews.push({ idx: previews.length, svgNames: svgs.map((s) => s.name), svgs: svgs.slice(0, 8) });
    }
  }
  return previews;
}

export function BrutePartsViewer() {
  const [gender, setGender] = useState<BruteGender>('male');
  const [filter, setFilter] = useState<Filter>('head');
  const [partKey, setPartKey] = useState('p3');

  const visibleParts = useMemo(() => PARTS[gender].filter((p) => p.group === filter), [gender, filter]);
  const activePart = (visibleParts.find((p) => p.key === partKey) ?? visibleParts[0] ?? PARTS[gender][0]) as PartDef;
  const previews = useMemo(() => previewsFor(gender, activePart), [gender, activePart]);

  const selectFilter = (next: Filter) => {
    setFilter(next);
    const first = PARTS[gender].find((p) => p.group === next);
    if (first) setPartKey(first.key);
  };

  const selectGender = (next: BruteGender) => {
    setGender(next);
    const equivalent = PARTS[next].find((p) => p.key === partKey && p.group === filter);
    if (!equivalent) {
      const first = PARTS[next].find((p) => p.group === filter);
      if (first) setPartKey(first.key);
    }
  };

  return (
    <div style={{ padding: 24, color: 'var(--text-primary)' }}>
      <h1 style={{ color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Face, head, hair, and body SVG viewer
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 980, lineHeight: 1.55 }}>
        I am not replacing anything. This shows the real inline SVGs that compose the brawler. There are no separate PNG/JPEG files.
        If you want to see all loose symbols, there is also <code>/debug/symbols</code>.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' }}>
        {(['male', 'female'] as BruteGender[]).map((g) => (
          <button type="button" key={g} className="btn" onClick={() => selectGender(g)} style={{ borderColor: gender === g ? 'var(--accent-gold)' : undefined }}>
            {g === 'male' ? 'Male' : 'Female'}
          </button>
        ))}
        {(['head', 'body'] as Filter[]).map((f) => (
          <button type="button" key={f} className="btn" onClick={() => selectFilter(f)} style={{ borderColor: filter === f ? 'var(--accent-gold)' : undefined }}>
            {f === 'head' ? 'Head/face/hair' : 'Body/clothes'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {visibleParts.map((p) => (
          <button type="button" key={p.key} className="btn" onClick={() => setPartKey(p.key)} style={{ borderColor: activePart.key === p.key ? 'var(--accent-gold)' : undefined }}>
            {p.key}
          </button>
        ))}
      </div>

      <section style={{ background: 'rgba(21, 12, 18, 0.82)', border: '1px solid var(--border-inner)', padding: 16, boxShadow: 'inset 0 0 0 1px var(--border-outer)' }}>
        <h2 style={{ color: 'var(--accent-gold)', margin: '0 0 4px', textTransform: 'uppercase' }}>{activePart.title}</h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
          {activePart.note}. Real tree part <b>{activePart.symbolKey}</b>. Variants found: <b>{previews.length}</b>.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {previews.map((preview) => (
            <div key={preview.idx} style={{ background: 'rgba(0,0,0,.28)', border: '1px solid rgba(138,96,56,.65)', padding: 10, minHeight: 190, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', minHeight: 112, background: 'rgba(255,255,255,.04)' }}>
                {preview.svgs.map((svg, i) => (
                  <div
                    key={`${svg.name}-${i}`}
                    title={svg.name}
                    style={{ width: 76, height: 76, overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.20)', border: '1px dashed rgba(230,180,80,.25)' }}
                    dangerouslySetInnerHTML={{ __html: svg.svg }}
                  />
                ))}
              </div>
              <div style={{ color: 'var(--accent-gold)', fontSize: 13 }}>variant {preview.idx}</div>
              <code style={{ color: 'var(--text-secondary)', fontSize: 10, wordBreak: 'break-all' }}>{preview.svgNames.join(', ')}</code>
            </div>
          ))}
          {previews.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No SVGs found for this part.</div>}
        </div>
      </section>
    </div>
  );
}
