// netlify/functions/delete-photo.js
// Supprime une photo stockée dans Netlify Blobs (ex: quand une fiche locataire est supprimée).
//
// Appel : POST /.netlify/functions/delete-photo  { code, key }

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, key } = JSON.parse(event.body || '{}');
    if (!code || !key) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants (code, key).' }) };
    }

    const store = getStore('bailexpert-photos');
    await store.delete(`${code}/${key}`);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('delete-photo error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
