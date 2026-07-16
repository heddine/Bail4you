// netlify/functions/get-settings.js
// Récupère les paramètres sauvegardés pour un code de licence donné.

const { getStore } = require('@netlify/blobs');
const { verifierCode } = require('./_license-check');
const { getClientIp, checkRateLimit, rateLimitResponse } = require('./_rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const ip = getClientIp(event);
  const rl = await checkRateLimit(`get:${ip}`, { limit: 60, windowSeconds: 300 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const code = event.queryStringParameters?.code || '';
  const verif = verifierCode(code);
  if (!verif.valid) {
    return { statusCode: 403, body: JSON.stringify({ error: verif.error || 'Licence invalide' }) };
  }

  try {
    const store = getStore('bailexpert-settings');
    const record = await store.get(verif.code, { type: 'json' });
    return { statusCode: 200, body: JSON.stringify({ data: record?.data || null, updatedAt: record?.updatedAt || null }) };
  } catch (err) {
    console.error('Erreur lecture paramètres :', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur de stockage' }) };
  }
};
