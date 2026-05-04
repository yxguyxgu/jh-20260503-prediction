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

type Tab = "open" | "resolved";

function MarketCard({ m }: { m: MarketRow }) {
  return (
    <div className="card">
      <h2>
        <Link to={`/markets/${m.id}`}>{m.title}</Link>
      </h2>
      <p className="muted" style={{ margin: "0.25rem 0" }}>
        by {m.creator.username}
        {!m.is_open && " · closed"}
        {m.is_resolved && " · resolved"}
      </p>
      <p style={{ margin: 0 }}>
        {m.description.slice(0, 200)}
        {m.description.length > 200 ? "…" : ""}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [tab, setTab] = useState<Tab>("open");
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

  const openList = markets.filter((m) => !m.is_resolved);
  const resolvedList = markets.filter((m) => m.is_resolved);
  const list = tab === "open" ? openList : resolvedList;

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Markets</h1>
      <div className="tabs" role="tablist" aria-label="Market lists">
        <button
          type="button"
          className={`tab ${tab === "open" ? "tab-active" : ""}`}
          role="tab"
          aria-selected={tab === "open"}
          onClick={() => setTab("open")}
        >
          Open ({openList.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === "resolved" ? "tab-active" : ""}`}
          role="tab"
          aria-selected={tab === "resolved"}
          onClick={() => setTab("resolved")}
        >
          Resolved ({resolvedList.length})
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {list.map((m) => (
        <MarketCard key={m.id} m={m} />
      ))}
      {list.length === 0 && !error && (
        <p className="muted">
          {tab === "open" ? "No open markets yet. Create one." : "No resolved markets yet."}
        </p>
      )}
    </div>
  );
}
