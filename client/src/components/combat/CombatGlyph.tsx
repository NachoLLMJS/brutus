// SVG glyphs para skills y weapons del combat. Compactos, mismo estilo que
// los del bundle de Claude Design.

interface CombatGlyphProps {
  kind: string;
  color?: string;
}

export function CombatGlyph({ kind, color = '#e6b450' }: CombatGlyphProps) {
  const fill = '#3d2530';
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden>
      {kind === 'axe' && (
        <g>
          <line x1="10" y1="36" x2="38" y2="8" stroke={color} strokeWidth="2.5" />
          <path d="M28 4 L46 4 L46 22 C40 22 32 18 28 4 Z" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'sword' && (
        <g>
          <line x1="10" y1="38" x2="38" y2="10" stroke={color} strokeWidth="2.5" />
          <line x1="32" y1="4" x2="44" y2="16" stroke={color} strokeWidth="2" />
        </g>
      )}
      {kind === 'mace' && (
        <g>
          <line x1="12" y1="38" x2="32" y2="18" stroke={color} strokeWidth="2.5" />
          <circle cx="34" cy="14" r="8" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'dagger' && (
        <g>
          <path d="M24 4 L24 30 L21 36 L27 36 L24 30 Z" fill={fill} stroke={color} strokeWidth="1.5" />
          <line x1="16" y1="30" x2="32" y2="30" stroke={color} strokeWidth="2" />
        </g>
      )}
      {kind === 'bow' && (
        <g>
          <path d="M14 6 Q34 24 14 42" fill="none" stroke={color} strokeWidth="2" />
          <line x1="14" y1="24" x2="40" y2="24" stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'spear' && (
        <g>
          <line x1="10" y1="40" x2="36" y2="10" stroke={color} strokeWidth="2" />
          <path d="M36 10 L42 4 L40 14 Z" fill={fill} stroke={color} strokeWidth="1.2" />
        </g>
      )}
      {kind === 'flail' && (
        <g>
          <line x1="8" y1="40" x2="22" y2="22" stroke={color} strokeWidth="2" strokeDasharray="2 2" />
          <circle cx="28" cy="16" r="6" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'hammer' && (
        <g>
          <line x1="10" y1="40" x2="28" y2="22" stroke={color} strokeWidth="2.5" />
          <rect x="22" y="6" width="22" height="14" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'shield' && (
        <g>
          <path d="M24 4 L40 10 L40 24 Q40 36 24 42 Q8 36 8 24 L8 10 Z" fill={fill} stroke={color} strokeWidth="1.5" />
          <path d="M24 14 L24 32 M16 22 L32 22" stroke={color} strokeWidth="1.2" opacity="0.7" />
        </g>
      )}
      {kind === 'poison' && (
        <g>
          <path d="M24 6 Q14 18 14 28 Q14 38 24 42 Q34 38 34 28 Q34 18 24 6 Z" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'heal' && (
        <g>
          <rect x="20" y="8" width="8" height="32" fill={fill} stroke={color} strokeWidth="1.5" />
          <rect x="8" y="20" width="32" height="8" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'counter' && (
        <g>
          <path d="M8 16 L16 8 L16 12 L32 12 L32 8 L40 16 L32 24 L32 20 L16 20 L16 24 Z" fill={fill} stroke={color} strokeWidth="1.2" />
        </g>
      )}
      {kind === 'rage' && (
        <g>
          <path d="M8 38 L20 8 L24 22 L32 12 L34 26 L40 38 Z" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'flame' && (
        <g>
          <path d="M24 4 Q14 16 18 24 Q14 28 18 36 Q22 30 24 32 Q26 28 30 36 Q34 28 30 24 Q34 16 24 4 Z" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
      {kind === 'bomb' && (
        <g>
          <circle cx="22" cy="28" r="14" fill={fill} stroke={color} strokeWidth="1.5" />
          <line x1="28" y1="14" x2="36" y2="6" stroke={color} strokeWidth="1.5" />
          <circle cx="38" cy="6" r="2.5" fill="#c41a1a" />
        </g>
      )}
      {kind === 'fury' && (
        <g>
          <path d="M24 4 L18 22 L26 20 L22 40 L34 18 L26 20 L32 4 Z" fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
