// Profile v2 — Temple personal.
// Visual treatment del bundle de Claude Design (BgPortrait full-bleed,
// hero banner gigante, big-stats row, dual cols con glass panels).
// Lógica preservada: useBrute, useGameStore (rememberBrute / forgetBrute /
// pendingLevelUp), pupils fetch, navigation, master-link copy.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useBrute } from '@/hooks/useBrute';
import { BruteCard } from '@/components/BruteCard';
import { BruteAvatar } from '@/components/BruteAvatar';
import { BgPortrait } from '@/components/BgPortrait';
import { PaperPanel } from '@/components/PaperPanel';
import { api } from '@/api/apiClient';
import type { Brute } from 'core';
import { applySkillStatBonuses, xpToNext, WEAPONS, SKILLS, getSkill, getWeapon } from 'core';
import { skillAsset, weaponAsset } from '@/lib/assets';
import { useGameStore } from '@/store/useGameStore';
import { useWalletStore } from '@/store/useWalletStore';
import { useProfileSettings } from '@/store/useProfileSettings';
import { useLobbySettings } from '@/store/useLobbySettings';
import { lineageFor, rankName } from '@/lib/profileFlavor';
import { formatBnbWei, readVaultInfo, type VaultInfo } from '@/lib/web3';

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
  const walletAddress = useWalletStore((s) => s.address);
  const setTrainingMode = useLobbySettings((s) => s.setTrainingMode);

  const [pupils, setPupils] = useState<Brute[]>([]);
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [vaultInfoLoading, setVaultInfoLoading] = useState(false);
  const [vaultInfoError, setVaultInfoError] = useState<string | null>(null);
  const pendingLevelUp = useGameStore((s) => s.pendingLevelUp);
  const hasPendingLevelUp = pendingLevelUp?.bruteId === id;

  // Visual settings de sesión.
  const portraitGlow = useProfileSettings((s) => s.portraitGlow);
  const beastCount = useProfileSettings((s) => s.beastCount);
  const showLineage = useProfileSettings((s) => s.showLineage);

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
    if (brute && walletAddress && brute.ownerWallet?.toLowerCase() === walletAddress.toLowerCase()) {
      rememberBrute({ id: brute.id, name: brute.name, level: brute.level });
    }
  }, [brute, rememberBrute, walletAddress]);

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


  useEffect(() => {
    let cancelled = false;
    setVaultInfoLoading(true);
    setVaultInfoError(null);
    void readVaultInfo(walletAddress)
      .then((info) => {
        if (!cancelled) setVaultInfo(info);
      })
      .catch((e) => {
        if (!cancelled) {
          setVaultInfo(null);
          setVaultInfoError(e instanceof Error ? e.message : 'vault_info_unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setVaultInfoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // Linaje determinista.
  const lineage = useMemo(() => (brute ? lineageFor(brute) : ''), [brute]);

  if (loading && !brute) {
    return (
      <div className="profile-v2-shell">
        <BgPortrait glowing={portraitGlow} />
        <main className="profile-v2">
          <div className="text-center font-display text-ink-strong py-12 uppercase tracking-widest">
            Summoning…
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
            <p className="text-blood font-display">Error: {error ?? 'Brawler not found.'}</p>
            <button
              type="button"
              className="btn mt-4"
              onClick={() => {
                if (id) forgetBrute(id);
                navigate('/', { replace: true });
              }}
            >
              Back
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

  const ownedSkills = new Set(brute.skills);
  const ownedWeapons = new Set(brute.weapons);
  const effectiveStats = applySkillStatBonuses(brute.stats, brute.skills);
  const statSub = (key: keyof typeof brute.stats, fallback: string) => {
    const base = brute.stats[key];
    const effective = effectiveStats[key];
    if (effective !== base) {
      const delta = effective - base;
      return `Base ${base} · skills ${delta > 0 ? '+' : ''}${delta}`;
    }
    return fallback;
  };
  const allSkillIds = SKILLS.map((s) => s.id);
  const allWeaponIds = WEAPONS.map((w) => w.id);

  const beasts: { id: string; meta: PetMeta }[] = brute.pets
    .map((id) => ({ id, meta: PET_META[id] ?? FALLBACK_PET }))
    .slice(0, beastCount);
  const beastsEmptyCount = Math.max(0, 3 - beasts.length);

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
  const warriorNameLength = Array.from(brute.name).length;
  const warriorNameFontSize = Math.max(22, Math.min(54, Math.floor(500 / Math.max(9, warriorNameLength))));

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
            ★ You have a pending level! Choose your upgrade ★
          </button>
        )}

        <section className="temple-rpg-layout">
          <aside className="temple-warrior-card">
            <div className="temple-card-kicker">◇ Vault Brawler Profile ◇</div>
            <div className="temple-avatar-stage" aria-label={`Vault Brawler ${brute.name}`}>
              <BruteAvatar brute={brute} size="sm" />
            </div>
            <h1
              className="temple-warrior-name"
              style={{
                fontSize: warriorNameFontSize,
                letterSpacing: warriorNameLength > 11 ? '0.01em' : '0.035em',
              }}
            >
              {nameParts[0]}
              <span>{nameParts[1]}</span>
            </h1>
            <div className="temple-rank-row">
              <span>{rankName(brute.rank)}</span>
              <b>Level {brute.level}</b>
            </div>
            <div className="temple-xp-label">{xpPct}% to nivel {brute.level + 1}</div>
            <div className="temple-xp-bar"><span style={{ width: `${xpPct}%` }} /></div>

            <div className="temple-card-stats">
              <BigStat label="Vitality" value={effectiveStats.hp} max={Math.max(MAX_HP, effectiveStats.hp)} color="#5fb04a" sub={statSub('hp', `+${Math.max(1, Math.floor(effectiveStats.hp / 12))} to subir nivel`)} />
              <BigStat label="Strength" value={effectiveStats.strength} max={Math.max(MAX_STAT, effectiveStats.strength)} color="#c41a1a" sub={statSub('strength', `Base damage ${Math.floor(effectiveStats.strength * 0.4) + 4}`)} />
              <BigStat label="Agility" value={effectiveStats.agility} max={Math.max(MAX_STAT, effectiveStats.agility)} color="#e6b450" sub={statSub('agility', `Dodge ${Math.min(50, Math.floor(effectiveStats.agility * 0.3))}%`)} />
              <BigStat label="Speed" value={effectiveStats.speed} max={Math.max(MAX_STAT, effectiveStats.speed)} color="#9b5cc9" sub={statSub('speed', effectiveStats.speed > 50 ? 'Acts first' : 'Average initiative')} />
            </div>

            <div className="temple-action-row">
              <button type="button" className="btn-hero gold" onClick={goTrain}>Train</button>
              <button type="button" className="btn-hero primary" onClick={goFight} disabled={noNormalFights}>Fight</button>
            </div>
            <div className="temple-card-footer">
              <span>{fightsRemaining}/{fightsTotal} today</span>
              <span>Defeats {brute.defeatsToday}/3</span>
              <Link to="/">Change Brawler</Link>
            </div>
          </aside>

          <section className="temple-main-stack">
            <Glass num="◇" title="Active Skills" meta={`${ownedSkills.size}/${allSkillIds.length} learned`}>
              <div className="invv2 temple-skills-grid">
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
            </Glass>

            <Glass num="◇" title="Weapons" meta={`${ownedWeapons.size}/${allWeaponIds.length} forged`}>
              <div className="invv2 temple-weapons-grid">
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
            </Glass>

            {skill && (
              <Glass num="◇" title="Active Upgrade">
                <div className="detail-strip temple-active-detail">
                  <div className="icon"><img src={skillAsset(skill.id)} alt={skill.name} /></div>
                  <div>
                    <div className="name">{skill.name} · active</div>
                    <div className="desc">{skill.description}</div>
                  </div>
                </div>
              </Glass>
            )}
          </section>

          <aside className="temple-side-stack">
            <Glass num="◇" title="Beasts" meta={`${beasts.length}/3`}>
              <div className="beastsv2 temple-beasts-compact">
                {beasts.map((b) => (
                  <BeastV2 key={b.id} kind={b.meta.kind} name={capitalize(b.id)} hp={b.meta.hp} dmg={b.meta.dmg} />
                ))}
                {Array.from({ length: beastsEmptyCount }).map((_, i) => (
                  <div key={i} className="beast-empty">Empty stable</div>
                ))}
              </div>
            </Glass>

            <Glass num="◇" title="Vault Info" meta="on-chain">
              <VaultInfoPanel info={vaultInfo} loading={vaultInfoLoading} error={vaultInfoError} />
            </Glass>
          </aside>
        </section>

        {showLineage && (
          <p className="temple-bottom-lineage">{lineage}</p>
        )}

        {pupils.length > 0 && (
          <section className="mt-8">
            <Glass num="— VII" title="Linked Vault Brawlers" meta={`${pupils.length} created`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pupils.map((p) => (
                  <BruteCard key={p.id} brute={p} onClick={() => navigate(`/brute/${p.id}`)} />
                ))}
              </div>
            </Glass>
          </section>
        )}
      </main>

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


function vaultMetric(value: bigint, suffix = 'BNB'): string {
  return `${formatBnbWei(value)} ${suffix}`;
}

function tokenMetric(value: bigint, symbol: string): string {
  const formatted = formatBnbWei(value);
  return `${formatted} ${symbol}`;
}

function VaultInfoPanel({
  info,
  loading,
  error,
}: {
  info: VaultInfo | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !info) {
    return <div className="vaultinfo-empty">Reading vault on-chain…</div>;
  }
  if (error && !info) {
    return <div className="vaultinfo-empty">Vault RPC unavailable</div>;
  }
  if (!info) {
    return <div className="vaultinfo-empty">Vault info unavailable</div>;
  }
  return (
    <div className="vaultinfo">
      <div className="vaultinfo-hero">
        <span>Vault balance</span>
        <strong>{formatBnbWei(info.vaultBalance)} BNB</strong>
        <small>{info.chainName}</small>
      </div>
      <div className="vaultinfo-grid">
        <VaultInfoRow label="Extra brawlers on-chain" value={info.totalOnChainBrawlers.toString()} />
        <VaultInfoRow label="Extra brawler price" value={vaultMetric(info.extraBrutePrice)} />
        <VaultInfoRow label="Tax received" value={vaultMetric(info.totalTaxRewardsReceived)} />
        <VaultInfoRow label="Reward pool" value={vaultMetric(info.combatRewardsBalance)} />
        <VaultInfoRow label="Claim per win" value={vaultMetric(info.combatClaimAmount)} />
        <VaultInfoRow label="Claimed so far" value={vaultMetric(info.combatTotalClaimed)} />
        <VaultInfoRow label="Hold required" value={tokenMetric(info.combatMinimumHold, info.tokenSymbol)} />
        <VaultInfoRow label="Token supply" value={tokenMetric(info.tokenTotalSupply, info.tokenSymbol)} />
        <VaultInfoRow label="Your token hold" value={info.walletTokenBalance === null ? 'Connect wallet' : tokenMetric(info.walletTokenBalance, info.tokenSymbol)} />
      </div>
      {loading && <div className="vaultinfo-refresh">Refreshing…</div>}
    </div>
  );
}

function VaultInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vaultinfo-row">
      <span>{label}</span>
      <b>{value}</b>
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
