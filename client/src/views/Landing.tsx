// Landing — "Forja la leyenda".
// Visual del bundle Claude Design (hero con skull sigils, forge form con
// anvil + splatter, warrior cards rich, footer ornamental, glow accent
// dynamic via Tweaks). Lógica preservada: useGameStore para recentBrutes,
// fetch de full Brute data, navegación a /create con name/gender pre-pop.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { BruteAvatar } from '@/components/BruteAvatar';
import { TweaksPanel, TweakSection, TweakSelect } from '@/components/TweaksPanel';
import { useLandingSettings, type AccentIntensity, type HeroLayout } from '@/store/useLandingSettings';
import { rankName } from '@/lib/profileFlavor';
import { api } from '@/api/apiClient';
import type { Brute } from 'core';

const ACCENT_MAP: Record<AccentIntensity, { red: string; gold: string }> = {
  subdued: { red: '0.18', gold: '0.16' },
  balanced: { red: '0.35', gold: '0.30' },
  infernal: { red: '0.55', gold: '0.45' },
};

export function Landing() {
  const recent = useGameStore((s) => s.recentBrutes);
  const setCurrent = useGameStore((s) => s.setCurrentBrute);
  const forget = useGameStore((s) => s.forgetBrute);
  const navigate = useNavigate();

  const heroLayout = useLandingSettings((s) => s.heroLayout);
  const setHeroLayout = useLandingSettings((s) => s.setHeroLayout);
  const accentIntensity = useLandingSettings((s) => s.accentIntensity);
  const setAccentIntensity = useLandingSettings((s) => s.setAccentIntensity);

  const [bruteInfo, setBruteInfo] = useState<Record<string, Brute>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Hidratamos info real de cada bruto reciente.
  useEffect(() => {
    if (recent.length === 0) {
      setBruteInfo({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const map: Record<string, Brute> = {};
      await Promise.all(
        recent.map(async (b) => {
          try {
            const full = await api.brutes.get(b.id);
            map[b.id] = full;
          } catch {
            // bruto borrado del server → lo ignoramos
          }
        }),
      );
      if (!cancelled) setBruteInfo(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [recent]);

  // Aplicar accent intensity como CSS vars en el shell.
  const glowVars = useMemo(() => {
    const v = ACCENT_MAP[accentIntensity];
    return {
      ['--glow-red' as string]: v.red,
      ['--glow-gold' as string]: v.gold,
    } as React.CSSProperties;
  }, [accentIntensity]);

  const visibleBrutes = useMemo(() => recent, [recent]);

  return (
    <div className="landing-shell" style={glowVars}>
      <Hero asym={heroLayout === 'asym'} />

      <Forge
        onForge={({ name, gender }) => {
          setToast(`${name} entra a la fragua…`);
          window.setTimeout(() => setToast(null), 1800);
          // Pre-populate name + gender in CharacterCreator via URL params.
          navigate(`/create?name=${encodeURIComponent(name)}&gender=${gender === 'M' ? 'male' : 'female'}`);
        }}
      />

      <RecentWarriorsSection
        brutes={visibleBrutes}
        bruteInfo={bruteInfo}
        onSelect={(id) => {
          setCurrent(id);
          navigate(`/brute/${id}`);
        }}
        onForget={(id) => {
          const stub = recent.find((b) => b.id === id);
          const name = stub?.name ?? 'este personaje';
          const ok = window.confirm(`¿Estás seguro de que quieres eliminar a ${name} de guerreros recientes?`);
          if (!ok) return;
          forget(id);
        }}
      />

      <footer className="landing-footer">
        <div className="footer-mark">
          <span className="pip" />
          <span>AFKFLAP · MMXXVI · Forjado en sangre</span>
        </div>
        <a href="#how">Cómo se juega</a>
      </footer>

      {toast && <div className="landing-toast">{toast}</div>}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Hero">
          <TweakSelect<HeroLayout>
            label="Layout"
            value={heroLayout}
            options={[
              { value: 'centered', label: 'Centrado' },
              { value: 'asym', label: 'Asimétrico' },
            ]}
            onChange={setHeroLayout}
          />
        </TweakSection>
        <TweakSection title="Atmósfera">
          <TweakSelect<AccentIntensity>
            label="Intensidad de glow"
            value={accentIntensity}
            options={[
              { value: 'subdued', label: 'Sutil' },
              { value: 'balanced', label: 'Equilibrio' },
              { value: 'infernal', label: 'Infernal' },
            ]}
            onChange={setAccentIntensity}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ─────────────────────── HERO ─────────────────────── */

function Hero({ asym }: { asym: boolean }) {
  return (
    <header className={`hero${asym ? ' asym' : ''}`}>
      <div className="hero-frame" />
      <div className="hero-corner tl" />
      <div className="hero-corner tr" />
      <div className="hero-corner bl" />
      <div className="hero-corner br" />

      <SkullSigil side="left" />
      <SkullSigil side="right" />

      <div className="hero-content">
        <div className="hero-eyebrow">
          <span>Donde la sangre forja leyendas</span>
        </div>
        <h1 className="hero-title">
          AFK<span className="v">F</span>LAP
        </h1>
        <div className="hero-sub">Forja tu campeón en la arena</div>
      </div>
    </header>
  );
}

function SkullSigil({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`sigil ${side}`} aria-hidden>
      <div className="sigil-glow" />
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <radialGradient id={`skull-bg-${side}`} cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#3d2530" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0d0a14" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="44" fill={`url(#skull-bg-${side})`} />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#6a4528" strokeWidth="1" opacity="0.6" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e6b450" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.45" />
        <g transform="translate(50 52)">
          <path
            d="M-18 -16 C-18 -28 -10 -34 0 -34 C10 -34 18 -28 18 -16 L18 -2 C18 4 14 6 12 8 L12 14 C12 16 10 18 8 18 L4 18 L4 14 L-4 14 L-4 18 L-8 18 C-10 18 -12 16 -12 14 L-12 8 C-14 6 -18 4 -18 -2 Z"
            fill="#0d0a14"
            stroke="#8a6038"
            strokeWidth="1.2"
          />
          <ellipse cx="-8" cy="-12" rx="4" ry="5" fill="#050308" />
          <ellipse cx="8" cy="-12" rx="4" ry="5" fill="#050308" />
          <circle cx="-8" cy="-11" r="1.6" fill="#c41a1a" opacity="0.95" />
          <circle cx="8" cy="-11" r="1.6" fill="#c41a1a" opacity="0.95" />
          <path d="M-2 -4 L0 2 L2 -4 Z" fill="#050308" />
          <line x1="-10" y1="6" x2="-10" y2="14" stroke="#1a1014" strokeWidth="1.5" />
          <line x1="-5" y1="6" x2="-5" y2="14" stroke="#1a1014" strokeWidth="1.5" />
          <line x1="0" y1="6" x2="0" y2="14" stroke="#1a1014" strokeWidth="1.5" />
          <line x1="5" y1="6" x2="5" y2="14" stroke="#1a1014" strokeWidth="1.5" />
          <line x1="10" y1="6" x2="10" y2="14" stroke="#1a1014" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

/* ─────────────────────── FORGE FORM ─────────────────────── */

function Forge({ onForge }: { onForge: (data: { name: string; gender: 'M' }) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError('Mínimo 3 runas');
      return;
    }
    setError('');
    onForge({ name: trimmed, gender: 'M' });
  };

  return (
    <section className="forge">
      <aside className="forge-aside">
        <div>
          <h2>
            Forja tu primer <em>guerrero</em>
          </h2>
          <p>
            Cada bruto que sale de la fragua es <strong>único</strong>. Su nombre invoca un destino
            forjado en sangre y acero. Lo que pasa en la arena, queda escrito en su carne.
          </p>
        </div>
        <div className="anvil-art">
          <AnvilHammer />
        </div>
        <div className="splatter splatter-bl" aria-hidden />
      </aside>

      <form className="forge-form" onSubmit={submit} noValidate>
        <div>
          <div className="field-label">
            <span>Nombre del guerrero</span>
            {error && <span className="err">{error}</span>}
          </div>
          <input
            className="landing-input"
            placeholder="Vorgath, Sanguineus, Mörgar…"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            maxLength={20}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <button type="submit" className="btn-forge" disabled={!name.trim()}>
          <span>Forjar guerrero</span>
          <span className="arrow">›</span>
        </button>

        <div className="fine">Cada guerrero es único e irrepetible</div>
      </form>
    </section>
  );
}

function AnvilHammer() {
  return (
    <svg viewBox="0 0 200 120" width="100%" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <defs>
        <linearGradient id="anvil-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3d2530" />
          <stop offset="1" stopColor="#0d0a14" />
        </linearGradient>
        <radialGradient id="ember" cx="50%" cy="100%" r="60%">
          <stop offset="0" stopColor="#c41a1a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c41a1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="118" rx="80" ry="22" fill="url(#ember)" />
      <g>
        <rect x="40" y="76" width="120" height="14" fill="url(#anvil-grad)" stroke="#8a6038" strokeWidth="1.2" />
        <path d="M30 60 L170 60 L160 76 L40 76 Z" fill="url(#anvil-grad)" stroke="#8a6038" strokeWidth="1.2" />
        <path d="M22 56 L40 60 L40 64 L22 60 Z" fill="#1a1014" stroke="#6a4528" strokeWidth="1" />
        <rect x="80" y="90" width="40" height="14" fill="#1a1014" stroke="#6a4528" strokeWidth="1.2" />
        <rect x="68" y="104" width="64" height="10" fill="url(#anvil-grad)" stroke="#8a6038" strokeWidth="1.2" />
      </g>
      <g transform="rotate(-20 130 50)">
        <rect x="50" y="48" width="80" height="4" fill="#3d2530" stroke="#6a4528" strokeWidth="0.8" />
        <rect x="124" y="40" width="20" height="20" fill="#1a1014" stroke="#8a6038" strokeWidth="1.2" />
      </g>
      <circle cx="150" cy="60" r="2" fill="#e6b450" />
      <circle cx="156" cy="64" r="1" fill="#e6b450" opacity="0.7" />
      <circle cx="146" cy="66" r="1" fill="#c41a1a" opacity="0.8" />
    </svg>
  );
}

/* ─────────────────────── WARRIORS ─────────────────────── */

function RecentWarriorsSection({
  brutes,
  bruteInfo,
  onSelect,
  onForget,
}: {
  brutes: { id: string; name: string; level: number }[];
  bruteInfo: Record<string, Brute>;
  onSelect: (id: string) => void;
  onForget: (id: string) => void;
}) {
  return (
    <section>
      <div className="section-head">
        <span className="num">— II</span>
        <span className="title">Guerreros recientes</span>
        <span className="rule" />
      </div>
      <div className="warriors-grid">
        {brutes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark">Aún no invocaste ningún guerrero</div>
            <div className="empty-sub">Empezá forjando el primero en la fragua de arriba.</div>
          </div>
        ) : (
          brutes.map((b) => {
            const full = bruteInfo[b.id];
            return (
              <WarriorCard
                key={b.id}
                stub={b}
                full={full}
                onSelect={() => onSelect(b.id)}
                onForget={() => onForget(b.id)}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

function WarriorCard({
  stub,
  full,
  onSelect,
  onForget,
}: {
  stub: { id: string; name: string; level: number };
  full?: Brute;
  onSelect: () => void;
  onForget: () => void;
}) {
  const wins = full?.victories ?? 0;
  const losses = full?.defeats ?? 0;
  const total = wins + losses;
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
  const level = full?.level ?? stub.level;
  const rank = full?.rank ?? 0;
  const weaponId = full?.weapons?.[0];

  return (
    <div
      className="warrior"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <button
        type="button"
        className="warrior-forget"
        aria-label={`Olvidar a ${stub.name}`}
        title="Olvidar este guerrero"
        onClick={(e) => {
          e.stopPropagation();
          onForget();
        }}
      >
        ✕
      </button>
      <div className="avatar">
        <div className="avatar-frame">
          {full ? (
            <BruteAvatar brute={full} size="sm" />
          ) : (
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontSize: 24 }}>?</span>
          )}
          <span className="pin tl" />
          <span className="pin tr" />
          <span className="pin bl" />
          <span className="pin br" />
        </div>
      </div>
      <div className="warrior-info">
        <div className="warrior-name">{stub.name}</div>
        <div className="warrior-rank">{rankName(rank)}</div>
        <div className="warrior-meta">
          <span className="gold">Nivel {level}</span>
          <span className="dot" />
          <span>{pct}% wr</span>
        </div>
        <div className="wl">
          <span className="w">{wins}V</span>
          <div className="wl-bar">
            <div
              className="wl-bar-fill"
              style={{ ['--wl' as string]: `${pct}%` } as React.CSSProperties}
            />
          </div>
          <span className="l">{losses}D</span>
        </div>
        {weaponId && (
          <div className="weapon-line">
            <WeaponGlyph kind={mapWeaponKind(weaponId)} />
            <span>Arma equipada</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WeaponGlyph({ kind }: { kind: string }) {
  const stroke = '#8a6038';
  const fill = '#1a1014';
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      {kind === 'axe' && (
        <g>
          <line x1="3" y1="13" x2="13" y2="3" stroke={stroke} strokeWidth="1.5" strokeLinecap="square" />
          <path d="M9 1 L15 1 L15 7 C12 7 10 5 9 1 Z" fill={fill} stroke={stroke} strokeWidth="1" />
        </g>
      )}
      {kind === 'sword' && (
        <g>
          <line x1="3" y1="13" x2="13" y2="3" stroke={stroke} strokeWidth="1.5" strokeLinecap="square" />
          <line x1="11" y1="1" x2="15" y2="5" stroke={stroke} strokeWidth="1.5" strokeLinecap="square" />
          <line x1="2" y1="14" x2="5" y2="11" stroke={stroke} strokeWidth="2" />
        </g>
      )}
      {kind === 'dagger' && (
        <g>
          <path d="M8 1 L8 11 L7 13 L9 13 L8 11 Z" fill={fill} stroke={stroke} strokeWidth="1" />
          <line x1="5" y1="11" x2="11" y2="11" stroke={stroke} strokeWidth="1.2" />
        </g>
      )}
      {kind === 'mace' && (
        <g>
          <line x1="4" y1="12" x2="11" y2="5" stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="4" r="3" fill={fill} stroke={stroke} strokeWidth="1" />
        </g>
      )}
      {kind === 'flail' && (
        <g>
          <line x1="3" y1="13" x2="9" y2="7" stroke={stroke} strokeWidth="1.2" strokeDasharray="1 1" />
          <circle cx="11" cy="5" r="2.5" fill={fill} stroke={stroke} strokeWidth="1" />
        </g>
      )}
      {kind === 'scythe' && (
        <g>
          <line x1="3" y1="13" x2="11" y2="3" stroke={stroke} strokeWidth="1.5" />
          <path d="M11 3 Q15 5 14 9" fill="none" stroke={stroke} strokeWidth="1.4" />
        </g>
      )}
    </svg>
  );
}

function mapWeaponKind(id: string): string {
  if (['axe', 'hatchet'].includes(id)) return 'axe';
  if (['knife', 'dagger', 'sai', 'shuriken'].includes(id)) return 'dagger';
  if (['mug', 'mighty_hammer', 'frying_pan', 'bo_staff', 'noodle_bowl', 'wrench'].includes(id)) return 'mace';
  if (['flail', 'morning_star', 'nunchaku', 'chain_whip', 'whip'].includes(id)) return 'flail';
  if (['scimitar'].includes(id)) return 'scythe';
  return 'sword';
}
