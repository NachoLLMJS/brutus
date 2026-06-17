// CharacterCreator — Forjar un Bruto.
// Reskin coherente con el design system dark fantasy. Lógica preservada:
// pre-pop desde URL params (name, gender, master), randomize body/colors,
// submit a api.brutes.create, navegación post-creation.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { BruteAvatar } from '@/components/BruteAvatar';
import { api, ApiError } from '@/api/apiClient';
import {
  appearancePalettes,
  generateColorString,
  getRandomBody,
  getRandomColors,
  mulberry32,
  hashStringToSeed,
  type Brute,
  type BruteGender,
} from 'core';
import { isValidName } from '@/lib/format';
import { useGameStore } from '@/store/useGameStore';
import { useToastStore } from '@/store/useToastStore';

function previewId(gender: BruteGender, body: string, bodyColors: string): string {
  return `preview-${gender}-${body}-${bodyColors}`;
}

function setColorIdx(
  current: string,
  field: 'skin' | 'hair' | 'shirt',
  idx: number,
): string {
  const pairs = Array.from({ length: 16 }, (_, i) => current.slice(i * 2, i * 2 + 2));
  const padded = pairs.map((p) => (p.length === 2 ? p : '00'));
  const setIdx = (offset: number) => {
    padded[offset] = idx.toString().padStart(2, '0');
  };
  if (field === 'skin') {
    setIdx(0); setIdx(1); setIdx(2);
  } else if (field === 'hair') {
    setIdx(3); setIdx(4); setIdx(5); setIdx(6); setIdx(7);
  } else {
    setIdx(8);
  }
  return padded.join('');
}

function getColorIdx(current: string, field: 'skin' | 'hair' | 'shirt'): number {
  const offset = field === 'skin' ? 0 : field === 'hair' ? 6 : 16;
  const v = parseInt(current.slice(offset, offset + 2), 10);
  return Number.isFinite(v) ? v : 0;
}

export function CharacterCreator() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const rememberBrute = useGameStore((s) => s.rememberBrute);
  const setCurrent = useGameStore((s) => s.setCurrentBrute);
  const pushToast = useToastStore((s) => s.push);

  const masterId = search.get('master');
  const [master, setMaster] = useState<Brute | null>(null);

  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<BruteGender>('male');
  const [body, setBody] = useState<string>(() => {
    const rng = mulberry32(hashStringToSeed('brutus-default-body'));
    return getRandomBody('male', rng);
  });
  const [bodyColors, setBodyColors] = useState<string>(() =>
    generateColorString({
      col0: 1, col0a: 1, col0c: 1,
      col1: 0, col1a: 0, col1b: 0, col1c: 0, col1d: 0,
      col2: 0, col2a: 0, col2b: 0,
      col3: 0, col3b: 0,
      col4: 0, col4a: 0, col4b: 0,
    }),
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const rng = mulberry32(hashStringToSeed(`gender-switch-${gender}-${Date.now()}`));
    setBody((prev) => prev || getRandomBody(gender, rng));
  }, [gender]);

  const previewSubject = useMemo(
    () => ({ id: previewId(gender, body, bodyColors), gender, body, bodyColors }),
    [gender, body, bodyColors],
  );

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

  // Pre-populate name + gender desde URL search params (cuando viene del Landing).
  useEffect(() => {
    const qName = search.get('name');
    const qGender = search.get('gender');
    if (qName) {
      setName(qName.slice(0, 20));
    }
    if (qGender === 'male' || qGender === 'female') {
      setGender(qGender);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameValid = isValidName(name);

  const skinPalette = appearancePalettes[gender].skin;
  const hairPalette = appearancePalettes[gender].hair;
  const clothingPalette = appearancePalettes[gender].clothing;

  const skinIdx = getColorIdx(bodyColors, 'skin');
  const hairIdx = getColorIdx(bodyColors, 'hair');
  const shirtIdx = getColorIdx(bodyColors, 'shirt');

  const randomize = () => {
    const seed = Date.now() & 0x7fffffff;
    const rng = mulberry32(seed);
    setBody(getRandomBody(gender, rng));
    setBodyColors(getRandomColors(gender, rng));
  };

  const randomizeBodyParts = () => {
    const rng = mulberry32(Date.now() & 0x7fffffff);
    setBody(getRandomBody(gender, rng));
  };

  const submit = async () => {
    if (!nameValid || submitting) return;
    setSubmitting(true);
    try {
      const brute = await api.brutes.create({
        name: name.trim(),
        gender,
        body,
        bodyColors,
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
    <div className="creator-shell anim-fade-up">
      <header className="creator-hero">
        <div className="eyebrow">
          <span>Forja tu destino</span>
        </div>
        <h1>
          Invocar <em>bruto</em>
        </h1>
        <div className="sub">Elegí su forma, su nombre, libéralo en la arena</div>
      </header>

      {master && (
        <div className="creator-pupil-banner">
          Vas a ser discípulo de <b>{master.name}</b> · Nivel {master.level}
        </div>
      )}

      <section className="creator-panel">
        <div className="creator-grid">
          {/* Preview izquierdo */}
          <div className="creator-preview">
            <div className="creator-preview-frame">
              <BruteAvatar brute={previewSubject} size="lg" />
              <span className="pin tl" />
              <span className="pin tr" />
              <span className="pin bl" />
              <span className="pin br" />
            </div>
            <div className={clsx('creator-preview-name', !name && 'empty')}>
              {name || 'Sin nombre'}
            </div>
            <div className="creator-randomizers">
              <button
                type="button"
                className="creator-randomizer-btn"
                onClick={randomizeBodyParts}
                title="Aleatorizar cuerpo (mantener colores)"
              >
                ⚂ Cuerpo
              </button>
              <button
                type="button"
                className="creator-randomizer-btn"
                onClick={randomize}
                title="Aleatorizar todo"
              >
                ⚂ Todo
              </button>
            </div>
          </div>

          {/* Form derecho */}
          <div className="creator-form">
            <div>
              <div className="creator-field-label">
                <span>Nombre del guerrero</span>
                {name.length > 0 && !nameValid && <span className="err">3-20 alfanuméricos</span>}
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

            <div>
              <div className="creator-field-label">
                <span>Linaje</span>
              </div>
              <div className="creator-gender">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={clsx('creator-gender-btn', gender === g && 'active')}
                    aria-pressed={gender === g}
                  >
                    <span className="glyph" aria-hidden>
                      {g === 'male' ? '♂' : '♀'}
                    </span>
                    <span>{g === 'male' ? 'Macho' : 'Hembra'}</span>
                  </button>
                ))}
              </div>
            </div>

            <SwatchRow
              label="Piel"
              colors={skinPalette}
              valueIdx={skinIdx}
              onPick={(idx) => setBodyColors((c) => setColorIdx(c, 'skin', idx))}
            />
            <SwatchRow
              label="Pelo"
              colors={hairPalette}
              valueIdx={hairIdx}
              onPick={(idx) => setBodyColors((c) => setColorIdx(c, 'hair', idx))}
            />
            <SwatchRow
              label="Atuendo"
              colors={clothingPalette}
              valueIdx={shirtIdx}
              onPick={(idx) => setBodyColors((c) => setColorIdx(c, 'shirt', idx))}
            />

            <button
              type="button"
              className="creator-cta"
              onClick={submit}
              disabled={!nameValid || submitting}
            >
              <span>{submitting ? 'Forjando…' : 'Invocar bruto'}</span>
              {!submitting && <span className="arrow">›</span>}
            </button>
            <div className={clsx('creator-fine', !nameValid && name.length > 0 && 'error')}>
              {name.length === 0
                ? 'Cada guerrero es único e irrepetible'
                : nameValid
                  ? 'Listo para forjar'
                  : 'Nombre debe tener entre 3 y 20 caracteres alfanuméricos'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface SwatchRowProps {
  label: string;
  colors: ReadonlyArray<string>;
  valueIdx: number;
  onPick: (idx: number) => void;
}

function SwatchRow({ label, colors, valueIdx, onPick }: SwatchRowProps) {
  return (
    <fieldset>
      <legend className="creator-field-label">
        <span>{label}</span>
      </legend>
      <div className="creator-swatches">
        {colors.map((c, i) => (
          <button
            type="button"
            key={`${c}-${i}`}
            onClick={() => onPick(i)}
            className={clsx('creator-swatch', valueIdx === i && 'active')}
            style={{ backgroundColor: c }}
            aria-label={`${label} ${i + 1}`}
            aria-pressed={valueIdx === i}
          />
        ))}
      </div>
    </fieldset>
  );
}
