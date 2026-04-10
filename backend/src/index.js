import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

// Allow all localhost origins in dev; restrict to FRONTEND_URL in production
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman) and any localhost port
      if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        return callback(null, true);
      }
      const allowed = (process.env.FRONTEND_URL ?? "").split(",").map((s) => s.trim());
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "lokal-map-backend" });
});

// ── GET /api/instagram-feed ───────────────────────────────────────────────────
// Query params:
//   token  — brand's long-lived Instagram user access token (stored per-brand by admin)
//   limit  — number of posts to return (default: 3, max: 6)
//
// Returns: array of { id, media_url, thumbnail_url, permalink, caption, media_type, timestamp }
//
// How to get a token for a brand:
//   1. Brand owner visits https://www.instagram.com/oauth/authorize?
//        client_id=YOUR_APP_ID&redirect_uri=YOUR_REDIRECT_URI&
//        scope=instagram_business_basic&response_type=code
//   2. Exchange the 'code' for a short-lived token via POST /oauth/access_token
//   3. Exchange short-lived → long-lived token:
//        GET https://graph.instagram.com/access_token?
//          grant_type=ig_exchange_token&client_secret=APP_SECRET&access_token=SHORT_TOKEN
//   4. Store the long-lived token (expires in 60 days — renew it before expiry!)
//
// Renewal endpoint: /api/instagram-refresh-token
app.get("/api/instagram-feed", async (req, res) => {
  const token = req.query.token || process.env.INSTAGRAM_ACCESS_TOKEN;
  const limit = Math.min(parseInt(req.query.limit) || 3, 6);

  if (!token) {
    return res.status(400).json({ error: "Missing Instagram access token" });
  }

  try {
    const fields = "id,media_url,thumbnail_url,permalink,caption,media_type,timestamp";
    const url =
      `https://graph.instagram.com/me/media` +
      `?fields=${fields}&limit=${limit}&access_token=${token}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    // Filter out STORY type, only return IMAGE and VIDEO
    const media = (data.data || []).filter(
      (item) => item.media_type === "IMAGE" || item.media_type === "CAROUSEL_ALBUM" || item.media_type === "VIDEO"
    );

    res.json({ media });
  } catch (err) {
    console.error("Instagram feed error:", err);
    res.status(500).json({ error: "Failed to fetch Instagram feed" });
  }
});

// ── GET /api/instagram-refresh-token ─────────────────────────────────────────
// Refresh a long-lived token before it expires (call this every ~50 days)
// Query params: token — existing long-lived token
app.get("/api/instagram-refresh-token", async (req, res) => {
  const token = req.query.token || process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    const url =
      `https://graph.instagram.com/refresh_access_token` +
      `?grant_type=ig_refresh_token&access_token=${token}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    res.json({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// ── Coord extractor helper ────────────────────────────────────────────────────

function extractCoordsFromUrl(url) {
  // Pattern 1: @lat,lon,zoom  e.g. /@5.4056215,100.402462,17z
  const atMatch = url.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // Pattern 2: !3d<lat>...!4d<lng>  in data= segment
  const dataMatch = url.match(/!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  // Pattern 3: /maps/search/lat,+lon  e.g. /maps/search/5.333473,+103.150213
  const searchMatch = url.match(/\/maps\/search\/(-?\d+\.?\d+),\+?(-?\d+\.?\d+)/);
  if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };

  // Pattern 4: ?q=lat,lon  e.g. ?q=5.333473,103.150213
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d+),\+?(-?\d+\.?\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  return null;
}

// ── GET /api/resolve-gmaps ────────────────────────────────────────────────────
// Resolves any Google Maps link (short or full) → { lat, lng }
// Supports:
//   • https://maps.app.goo.gl/xxxxx          (short share link)
//   • https://www.google.com/maps/place/...   (full URL with @lat,lon)
//   • Any Google Maps URL containing coordinates
app.get("/api/resolve-gmaps", async (req, res) => {
  let url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  // Ensure protocol
  if (!/^https?:\/\//.test(url)) url = "https://" + url;

  // Try client-side extraction first (works for full URLs without a network call)
  const quick = extractCoordsFromUrl(url);
  if (quick) return res.json(quick);

  // For short links or URLs without embedded coords — follow redirect
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        // Mimic a browser so Google doesn't redirect to a consent page
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const finalUrl = response.url;

    // Try extracting from the resolved URL first
    const fromUrl = extractCoordsFromUrl(finalUrl);
    if (fromUrl) return res.json(fromUrl);

    // Last resort: scan the response HTML for coordinates
    const html = await response.text();

    // Google embeds coords in a JS variable like window.APP_INITIALIZATION_STATE
    // Pattern: [lat,lng] as floats near each other in the initialisation state
    const htmlMatch = html.match(/,(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
    if (htmlMatch) {
      const lat = parseFloat(htmlMatch[1]);
      const lng = parseFloat(htmlMatch[2]);
      // Sanity check: valid lat/lng range
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return res.json({ lat, lng });
      }
    }

    return res.status(404).json({ error: "Koordinat tidak ditemui dalam link ini." });
  } catch (err) {
    console.error("resolve-gmaps error:", err);
    return res.status(500).json({ error: "Gagal resolve link. Cuba URL penuh Google Maps." });
  }
});

app.listen(PORT, () => {
  console.log(`Lokal-Map backend running on http://localhost:${PORT}`);
});
