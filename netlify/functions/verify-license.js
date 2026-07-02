// netlify/functions/verify-license.js
const crypto = require('crypto');

const DUREE_JOURS = { '1': 30, '2': 30, '3': 30, 'A': 36500 };

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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valid: true, plan, dureeJours: DUREE_JOURS[plan] })
  };
};
