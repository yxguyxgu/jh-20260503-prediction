import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type Row = { id: string; username: string; balance: number };

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

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Leaderboard</h1>
      <p className="muted">Top users by SC balance.</p>
      {error && <p className="error">{error}</p>}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>SC</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.username}</td>
                <td>{r.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link to="/login">Log in</Link> to trade.
      </p>
    </div>
  );
}
