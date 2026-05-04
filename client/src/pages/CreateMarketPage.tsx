import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function CreateMarketPage() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionsText, setOptionsText] = useState("Will it rain tomorrow?\nWill stocks go up?");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const options = optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 1) {
      setError("Add at least one YES/NO question (one per line).");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ market: { id: string } }>("/markets", {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, options }),
      });
      nav(`/markets/${data.market.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Create market</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="t">Title</label>
        <input id="t" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label htmlFor="d">Description</label>
        <textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <label htmlFor="o">Binary questions (one per line)</label>
        <textarea id="o" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
