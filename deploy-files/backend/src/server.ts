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
const TRACK_API_BASE = 'https://api.17track.net/awb/v2';

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

    const cleanNumber = number.trim();
    console.log(`[17TRACK AWB] Registering ${cleanNumber}`);

    const response = await fetch(`${TRACK_API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', '17token': TRACK_API_KEY, 'Accept': 'application/json' },
      body: JSON.stringify([{ number: cleanNumber }]),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(500).json({ error: 'Non-JSON response', details: text.slice(0, 500) }); }
    if (!response.ok) { console.error(`[17TRACK AWB] Register error:`, JSON.stringify(data).slice(0, 300)); return res.status(response.status).json(data); }
    res.json(data);
  } catch (error: any) {
    console.error('[17TRACK AWB] Register exception:', error.message);
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

    const cleanNumber = number.trim();
    console.log(`[17TRACK AWB] Fetching ${cleanNumber}`);
    const response = await fetch(`${TRACK_API_BASE}/gettrackinfo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', '17token': TRACK_API_KEY, 'Accept': 'application/json' },
      body: JSON.stringify([{ number: cleanNumber }]),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(500).json({ error: 'Non-JSON response', details: text.slice(0, 500) }); }
    if (!response.ok) return res.status(response.status).json(data);

    // Sync MAWB status from AWB tracking data
    try {
      const accepted = data?.data?.accepted;
      if (accepted && accepted.length > 0) {
        const item = accepted[0];
        const shipment = item.track_info?.shipment || {};
        const latestStatus = shipment.latest_status?.status || '';
        const awbInfo = shipment.awb_info || {};

        console.log(`[17TRACK AWB] Sync check: number=${item.number}, latestStatus=${latestStatus}, origin=${awbInfo.origin_iata}, dest=${awbInfo.destination_iata}`);

        // Map 17track status to MAWB status
        const statusMap: Record<string, string> = {
          'NotFound': 'pending',
          'Booked': 'confirmed',
          'Received': 'warehouse_in',
          'InTransit': 'departed',
          'Arrived': 'arrived',
          'Notified': 'arrived',
          'Delivered': 'arrived',
        };

        if (latestStatus || awbInfo.origin_iata || awbInfo.destination_iata) {
          const update: any = { lastActivity: new Date().toISOString() };

          if (awbInfo.origin_iata) update.origin = awbInfo.origin_iata;
          if (awbInfo.destination_iata) update.destination = awbInfo.destination_iata;

          if (statusMap[latestStatus]) {
            update.status = statusMap[latestStatus];
          }

          // Also check latest tracking event for ARR/DEP status codes
          if (!update.status) {
            const trackingInfos = shipment.awb_tracking_infos || [];
            const lastEvent = trackingInfos[trackingInfos.length - 1];
            if (lastEvent?.status_code === 'ARR') update.status = 'arrived';
            else if (lastEvent?.status_code === 'DEP') update.status = 'departed';
          }

          // Extract flight dates from transport info
          const transportInfos = shipment.awb_transport_infos || [];
          if (transportInfos.length > 0) {
            const firstLeg = transportInfos[0];
            if (firstLeg.atd && !update.atd) update.atd = new Date(firstLeg.atd).toISOString();
            if (firstLeg.ata && !update.ata) update.ata = new Date(firstLeg.ata).toISOString();
          }

          await db.update(mawbs).set(update).where(eq(mawbs.mawbNo, cleanNumber));
          console.log(`[17TRACK AWB] Synced ${cleanNumber}: status=${update.status || 'unchanged'}`);
        }
      }
    } catch (syncErr: any) {
      console.error('[17TRACK AWB] Sync error:', syncErr.message);
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 17TRACK AWB Webhook for tracking push updates
app.all('/api/webhook/17track', async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['sign'] || '';
  const rawBody = JSON.stringify(req.body);
  const expectedSign = require('crypto').createHash('sha256').update(rawBody + '/' + TRACK_API_KEY).digest('hex');
  if (signature && signature !== expectedSign) {
    console.error('[17TRACK WEBHOOK] Invalid signature');
    return res.status(200).json({ code: 0, message: 'accepted' });
  }

  const now = new Date().toISOString();
  console.log(`[17TRACK WEBHOOK] ${req.method} event=${req.body?.event} at ${now}`);

  if (req.method === 'POST') {
    const body = req.body;
    const event = body.event;
    const data = body.data || {};

    // Extract AWB number (always with dash: 123-12345678 format)
    const awbNumber = data.number || '';
    if (!awbNumber) {
      return res.status(200).json({ code: 0, message: 'no tracking number' });
    }

    if (event === 'AWB_STOPPED') {
      console.log(`[17TRACK WEBHOOK] AWB ${awbNumber} stopped (${data.icao || ''})`);
      return res.status(200).json({ code: 0, message: 'accepted' });
    }

    // Find the MAWB by awbNumber (with dash)
    const [existing] = await db.select().from(mawbs)
      .where(eq(mawbs.mawbNo, awbNumber))
      .limit(1);

    if (!existing) {
      console.log(`[17TRACK WEBHOOK] No MAWB found for ${awbNumber}`);
      return res.status(200).json({ code: 0, message: 'no matching MAWB' });
    }

    const update: any = { lastActivity: now };

    // Process tracking info from AWB_UPDATED event
    const trackInfo = data.track_info || {};
    const shipment = trackInfo.shipment || {};
    const trackingInfos = shipment.awb_tracking_infos || [];

    if (trackingInfos.length > 0) {
      // Map AWB tracking infos to our tracking logs format
      const newLogs = trackingInfos.map((t: any) => ({
        time: t.date || '',
        status: t.status_code || '',
        description: t.description || '',
        location: t.station || '',
        flight_no: t.flight_no || '',
        pieces: t.pieces || 0,
        weight: t.weight || 0,
      }));

      // Merge with existing tracking logs
      const existingLogs = (typeof existing.trackingLogs === 'string'
        ? JSON.parse(existing.trackingLogs)
        : existing.trackingLogs) || [];
      const mergedLogs = [...existingLogs, ...newLogs];
      const seen = new Set();
      update.trackingLogs = mergedLogs.filter((log: any) => {
        const key = `${log.time}|${log.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Update MAWB status based on latest tracking event
    const awbInfo = shipment.awb_info || {};
    const latestStatus = shipment.latest_status?.status || awbInfo.status || '';
    if (latestStatus === 'Delivered') {
      if (!update.status) update.status = 'arrived';
    }

    await db.update(mawbs).set(update).where(eq(mawbs.id, existing.id));
    console.log(`[17TRACK WEBHOOK] Updated AWB ${awbNumber}: status=${update.status || 'unchanged'}, logs=${update.trackingLogs?.length || 0}`);
  }

  res.status(200).json({ code: 0, message: 'accepted' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});
