import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  console.log(`[DEBUG] fetch API available: ${typeof fetch !== "undefined"}`);

  // 17TRACK API Context
  const TRACK_API_KEY = process.env.TRACK_TOKEN;
  // Official AirTrack (MAWB) API v2.1
  const TRACK_API_BASE = "https://api.17track.net/airtrack/v2.1";

  // Webhook / Callback Route
  // Register this URL in your 17TRACK Console under AirTrack Settings
  // NOTE: External services can only reach this if the app is Publicly Shared.
  // If you see 503, it's because the preview environment blocks external POSTs.
  app.all("/api/webhook/17track", (req, res) => {
    console.log(`[17TRACK WEBHOOK] Received ${req.method} request at ${new Date().toISOString()}`);
    if (req.method === "POST") {
      console.log("[17TRACK WEBHOOK] Payload:", JSON.stringify(req.body, null, 2));
    }
    res.status(200).json({ code: 0, message: "accepted" });
  });

  // API Routes
  app.post("/api/track/register", async (req, res) => {
    try {
      const { number } = req.body;
      if (!number) return res.status(400).json({ error: "Tracking number required" });

      if (!TRACK_API_KEY || TRACK_API_KEY === "YOUR_API_KEY_HERE") {
        console.error("TRACK_TOKEN is not configured in environment (Secrets)");
        return res.status(400).json({ 
          code: 999, 
          message: "API Token Missing. Please set TRACK_TOKEN in Settings -> Secrets." 
        });
      }

      const url = `${TRACK_API_BASE}/register`;
      console.log(`[17TRACK] Registering: ${number} via ${url}`);

      // Basic payload for MAWB
      const cleanNumber = number.replace(/\s/g, "").replace("-", "");
      const payload = { number: cleanNumber };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "17token": TRACK_API_KEY || ""
        },
        body: JSON.stringify([payload]),
      });

      const text = await response.text();
      console.log(`[17TRACK AirTrack] Register Response Status: ${response.status}`);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[17TRACK AirTrack] Register failed to parse JSON. Body starts with:", text.slice(0, 500));
        return res.status(500).json({ 
          error: "17TRACK API returned non-JSON response (likely an error page or WAF block)", 
          status: response.status,
          details: text.slice(0, 500) 
        });
      }

      if (!response.ok) {
        console.error(`[17TRACK AirTrack] API returned ${response.status}:`, JSON.stringify(data));
        return res.status(response.status).json(data);
      }

      console.log("[17TRACK AirTrack] Register Result:", JSON.stringify(data));
      res.json(data);
    } catch (error) {
      console.error("17TRACK AirTrack Register Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Internal Server Error during registration", details: errorMessage });
    }
  });

  app.post("/api/track/gettrackinfo", async (req, res) => {
    try {
      const { number } = req.body;
      if (!number) return res.status(400).json({ error: "Tracking number required" });

      if (!TRACK_API_KEY || TRACK_API_KEY === "YOUR_API_KEY_HERE") {
        return res.status(400).json({ 
          code: 999, 
          message: "API Token Missing. Please set TRACK_TOKEN in Settings -> Secrets." 
        });
      }

      const url = `${TRACK_API_BASE}/gettrackinfo`;
      console.log(`[17TRACK] Fetching: ${number} via ${url}`);

      // Basic payload for MAWB
      const cleanNumber = number.replace(/\s/g, "").replace("-", "");
      const payload = { number: cleanNumber };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "17token": TRACK_API_KEY || ""
        },
        body: JSON.stringify([payload]),
      });

      const text = await response.text();
      console.log(`[17TRACK AirTrack] Fetch Response Status: ${response.status}`);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[17TRACK AirTrack] Fetch failed to parse JSON. Body starts with:", text.slice(0, 100));
        return res.status(500).json({ 
          error: "17TRACK API returned non-JSON response (likely an error page)", 
          status: response.status,
          details: text.slice(0, 500) 
        });
      }

      if (!response.ok) {
        console.error(`[17TRACK AirTrack] API returned ${response.status}:`, JSON.stringify(data));
        return res.status(response.status).json(data);
      }

      console.log("[17TRACK AirTrack] Fetch Result:", JSON.stringify(data));
      res.json(data);
    } catch (error) {
      console.error("17TRACK AirTrack Track Error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Internal Server Error during fetch", details: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
