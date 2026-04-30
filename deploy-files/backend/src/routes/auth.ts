import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (!user || !(await argon2.verify(user.passwordHash, password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000,
  });

  res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } });
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
