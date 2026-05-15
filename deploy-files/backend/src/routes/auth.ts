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
    tier: user.tier,
    regions: user.regions || [],
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

    const user = Array.isArray(newUser) ? newUser[0] : newUser;
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

      const inserted = Array.isArray(admin) ? admin[0] : admin;
      setAuthCookies(req, res, inserted);
      return res.json({ user: { id: inserted.id, email: inserted.email, role: inserted.role, status: inserted.status, name: inserted.name, tier: inserted.tier } });
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
  res.clearCookie('accessToken', { path: '/' });
  res.json({ message: 'Logged out' });
});

// 5. Get current profile (full user from DB, not just JWT payload)
router.get('/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });
    const u = rows[0];
    res.json({
      id: u.id, email: u.email, name: u.name,
      role: u.role, status: u.status, tier: u.tier,
      companyName: u.companyName, phone: u.phone,
      contactPerson: u.contactPerson, avatarUrl: u.avatarUrl,
      regions: u.regions, warehouses: u.warehouses,
    });
  } catch { res.status(500).json({ message: 'Failed to fetch profile' }); }
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

// 7. Update user (admin approve/reject + profile editing)
router.put('/users/:id', authenticateToken, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const isAdmin = req.user?.role === 'admin';

  try {
    const updateData: any = {};
    // Accept ALL safe profile fields
    const profileFields = ['name', 'companyName', 'phone', 'contactPerson', 'avatarUrl', 'regions', 'warehouses'];
    for (const field of profileFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    // Admin-only fields
    if (isAdmin) {
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.status) updateData.status = req.body.status;
      if (req.body.tier !== undefined) updateData.tier = req.body.tier;
    }

    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, parseInt(id)))
      .returning();

    if (result.length === 0) return res.status(404).json({ message: 'User not found' });
    const user = Array.isArray(result) ? result[0] : result;
    res.json({
      id: user.id, email: user.email, name: user.name,
      role: user.role, status: user.status, tier: user.tier,
      companyName: user.companyName, phone: user.phone,
      contactPerson: user.contactPerson, avatarUrl: user.avatarUrl,
      regions: user.regions, warehouses: user.warehouses,
    });
  } catch (error) {
    console.error('[Auth] Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

export default router;
