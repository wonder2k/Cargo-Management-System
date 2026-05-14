import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, authorizeRole, AuthRequest } from '../middleware/auth';

const router = Router();

const setAuthCookies = (req: any, res: any, user: any) => {
  const userPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    name: user.name,
    tier: user.tier
  };

  const accessToken = jwt.sign(
    userPayload,
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '24h' }
  );

  // Only set Secure flag when actual HTTPS connection
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 86400000, // 24 hours
  });
};

// 1. Register (POST /api/auth/register)
router.post('/register', async (req, res) => {
  const { email, password, name, companyName, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if user exists
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await argon2.hash(password);

    // First user to register gets admin role and auto-approved
    const userCountResult = await db.select({ count: users.id }).from(users);
    const isFirstUser = userCountResult.length === 0;

    const newUser = await db.insert(users).values({
      email,
      passwordHash,
      name: name || email.split('@')[0],
      role: isFirstUser ? 'admin' : 'viewer',
      status: isFirstUser ? 'approved' : 'pending',
      companyName: companyName || null,
      phone: phone || null,
    }).returning();

    const user = newUser[0];
    setAuthCookies(req, res, user);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        tier: user.tier
      },
      message: isFirstUser
        ? 'Admin account created successfully'
        : 'Registration successful. Awaiting admin approval.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 2. Demo Login (POST /api/auth/demo-login)
router.post('/demo-login', async (_req, res) => {
  const demoUser = {
    id: 999,
    email: 'demo@jcargo.com',
    name: 'Demo User',
    role: 'admin',
    status: 'approved',
    tier: 10
  };

  setAuthCookies(_req, res, demoUser);
  res.json({ message: 'Demo Login Success', user: demoUser });
});

// 3. Standard Login (POST /api/auth/login)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Bootstrap admin login (only works if no users in DB)
  try {
    const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
    const isEmpty = existingUsers.length === 0;
    console.log(`[Auth] Login attempt for ${email}, DB empty: ${isEmpty}`);

    if (email === 'wonder2k@gmail.com' && password === 'admin123' && isEmpty) {
      const passwordHash = await argon2.hash('admin123');
      const admin = await db.insert(users).values({
        email: 'wonder2k@gmail.com',
        passwordHash,
        name: 'Super Admin',
        role: 'admin',
        status: 'approved',
        tier: 10,
      }).returning();

      setAuthCookies(req, res, admin[0]);
      return res.json({ user: { id: admin[0].id, email: admin[0].email, role: admin[0].role, status: admin[0].status, name: admin[0].name, tier: admin[0].tier } });
    }
  } catch (e) {
    console.error('[Auth] Bootstrap login error:', e);
    // Fall through to normal login if DB query fails
  }

  try {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Account pending approval. Contact your administrator.' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Account registration was rejected.' });
    }

    setAuthCookies(req, res, user);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        tier: user.tier
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login Error' });
  }
});

// 4. Logout
router.post('/logout', (_req, res) => {
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out' });
});

// 5. Get current profile
router.get('/profile', authenticateToken, (req: AuthRequest, res) => {
  res.json(req.user);
});

// 6. List all users (admin only)
router.get('/users', authenticateToken, authorizeRole(['admin']), async (_req, res) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      tier: users.tier,
      companyName: users.companyName,
      phone: users.phone,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// 7. Update user (admin approve/reject/change role)
router.put('/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { role, status, tier } = req.body;

  try {
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (tier !== undefined) updateData.tier = tier;

    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        status: users.status,
        tier: users.tier,
      });

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

export default router;
