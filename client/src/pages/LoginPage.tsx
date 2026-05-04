import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/markets" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      nav("/markets", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 440 }}>
      <h2>Log in</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="u">Username</label>
        <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <label htmlFor="p">Password</label>
        <input
          id="p"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? "…" : "Log in"}
          </button>
        </div>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        No account? <Link to="/signup">Sign up</Link> · <Link to="/leaderboard">Leaderboard</Link>
      </p>
    </div>
  );
}
