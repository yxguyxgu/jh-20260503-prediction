import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Row = { id: string; username: string; balance: number };

function rowClass(rank: number): string {
  if (rank === 1) return "lb-row lb-row-gold";
  if (rank === 2) return "lb-row lb-row-silver";
  if (rank === 3) return "lb-row lb-row-bronze";
  return "lb-row lb-row-plain";
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ leaderboard: Row[] }>("/leaderboard");
        if (!cancelled) setRows(data.leaderboard);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxBal = useMemo(() => rows[0]?.balance ?? 1, [rows]);

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Leaderboard</h1>
      <p className="muted">Top users by SC balance.</p>
      {error && <p className="error">{error}</p>}
      <div className="card lb-card" style={{ padding: "0.65rem 0.75rem" }}>
        <div className="lb-list">
          {rows.map((r, i) => {
            const rank = i + 1;
            const pct = maxBal > 0 ? Math.max(4, Math.round((r.balance / maxBal) * 100)) : 0;
            return (
              <div key={r.id} className={rowClass(rank)}>
                <div className="lb-row-inner">
                  <span className="lb-rank">{rank}</span>
                  <span className="lb-name">{r.username}</span>
                  <span className="lb-score">{r.balance} SC</span>
                </div>
                <div className="lb-bar-track">
                  <div className="lb-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link to="/login">Log in</Link> to trade.
      </p>
    </div>
  );
}
