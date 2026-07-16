// netlify/functions/_license-check.js
// Vérifie qu'un code de licence est authentique (format + checksum HMAC),
// SANS toucher au compteur d'activations de verify-license.js. Utilisé par
// les fonctions de sauvegarde cloud pour s'assurer qu'un code est réel avant
// de l'utiliser comme clé de stockage — un simple contrôle d'authenticité,
// pas une nouvelle activation.

const crypto = require('crypto');

function computeChecksum(block2, block3, plan, secret) {
  return crypto.createHmac('sha256', secret)
    .update(block2 + block3 + plan)
    .digest('hex')
    .toUpperCase()
    .slice(0, 3);
}

function verifierCode(code) {
  const { LICENSE_SECRET } = process.env;
  if (!LICENSE_SECRET) return { valid: false, error: 'Configuration serveur incomplète' };

  code = (code || '').toUpperCase().trim();
  const parts = code.split('-');
  if (parts.length !== 4 || parts[0] !== 'BHSH') {
    return { valid: false, error: 'Format de code invalide' };
  }

  const [, block2, block3, block4] = parts;
  if (!/^[A-Z0-9]{4}$/.test(block2) || !/^[A-Z0-9]{4}$/.test(block3) || !/^[A-Z0-9]{3}[1234]$/.test(block4)) {
    return { valid: false, error: 'Format de code invalide' };
  }

  const plan = block4.slice(-1);
  const providedChecksum = block4.slice(0, 3);
  const expectedChecksum = computeChecksum(block2, block3, plan, LICENSE_SECRET);

  if (providedChecksum !== expectedChecksum) {
    return { valid: false, error: 'Code invalide' };
  }

  return { valid: true, plan, code };
}

module.exports = { verifierCode };
