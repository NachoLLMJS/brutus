// HP bar v2 (combat) — barra con ticks visuales en 25/50/75% y números abajo.
// Color dinámico según pct (verde > 60%, oro 30-60%, sangre < 30%).

interface HPBarV2Props {
  value: number;
  max: number;
  side: 'left' | 'right';
}

export function HPBarV2({ value, max, side }: HPBarV2Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color =
    pct > 60 ? 'var(--hp-full)' : pct > 30 ? 'var(--hp-mid)' : 'var(--hp-low)';
  const ticks = [25, 50, 75];
  return (
    <div className={`hpbar ${side}`}>
      <div className="hpbar-track">
        <div
          className="hpbar-fill"
          style={{ width: `${pct}%`, ['--hp-color' as string]: color } as React.CSSProperties}
        />
        {ticks.map((t) => (
          <div key={t} className="hpbar-tick" style={{ left: `${t}%` }} />
        ))}
      </div>
      <div className="hpbar-num">
        <span className="hpbar-cur">{Math.max(0, Math.round(value))}</span>
        <span className="hpbar-sep">/</span>
        <span className="hpbar-max">{max}</span>
      </div>
    </div>
  );
}
