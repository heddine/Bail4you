// netlify/functions/get-photo.js
// Récupère une photo stockée dans Netlify Blobs, à partir du code de licence + clé.
//
// Appel : GET /.netlify/functions/get-photo?code=XXXX&key=fiche_171234_recto

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, key } = event.queryStringParameters || {};
    if (!code || !key) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants (code, key).' }) };
    }

    const store = getStore('bailexpert-photos');
    const blobKey = `${code}/${key}`;
    const dataUrl = await store.get(blobKey);

    if (!dataUrl) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Photo introuvable.' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl })
    };
  } catch (err) {
    console.error('get-photo error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur.' }) };
  }
};
