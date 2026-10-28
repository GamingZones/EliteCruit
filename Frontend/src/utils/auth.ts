export const TOKEN_STORAGE_KEY = "elitecruit-token";
export const USER_STORAGE_KEY = "elitecruit-user";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem("token") || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {}
}

export function getStoredUser<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {}
}

export function getAuthHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const res: Record<string, string> = { ...headers };
  if (token) {
    res["Authorization"] = `Bearer ${token}`;
  }
  return res;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
    const isAuthAttempt = url.includes("/api/auth/");
    if (!isAuthAttempt) {
      clearAuth();
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath !== "/login" && currentPath !== "/" && currentPath !== "/create-account") {
          window.location.replace("/login?session=expired");
        }
      }
    }
  }

  return response;
}
