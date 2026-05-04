import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import ProbabilityLineChart from "../components/ProbabilityLineChart";

type BetRow = {
  id: string;
  amount: number;
  bet_on: string;
  created_at: string;
  user: { id: string; username: string };
};

type OptionRow = {
  id: string;
  question_text: string;
  resolved_value: string | null;
  yes_stake_total: number;
  no_stake_total: number;
  implied_yes_probability: number;
  bets: BetRow[];
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user: { id: string; username: string };
};

type MarketPayload = {
  id: string;
  title: string;
  description: string;
  is_open: boolean;
  is_resolved: boolean;
  created_at: string;
  creator: { id: string; username: string };
  options: OptionRow[];
  comments: CommentRow[];
};

export default function MarketDetailPage() {
  const { id } = useParams();
  const { setUserBalance, refreshUser } = useAuth();
  const [market, setMarket] = useState<MarketPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [sides, setSides] = useState<Record<string, "YES" | "NO">>({});

  async function load() {
    if (!id) return;
    try {
      const data = await api<{ market: MarketPayload }>(`/markets/${id}`, { auth: true });
      setMarket(data.market);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function placeBet(optionId: string) {
    if (!id || !market) return;
    const raw = amounts[optionId] ?? "0";
    const amount = parseInt(raw, 10);
    const side = sides[optionId] ?? "YES";
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Enter a valid bet amount (integer SC).");
      return;
    }
    try {
      const res = await api<{ balance: number }>(`/markets/${id}/bet`, {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: optionId, amount, side }),
      });
      setUserBalance(res.balance);
      await load();
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bet failed");
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !comment.trim()) return;
    try {
      await api(`/markets/${id}/comment`, {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    }
  }

  if (!id) return <p className="error">Missing market id</p>;
  if (error && !market) return <p className="error">{error}</p>;
  if (!market) return <p className="muted">Loading…</p>;

  return (
    <div>
      <p>
        <Link to="/markets">← Markets</Link>
      </p>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>{market.title}</h1>
      <p className="muted">
        by {market.creator.username}
        {!market.is_open && " · betting closed"}
        {market.is_resolved && " · fully resolved"}
      </p>
      <p>{market.description}</p>
      {error && <p className="error">{error}</p>}

      {market.options.map((o) => (
        <div key={o.id} className="card">
          <h3>{o.question_text}</h3>
          <p className="muted">
            Implied YES ≈ {(o.implied_yes_probability * 100).toFixed(1)}% · YES pool {o.yes_stake_total} SC · NO pool{" "}
            {o.no_stake_total} SC
            {o.resolved_value && ` · resolved: ${o.resolved_value}`}
          </p>
          <ProbabilityLineChart bets={o.bets} />
          {market.is_open && !market.is_resolved && !o.resolved_value && (
            <div className="row-actions" style={{ marginTop: "0.5rem" }}>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="Amount"
                value={amounts[o.id] ?? ""}
                onChange={(e) => setAmounts((m) => ({ ...m, [o.id]: e.target.value }))}
                style={{ width: 120, maxWidth: "40%" }}
              />
              <select
                value={sides[o.id] ?? "YES"}
                onChange={(e) =>
                  setSides((m) => ({ ...m, [o.id]: e.target.value as "YES" | "NO" }))
                }
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
              <button type="button" className="primary" onClick={() => void placeBet(o.id)}>
                Place bet
              </button>
            </div>
          )}
          <details style={{ marginTop: "0.5rem" }}>
            <summary className="muted">Recent bets</summary>
            <ul style={{ paddingLeft: "1.1rem", margin: "0.35rem 0 0" }}>
              {o.bets.slice(0, 30).map((b) => (
                <li key={b.id}>
                  {b.user.username} — {b.bet_on} — {b.amount} SC
                </li>
              ))}
            </ul>
          </details>
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Comments</h3>
        <form onSubmit={postComment}>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" />
          <div style={{ marginTop: "0.35rem" }}>
            <button type="submit" className="primary">
              Post
            </button>
          </div>
        </form>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {market.comments.map((c) => (
            <li key={c.id} style={{ borderTop: "1px solid #eee", padding: "0.5rem 0" }}>
              <strong>{c.user.username}</strong>{" "}
              <span className="muted">{new Date(c.created_at).toLocaleString()}</span>
              <div>{c.content}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
