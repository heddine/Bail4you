// netlify/functions/_rate-limit.js
// Rate limiting basique par IP, via Netlify Blobs comme compteur.

const { getStore } = require('@netlify/blobs');

function getClientIp(event) {
  const h = event.headers || {};
  return (
    h['x-nf-client-connection-ip'] ||
    (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

async function checkRateLimit(key, { limit, windowSeconds }) {
  const store = getStore('bailexpert-ratelimit');
  const now = Date.now();

  let entry;
  try {
    entry = await store.get(key, { type: 'json' });
  } catch {
    entry = null;
  }

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowSeconds * 1000 };
  }

  entry.count += 1;

  try {
    await store.setJSON(key, entry);
  } catch {
    return { allowed: true, remaining: limit, resetAt: entry.resetAt };
  }

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt
  };
}

function rateLimitResponse(resetAt) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return {
    statusCode: 429,
    headers: { 'Retry-After': String(retryAfter) },
    body: JSON.stringify({ error: 'Trop de requêtes, réessayez plus tard.' })
  };
}

module.exports = { getClientIp, checkRateLimit, rateLimitResponse };
