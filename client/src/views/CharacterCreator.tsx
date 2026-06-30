// CharacterCreator — Forge a Brawler.
// Reskin coherente con el design system dark fantasy. Lógica preservada:
// pre-pop desde URL params (name, gender, master), randomize body/colors,
// submit a api.brutes.create, navegación post-creation.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  LpcAvatarPreview,
  LPC_ARMOR_COLOR_OPTIONS,
  LPC_ARMS_ARMOR_OPTIONS,
  LPC_FEET_ARMOR_OPTIONS,
  LPC_HAIR_OPTIONS,
  LPC_HEADWEAR_OPTIONS,
  LPC_LEGS_ARMOR_OPTIONS,
  LPC_TORSO_ARMOR_OPTIONS,
  LPC_WINGS_OPTIONS,
  type LpcArmsArmorKey,
  type LpcArmorColorKey,
  type LpcFeetArmorKey,
  type LpcHairKey,
  type LpcHeadwearKey,
  type LpcLegsArmorKey,
  type LpcTorsoArmorKey,
  type LpcWingsKey,
} from '@/components/LpcAvatarPreview';
import { api, ApiError } from '@/api/apiClient';
import {
  generateColorString,
  getRandomBody,
  mulberry32,
  hashStringToSeed,
  type Brute,
  type BruteGender,
} from 'core';
import { isValidName } from '@/lib/format';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/store/useToastStore';
import { useWalletStore } from '@/store/useWalletStore';
import {
  createPaidExtraBruteOnChain,
  formatBnbWei,
  getEthereumProvider,
  isSupportedBnbChain,
  metadataHashForBrute,
  readExtraBrutePrice,
} from '@/lib/web3';

export function CharacterCreator() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const rememberBrute = useGameStore((s) => s.rememberBrute);
  const setCurrent = useGameStore((s) => s.setCurrentBrute);
  const pushToast = useToastStore((s) => s.push);
  const walletAddress = useWalletStore((s) => s.address);
  const chainId = useWalletStore((s) => s.chainId);

  const masterId = search.get('master');
  const [master, setMaster] = useState<Brute | null>(null);

  const [name, setName] = useState<string>('');
  const [gender] = useState<BruteGender>('male');
  const [body, setBody] = useState<string>(() => {
    const rng = mulberry32(hashStringToSeed('brutus-default-body'));
    return getRandomBody('male', rng);
  });
  const [bodyColors] = useState<string>(() =>
    generateColorString({
      col0: 1, col0a: 1, col0c: 1,
      col1: 0, col1a: 0, col1b: 0, col1c: 0, col1d: 0,
      col2: 0, col2a: 0, col2b: 0,
      col3: 0, col3b: 0,
      col4: 0, col4a: 0, col4b: 0,
    }),
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lpcHair, setLpcHair] = useState<LpcHairKey>('bedhead');
  const [lpcWings, setLpcWings] = useState<LpcWingsKey>('monarchPurple');
  const [lpcHeadwear, setLpcHeadwear] = useState<LpcHeadwearKey>('none');
  const [lpcArmsArmor, setLpcArmsArmor] = useState<LpcArmsArmorKey>('none');
  const [lpcTorsoArmor, setLpcTorsoArmor] = useState<LpcTorsoArmorKey>('trenchCoat');
  const [lpcLegsArmor, setLpcLegsArmor] = useState<LpcLegsArmorKey>('plate');
  const [lpcFeetArmor, setLpcFeetArmor] = useState<LpcFeetArmorKey>('plate');
  const [lpcArmorColor, setLpcArmorColor] = useState<LpcArmorColorKey>('black');
  const [paidForgeNeeded, setPaidForgeNeeded] = useState<boolean>(false);
  const [paidForgePrice, setPaidForgePrice] = useState<bigint | null>(null);
  const [paidForgeBusy, setPaidForgeBusy] = useState<boolean>(false);

  useEffect(() => {
    const rng = mulberry32(hashStringToSeed(`gender-switch-${gender}-${Date.now()}`));
    setBody((prev) => prev || getRandomBody(gender, rng));
  }, [gender]);

  useEffect(() => {
    if (!masterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const m = await api.brutes.get(masterId);
        if (!cancelled) setMaster(m);
      } catch {
        // ignorar
      }
    })();
    return () => { cancelled = true; };
  }, [masterId]);

  // Pre-populate name desde URL search params (cuando viene del Landing). El juego usa macho fijo por ahora.
  useEffect(() => {
    const qName = search.get('name');
    if (qName) {
      setName(qName.slice(0, 20));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameValid = isValidName(name);
  const walletReady = Boolean(walletAddress && isSupportedBnbChain(chainId));
  const forgeDisabled = !nameValid || submitting || !walletReady;
  const effectiveLpcHair = lpcHeadwear === 'none' ? lpcHair : 'none';
  const lpcAppearance = {
    head: 'humanMale' as const,
    hair: lpcHair,
    wings: lpcWings,
    headwear: lpcHeadwear,
    armsArmor: lpcArmsArmor,
    torsoArmor: lpcTorsoArmor,
    legsArmor: lpcLegsArmor,
    feetArmor: lpcFeetArmor,
    armorColor: lpcArmorColor,
    weapon: 'none' as const,
  };

  const appearance = {
    gender: 'M' as const,
    skin: '#d2a679',
    hair: '#3b1f0e',
    shirt: '#3b3b8a',
    pants: '#1f1f1f',
    lpc: lpcAppearance,
  };

  const submit = async () => {
    if (submitting) return;
    if (!walletAddress) {
      pushToast('error', 'Connect MetaMask to forge.');
      return;
    }
    if (!isSupportedBnbChain(chainId)) {
      pushToast('error', 'Switch to BNB Chain/Testnet to forge.');
      return;
    }
    if (!nameValid) return;
    setSubmitting(true);
    try {
      const brute = await api.brutes.create({
        name: name.trim(),
        gender,
        body,
        bodyColors,
        appearance,
        walletAddress,
        masterId: masterId ?? undefined,
      });
      rememberBrute({ id: brute.id, name: brute.name, level: brute.level });
      setPaidForgeNeeded(false);
      setCurrent(brute.id);
      navigate(`/brute/${brute.id}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      if (code === 'base_brute_limit_reached_extra_requires_onchain_payment') {
        setPaidForgeNeeded(true);
        const provider = getEthereumProvider();
        if (provider && walletAddress) {
          try {
            setPaidForgePrice(await readExtraBrutePrice(provider, walletAddress));
          } catch {
            setPaidForgePrice(null);
          }
        }
        pushToast('info', 'You already have 3 base Vault Brawlers. You can create another by paying BNB.');
      } else {
        pushToast('error', `Could not create: ${code}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitPaidExtra = async () => {
    if (paidForgeBusy || !walletAddress || !walletReady || !nameValid) return;
    const provider = getEthereumProvider();
    if (!provider) {
      pushToast('error', 'MetaMask is not available.');
      return;
    }
    setPaidForgeBusy(true);
    try {
      const metadataHash = await metadataHashForBrute({
        name: name.trim(),
        walletAddress,
        gender,
        body,
        bodyColors,
      });
      const paid = await createPaidExtraBruteOnChain(provider, walletAddress, metadataHash);
      const brute = await api.brutes.create({
        name: name.trim(),
        gender,
        body,
        bodyColors,
        appearance,
        walletAddress,
        onChainBruteId: paid.onChainBruteId,
        createTxHash: paid.txHash,
        masterId: masterId ?? undefined,
      });
      rememberBrute({ id: brute.id, name: brute.name, level: brute.level });
      setPaidForgeNeeded(false);
      setCurrent(brute.id);
      pushToast('success', 'Extra Vault Brawler created by paying BNB.');
      navigate(`/brute/${brute.id}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : e instanceof Error ? e.message : 'paid_forge_failed';
      pushToast('error', `Payment/creation failed: ${code}`);
    } finally {
      setPaidForgeBusy(false);
    }
  };

  return (
    <div className="creator-shell anim-fade-up">
      <header className="creator-hero">
        <div className="eyebrow">
          <span>Forge your destiny</span>
        </div>
        <h1>
          Create <em>Vault Brawler</em>
        </h1>
        <div className="sub">Choose his shape, his name, and unleash him in the arena</div>
      </header>

      {master && (
        <div className="creator-pupil-banner">
          New Vault Brawler linked to <b>{master.name}</b> · Level {master.level}
        </div>
      )}

      <section className="creator-panel">
        <div className="creator-grid">
          {/* Preview izquierdo */}
          <div className="creator-preview">
            <div className="creator-preview-frame">
              <LpcAvatarPreview
                hair={effectiveLpcHair}
                wings={lpcWings}
                headwear={lpcHeadwear}
                armsArmor={lpcArmsArmor}
                torsoArmor={lpcTorsoArmor}
                legsArmor={lpcLegsArmor}
                feetArmor={lpcFeetArmor}
                armorColor={lpcArmorColor}
                weapon="none"
                scale={3}
                compact
              />
              <span className="pin tl" />
              <span className="pin tr" />
              <span className="pin bl" />
              <span className="pin br" />
            </div>
            <div className={clsx('creator-preview-name', !name && 'empty')}>
              {name || 'No name'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 10 }}>
              Editable equipment for creation and combat.
            </div>
          </div>

          {/* Form derecho */}
          <div className="creator-form">
            <div>
              <div className="creator-field-label">
                <span>Vault Brawler name</span>
                {name.length > 0 && !nameValid && <span className="err">3-20 alphanumeric</span>}
              </div>
              <input
                className="creator-name-input"
                placeholder="Vorgath, Sanguineus, Mörgar…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={!nameValid && name.length > 0}
              />
            </div>

            <div className="creator-select-grid">
              <LpcSelect label="Hair" value={lpcHair} options={LPC_HAIR_OPTIONS} onChange={(value) => setLpcHair(value as LpcHairKey)} />
              <LpcSelect label="Wings" value={lpcWings} options={LPC_WINGS_OPTIONS} onChange={(value) => setLpcWings(value as LpcWingsKey)} />
              <LpcSelect label="Headwear / helmet" value={lpcHeadwear} options={LPC_HEADWEAR_OPTIONS} onChange={(value) => setLpcHeadwear(value as LpcHeadwearKey)} />
              <LpcSelect label="Color" value={lpcArmorColor} options={LPC_ARMOR_COLOR_OPTIONS} onChange={(value) => setLpcArmorColor(value as LpcArmorColorKey)} />
              <LpcSelect label="Arms armour" value={lpcArmsArmor} options={LPC_ARMS_ARMOR_OPTIONS} onChange={(value) => setLpcArmsArmor(value as LpcArmsArmorKey)} />
              <LpcSelect label="Jacket / armour" value={lpcTorsoArmor} options={LPC_TORSO_ARMOR_OPTIONS} onChange={(value) => setLpcTorsoArmor(value as LpcTorsoArmorKey)} />
              <LpcSelect label="Legs armour" value={lpcLegsArmor} options={LPC_LEGS_ARMOR_OPTIONS} onChange={(value) => setLpcLegsArmor(value as LpcLegsArmorKey)} />
              <LpcSelect label="Feet armour" value={lpcFeetArmor} options={LPC_FEET_ARMOR_OPTIONS} onChange={(value) => setLpcFeetArmor(value as LpcFeetArmorKey)} />
            </div>

            <button
              type="button"
              className="creator-cta"
              onClick={submit}
              disabled={forgeDisabled}
            >
              <span>{submitting ? 'Creating…' : walletReady ? 'Create Vault Brawler' : 'Wallet required'}</span>
              {!submitting && <span className="arrow">›</span>}
            </button>
            {paidForgeNeeded && walletReady && (
              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  marginTop: 10,
                  padding: 12,
                  border: '1px solid rgba(230,180,80,0.45)',
                  background: 'rgba(230,180,80,0.08)',
                }}
              >
                <b>You already have 3 base Vault Brawlers.</b>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                  You can create this extra Vault Brawler by paying {paidForgePrice ? `${formatBnbWei(paidForgePrice)} BNB` : 'BNB'}.
                  The contract splits 50% to the vault and 50% to burn.
                </span>
                <button
                  type="button"
                  className="creator-cta"
                  onClick={() => void submitPaidExtra()}
                  disabled={paidForgeBusy || !nameValid}
                >
                  <span>{paidForgeBusy ? 'Waiting for MetaMask…' : `Create extra Vault Brawler by paying ${paidForgePrice ? `${formatBnbWei(paidForgePrice)} BNB` : 'BNB'}`}</span>
                  {!paidForgeBusy && <span className="arrow">›</span>}
                </button>
              </div>
            )}
            <div className={clsx('creator-fine', (!walletReady || (!nameValid && name.length > 0)) && 'error')}>
              {!walletReady
                ? 'First connect MetaMask on BNB Chain/Testnet'
                : name.length === 0
                  ? 'Each Vault Brawler will be linked to your BNB wallet'
                  : nameValid
                    ? 'Ready to create'
                    : 'Name must be 3 to 20 alphanumeric characters'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface LpcSelectOption {
  key: string;
  label: string;
}

function LpcSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<LpcSelectOption>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="creator-lpc-select">
      <span className="creator-field-label creator-lpc-label">
        <span>{label}</span>
      </span>
      <select
        className="creator-name-input creator-lpc-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
