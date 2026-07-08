// netlify/functions/start-trial.js
// Enregistre le démarrage d'un essai gratuit, en bloquant la réutilisation
// du même email ou numéro de téléphone pour un nouvel essai.

const { getStore } = require('@netlify/blobs');

function normaliserEmail(email) {
  return (email || '').trim().toLowerCase();
}

function normaliserTel(tel) {
  return (tel || '').replace(/[\s().-]/g, '');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ allowed: false, error: 'Méthode non autorisée' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ allowed: false, error: 'Requête invalide' }) };
  }

  const nom = (data.nom || '').trim();
  const prenom = (data.prenom || '').trim();
  const email = normaliserEmail(data.email);
  const tel = normaliserTel(data.tel);
  const adresse = (data.adresse || '').trim();

  if (!nom || !prenom || !email || !tel) {
    return { statusCode: 200, body: JSON.stringify({ allowed: false, error: 'Merci de renseigner nom, prénom, email et téléphone.' }) };
  }

  try {
    const store = getStore({ name: 'trial-signups', consistency: 'strong' });

    const [byEmail, byTel] = await Promise.all([
      store.get('email:' + email, { type: 'json' }),
      store.get('tel:' + tel, { type: 'json' })
    ]);

    if (byEmail || byTel) {
      return {
        statusCode: 200,
        body: JSON.stringify({ allowed: false, error: 'Cet email ou ce numéro de téléphone a déjà été utilisé pour un essai gratuit.' })
      };
    }

    const record = { nom, prenom, email, tel, adresse, dateDebut: new Date().toISOString() };
    await Promise.all([
      store.setJSON('email:' + email, record),
      store.setJSON('tel:' + tel, record)
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed: true })
    };
  } catch (e) {
    console.error('start-trial error:', e.message);
    // En cas de panne du stockage, on n'empêche pas l'essai légitime
    return { statusCode: 200, body: JSON.stringify({ allowed: true }) };
  }
};
