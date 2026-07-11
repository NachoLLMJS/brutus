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
import { api, ApiError } from '@/api/apiClient';
import { ensureWalletAuth } from '@/lib/walletAuth';
import type { Brute } from 'core';
import { applySkillStatBonuses, xpToNext, WEAPONS, SKILLS, PETS, getSkill, getWeapon, getPet } from 'core';
import { skillAsset, weaponAsset, petAsset } from '@/lib/assets';
import { useGameStore } from '@/store/useGameStore';
import { useWalletStore } from '@/store/useWalletStore';
import { useProfileSettings } from '@/store/useProfileSettings';
import { useLobbySettings } from '@/store/useLobbySettings';
import { lineageFor, rankName } from '@/lib/profileFlavor';
import { buyPetOnChain, buyPetWithTokenOnChain, formatBnbWei, getEthereumProvider, readVaultInfo, readWalletPetOwnership, type VaultInfo } from '@/lib/web3';

const PET_PRICES_BNB: Record<string, string> = {
  doux_dino: '0.0009',
  mort_dino: '0.0018',
  tard_dino: '0.0036',
  vita_dino: '0.0069',
  bnb_dino: '0.0138',
  blue_mega_dino: '0.022',
  lime_mega_dino: '0.032',
  dark_mega_dino: '0.046',
  red_mega_dino: '0.066',
  yellow_mega_dino: '0.096',
  blue_butterfly: '0.11',
  grey_butterfly: '0.125',
  pink_butterfly: '0.145',
  white_butterfly: '0.165',
  red_butterfly: '0.19',
  yellow_butterfly: '0.22',
  purple_butterfly: '0.26',
};

const PET_PRICES_TOKEN: Record<string, string> = {
  doux_dino: '900',
  mort_dino: '1800',
  tard_dino: '3600',
  vita_dino: '6900',
  bnb_dino: '13800',
  blue_mega_dino: '22000',
  lime_mega_dino: '32000',
  dark_mega_dino: '46000',
  red_mega_dino: '66000',
  yellow_mega_dino: '96000',
  blue_butterfly: '110000',
  grey_butterfly: '125000',
  pink_butterfly: '145000',
  white_butterfly: '165000',
  red_butterfly: '190000',
  yellow_butterfly: '220000',
  purple_butterfly: '260000',
};

const MEGA_DINO_IDS = new Set(['blue_mega_dino', 'lime_mega_dino', 'dark_mega_dino', 'red_mega_dino', 'yellow_mega_dino']);
const BUTTERFLY_PET_IDS = new Set(['blue_butterfly', 'grey_butterfly', 'pink_butterfly', 'white_butterfly', 'red_butterfly', 'yellow_butterfly', 'purple_butterfly']);

function parseUnits18(amount: string): bigint {
  const [whole = '0', fraction = ''] = amount.split('.');
  const padded = fraction.padEnd(18, '0').slice(0, 18);
  return BigInt(whole || '0') * 1_000_000_000_000_000_000n + BigInt(padded || '0');
}

function parseBnbToWei(amount: string): bigint {
  return parseUnits18(amount);
}

const MAX_HP = 200;
const MAX_STAT = 100;

interface PetMeta {
  name: string;
  hp: number;
  dmg: number;
  asset: string;
}
const FALLBACK_PET: PetMeta = { name: 'Unknown Beast', hp: 30, dmg: 5, asset: petAsset('bloodling') };

export function Profile() {
  const { id = '' } = useParams<{ id: string }>();
  const { brute, loading, error, setBrute } = useBrute(id);
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
  const showLineage = useProfileSettings((s) => s.showLineage);

  // Selected skill/weapon for detail strip
  const [selSkillId, setSelSkillId] = useState<string | null>(null);
  const [selWeaponId, setSelWeaponId] = useState<string | null>(null);
  const [petMarketOpen, setPetMarketOpen] = useState(false);
  const [petMarketSaving, setPetMarketSaving] = useState(false);
  const [petMarketError, setPetMarketError] = useState<string | null>(null);
  const [petPaymentToken, setPetPaymentToken] = useState(false);
  const [walletOwnedPetIds, setWalletOwnedPetIds] = useState<Set<string>>(new Set());
  const [petOwnershipLoading, setPetOwnershipLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    if (!walletAddress) {
      setWalletOwnedPetIds(new Set());
      setPetOwnershipLoading(false);
      return () => {
        cancelled = true;
      };
    }
    const provider = getEthereumProvider();
    if (!provider) {
      setWalletOwnedPetIds(new Set());
      setPetOwnershipLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setPetOwnershipLoading(true);
    void readWalletPetOwnership(provider, walletAddress, PETS.map((pet) => pet.id))
      .then((owned) => {
        if (!cancelled) setWalletOwnedPetIds(owned);
      })
      .catch(() => {
        if (!cancelled) setWalletOwnedPetIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setPetOwnershipLoading(false);
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
    .map((id) => {
      const pet = getPet(id);
      return {
        id,
        meta: pet
          ? { name: pet.name, hp: pet.hp, dmg: pet.damage, asset: petAsset(id) }
          : { ...FALLBACK_PET, asset: petAsset(id) },
      };
    })
    .slice(0, 3);
  const beastsEmptyCount = Math.max(0, 3 - beasts.length);
  const ownedPetIds = new Set(brute.pets.slice(0, 3));

  const updatePets = async (pets: string[]) => {
    setPetMarketSaving(true);
    setPetMarketError(null);
    try {
      if (!walletAddress) throw new ApiError('auth_required', 401);
      await ensureWalletAuth(walletAddress);
      const updated = await api.brutes.setPets(brute.id, pets);
      setBrute(updated);
    } catch (e) {
      setPetMarketError(e instanceof Error ? e.message : 'pet_market_error');
    } finally {
      setPetMarketSaving(false);
    }
  };

  const togglePet = async (petId: string) => {
    const current = brute.pets.slice(0, 3);
    const next = current.includes(petId)
      ? current.filter((pid) => pid !== petId)
      : [...current, petId].slice(0, 3);
    await updatePets(next);
  };

  const buyOrEquipPet = async (petId: string) => {
    if (ownedPetIds.has(petId)) {
      await togglePet(petId);
      return;
    }
    if (!walletOwnedPetIds.has(petId)) {
      if (!walletAddress) {
        setPetMarketError('connect_wallet_to_buy_pet');
        return;
      }
      const provider = getEthereumProvider();
      if (!provider) {
        setPetMarketError('metamask_required');
        return;
      }
      setPetMarketSaving(true);
      setPetMarketError(null);
      try {
        if (petPaymentToken) {
          await buyPetWithTokenOnChain(provider, walletAddress, petId, parseUnits18(PET_PRICES_TOKEN[petId] ?? '900'));
        } else {
          await buyPetOnChain(provider, walletAddress, petId, parseBnbToWei(PET_PRICES_BNB[petId] ?? '0.0009'));
        }
        const owned = await readWalletPetOwnership(provider, walletAddress, PETS.map((pet) => pet.id));
        setWalletOwnedPetIds(owned);
        const current = brute.pets.slice(0, 3);
        if (current.length < 3) await updatePets([...current, petId]);
      } catch (e) {
        setPetMarketError(e instanceof Error ? e.message : 'pet_purchase_failed');
      } finally {
        setPetMarketSaving(false);
      }
      return;
    }
    await togglePet(petId);
  };

  const goFight = () => {
    setTrainingMode(false);
    navigate(`/brute/${brute.id}/arena`);
  };
  const goTrain = () => {
    setTrainingMode(true);
    navigate(`/brute/${brute.id}/arena`);
  };

  return (
    <div className="temple-wrap anim-fade-up">
      <div className="ghost temple-ghost" aria-hidden>Temple</div>

      {hasPendingLevelUp && (
        <button
          type="button"
          onClick={() => navigate(`/brute/${brute.id}/levelup`)}
          className="temple-levelup-banner"
        >
          ★ You have a pending level! Choose your upgrade ★
        </button>
      )}

      <div className="temple-hero vb-fu vb-fu1">
        <div className="ringwrap">
          <div className="ring glow" aria-hidden />
          <div className="ring r1" aria-hidden />
          <div className="ring r2" aria-hidden />
          <div className="temple-portrait" aria-label={`Vault Brawler ${brute.name}`}>
            <BruteAvatar brute={brute} size="sm" />
          </div>
        </div>
        <div className="temple-id">
          <div className="eyebrow">◇ Vault Brawler Profile ◇</div>
          <h1>{brute.name}</h1>
          <div className="temple-meta">
            <span className="rank-badge">{rankName(brute.rank)}</span>
            <span>Level {brute.level} · {xpPct}% to Level {brute.level + 1}</span>
          </div>
          <div className="hero-actions">
            <button type="button" className="btn-rune btn-hero" onClick={goTrain}>Train</button>
            <button type="button" className="btn-epic btn-hero primary" onClick={goFight} disabled={noNormalFights}>⚔ Fight</button>
            <div className="fights-pill">
              <span>Fights today {fightsRemaining}/{fightsTotal}</span>
              <span className="pips" aria-hidden>
                {Array.from({ length: fightsTotal }).map((_, i) => (
                  <span key={i} className={clsx('pip', i < fightsRemaining && 'on')} />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bigstats vb-fu vb-fu2">
        <BigStat icon="/assets/stats/hp.webp" label="Vitality" value={effectiveStats.hp} max={Math.max(MAX_HP, effectiveStats.hp)} color="var(--success)" sub={statSub('hp', `+${Math.max(1, Math.floor(effectiveStats.hp / 12))} to level up`)} />
        <BigStat icon="/assets/stats/strength.webp" label="Strength" value={effectiveStats.strength} max={Math.max(MAX_STAT, effectiveStats.strength)} color="var(--purple-glow)" sub={statSub('strength', `Base damage ${Math.floor(effectiveStats.strength * 0.4) + 4}`)} />
        <BigStat icon="/assets/stats/agility.webp" label="Agility" value={effectiveStats.agility} max={Math.max(MAX_STAT, effectiveStats.agility)} color="var(--gold)" sub={statSub('agility', `Dodge ${Math.min(50, Math.floor(effectiveStats.agility * 0.3))}%`)} />
        <BigStat icon="/assets/stats/speed.webp" label="Speed" value={effectiveStats.speed} max={Math.max(MAX_STAT, effectiveStats.speed)} color="var(--text-strong)" sub={statSub('speed', effectiveStats.speed > 50 ? 'Acts first' : 'Average initiative')} />
      </div>

      <div className="dual vb-fu vb-fu3">
        <div className="dual-left">
          <div className="glass rough cut-a">
            <span className="rivet tl" aria-hidden /><span className="rivet tr" aria-hidden />
            <span className="rivet bl" aria-hidden /><span className="rivet br" aria-hidden />
            <div className="glass-head">
              <span className="title"><span className="d" />Active Skills</span>
              <span className="meta">{ownedSkills.size}/{allSkillIds.length} learned</span>
            </div>
            <div className="grid-icons">
              {allSkillIds.map((sid) => {
                const owned = ownedSkills.has(sid);
                return (
                  <button
                    type="button"
                    key={sid}
                    className={clsx('sticker', !owned && 'locked', owned && selSkillId === sid && 'active')}
                    onClick={() => owned && setSelSkillId(sid)}
                    title={getSkill(sid)?.name ?? sid}
                    disabled={!owned}
                  >
                    <img className="sticker-icon" src={skillAsset(sid)} alt={getSkill(sid)?.name ?? sid} />
                    {owned && <span className="sticker-pin" aria-hidden>★</span>}
                  </button>
                );
              })}
            </div>
            {skill && (
              <div className="upgrade-box">
                <img src={skillAsset(skill.id)} alt={skill.name} />
                <div>
                  <div className="upgrade-name">{skill.name} · Active</div>
                  <div className="upgrade-desc">{skill.description}</div>
                </div>
              </div>
            )}
          </div>

          <div className="glass rough cut-c">
            <span className="rivet tl" aria-hidden /><span className="rivet tr" aria-hidden />
            <span className="rivet bl" aria-hidden /><span className="rivet br" aria-hidden />
            <div className="glass-head">
              <span className="title"><span className="d" />Weapons</span>
              <span className="meta">{ownedWeapons.size}/{allWeaponIds.length} forged</span>
            </div>
            <div className="grid-icons">
              {allWeaponIds.map((wid) => {
                const owned = ownedWeapons.has(wid);
                return (
                  <button
                    type="button"
                    key={wid}
                    className={clsx('sticker', !owned && 'locked', owned && selWeaponId === wid && 'active')}
                    onClick={() => owned && setSelWeaponId(wid)}
                    title={getWeapon(wid)?.name ?? wid}
                    disabled={!owned}
                  >
                    <img className="sticker-icon" src={weaponAsset(wid)} alt={getWeapon(wid)?.name ?? wid} />
                    {owned && <span className="sticker-pin" aria-hidden>★</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dual-right">
          <div className="glass rough cut-b">
            <span className="rivet tl" aria-hidden /><span className="rivet br" aria-hidden />
            <div className="glass-head">
              <span className="title"><span className="d" />Beasts</span>
              <span className="meta">{beasts.length}/3</span>
            </div>
            <div className="beast-stack">
              {beasts.map((b) => (
                <button key={b.id} type="button" className="beast-filled" onClick={() => setPetMarketOpen(true)}>
                  <PetIdleSprite petId={b.id} name={b.meta.name} />
                  <span>
                    <span className="beast-name">{b.meta.name}</span>
                    <br />
                    <span className="beast-meta">HP {b.meta.hp} · DMG {b.meta.dmg}</span>
                  </span>
                </button>
              ))}
              {Array.from({ length: beastsEmptyCount }).map((_, i) => (
                <button key={i} type="button" className="beast-slot" onClick={() => setPetMarketOpen(true)}>Empty stable</button>
              ))}
              {beasts.length >= 3 && (
                <button type="button" className="beast-market-link" onClick={() => setPetMarketOpen(true)}>Open pet marketplace</button>
              )}
            </div>
          </div>

          <div className="glass rough cut-a">
            <span className="rivet tl" aria-hidden /><span className="rivet br" aria-hidden />
            <div className="glass-head">
              <span className="title"><span className="d" />Vault Info</span>
              <span className="meta">On-chain</span>
            </div>
            <VaultInfoPanel info={vaultInfo} loading={vaultInfoLoading} error={vaultInfoError} />
          </div>
        </div>
      </div>

      {showLineage && <p className="temple-lineage">{lineage}</p>}

      <div className="temple-footer-row">
        <span>Defeats {brute.defeatsToday}/3</span>
        <Link to="/">Change Brawler</Link>
      </div>

      {pupils.length > 0 && (
        <div className="glass rough cut-b" style={{ marginTop: 32 }}>
          <span className="rivet tl" aria-hidden /><span className="rivet br" aria-hidden />
          <div className="glass-head">
            <span className="title"><span className="d" />Linked Vault Brawlers</span>
            <span className="meta">{pupils.length} created</span>
          </div>
          <div className="pupils-grid">
            {pupils.map((p) => (
              <BruteCard key={p.id} brute={p} onClick={() => navigate(`/brute/${p.id}`)} />
            ))}
          </div>
        </div>
      )}

      {petMarketOpen && (
        <PetMarketplaceModal
          ownedPetIds={ownedPetIds}
          walletOwnedPetIds={walletOwnedPetIds}
          ownershipLoading={petOwnershipLoading}
          payWithToken={petPaymentToken}
          onPayWithTokenChange={setPetPaymentToken}
          tokenSymbol={vaultInfo?.tokenSymbol ?? 'TOKEN'}
          saving={petMarketSaving}
          error={petMarketError}
          onClose={() => setPetMarketOpen(false)}
          onToggle={buyOrEquipPet}
        />
      )}

    </div>
  );
}

/* ─── Sub-components ─── */

function BigStat({
  icon,
  label,
  value,
  max,
  color,
  sub,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  color: string;
  sub?: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="bigstat rough cut-b">
      <span className="rivet tl" aria-hidden />
      <span className="rivet br" aria-hidden />
      <div className="bigstat-label">
        <span className="icon-img bigstat-icon" style={{ backgroundImage: `url(${icon})` }} aria-hidden />
        {label}
      </div>
      <div className="bigstat-value" style={{ color }}>
        {value}
        <span className="bigstat-max">/{max}</span>
      </div>
      <div className="bigstat-bar">
        <div
          className="bigstat-bar-fill"
          style={{ width: `${pct}%`, background: color, color } as React.CSSProperties}
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
    return <div className="vault-note">Reading vault on-chain…</div>;
  }
  if (error && !info) {
    return <div className="vault-note">Vault RPC unavailable</div>;
  }
  if (!info) {
    return <div className="vault-note">Vault info unavailable</div>;
  }
  return (
    <div>
      <div className="vault-balance">
        <div className="lbl">Vault Balance</div>
        <div className="val">{formatBnbWei(info.vaultBalance)} BNB</div>
        <div className="lbl">{info.chainName}</div>
      </div>
      <VaultInfoRow label="Extra Brawlers On-Chain" value={info.totalOnChainBrawlers.toString()} />
      <VaultInfoRow label="Extra Brawler Price" value={vaultMetric(info.extraBrutePrice)} />
      <VaultInfoRow label="Tax Received" value={vaultMetric(info.totalTaxRewardsReceived)} />
      <VaultInfoRow label="Reward Pool" value={vaultMetric(info.combatRewardsBalance)} />
      <VaultInfoRow label="Claim Per Win" value={vaultMetric(info.combatClaimAmount)} />
      <VaultInfoRow label="Claimed So Far" value={vaultMetric(info.combatTotalClaimed)} />
      <VaultInfoRow label="Hold Required" value={tokenMetric(info.combatMinimumHold, info.tokenSymbol)} />
      <VaultInfoRow label="Token Supply" value={tokenMetric(info.tokenTotalSupply, info.tokenSymbol)} />
      <VaultInfoRow label="Your Token Hold" value={info.walletTokenBalance === null ? 'Connect wallet' : tokenMetric(info.walletTokenBalance, info.tokenSymbol)} />
      {loading && <div className="vault-note">Refreshing…</div>}
    </div>
  );
}

function VaultInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vault-row">
      <span className="l">{label}</span>
      <b className="v">{value}</b>
    </div>
  );
}

function PetIdleSprite({ petId, name, large = false }: { petId: string; name: string; large?: boolean }) {
  const mega = MEGA_DINO_IDS.has(petId);
  const butterfly = BUTTERFLY_PET_IDS.has(petId);
  const image = butterfly ? `/assets/pets/butterflies/${petId}.png` : `/assets/pets/dinos/${petId}_idle.png`;
  return (
    <span
      className={clsx('pet-idle-sprite', mega && 'mega', butterfly && 'butterfly', large && 'large')}
      style={{ backgroundImage: `url(${image})` }}
      role="img"
      aria-label={name}
    />
  );
}

function PetMarketplaceModal({
  ownedPetIds,
  walletOwnedPetIds,
  ownershipLoading,
  payWithToken,
  onPayWithTokenChange,
  tokenSymbol,
  saving,
  error,
  onClose,
  onToggle,
}: {
  ownedPetIds: Set<string>;
  walletOwnedPetIds: Set<string>;
  ownershipLoading: boolean;
  payWithToken: boolean;
  onPayWithTokenChange: (enabled: boolean) => void;
  tokenSymbol: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onToggle: (petId: string) => Promise<void>;
}) {
  const petPrices = PET_PRICES_BNB;
  const [selectedPetId, setSelectedPetId] = useState(PETS[0]?.id ?? '');
  const selectedPet = PETS.find((pet) => pet.id === selectedPetId) ?? PETS[0];
  const selectedOwned = selectedPet ? ownedPetIds.has(selectedPet.id) : false;
  const selectedWalletOwned = selectedPet ? walletOwnedPetIds.has(selectedPet.id) : false;
  const selectedButterfly = selectedPet ? BUTTERFLY_PET_IDS.has(selectedPet.id) : false;
  const selectedDisabled = !selectedPet || saving || ownershipLoading || (selectedWalletOwned && !selectedOwned && ownedPetIds.size >= 3);

  return (
    <div className="pet-market-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="pet-market-modal pet-market-shop" role="dialog" aria-modal="true" aria-label="Pet marketplace" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pet-shop-topbar">
          <div className="pet-shop-search">Search beasts...</div>
          <div className="pet-shop-pill">Filter ▾</div>
          <div className="pet-shop-pill wide">Sort: Price · Low to High</div>
          <div className="pet-shop-balance">0.0009 BNB</div>
          <div className="pet-shop-balance strong">0.00008077 BNB</div>
          <button type="button" className="pet-shop-close" onClick={onClose} aria-label="Close marketplace">×</button>
        </div>

        {error && <div className="pet-market-error">{error}</div>}

        <div className="pet-shop-layout">
          <div className="pet-shop-inventory" aria-label="Dino pet listings">
            {PETS.map((pet) => {
              const equipped = ownedPetIds.has(pet.id);
              const walletOwned = walletOwnedPetIds.has(pet.id);
              const disabled = saving || ownershipLoading || (walletOwned && !equipped && ownedPetIds.size >= 3);
              const selected = selectedPet?.id === pet.id;
              return (
                <button
                  key={pet.id}
                  type="button"
                  className={clsx('pet-shop-item', selected && 'selected', equipped && 'owned', walletOwned && 'wallet-owned')}
                  disabled={saving || ownershipLoading}
                  onClick={() => setSelectedPetId(pet.id)}
                  onDoubleClick={() => !disabled && void onToggle(pet.id)}
                >
                  <span className="pet-shop-icon"><PetIdleSprite petId={pet.id} name={pet.name} /></span>
                  <span className="pet-shop-price">{petPrices[pet.id] ?? '0.0009'}</span>
                </button>
              );
            })}
          </div>

          {selectedPet && (
            <aside className="pet-shop-detail">
              <nav className="pet-shop-tabs" aria-label="Marketplace tabs">
                <span className="active">Buy</span>
                <span>Sell</span>
                <span>All Listings</span>
              </nav>

              <div className="pet-shop-titlebar">{selectedPet.name}</div>

              <div className="pet-shop-tags">
                <span>{selectedPet.weight <= 2 ? 'legendary' : selectedPet.weight <= 5 ? 'rare' : 'common'}</span>
                <span>{selectedButterfly ? 'butterfly pet' : 'dino pet'}</span>
                <button type="button" className={clsx('pet-pay-toggle', !payWithToken && 'active')} onClick={() => onPayWithTokenChange(false)}>BNB</button>
                <button type="button" className={clsx('pet-pay-toggle', payWithToken && 'active')} onClick={() => onPayWithTokenChange(true)}>{tokenSymbol}</button>
              </div>

              <div className="pet-shop-copy">
                <p>{selectedPet.description}</p>
                <em>Wallet-owned on-chain · usable by any VaultBrawler.</em>
              </div>

              <div className="pet-shop-preview-card">
                <div className="pet-shop-preview"><PetIdleSprite petId={selectedPet.id} name={selectedPet.name} large /></div>
                <div className="pet-shop-floor">Floor {payWithToken ? `${PET_PRICES_TOKEN[selectedPet.id] ?? '900'} ${tokenSymbol}` : `${petPrices[selectedPet.id] ?? '0.0009'} BNB`}</div>
                <div className="pet-shop-listed">Listed <b>{5800 + selectedPet.damage * 3}</b></div>
              </div>

              <div className="pet-shop-stats">
                <span>HP <b>{selectedPet.hp}</b></span>
                <span>DMG <b>{selectedPet.damage}</b></span>
                <span>STR <b>{selectedPet.strength}</b></span>
                <span>AGI <b>{selectedPet.agility}</b></span>
                <span>SPD <b>{selectedPet.speed}</b></span>
              </div>

              <div className="pet-shop-buy-row">
                <div className="pet-shop-total">~$0.00<br /><strong>{selectedWalletOwned ? '0' : payWithToken ? `${PET_PRICES_TOKEN[selectedPet.id] ?? '900'} ${tokenSymbol}` : `${petPrices[selectedPet.id] ?? '0.0009'} BNB`}</strong></div>
                <button
                  type="button"
                  className="pet-shop-buy"
                  disabled={selectedDisabled}
                  onClick={() => void onToggle(selectedPet.id)}
                >
                  {ownershipLoading ? 'Reading chain' : selectedOwned ? 'Unequip' : selectedWalletOwned ? (ownedPetIds.size >= 3 ? 'Stable full' : 'Equip') : 'Buy'}
                </button>
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}
