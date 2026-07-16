// netlify/functions/save-settings.js
// Sauvegarde les paramètres bailleur/pro (et éventuellement biens/locataires)
// d'un utilisateur, en utilisant son code de licence comme clé de stockage.
// Réservé aux licences valides (le code doit passer le contrôle
// format+checksum de _license-check.js), pour rester cohérent avec le
// modèle "état des lieux + photos = payant".

const { getStore } = require('@netlify/blobs');
const { verifierCode } = require('./_license-check');
const { getClientIp, checkRateLimit, rateLimitResponse } = require('./_rate-limit');

const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2 Mo — largement suffisant pour du texte + petites photos compressées

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const ip = getClientIp(event);
  const rl = await checkRateLimit(`save:${ip}`, { limit: 30, windowSeconds: 300 });
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  if ((event.body || '').length > MAX_PAYLOAD_SIZE) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Données trop volumineuses' }) };
  }

  let code, data;
  try {
    ({ code, data } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Requête invalide' }) };
  }

  if (!data || typeof data !== 'object') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Données manquantes' }) };
  }

  const verif = verifierCode(code);
  if (!verif.valid) {
    return { statusCode: 403, body: JSON.stringify({ error: verif.error || 'Licence invalide' }) };
  }

  try {
    const store = getStore('bailexpert-settings');
    await store.setJSON(verif.code, {
      data,
      updatedAt: new Date().toISOString()
    });
    return { statusCode: 200, body: JSON.stringify({ saved: true }) };
  } catch (err) {
    console.error('Erreur sauvegarde paramètres :', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur de stockage' }) };
  }
};
