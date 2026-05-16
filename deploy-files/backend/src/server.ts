import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

import authRoutes from './routes/auth';
import businessRoutes from './routes/business';
import operationRoutes from './routes/operation';
import financeRoutes from './routes/finance';
import uploadRoutes from './routes/upload';

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
    const response = await fetch(`${TRACK_API_BASE}/register`, {
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});