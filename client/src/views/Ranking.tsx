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

function BrawlerBust({ entry }: { entry: LeaderboardEntry }) {
  return (
    <span className="ranking-bust" aria-label={`${entry.name} brawler model`}>
      <BruteAvatar brute={entry} size="sm" anim={{ facing: 'right' }} />
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
    <div className="ranking-wrap anim-fade-up">
      <div className="ghost ranking-ghost" aria-hidden>Glory</div>

      <header className="ranking-hero vb-fu vb-fu1">
        <div className="eyebrow">Only victories are remembered</div>
        <h1>Leader<span className="acc">board</span></h1>
        <div className="sub">Top 100 Vault Brawlers</div>
      </header>

      <section className="ranking-board rough cut-b vb-fu vb-fu2">
        <span className="rivet tl" aria-hidden /><span className="rivet tr" aria-hidden />
        <span className="rivet bl" aria-hidden /><span className="rivet br" aria-hidden />
        <div className="glass-head">
          <span className="title"><span className="d" />Top 100 Vault Brawlers</span>
          <span className="meta">Real wins on record</span>
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
                  <tr key={entry.id} className={entry.rank <= 3 ? `top top-${entry.rank}` : undefined}>
                    <td>
                      <div className="ranking-rank-cell">
                        <span className="ranking-rank">#{entry.rank}</span>
                        <BrawlerBust entry={entry} />
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
      </section>
    </div>
  );
}
