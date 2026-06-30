// Landing — "Forja la leyenda".
// Visual del bundle Claude Design (hero con skull sigils, forge form con
// anvil + splatter, warrior cards rich, footer ornamental, glow accent
// dynamic via Tweaks). Lógica preservada: useGameStore para recentBrutes,
// fetch de full Brute data, navegación a /create con name/gender pre-pop.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { BruteAvatar } from '@/components/BruteAvatar';
import { useLandingSettings, type AccentIntensity } from '@/store/useLandingSettings';
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
  const accentIntensity = useLandingSettings((s) => s.accentIntensity);

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
          setToast(`${name} entra al Vault…`);
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
          const name = stub?.name ?? 'este Vault Brawler';
          const ok = window.confirm(`¿Estás seguro de que quieres eliminar a ${name} de Vault Brawlers recientes?`);
          if (!ok) return;
          forget(id);
        }}
      />

      <footer className="landing-footer">
        <div className="footer-mark">
          <span className="pip" />
          <span>Vault Brawl · MMXXVI · Forjado en el Vault</span>
        </div>
        <a href="#how">Cómo se juega</a>
      </footer>

      {toast && <div className="landing-toast">{toast}</div>}
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
          <span>Donde el Vault forja leyendas</span>
        </div>
        <h1 className="hero-title">
          Vault<span className="v"> B</span>rawl
        </h1>
        <div className="hero-sub">Crea tu Vault Brawler y domina la arena</div>
      </div>
    </header>
  );
}

function SkullSigil({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`sigil ${side}`} aria-hidden>
      <div className="sigil-glow" />
      <img src="/logos/vaultbrawl-retro-parchment-banner.png" alt="" draggable={false} />
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
            Crea tu primer <em>Vault Brawler</em>
          </h2>
          <p>
            Cada Vault Brawler que sale del Vault es <strong>único</strong>. Su nombre invoca un destino
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
            <span>Nombre del Vault Brawler</span>
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
          <span>Crear Vault Brawler</span>
          <span className="arrow">›</span>
        </button>

        <div className="fine">Cada Vault Brawler es único e irrepetible</div>
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
        <span className="title">Vault Brawlers recientes</span>
        <span className="rule" />
      </div>
      <div className="warriors-grid">
        {brutes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-mark">Aún no creaste ningún Vault Brawler</div>
            <div className="empty-sub">Empezá creando el primero en el Vault de arriba.</div>
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
        title="Olvidar este Vault Brawler"
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
