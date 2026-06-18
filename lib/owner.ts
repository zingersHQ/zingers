// Anonymous owner identity — no auth. A stable token lives in localStorage and
// represents "you"; an optional public handle shows on the shared ladder.
const TOKEN_KEY = "zingers_owner_token_v1";
const HANDLE_KEY = "zingers_owner_handle_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOwnerToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = uuid();
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

// Adopt a trainer code copied from another device — this is how a save follows
// you across browsers without any account/login. Returns the normalized token,
// or "" if the input isn't a plausible token.
export function setOwnerToken(raw: string): string {
  if (typeof window === "undefined") return "";
  const t = raw.trim();
  if (t.length < 8 || t.length > 128) return "";
  localStorage.setItem(TOKEN_KEY, t);
  return t;
}

export function getHandle(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(HANDLE_KEY) || "";
}

export function setHandle(h: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HANDLE_KEY, h.slice(0, 24));
}
