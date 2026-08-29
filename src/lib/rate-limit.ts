/**
 * Small in-memory limiter for public form endpoints. Enough to blunt casual
 * spam on a single instance; swap for Redis if the site is scaled out.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  entry.count += 1;
  if (entry.count > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }

  return { ok: true, remaining: limit - entry.count };
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
