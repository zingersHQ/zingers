import "server-only";

interface Bucket {
  resetAt: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(req: Request, scope: string, max: number, windowMs: number): Response | null {
  const now = Date.now();
  const key = `${scope}:${clientIp(req)}`;
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { resetAt: now + windowMs, count: 1 });
    return null;
  }
  cur.count++;
  if (cur.count <= max) return null;

  const retryAfter = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
  return new Response("rate limited", {
    status: 429,
    headers: {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": String(max),
      "X-RateLimit-Reset": String(Math.ceil(cur.resetAt / 1000)),
    },
  });
}

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "local";
}
