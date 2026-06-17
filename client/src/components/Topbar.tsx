// Topbar global — reemplazo de MyBruteHeader.
// Fixed-feeling navbar dark fantasy con logo BRUTUS, navegación entre secciones
// (Templo / Tablón / Forja) y user chip a la derecha que muestra el
// bruto activo (si lo hay).
// NOTA: Torneo está oculto — el route sigue existiendo pero sin entry points UI.

import { Link, useLocation, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useGameStore } from '@/store/useGameStore';

interface NavItem {
  label: string;
  /** Función que retorna el target href dado el bruteId actual (o null si no hay). */
  to: (bruteId: string | null) => string | null;
  /** Función que detecta si la ruta actual matchea esta nav item. */
  matches: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  {
    label: 'Templo',
    to: (id) => (id ? `/brute/${id}` : null),
    matches: (p) => /^\/brute\/[^/]+$/.test(p) || p.startsWith('/brute/') && p.endsWith('/levelup'),
  },
  {
    label: 'Tablón',
    to: (id) => (id ? `/brute/${id}/arena` : null),
    matches: (p) => p.includes('/arena') || p.includes('/fight/'),
  },
  // 'Torneo' oculto — feature paused; route sigue existiendo pero sin entry.
  {
    label: 'Forja',
    // La "Forja" lleva al creator si no hay bruto, o al level-up si lo hay
    // pendiente. Si no, queda inerte.
    to: (id) => (id ? `/brute/${id}/levelup` : '/create'),
    matches: (p) => p === '/create' || p.endsWith('/levelup'),
  },
];

export function Topbar() {
  const params = useParams();
  const { pathname } = useLocation();
  const recentBrutes = useGameStore((s) => s.recentBrutes);
  const currentBruteId = useGameStore((s) => s.currentBruteId);

  // Determinar el bruteId activo: prioridad URL → store currentBrute → primer
  // recent. Permite que la nav funcione incluso desde Landing/Creator.
  const bruteId =
    params.id ?? currentBruteId ?? recentBrutes[0]?.id ?? null;
  const activeBrute = recentBrutes.find((r) => r.id === bruteId);

  return (
    <header
      className="relative z-30 flex items-center justify-between px-6 md:px-9 py-4"
      style={{
        borderBottom: '1px solid var(--border-shadow)',
        background:
          'linear-gradient(180deg, rgba(13, 10, 20, 0.92), rgba(13, 10, 20, 0.5))',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Brand */}
      <Link
        to="/"
        className="font-display uppercase no-underline"
        style={{
          fontSize: 22,
          letterSpacing: '0.16em',
          color: 'var(--text-strong)',
        }}
      >
        BRUT<span style={{ color: 'var(--primary)' }}>U</span>S
      </Link>

      {/* Nav */}
      <nav
        className="hidden md:flex items-center gap-7 font-display uppercase"
        style={{ fontSize: 13, letterSpacing: '0.18em' }}
      >
        {NAV.map((item) => {
          const target = item.to(bruteId);
          const isActive = item.matches(pathname);
          const className = clsx(
            'pb-1.5 border-b transition-colors',
            isActive ? 'opacity-100' : 'opacity-100 hover:text-ink-strong',
          );
          const style = {
            color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
            borderBottomColor: isActive ? 'var(--accent-gold)' : 'transparent',
          } as const;
          if (!target) {
            return (
              <span
                key={item.label}
                className={className}
                style={{ ...style, opacity: 0.4, cursor: 'not-allowed' }}
                aria-disabled
              >
                {item.label}
              </span>
            );
          }
          return (
            <Link key={item.label} to={target} className={className} style={style}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User chip */}
      <div
        className="flex items-center gap-2.5"
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
        }}
      >
        <span className="hidden sm:inline">
          {activeBrute?.name ?? 'Sin bruto'}
        </span>
        <div
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: 3,
            background: 'var(--paper-accent)',
            border: '1px solid var(--border-shadow)',
          }}
        />
      </div>
    </header>
  );
}
