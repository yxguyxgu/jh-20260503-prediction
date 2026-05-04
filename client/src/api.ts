const API_ORIGIN =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:4000" : typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");

function apiUrl(path: string): string {
  const origin = String(API_ORIGIN).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}/api${p}`;
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export async function api<T>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = opts;
  const h = new Headers(headers);
  if (auth) {
    const t = getToken();
    if (t) h.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(apiUrl(path), { ...rest, headers: h });
  if (res.status === 204) {
    if (!res.ok) throw new Error(res.statusText);
    return undefined as T;
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: string }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body as T;
}
