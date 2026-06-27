// Profile v2 — Templo personal.
// Visual treatment del bundle de Claude Design (BgPortrait full-bleed,
// hero banner gigante, big-stats row, dual cols con glass panels).
// Lógica preservada: useBrute, useGameStore (rememberBrute / forgetBrute /
// pendingLevelUp), pupils fetch, navigation, master-link copy.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useBrute } from '@/hooks/useBrute';
import { BruteCard } from '@/components/BruteCard';
import { BgPortrait } from '@/components/BgPortrait';
import { TweaksPanel, TweakSection, TweakToggle, TweakSlider } from '@/components/TweaksPanel';
import { PaperPanel } from '@/components/PaperPanel';
import { api } from '@/api/apiClient';
import type { Brute } from 'core';
import { xpToNext, WEAPONS, SKILLS, getSkill, getWeapon } from 'core';
import { skillAsset, weaponAsset } from '@/lib/assets';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/store/useToastStore';
import { useProfileSettings } from '@/store/useProfileSettings';
import { useLobbySettings } from '@/store/useLobbySettings';
import { battleHistoryFor, lineageFor, rankName } from '@/lib/profileFlavor';

const MAX_HP = 200;
const MAX_STAT = 100;

interface PetMeta {
  kind: 'wolf' | 'bear' | 'panther';
  hp: number;
  dmg: number;
}
const FALLBACK_PET: PetMeta = { kind: 'wolf', hp: 42, dmg: 18 };
const PET_META: Record<string, PetMeta> = {
  dog:     { kind: 'wolf',    hp: 42, dmg: 18 },
  bear:    { kind: 'bear',    hp: 88, dmg: 24 },
  panther: { kind: 'panther', hp: 36, dmg: 22 },
};

export function Profile() {
  const { id = '' } = useParams<{ id: string }>();
  const { brute, loading, error } = useBrute(id);
  const navigate = useNavigate();
  const rememberBrute = useGameStore((s) => s.rememberBrute);
  const forgetBrute = useGameStore((s) => s.forgetBrute);
  const pushToast = useToastStore((s) => s.push);
  const setTrainingMode = useLobbySettings((s) => s.setTrainingMode);

  const [pupils, setPupils] = useState<Brute[]>([]);
  const pendingLevelUp = useGameStore((s) => s.pendingLevelUp);
  const hasPendingLevelUp = pendingLevelUp?.bruteId === id;

  // Tweaks (persistidos)
  const portraitGlow = useProfileSettings((s) => s.portraitGlow);
  const setPortraitGlow = useProfileSettings((s) => s.setPortraitGlow);
  const beastCount = useProfileSettings((s) => s.beastCount);
  const setBeastCount = useProfileSettings((s) => s.setBeastCount);
  const showLineage = useProfileSettings((s) => s.showLineage);
  const setShowLineage = useProfileSettings((s) => s.setShowLineage);

  // Selected skill/weapon for detail strip
  const [selSkillId, setSelSkillId] = useState<string | null>(null);
  const [selWeaponId, setSelWeaponId] = useState<string | null>(null);

  useEffect(() => {
    if (error === 'brute_not_found' && id) {
      forgetBrute(id);
      navigate('/', { replace: true });
    }
  }, [error, id, forgetBrute, navigate]);

  useEffect(() => {
    if (brute) {
      rememberBrute({ id: brute.id, name: brute.name, level: brute.level });
    }
  }, [brute, rememberBrute]);

  // Default selection: primer skill/weapon equipado.
  useEffect(() => {
    if (!brute) return;
    if (!selSkillId && brute.skills.length > 0) {
      setSelSkillId(brute.skills[0] ?? null);
    }
    if (!selWeaponId && brute.weapons.length > 0) {
      setSelWeaponId(brute.weapons[0] ?? null);
    }
  }, [brute, selSkillId, selWeaponId]);

  useEffect(() => {
    if (!brute) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await api.brutes.pupils(brute.id);
        if (!cancelled) setPupils(Array.isArray(list) ? list : []);
      } catch {
        // pupils es secundario
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brute]);

  // Bitácora + linaje deterministas.
  const history = useMemo(() => (brute ? battleHistoryFor(brute, 5) : []), [brute]);
  const lineage = useMemo(() => (brute ? lineageFor(brute) : ''), [brute]);

  if (loading && !brute) {
    return (
      <div className="profile-v2-shell">
        <BgPortrait glowing={portraitGlow} />
        <main className="profile-v2">
          <div className="text-center font-display text-ink-strong py-12 uppercase tracking-widest">
            Convocando…
          </div>
        </main>
      </div>
    );
  }
  if (error || !brute) {
    return (
      <div className="profile-v2-shell">
        <BgPortrait glowing={false} />
        <main className="profile-v2">
          <PaperPanel>
            <p className="text-blood font-display">Error: {error ?? 'no se encontró el bruto.'}</p>
            <button
              type="button"
              className="btn mt-4"
              onClick={() => {
                if (id) forgetBrute(id);
                navigate('/', { replace: true });
              }}
            >
              Volver
            </button>
          </PaperPanel>
        </main>
      </div>
    );
  }

  const xpMax = xpToNext(brute.level);
  const xpPct = Math.min(100, Math.floor((brute.xp / xpMax) * 100));
  const noNormalFights = brute.fightsRemaining <= 0;
  const fightsTotal = 3;
  const fightsRemaining = Math.max(0, Math.min(fightsTotal, brute.fightsRemaining));

  const skill = selSkillId ? getSkill(selSkillId) : null;
  const weapon = selWeaponId ? getWeapon(selWeaponId) : null;

  const ownedSkills = new Set(brute.skills);
  const ownedWeapons = new Set(brute.weapons);
  const allSkillIds = SKILLS.map((s) => s.id);
  const allWeaponIds = WEAPONS.map((w) => w.id);

  const beasts: { id: string; meta: PetMeta }[] = brute.pets
    .map((id) => ({ id, meta: PET_META[id] ?? FALLBACK_PET }))
    .slice(0, beastCount);
  const beastsEmptyCount = Math.max(0, 3 - beasts.length);

  const copyMasterLink = async () => {
    const url = `${window.location.origin}/create?master=${brute.id}`;
    try {
      await navigator.clipboard.writeText(url);
      pushToast('success', 'Enlace de discípulo copiado.');
    } catch {
      pushToast('error', 'No se pudo copiar.');
    }
  };

  const goFight = () => {
    setTrainingMode(false);
    navigate(`/brute/${brute.id}/arena`);
  };
  const goTrain = () => {
    setTrainingMode(true);
    navigate(`/brute/${brute.id}/arena`);
  };

  // Split del nombre para acentuar la última letra (estilo "VORG[A]TH").
  const nameParts = brute.name.length > 1
    ? [brute.name.slice(0, -1), brute.name.slice(-1)]
    : [brute.name, ''];

  return (
    <div className="profile-v2-shell">
      <BgPortrait glowing={portraitGlow} />

      <main className="profile-v2 anim-fade-up">
        {hasPendingLevelUp && (
          <button
            type="button"
            onClick={() => navigate(`/brute/${brute.id}/levelup`)}
            className="levelup-banner block w-full"
          >
            ★ ¡Tenés un nivel pendiente! Elegí tu mejora ★
          </button>
        )}

        <section className="profile-hero">
          <div className="eyebrow"><span>Templo personal</span></div>
          <h1>
            {nameParts[0]}
            <span className="accent">{nameParts[1]}</span>
          </h1>
          <div className="meta">
            <span className="rank">{rankName(brute.rank)}</span>
            <span className="lvl">Nivel <b>{brute.level}</b> · {xpPct}% al {brute.level + 1}</span>
          </div>
          <div className="profile-hero-actions">
            <button type="button" className="btn-hero gold" onClick={goTrain} disabled={brute.trainingFightsRemaining <= 0}>
              Entrenar
            </button>
            <button type="button" className="btn-hero primary" onClick={goFight} disabled={noNormalFights}>
              <span aria-hidden>⚔</span>
              <span>Pelear</span>
            </button>
            <div className="fights-pill">
              <span>{fightsRemaining}/{fightsTotal} hoy</span>
              <span className="fights-pips">
                {Array.from({ length: fightsTotal }).map((_, i) => (
                  <span key={i} className={clsx('p', i < fightsRemaining && 'on')} />
                ))}
              </span>
            </div>
          </div>
        </section>

        <section className="profile-bigstats">
          <BigStat label="Vitalidad" value={brute.stats.hp} max={MAX_HP} color="#5fb04a" sub={`+${Math.max(1, Math.floor(brute.stats.hp / 12))} al subir nivel`} />
          <BigStat label="Fuerza" value={brute.stats.strength} max={MAX_STAT} color="#c41a1a" sub={`Daño base ${Math.floor(brute.stats.strength * 0.4) + 4}`} />
          <BigStat label="Agilidad" value={brute.stats.agility} max={MAX_STAT} color="#e6b450" sub={`Esquiva ${Math.min(50, Math.floor(brute.stats.agility * 0.3))}%`} />
          <BigStat label="Velocidad" value={brute.stats.speed} max={MAX_STAT} color="#8a6038" sub={brute.stats.speed > 50 ? 'Inicia primero' : 'Iniciativa media'} />
        </section>

        <section className="profile-dual">
          <div className="profile-col-left">
            <Glass num="— I" title="Habilidades" meta={`${ownedSkills.size}/${allSkillIds.length} aprendidas · ${ownedSkills.size} activas`}>
              <div className="invv2">
                {allSkillIds.map((sid) => {
                  const owned = ownedSkills.has(sid);
                  const active = selSkillId === sid;
                  return (
                    <button
                      type="button"
                      key={sid}
                      className={clsx('slotv2', !owned && 'locked', active && 'active', owned && 'equipped')}
                      onClick={() => owned && setSelSkillId(sid)}
                      title={getSkill(sid)?.name ?? sid}
                      disabled={!owned}
                    >
                      <img src={skillAsset(sid)} alt={getSkill(sid)?.name ?? sid} />
                      {owned && <span className="slotv2-pin">★</span>}
                    </button>
                  );
                })}
              </div>
              {skill && (
                <div className="detail-strip">
                  <div className="icon">
                    <img src={skillAsset(skill.id)} alt={skill.name} />
                  </div>
                  <div>
                    <div className="name">{skill.name} {ownedSkills.has(skill.id) && '· activa'}</div>
                    <div className="desc">{skill.description}</div>
                  </div>
                </div>
              )}
            </Glass>

            <Glass num="— II" title="Armas" meta={`${ownedWeapons.size} en pool · ${ownedWeapons.size}/${allWeaponIds.length} forjadas`}>
              <div className="invv2">
                {allWeaponIds.map((wid) => {
                  const owned = ownedWeapons.has(wid);
                  const active = selWeaponId === wid;
                  return (
                    <button
                      type="button"
                      key={wid}
                      className={clsx('slotv2', !owned && 'locked', active && 'active', owned && 'equipped')}
                      onClick={() => owned && setSelWeaponId(wid)}
                      title={getWeapon(wid)?.name ?? wid}
                      disabled={!owned}
                    >
                      <img src={weaponAsset(wid)} alt={getWeapon(wid)?.name ?? wid} />
                      {owned && <span className="slotv2-pin">★</span>}
                    </button>
                  );
                })}
              </div>
              {weapon && (
                <div className="detail-strip">
                  <div className="icon">
                    <img src={weaponAsset(weapon.id)} alt={weapon.name} />
                  </div>
                  <div>
                    <div className="name">{weapon.name} {ownedWeapons.has(weapon.id) && '· en pool'}</div>
                    <div className="desc">{weapon.description}</div>
                  </div>
                </div>
              )}
            </Glass>
          </div>

          <div className="profile-col-right">
            <Glass num="— III" title="Bestias" meta={`${beasts.length}/3`}>
              <div className="beastsv2">
                {beasts.map((b) => (
                  <BeastV2 key={b.id} kind={b.meta.kind} name={capitalize(b.id)} hp={b.meta.hp} dmg={b.meta.dmg} />
                ))}
                {Array.from({ length: beastsEmptyCount }).map((_, i) => (
                  <div key={i} className="beast-empty">Establo vacío</div>
                ))}
              </div>
            </Glass>

            <Glass num="— IV" title="Bitácora" meta="5 últimas">
              <div className="battlesv2">
                {history.map((b, i) => (
                  <div key={i} className={clsx('battlev2', b.result)}>
                    <div className="battlev2-r">{b.result === 'win' ? 'V' : 'D'}</div>
                    <div>
                      <div className="battlev2-foe">
                        {b.foe} <span className="lvl">N{b.level}</span>
                      </div>
                      <div className="battlev2-when">{b.when}</div>
                    </div>
                    <div className="battlev2-xp">{b.xp >= 0 ? '+' : ''}{b.xp}</div>
                  </div>
                ))}
              </div>
            </Glass>

            {showLineage && (
              <Glass num="— V" title="Linaje">
                <p className="lineage-v2">
                  {(() => {
                    const idx = lineage.indexOf(brute.name);
                    if (idx === -1) return lineage;
                    return (
                      <>
                        {lineage.slice(0, idx)}
                        <strong>{brute.name}</strong>
                        {lineage.slice(idx + brute.name.length)}
                      </>
                    );
                  })()}
                </p>
              </Glass>
            )}

            <Glass num="— VI" title="Acciones">
              <div className="flex flex-col gap-3">
                <button type="button" onClick={copyMasterLink} className="btn">
                  Compartir enlace de discípulo
                </button>
                <Link to="/" className="btn">Cambiar bruto</Link>
                <div className="text-xs text-center" style={{ color: 'var(--text-secondary)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  Derrotas hoy: {brute.defeatsToday}/3
                </div>
              </div>
            </Glass>
          </div>
        </section>

        {pupils.length > 0 && (
          <section className="mt-8">
            <Glass num="— VII" title="Discípulos" meta={`${pupils.length} forjados`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pupils.map((p) => (
                  <BruteCard key={p.id} brute={p} onClick={() => navigate(`/brute/${p.id}`)} />
                ))}
              </div>
            </Glass>
          </section>
        )}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Retrato">
          <TweakToggle label="Glow rojo de fondo" value={portraitGlow} onChange={setPortraitGlow} />
        </TweakSection>
        <TweakSection title="Bestias">
          <TweakSlider label="Cantidad" min={0} max={3} step={1} value={beastCount} onChange={setBeastCount} />
        </TweakSection>
        <TweakSection title="Lore">
          <TweakToggle label="Mostrar Linaje" value={showLineage} onChange={setShowLineage} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ─── Sub-components ─── */

function Glass({
  num,
  title,
  meta,
  children,
}: {
  num: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="profile-glass">
      <div className="profile-glass-head">
        <span className="num">{num}</span>
        <span className="title">{title}</span>
        {meta && <span className="meta">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

function BigStat({
  label,
  value,
  max,
  color,
  sub,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  sub?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="bigstat">
      <div className="bigstat-label">{label}</div>
      <div className="bigstat-value" style={{ color }}>
        {value}
        <span className="bigstat-max">/{max}</span>
      </div>
      <div className="bigstat-bar">
        <div
          className="bigstat-bar-fill"
          style={{ width: `${pct}%`, ['--c' as string]: color } as React.CSSProperties}
        />
      </div>
      {sub && <div className="bigstat-sub">{sub}</div>}
    </div>
  );
}

function BeastV2({
  kind,
  name,
  hp,
  dmg,
}: {
  kind: 'wolf' | 'bear' | 'panther';
  name: string;
  hp: number;
  dmg: number;
}) {
  return (
    <div className="beastv2">
      <div className="beastv2-art">
        <svg viewBox="0 0 100 80" width="100%" height="100%" aria-hidden>
          <defs>
            <radialGradient id={`bv-${kind}`} cx="50%" cy="100%" r="80%">
              <stop offset="0" stopColor="#3d2530" />
              <stop offset="1" stopColor="#0d0a14" />
            </radialGradient>
          </defs>
          <rect width="100" height="80" fill={`url(#bv-${kind})`} />
          {kind === 'wolf' && (
            <g>
              <path
                d="M20 50 L30 30 L40 35 L55 28 L70 30 L80 38 L78 56 L72 60 L70 64 L42 64 L38 60 L24 62 Z"
                fill="#1a1014"
                stroke="#8a6038"
                strokeWidth="1.2"
              />
              <circle cx="40" cy="42" r="1.5" fill="#c41a1a" />
              <circle cx="50" cy="42" r="1.5" fill="#c41a1a" />
            </g>
          )}
          {kind === 'bear' && (
            <g>
              <ellipse cx="50" cy="52" rx="32" ry="22" fill="#1a1014" stroke="#8a6038" strokeWidth="1.2" />
              <circle cx="50" cy="34" r="14" fill="#1a1014" stroke="#8a6038" strokeWidth="1.2" />
              <circle cx="44" cy="32" r="1.4" fill="#e6b450" />
              <circle cx="56" cy="32" r="1.4" fill="#e6b450" />
            </g>
          )}
          {kind === 'panther' && (
            <g>
              <path
                d="M10 55 L20 40 L40 38 L60 35 L78 40 L88 50 L86 62 L80 60 L72 64 L34 60 L20 60 Z"
                fill="#1a1014"
                stroke="#8a6038"
                strokeWidth="1.2"
              />
              <circle cx="74" cy="46" r="1.4" fill="#5fb04a" />
            </g>
          )}
        </svg>
      </div>
      <div>
        <div className="beastv2-name">{name}</div>
        <div className="beastv2-meta">HP {hp} · DMG {dmg}</div>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}
