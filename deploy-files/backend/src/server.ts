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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
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
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/operation', operationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running at http://0.0.0.0:${PORT}`);
});