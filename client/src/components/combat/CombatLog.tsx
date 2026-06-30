// Battle Log live del combate. Convierte FightStep[] en log rows con icono +
// actor coloreado + texto + dmg numérico.
//
// Se le pasa el log completo y el currentIdx (steps procesados hasta ahora).
// Renderiza los últimos `logLength` events. La row más reciente arriba.

import clsx from 'clsx';
import { useMemo } from 'react';
import { StepType, getSkill, getWeapon } from 'core';
import type { FightLog, FightStep } from 'core';

type LogType = 'hit' | 'crit' | 'block' | 'dodge' | 'skill' | 'end' | 'info';

interface LogRow {
  id: number;
  type: LogType;
  icon: string;
  actorName: string;
  actorSide: 'A' | 'B' | null;
  text: string;
  dmg?: number;
  fresh?: boolean;
}

const TYPE_ICONS: Record<LogType, string> = {
  hit: '⚔',
  crit: '✦',
  block: '◆',
  dodge: '◇',
  skill: '✷',
  end: '☠',
  info: '·',
};

interface CombatLogProps {
  log: FightLog;
  currentIdx: number;
  logLength: number;
}

export function CombatLog({ log, currentIdx, logLength }: CombatLogProps) {
  const rows: LogRow[] = useMemo(() => {
    const fighters = log.fighters;
    const all: LogRow[] = [];
    const visible = log.steps.slice(0, currentIdx);
    for (let i = 0; i < visible.length; i++) {
      const step = visible[i]!;
      const r = stepToRow(step, fighters, i);
      if (r) all.push({ ...r, fresh: i === visible.length - 1 });
    }
    return all.slice(-logLength);
  }, [log, currentIdx, logLength]);

  // El log-list usa flex-direction: column-reverse, así que el array directo
  // (en orden cronológico) hace que la más nueva quede ARRIBA visualmente.
  return (
    <aside className="log-panel">
      <div className="log-head">
        <span className="title">Battle Log</span>
        <span className="live">En vivo</span>
      </div>
      <div className="log-list">
        {rows.map((r) => (
          <div key={r.id} className={clsx('log-row', r.type, r.fresh && 'fresh')}>
            <span className="log-icon">{r.icon}</span>
            <span
              className="log-actor"
              style={{
                color:
                  r.actorSide === 'A'
                    ? 'var(--accent-gold)'
                    : r.actorSide === 'B'
                      ? 'var(--hp-full)'
                      : 'var(--text-secondary)',
              }}
            >
              {r.actorName}
            </span>
            <span className="log-text">{r.text}</span>
            {r.dmg != null && (
              <span className={clsx('log-dmg', r.type === 'crit' && 'crit')}>
                −{r.dmg}
              </span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

/** Convierte un FightStep en una LogRow renderizable. Retorna null si el step no es de log. */
function stepToRow(
  step: FightStep,
  fighters: FightLog['fighters'],
  idx: number,
): LogRow | null {
  const fighterById = (id: number) => fighters.find((f) => f.id === id);
  const sideOf = (id: number): 'A' | 'B' | null => {
    const f = fighterById(id);
    if (!f) return null;
    return fighters[0]?.id === id ? 'A' : 'B';
  };
  const nameOf = (id: number) => fighterById(id)?.name ?? `#${id}`;

  switch (step.a) {
    case StepType.Arrive:
      return {
        id: idx,
        type: 'info',
        icon: TYPE_ICONS.info,
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: 'enters the pit.',
      };
    case StepType.Hit: {
      const isCrit = step.c === 1;
      const wName = step.w ? getWeapon(step.w)?.name : null;
      return {
        id: idx,
        type: isCrit ? 'crit' : 'hit',
        icon: TYPE_ICONS[isCrit ? 'crit' : 'hit'],
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: isCrit
          ? 'devastating critical hit!'
          : wName
            ? `strikes with ${wName}.`
            : 'lands a hit.',
        dmg: step.d,
      };
    }
    case StepType.FlashFlood:
    case StepType.Hammer:
    case StepType.Poison:
      return {
        id: idx,
        type: 'hit',
        icon: TYPE_ICONS.hit,
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: 'unleashes a technique.',
        dmg: step.d,
      };
    case StepType.Evade:
      return {
        id: idx,
        type: 'dodge',
        icon: TYPE_ICONS.dodge,
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: 'rolls and dodges.',
      };
    case StepType.Block:
      return {
        id: idx,
        type: 'block',
        icon: TYPE_ICONS.block,
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: 'blocks the attack.',
      };
    case StepType.Counter:
      return {
        id: idx,
        type: 'hit',
        icon: TYPE_ICONS.hit,
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: 'counterattacks.',
      };
    case StepType.SkillActivate:
      return {
        id: idx,
        type: 'skill',
        icon: TYPE_ICONS.skill,
        actorName: nameOf(step.b),
        actorSide: sideOf(step.b),
        text: `activates ${getSkill(step.s)?.name ?? step.s}.`,
      };
    case StepType.Heal:
      return {
        id: idx,
        type: 'skill',
        icon: TYPE_ICONS.skill,
        actorName: nameOf(step.b),
        actorSide: sideOf(step.b),
        text: `recovers ${step.h} HP.`,
      };
    case StepType.Vampirism:
      return {
        id: idx,
        type: 'skill',
        icon: TYPE_ICONS.skill,
        actorName: nameOf(step.b),
        actorSide: sideOf(step.b),
        text: `drena ${step.h} HP.`,
      };
    case StepType.Survive:
      return {
        id: idx,
        type: 'skill',
        icon: TYPE_ICONS.skill,
        actorName: nameOf(step.b),
        actorSide: sideOf(step.b),
        text: 'sobrevive milagrosamente.',
      };
    case StepType.Death:
      return {
        id: idx,
        type: 'end',
        icon: TYPE_ICONS.end,
        actorName: nameOf(step.f),
        actorSide: sideOf(step.f),
        text: 'cae en el polvo.',
      };
    case StepType.End:
      return {
        id: idx,
        type: 'end',
        icon: TYPE_ICONS.end,
        actorName: nameOf(step.w),
        actorSide: sideOf(step.w),
        text: 'es coronado.',
      };
    default:
      return null;
  }
}
