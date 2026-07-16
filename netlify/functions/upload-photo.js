// netlify/functions/upload-photo.js
// Stocke une photo (pièce d'identité) dans Netlify Blobs, liée au code de licence.
// Ne stocke QUE des photos pour un utilisateur avec licence valide — pas de gratuit.

const { getStore } = require('@netlify/blobs');
const { verifierCode } = require('./_license-check');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, key, dataUrl } = JSON.parse(event.body || '{}');

    if (!code || !key || !dataUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants (code, key, dataUrl).' }) };
    }

    // ── Vérification de licence (authenticité du code, sans consommer d'activation) ──
    const verif = verifierCode(code);
    if (!verif.valid) {
      return { statusCode: 403, body: JSON.stringify({ error: verif.error || 'Licence invalide.' }) };
    }

    // Limite de taille (sécurité — après compression côté client, ~150-300 Ko attendu)
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
    if (approxBytes > 2 * 1024 * 1024) { // 2 Mo max
      return { statusCode: 413, body: JSON.stringify({ error: 'Image trop volumineuse (max 2 Mo).' }) };
    }

    const store = getStore('bailexpert-photos');
    const blobKey = `${verif.code}/${key}`; // ex: BHSH-XXXX-XXXX-XXX1/fiche_171234_recto

    await store.set(blobKey, dataUrl, {
      metadata: { uploadedAt: new Date().toISOString() }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, key })
    };
  } catch (err) {
    console.error('upload-photo error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
