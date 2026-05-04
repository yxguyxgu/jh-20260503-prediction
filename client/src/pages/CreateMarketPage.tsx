import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function CreateMarketPage() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setQuestion(i: number, value: string) {
    setQuestions((q) => q.map((s, j) => (j === i ? value : s)));
  }

  function addQuestion() {
    setQuestions((q) => [...q, ""]);
  }

  function removeQuestion(i: number) {
    setQuestions((q) => (q.length <= 1 ? q : q.filter((_, j) => j !== i)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const options = questions.map((s) => s.trim()).filter(Boolean);
    if (options.length < 1) {
      setError("Add at least one YES/NO question.");
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
        <p className="muted" style={{ margin: "0.15rem 0 0.35rem", fontSize: "0.85rem" }}>
          Include <strong>under what circumstances the market resolves to NO</strong> (and any other resolution
          rules participants should know).
        </p>
        <textarea
          id="d"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder="e.g. This market resolves NO if …"
        />

        <div style={{ marginTop: "0.75rem" }}>Binary questions (YES/NO)</div>
        <p className="muted" style={{ margin: "0.15rem 0 0.5rem", fontSize: "0.85rem" }}>
          At least one question is required. Add more with the button below.
        </p>
        <div className="form-questions">
          {questions.map((q, i) => (
            <div key={i} className="form-question-row">
              <label className="form-question-label" htmlFor={`q-${i}`}>
                {i + 1}.
              </label>
              <div className="form-question-field">
                <input
                  id={`q-${i}`}
                  value={q}
                  onChange={(e) => setQuestion(i, e.target.value)}
                  placeholder={`Question ${i + 1}`}
                />
                {questions.length > 1 && (
                  <button type="button" className="form-question-remove" onClick={() => removeQuestion(i)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addQuestion} style={{ marginTop: "0.5rem" }}>
          Add question
        </button>

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
