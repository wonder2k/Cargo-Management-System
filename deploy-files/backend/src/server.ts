import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import { eq, or } from 'drizzle-orm';

import authRoutes from './routes/auth';
import businessRoutes from './routes/business';
import operationRoutes from './routes/operation';
import financeRoutes from './routes/finance';
import uploadRoutes from './routes/upload';

import { db } from './db';
import { mawbs } from './db/schema';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const TRACK_API_KEY = process.env.TRACK_TOKEN;
const TRACK_API_BASE = 'https://api.17track.net/airtrack/v2.1';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/operation', operationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/upload', uploadRoutes);

// 17TRACK API proxy
app.post('/api/track/register', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Tracking number required' });

    if (!TRACK_API_KEY || TRACK_API_KEY === 'YOUR_API_KEY_HERE') {
      return res.status(400).json({ code: 999, message: 'API Token Missing. Set TRACK_TOKEN in .env' });
    }

    const cleanNumber = number.replace(/\s/g, '').replace(/-/g, '');
    console.log(`[17TRACK] Registering ${cleanNumber} via ${TRACK_API_BASE}/register`);
    const response = await fetch(`${TRACK_API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', '17token': TRACK_API_KEY },
      body: JSON.stringify([{ number: cleanNumber }]),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(500).json({ error: 'Non-JSON response', details: text.slice(0, 500) }); }
    if (!response.ok) { console.error(`[17TRACK] API error ${response.status}:`, JSON.stringify(data).slice(0, 300)); return res.status(response.status).json(data); }
    res.json(data);
  } catch (error: any) {
    console.error('[17TRACK] Register exception:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.post('/api/track/gettrackinfo', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Tracking number required' });

    if (!TRACK_API_KEY || TRACK_API_KEY === 'YOUR_API_KEY_HERE') {
      return res.status(400).json({ code: 999, message: 'API Token Missing. Set TRACK_TOKEN in .env' });
    }

    const cleanNumber = number.replace(/\s/g, '').replace(/-/g, '');
    const response = await fetch(`${TRACK_API_BASE}/gettrackinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', '17token': TRACK_API_KEY },
      body: JSON.stringify([{ number: cleanNumber }]),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(500).json({ error: 'Non-JSON response', details: text.slice(0, 500) }); }
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 17TRACK Webhook for tracking push updates
app.all('/api/webhook/17track', async (req, res) => {
  const now = new Date().toISOString();
  console.log(`[17TRACK WEBHOOK] ${req.method} at ${now}`);

  if (req.method === 'POST') {
    const body = req.body;
    console.log('[17TRACK WEBHOOK] Payload:', JSON.stringify(body).slice(0, 500));

    try {
      // Determine the tracking number from the payload
      const trackNumber = body.track_info?.tracking_number || body.number || '';
      const cleanNo = trackNumber.replace(/\s/g, '').replace(/-/g, '');

      if (!cleanNo) {
        return res.status(200).json({ code: 0, message: 'no tracking number' });
      }

      // Find the MAWB in the DB (with or without dashes)
      const [existing] = await db.select().from(mawbs)
        .where(or(
          eq(mawbs.mawbNo, cleanNo),
          eq(mawbs.mawbNo, trackNumber)
        ))
        .limit(1);

      if (!existing) {
        console.log(`[17TRACK WEBHOOK] No MAWB found for ${cleanNo}, storing as orphan`);
        return res.status(200).json({ code: 0, message: 'no matching MAWB' });
      }

      // Build update payload
      const update: any = { lastActivity: now };

      // Parse tracking logs from the webhook
      const ti = body.track_info;
      if (ti?.tracking_full_log && Array.isArray(ti.tracking_full_log)) {
        const existingLogs = (typeof existing.trackingLogs === 'string'
          ? JSON.parse(existing.trackingLogs)
          : existing.trackingLogs) || [];
        const mergedLogs = [...existingLogs, ...ti.tracking_full_log];
        // Deduplicate by time+status
        const seen = new Set();
        update.trackingLogs = mergedLogs.filter((log: any) => {
          const key = `${log.time}|${log.status}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      // Map 17track status to MAWB status
      const eventStatus = ti?.latest_event?.status || ti?.status || '';
      if (eventStatus === 'DEP' || eventStatus === 'departed') {
        update.status = 'departed';
        if (ti?.latest_event?.time) update.atd = new Date(ti.latest_event.time).toISOString();
      } else if (eventStatus === 'ARR' || eventStatus === 'arrived') {
        update.status = 'arrived';
        if (ti?.latest_event?.time) update.ata = new Date(ti.latest_event.time).toISOString();
      }

      await db.update(mawbs).set(update).where(eq(mawbs.id, existing.id));

      console.log(`[17TRACK WEBHOOK] Updated MAWB ${existing.mawbNo}: status=${update.status || 'unchanged'}, logs=${update.trackingLogs?.length || 0}`);
    } catch (err: any) {
      console.error('[17TRACK WEBHOOK] Error processing update:', err.message);
    }
  }

  res.status(200).json({ code: 0, message: 'accepted' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});
