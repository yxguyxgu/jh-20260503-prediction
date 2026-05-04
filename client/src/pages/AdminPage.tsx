import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

type AdminUser = {
  id: string;
  username: string;
  balance: number;
  is_admin: boolean;
  created_at: string;
};

type AdminMarket = {
  id: string;
  title: string;
  is_open: boolean;
  is_resolved: boolean;
  creator: { id: string; username: string };
  options: { id: string; question_text: string; resolved_value: string | null }[];
};

export default function AdminPage() {
  const { refreshUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [resolveMarketId, setResolveMarketId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, "YES" | "NO">>({});

  const load = useCallback(async () => {
    try {
      const [u, m] = await Promise.all([
        api<{ users: AdminUser[] }>("/admin/users", { auth: true }),
        api<{ markets: AdminMarket[] }>("/admin/markets", { auth: true }),
      ]);
      setUsers(u.users);
      setMarkets(m.markets);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function adjust(userId: string) {
    const raw = deltas[userId] ?? "0";
    const delta = parseInt(raw, 10);
    if (!Number.isFinite(delta)) {
      setError("Delta must be an integer.");
      return;
    }
    try {
      await api(`/admin/users/${userId}/adjust-balance`, {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      setDeltas((d) => ({ ...d, [userId]: "" }));
      await load();
      await refreshUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjust failed");
    }
  }

  async function removeUser(userId: string) {
    if (!window.confirm("Delete this user and their data?")) return;
    try {
      await api(`/admin/users/${userId}`, { method: "DELETE", auth: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function submitResolve(marketId: string) {
    const m = markets.find((x) => x.id === marketId);
    if (!m) return;
    const resolutions = m.options
      .filter((o) => !o.resolved_value)
      .map((o) => ({
        option_id: o.id,
        outcome: outcomes[o.id] ?? "YES",
      }));
    if (resolutions.length === 0) {
      setError("All options already resolved.");
      return;
    }
    try {
      await api(`/admin/markets/${marketId}/resolve`, {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutions }),
      });
      setResolveMarketId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Admin</h1>
      {error && <p className="error">{error}</p>}

      <h2 style={{ fontSize: "1.1rem" }}>Users</h2>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Balance</th>
              <th>Admin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.balance}</td>
                <td>{u.is_admin ? "yes" : ""}</td>
                <td>
                  <div className="row-actions">
                    <input
                      type="number"
                      step={1}
                      placeholder="Δ SC"
                      value={deltas[u.id] ?? ""}
                      onChange={(e) => setDeltas((d) => ({ ...d, [u.id]: e.target.value }))}
                      style={{ width: 90, maxWidth: "35vw" }}
                    />
                    <button type="button" onClick={() => void adjust(u.id)}>
                      Adjust
                    </button>
                    {!u.is_admin && (
                      <button type="button" className="danger" onClick={() => void removeUser(u.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Markets</h2>
      {markets.map((m) => (
        <div key={m.id} className="card">
          <strong>{m.title}</strong>
          <span className="muted">
            {" "}
            · {m.creator.username}
            {!m.is_open && " · closed"}
            {m.is_resolved && " · resolved"}
          </span>
          <ul>
            {m.options.map((o) => (
              <li key={o.id}>
                {o.question_text}
                {o.resolved_value ? (
                  <span className="muted"> → {o.resolved_value}</span>
                ) : (
                  <span className="muted"> → open</span>
                )}
              </li>
            ))}
          </ul>
          {!m.is_resolved && (
            <div className="row-actions">
              {resolveMarketId === m.id ? (
                <>
                  {m.options
                    .filter((o) => !o.resolved_value)
                    .map((o) => (
                      <label key={o.id} className="muted" style={{ display: "inline-flex", gap: 6 }}>
                        {o.question_text.slice(0, 40)}
                        <select
                          value={outcomes[o.id] ?? "YES"}
                          onChange={(e) =>
                            setOutcomes((s) => ({ ...s, [o.id]: e.target.value as "YES" | "NO" }))
                          }
                        >
                          <option value="YES">YES</option>
                          <option value="NO">NO</option>
                        </select>
                      </label>
                    ))}
                  <button type="button" className="primary" onClick={() => void submitResolve(m.id)}>
                    Confirm resolve
                  </button>
                  <button type="button" onClick={() => setResolveMarketId(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setResolveMarketId(m.id)}>
                  Resolve options…
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
