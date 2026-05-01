import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 统一设置 Cookie 的逻辑
const setAuthCookies = (res: any, user: any) => {
  const userPayload = { 
    id: user.id, 
    email: user.email, 
    role: user.role,
    name: user.name,
    tier: user.tier
  };
  
  const accessToken = jwt.sign(
    userPayload,
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '1h' }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 3600000, // 1小时
  });
};

// 1. 快速演示登录 (POST /api/auth/demo-login)
router.post('/demo-login', async (req, res) => {
  const demoUser = {
    id: 999,
    email: 'demo@jcargo.com',
    name: 'Demo User',
    role: 'admin',
    tier: 10
  };

  setAuthCookies(res, demoUser);
  console.log('Demo user logged in');
  res.json({ message: 'Demo Login Success', user: demoUser });
});

// 3. 标准登录 (POST /api/auth/login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 如果是 Demo 账号或预设管理员，走特殊通道
  if (email === 'demo@jcargo.com' || (email === 'wonder2k@gmail.com' && password === 'admin123')) {
    const demoUser = { 
      id: email === 'wonder2k@gmail.com' ? 100 : 999, 
      email: email, 
      name: email === 'wonder2k@gmail.com' ? 'Super Admin' : 'Demo User', 
      role: 'admin',
      tier: 10
    };
    setAuthCookies(res, demoUser);
    return res.json({ user: demoUser });
  }

  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    setAuthCookies(res, user);
    res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, tier: user.tier } });
  } catch (error) {
    res.status(500).json({ message: 'Login Error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out' });
});

router.get('/profile', authenticateToken, (req: any, res) => {
  res.json(req.user);
});

export default router;