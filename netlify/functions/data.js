const { getStore } = require('@netlify/blobs');

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || 'PawnE4!';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-password',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore('snapshots');

  // ── GET — load all snapshots (public, no password needed) ──
  if (event.httpMethod === 'GET') {
    try {
      const { blobs } = await store.list();
      const snapshots = await Promise.all(
        blobs.map(async b => {
          const data = await store.get(b.key, { type: 'json' });
          return data;
        })
      );
      // Sort by date ascending
      snapshots.sort((a, b) => a.date.localeCompare(b.date));
      return { statusCode: 200, headers, body: JSON.stringify(snapshots) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── POST — save a snapshot (password required) ──
  if (event.httpMethod === 'POST') {
    const password = event.headers['x-password'];
    if (password !== UPLOAD_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect password' }) };
    }
    try {
      const snap = JSON.parse(event.body);
      if (!snap.date) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing date' }) };
      await store.setJSON(snap.date, snap);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── DELETE — remove a snapshot (password required) ──
  if (event.httpMethod === 'DELETE') {
    const password = event.headers['x-password'];
    if (password !== UPLOAD_PASSWORD) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect password' }) };
    }
    try {
      const { date } = JSON.parse(event.body);
      await store.delete(date);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
