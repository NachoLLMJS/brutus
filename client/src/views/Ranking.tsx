import { useEffect, useMemo, useState } from 'react';
import { api, ApiError, type LeaderboardEntry } from '@/api/apiClient';
import { BruteAvatar } from '@/components/BruteAvatar';

function shortWallet(wallet: string | null): string {
  if (!wallet) return 'No wallet linked';
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function winRate(entry: LeaderboardEntry): string {
  const total = entry.victories + entry.defeats;
  if (total <= 0) return '—';
  return `${Math.round((entry.victories / total) * 100)}%`;
}

function matches(entry: LeaderboardEntry): number {
  return entry.victories + entry.defeats;
}

function rankMedal(rank: number): string {
  if (rank === 1) return '✦';
  if (rank === 2) return '◆';
  if (rank === 3) return '●';
  return '•';
}

function medalTier(rank: number): string {
  if (rank <= 10) return 'gold';
  if (rank <= 20) return 'silver';
  if (rank <= 30) return 'bronze';
  return 'purple';
}

function BrawlerMedallion({ entry }: { entry: LeaderboardEntry }) {
  return (
    <span className={`ranking-avatar-medal ranking-avatar-medal--${medalTier(entry.rank)} ranking-avatar-medal--rank-${entry.rank <= 3 ? entry.rank : 'default'}`} aria-label={`${entry.name} brawler model`}>
      <span className="ranking-avatar-medal__frame" aria-hidden />
      <span className="ranking-avatar-medal__viewport">
        <BruteAvatar brute={entry} size="sm" anim={{ facing: 'right' }} className="ranking-avatar-medal__model" />
      </span>
      <span className="ranking-avatar-medal__gem" aria-hidden>{rankMedal(entry.rank)}</span>
    </span>
  );
}

export function Ranking() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void api.brutes.leaderboard()
      .then((next) => {
        if (cancelled) return;
        setEntries(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.code : 'NETWORK_ERROR');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tableRows = useMemo(() => entries.slice(0, 100), [entries]);

  return (
    <div className="ranking-shell anim-fade-up">
      <header className="ranking-titlebar">
        <span className="ranking-ribbon" aria-hidden>✹</span>
        <div>
          <div className="ranking-kicker">Vault Brawl</div>
          <h1>Leaderboard</h1>
        </div>
        <span className="ranking-ribbon" aria-hidden>✹</span>
      </header>

      <section className="ranking-board">
        <div className="ranking-board__shine" aria-hidden />
        <div className="ranking-board__inner">
          <div className="ranking-board__copy">
            <strong>Top 100 Vault Brawlers</strong>
          </div>

          {loading ? (
            <div className="ranking-state">Reading real brawler wins…</div>
          ) : error ? (
            <div className="ranking-state ranking-state--error">Could not load leaderboard: {error}</div>
          ) : entries.length === 0 ? (
            <div className="ranking-state">No ranked brawlers yet. First blood will appear here.</div>
          ) : (
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Brawler</th>
                    <th>Wallet</th>
                    <th>Wins</th>
                    <th>Matches</th>
                    <th>Winrate</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((entry) => (
                    <tr key={entry.id} className={entry.rank <= 3 ? `ranking-row--top ranking-row--top-${entry.rank}` : undefined}>
                      <td>
                        <div className="ranking-rank-cell">
                          <span className="ranking-rank">#{entry.rank}</span>
                          <BrawlerMedallion entry={entry} />
                        </div>
                      </td>
                      <td>
                        <span className="ranking-name" aria-label={`${entry.name} brawler`}>
                          {entry.name}
                        </span>
                      </td>
                      <td>
                        <span className="ranking-wallet" title={entry.ownerWallet ?? undefined}>
                          {shortWallet(entry.ownerWallet)}
                        </span>
                      </td>
                      <td className="ranking-number ranking-number--wins">{entry.victories}</td>
                      <td className="ranking-number">{matches(entry)}</td>
                      <td className="ranking-number">{winRate(entry)}</td>
                      <td className="ranking-number">{entry.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
