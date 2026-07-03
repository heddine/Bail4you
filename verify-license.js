// netlify/functions/verify-license.js
// Vérifie un code de licence côté serveur ET limite le nombre d'appareils
// pouvant activer un même code (anti-partage), via Netlify Blobs.

const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const DUREE_JOURS = { '1': 30, '2': 30, '3': 30, 'A': 36500 };
const MAX_ACTIVATIONS = 3; // quota souple : couvre changement de tel + réinstall + 2e appareil

function computeChecksum(block2, block3, plan, secret) {
  const hmac = crypto.createHmac('sha256', secret)
    .update(block2 + block3 + plan)
    .digest('hex')
    .toUpperCase();
  return hmac.slice(0, 3);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ valid: false, error: 'Méthode non autorisée' }) };
  }

  const { LICENSE_SECRET } = process.env;
  if (!LICENSE_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ valid: false, error: 'Configuration serveur incomplète' }) };
  }

  let code;
  try {
    code = (JSON.parse(event.body || '{}').code || '').toUpperCase().trim();
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'Requête invalide' }) };
  }

  const parts = code.split('-');
  if (parts.length !== 4 || parts[0] !== 'BHSH') {
    return { statusCode: 200, body: JSON.stringify({ valid: false, error: 'Format de code invalide' }) };
  }

  const [, block2, block3, block4] = parts;
  if (!/^[A-Z0-9]{4}$/.test(block2) || !/^[A-Z0-9]{4}$/.test(block3) || !/^[A-Z0-9]{3}[123A]$/.test(block4)) {
    return { statusCode: 200, body: JSON.stringify({ valid: false, error: 'Format de code invalide' }) };
  }

  const plan = block4.slice(-1);
  const providedChecksum = block4.slice(0, 3);
  const expectedChecksum = computeChecksum(block2, block3, plan, LICENSE_SECRET);

  if (providedChecksum !== expectedChecksum) {
    return { statusCode: 200, body: JSON.stringify({ valid: false, error: 'Code invalide' }) };
  }

  // ── Contrôle anti-partage : quota d'activations par code ──────────────
  try {
    const store = getStore({ name: 'license-activations', consistency: 'strong' });
    let record = await store.get(code, { type: 'json' });
    if (!record) record = { count: 0, firstUsed: new Date().toISOString() };

    if (record.count >= MAX_ACTIVATIONS) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          valid: false,
          error: 'Ce code a atteint sa limite de ' + MAX_ACTIVATIONS + ' appareils. Contactez le support pour assistance.'
        })
      };
    }

    record.count += 1;
    record.lastUsed = new Date().toISOString();
    await store.setJSON(code, record);
  } catch (e) {
    // En cas de panne du stockage, on n'empêche pas l'activation légitime
    console.error('Blobs error:', e.message);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valid: true, plan, dureeJours: DUREE_JOURS[plan] })
  };
};
