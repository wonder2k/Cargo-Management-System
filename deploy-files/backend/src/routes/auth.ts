import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Helper to generate and set token cookie
const setAuthCookie = (res: any, user: any) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600000, // 1 hour
  });
};

router.post('/demo-login', async (req, res) => {
  // Return a static demo user
  const demoUser = {
    id: 999, // Static ID for demo
    email: 'demo@jcargo.com',
    name: 'Demo User',
    role: 'admin',
    tier: 10
  };

  setAuthCookie(res, demoUser);
  res.json({ user: demoUser });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Handle Demo login via regular login form
  if (email === 'demo@jcargo.com' || (email.startsWith('demo') && password === 'password')) {
    const demoUser = { id: 999, email: 'demo@jcargo.com', name: 'Demo User', role: 'admin', tier: 10 };
    setAuthCookie(res, demoUser);
    return res.json({ user: demoUser });
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  setAuthCookie(res, user);
  res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, tier: user.tier } });
});

router.get('/profile', authenticateToken, async (req: any, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user.id) });
  res.json(user);
});

router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out' });
});

export default router;
