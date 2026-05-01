import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const setAuthCookies = (res: any, user: any) => {
  const userPayload = { id: user.id, email: user.email, role: user.role, name: user.name, tier: user.tier };
  
  const accessToken = jwt.sign(
    userPayload,
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '24h' }
  );

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400000,
  });
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Special Channel for Demo and Admin
  if (email === 'demo@jcargo.com' || (email === 'wonder2k@gmail.com' && password === 'admin123')) {
    const demoUser = {
      id: email === 'wonder2k@gmail.com' ? 1 : 999,
      email: email,
      name: email === 'wonder2k@gmail.com' ? 'Super Admin' : 'Demo User',
      role: 'admin',
      tier: 10
    };
    setAuthCookies(res, demoUser);
    return res.json({ user: demoUser });
  }

  // Regular login logic (if user exists in DB)
  try {
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    // Simple password check for preview (normally use argon2)
    // For this preview version, we'll favor the special channel above
    return res.status(401).json({ message: 'Only predefined accounts are active in this preview.' });
  } catch (error) {
    res.status(500).json({ message: 'Login Error' });
  }
});

router.post('/demo-login', async (req, res) => {
  const demoUser = { id: 999, email: 'demo@jcargo.com', name: 'Demo User', role: 'admin', tier: 10 };
  setAuthCookies(res, demoUser);
  res.json({ user: demoUser });
});

router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out' });
});

router.get('/profile', authenticateToken, (req: any, res) => {
  res.json(req.user);
});

export default router;
