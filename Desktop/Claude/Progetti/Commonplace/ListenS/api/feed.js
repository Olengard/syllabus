// Vercel Serverless Function — proxy RSS feed lato server
// Chiamata da: /api/feed?url=<encoded_feed_url>
// Bypassa CORS completamente: il fetch avviene server-side

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Validazione base: solo http/https
  let feedUrl;
  try {
    feedUrl = new URL(decodeURIComponent(url));
    if (!['http:', 'https:'].includes(feedUrl.protocol)) throw new Error('invalid protocol');
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    const response = await fetch(feedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ListenS/1.0; RSS reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Feed returned ${response.status}` });
    }

    const xml = await response.text();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // cache 5 min su CDN
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(xml);

  } catch (err) {
    return res.status(502).json({ error: err.message || 'Failed to fetch feed' });
  }
}
