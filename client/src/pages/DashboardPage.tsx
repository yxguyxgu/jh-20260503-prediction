import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

type MarketRow = {
  id: string;
  title: string;
  description: string;
  is_open: boolean;
  is_resolved: boolean;
  created_at: string;
  creator: { id: string; username: string };
};

export default function DashboardPage() {
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ markets: MarketRow[] }>("/markets", { auth: true });
        if (!cancelled) setMarkets(data.markets);
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
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Markets</h1>
      {error && <p className="error">{error}</p>}
      {markets.map((m) => (
        <div key={m.id} className="card">
          <h2>
            <Link to={`/markets/${m.id}`}>{m.title}</Link>
          </h2>
          <p className="muted" style={{ margin: "0.25rem 0" }}>
            by {m.creator.username}
            {!m.is_open && " · closed"}
            {m.is_resolved && " · resolved"}
          </p>
          <p style={{ margin: 0 }}>{m.description.slice(0, 200)}{m.description.length > 200 ? "…" : ""}</p>
        </div>
      ))}
      {markets.length === 0 && !error && <p className="muted">No markets yet. Create one.</p>}
    </div>
  );
}
