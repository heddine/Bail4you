// netlify/functions/upload-photo.js
// Stocke une photo (pièce d'identité) dans Netlify Blobs, liée au code de licence.
// Ne stocke QUE des photos pour un utilisateur avec licence active — pas de gratuit.
//
// ⚠️ À ADAPTER : remplace la vérification de licence ci-dessous par ta logique
// existante (celle utilisée dans save-settings.js / _license-check.js) pour
// rester cohérent avec le reste de ton backend.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, key, dataUrl } = JSON.parse(event.body || '{}');

    if (!code || !key || !dataUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants (code, key, dataUrl).' }) };
    }

    // ── Vérification de licence ──
    // TODO : remplace cette ligne par ta vérification réelle
    // (ex: appel à la même fonction/logique que verify-license.js ou save-settings.js)
    const licenceValide = await verifierLicenceBasique(code);
    if (!licenceValide) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Licence invalide ou inactive.' }) };
    }

    // Limite de taille (sécurité — après compression côté client, ~150-300 Ko attendu)
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
    if (approxBytes > 2 * 1024 * 1024) { // 2 Mo max
      return { statusCode: 413, body: JSON.stringify({ error: 'Image trop volumineuse (max 2 Mo).' }) };
    }

    const store = getStore('bailexpert-photos');
    const blobKey = `${code}/${key}`; // ex: ABCD-1234/fiche_171234_recto

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

// Placeholder — à remplacer par ta vraie vérification de licence
async function verifierLicenceBasique(code) {
  // Exemple minimal : le code doit exister et respecter un format attendu.
  // Remplace par un appel à ta base de licences / ton secret LICENSE_SECRET.
  return typeof code === 'string' && code.length >= 6;
}
