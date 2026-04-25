import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { BruteAvatar } from '@/components/BruteAvatar';
import { api, ApiError } from '@/api/apiClient';
import type { Appearance, Brute, Gender } from 'core';
import { isValidName } from '@/lib/format';
import { HAIR_PALETTE, PANTS_PALETTE, SHIRT_PALETTE, SKIN_PALETTE } from '@/lib/palette';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/store/useToastStore';

export function CharacterCreator() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const rememberBrute = useGameStore((s) => s.rememberBrute);
  const setCurrent = useGameStore((s) => s.setCurrentBrute);
  const pushToast = useToastStore((s) => s.push);

  const masterId = search.get('master');
  const [master, setMaster] = useState<Brute | null>(null);

  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<Gender>('M');
  const [skin, setSkin] = useState<string>(SKIN_PALETTE[1]!);
  const [hair, setHair] = useState<string>(HAIR_PALETTE[0]!);
  const [shirt, setShirt] = useState<string>(SHIRT_PALETTE[0]!);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const appearance = useMemo<Appearance>(
    () => ({
      gender,
      skin,
      hair,
      shirt,
      pants: PANTS_PALETTE[0]!,
    }),
    [gender, skin, hair, shirt],
  );

  useEffect(() => {
    if (!masterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const m = await api.brutes.get(masterId);
        if (!cancelled) setMaster(m);
      } catch {
        // si falla, ignoramos: simplemente no mostramos banner
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [masterId]);

  const nameValid = isValidName(name);

  const submit = async () => {
    if (!nameValid || submitting) return;
    setSubmitting(true);
    try {
      const brute = await api.brutes.create({
        name: name.trim(),
        appearance,
        masterId: masterId ?? undefined,
      });
      rememberBrute({ id: brute.id, name: brute.name, level: brute.level });
      setCurrent(brute.id);
      navigate(`/brute/${brute.id}`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'NETWORK_ERROR';
      pushToast('error', `No se pudo crear: ${code}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl text-gold mb-6">Forjar un Bruto</h1>

      {master && (
        <div className="panel border-gold p-3 mb-6 text-sm">
          Vas a ser discípulo de <span className="text-gold font-serif">{master.name}</span> (Nivel {master.level}).
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="panel p-6 flex flex-col items-center justify-center">
          <BruteAvatar appearance={appearance} size="lg" />
          <div className="mt-4 font-serif text-xl text-ink">{name || 'Sin nombre'}</div>
        </div>

        <div className="panel p-6 flex flex-col gap-5">
          <label className="block">
            <span className="text-sm text-muted mb-1 block">Nombre</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder="Aelar el Tuerto"
              aria-invalid={!nameValid && name.length > 0}
            />
            {name.length > 0 && !nameValid && (
              <p className="text-xs text-blood mt-1">3-20 caracteres alfanuméricos.</p>
            )}
          </label>

          <fieldset>
            <legend className="text-sm text-muted mb-2">Género</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['M', 'F'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={clsx(
                    'panel py-2 text-sm font-serif transition-all',
                    gender === g ? 'border-gold shadow-rune-strong text-gold' : 'hover:border-rune',
                  )}
                  aria-pressed={gender === g}
                >
                  {g === 'M' ? 'Hombre' : 'Mujer'}
                </button>
              ))}
            </div>
          </fieldset>

          <Swatches label="Piel" colors={SKIN_PALETTE} value={skin} onChange={setSkin} />
          <Swatches label="Pelo" colors={HAIR_PALETTE} value={hair} onChange={setHair} />
          <Swatches label="Camisa" colors={SHIRT_PALETTE} value={shirt} onChange={setShirt} />

          <button
            type="button"
            onClick={submit}
            disabled={!nameValid || submitting}
            className="btn-primary mt-2"
          >
            {submitting ? 'Forjando…' : 'Invocar bruto'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SwatchesProps {
  label: string;
  colors: ReadonlyArray<string>;
  value: string;
  onChange: (c: string) => void;
}

function Swatches({ label, colors, value, onChange }: SwatchesProps) {
  return (
    <fieldset>
      <legend className="text-sm text-muted mb-2">{label}</legend>
      <div className="flex gap-2">
        {colors.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            className={clsx(
              'w-8 h-8 rounded-full border-2 transition-transform',
              value === c ? 'border-gold scale-110 shadow-rune-strong' : 'border-arcane hover:scale-105',
            )}
            style={{ backgroundColor: c }}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
          />
        ))}
      </div>
    </fieldset>
  );
}
