import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setToken } from "./api";

export type User = {
  id: string;
  username: string;
  balance: number;
  is_admin: boolean;
};

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserBalance: (n: number) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const me = await api<{ user: User }>("/me", { auth: true });
      setUser(me.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api<{ token: string; user: User }>("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const signup = useCallback(async (username: string, password: string) => {
    const data = await api<{ token: string; user: User }>("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const setUserBalance = useCallback((n: number) => {
    setUser((u) => (u ? { ...u, balance: n } : null));
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      signup,
      logout,
      refreshUser,
      setUserBalance,
    }),
    [user, ready, login, signup, logout, refreshUser, setUserBalance]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
