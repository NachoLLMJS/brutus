import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

export function Landing() {
  const recent = useGameStore((s) => s.recentBrutes);
  const setCurrent = useGameStore((s) => s.setCurrentBrute);
  const forget = useGameStore((s) => s.forgetBrute);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="font-serif text-5xl text-gold tracking-wider drop-shadow">
          BRUTUS
        </h1>
        <p className="text-muted mt-2 italic">
          Forja un guerrero. Sangra en la arena. Asciende rangos.
        </p>
      </div>

      <div className="panel p-6 w-full max-w-md">
        {recent.length === 0 ? (
          <p className="text-muted text-center mb-4">
            No hay brutos invocados todavía.
          </p>
        ) : (
          <>
            <h2 className="font-serif text-xl text-ink mb-3">Tus brutos</h2>
            <ul className="flex flex-col gap-2 mb-4">
              {recent.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 bg-elevated border border-arcane rounded px-3 py-2"
                >
                  <button
                    type="button"
                    className="flex-1 text-left hover:text-gold transition-colors"
                    onClick={() => {
                      setCurrent(b.id);
                      navigate(`/brute/${b.id}`);
                    }}
                  >
                    <div className="font-serif">{b.name}</div>
                    <div className="text-xs text-muted">Nivel {b.level}</div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Olvidar a ${b.name}`}
                    className="text-muted hover:text-blood text-sm"
                    onClick={() => forget(b.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link to="/create" className="btn-primary w-full">
          Crear nuevo bruto
        </Link>
      </div>

      <footer className="mt-8 text-xs text-muted text-center">
        Brutus v3 · mecánicas porteadas (no copiadas) de El Bruto / MyBrute.
      </footer>
    </div>
  );
}
