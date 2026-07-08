// netlify/functions/generate-license.js
// Génère un code de licence signé. Réservé à un usage ADMIN (vous).
// Appel : https://votresite.netlify.app/.netlify/functions/generate-license?key=VOTRE_ADMIN_KEY&plan=1
//   plan = 1 | 2 | 3
//
// Variables d'environnement à définir sur Netlify (Site settings > Environment variables) :
//   LICENSE_SECRET  -> une longue chaîne aléatoire, ex: générée avec `openssl rand -hex 32`
//   ADMIN_KEY       -> un mot de passe que vous seul connaissez, pour appeler cette fonction

const crypto = require('crypto');

const DUREE_JOURS = { '1': 30, '2': 30, '3': 30 };

function randomBlock(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I pour éviter confusion
  let out = '';
  for (let i = 0; i < len; i++) out += chars[crypto.randomInt(0, chars.length)];
  return out;
}

function computeChecksum(block2, block3, plan, secret) {
  const hmac = crypto.createHmac('sha256', secret)
    .update(block2 + block3 + plan)
    .digest('hex')
    .toUpperCase();
  return hmac.slice(0, 3); // 3 premiers caractères hex (0-9A-F)
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const { ADMIN_KEY, LICENSE_SECRET } = process.env;

  if (!ADMIN_KEY || !LICENSE_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration serveur incomplète (variables env manquantes)' }) };
  }

  if (params.key !== ADMIN_KEY) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  const plan = (params.plan || '').toUpperCase();
  if (!DUREE_JOURS[plan]) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Plan invalide. Utilisez 1, 2 ou 3.' }) };
  }

  const block2 = randomBlock(4);
  const block3 = randomBlock(4);
  const checksum = computeChecksum(block2, block3, plan, LICENSE_SECRET);
  const code = `BHSH-${block2}-${block3}-${checksum}${plan}`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, plan, dureeJours: DUREE_JOURS[plan] })
  };
};
