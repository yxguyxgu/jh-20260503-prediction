import { useEffect } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import MarketDetailPage from "./pages/MarketDetailPage";
import CreateMarketPage from "./pages/CreateMarketPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AdminPage from "./pages/AdminPage";

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="top-nav">
      <Link to="/">Home</Link>
      {user && (
        <>
          <Link to="/markets">Markets</Link>
          <Link to="/create">Create</Link>
          {user.is_admin && <Link to="/admin">Admin</Link>}
        </>
      )}
      <Link to="/leaderboard">Leaderboard</Link>
      <span className="spacer" />
      {user ? (
        <>
          <span className="muted top-nav-muted">
            {user.username} — {user.balance} SC
          </span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </>
      ) : (
        <>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
        </>
      )}
    </nav>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/markets" replace />;
}

function Bootstrap() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") navigate(0);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <Bootstrap />
      <header className="top-bar">
        <div className="layout top-bar-inner">
          <NavBar />
        </div>
      </header>
      <div className="layout page-body">
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/markets"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/markets/:id"
            element={
              <RequireAuth>
                <MarketDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreateMarketPage />
              </RequireAuth>
            }
          />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<p>Not found</p>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
