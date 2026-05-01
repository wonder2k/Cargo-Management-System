import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Helper to set both access and refresh tokens in httpOnly cookies
const setAuthCookies = (res: any, user: any) => {
  const userPayload = { id: user.id, email: user.email, role: user.role };
  
  const accessToken = jwt.sign(
    userPayload,
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    userPayload,
    process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret',
    { expiresIn: '7d' }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 3600000, // 1 hour
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// 1. Demo Login Endpoint (POST /api/auth/demo-login)
router.post('/demo-login', async (req, res) => {
  // Static demo user data
  const demoUser = {
    id: 1,
    email: 'demo@jcargo.com',
    name: 'Demo User',
    role: 'admin',
    tier: 1
  };

  setAuthCookies(res, demoUser);
  res.json({ 
    message: 'Demo login successful',
    user: demoUser 
  });
});

// 2. Regular Login Endpoint (POST /api/auth/login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Auto-login for demo email or specific demo patterns
  if (email === 'demo@jcargo.com' || (email && email.includes('demo') && password === 'password')) {
    const demoUser = { id: 1, email: 'demo@jcargo.com', name: 'Demo User', role: 'admin', tier: 1 };
    setAuthCookies(res, demoUser);
    return res.json({ user: demoUser });
  }

  try {
    const user = await db.query.users.findFirst({ 
      where: eq(users.email, email) 
    });

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    setAuthCookies(res, user);
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        name: user.name,
        tier: user.tier 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. User Profile (GET /api/auth/profile)
router.get('/profile', authenticateToken, async (req: any, res) => {
  try {
    const user = await db.query.users.findFirst({ 
      where: eq(users.id, req.user.id) 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// 4. Logout (POST /api/auth/logout)
router.post('/logout', (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.json({ message: 'Logged out successfully' });
});

export default router;
