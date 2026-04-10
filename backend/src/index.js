import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_URL }));
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

app.listen(PORT, () => {
  console.log(`Lokal-Map backend running on http://localhost:${PORT}`);
});
