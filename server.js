const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── YouTube Search Proxy (no API key, scrape innertube) ──
app.get('/api/search', async (req, res) => {
  const query = req.query.query || '';
  if (!query) return res.json({ status: 'error', data: [] });

  try {
    // Use YouTube's internal Innertube API (no key needed)
    const body = {
      query: query,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101'
        }
      }
    };

    const response = await fetch('https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20240101'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    // Parse results from YouTube's response
    const items = data?.contents?.twoColumnSearchResultsRenderer
      ?.primaryContents?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents || [];

    const tracks = [];
    for (const item of items) {
      const vr = item.videoRenderer;
      if (!vr) continue;
      const videoId = vr.videoId;
      if (!videoId) continue;

      const title = vr.title?.runs?.[0]?.text || 'Unknown';
      const artist = vr.longBylineText?.runs?.[0]?.text || 
                     vr.shortBylineText?.runs?.[0]?.text || 'Unknown';
      const thumbnail = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || '';
      const duration = vr.lengthText?.simpleText || '';

      tracks.push({ videoId, title, artist, thumbnail, duration });
      if (tracks.length >= 20) break;
    }

    res.json({ status: 'success', data: tracks });
  } catch (err) {
    console.error('Search error:', err.message);
    res.json({ status: 'error', data: [] });
  }
});

// Fallback: serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AniSound server running on port ${PORT}`);
});
