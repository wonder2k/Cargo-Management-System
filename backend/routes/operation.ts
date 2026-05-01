import { Router } from 'express';
import { db } from '../db';
import { mawbs, bookings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Helper to seed some data if empty
const seedIfEmpty = async () => {
  const existing = await db.select().from(mawbs);
  if (existing.length === 0) {
    await db.insert(mawbs).values([
      { mawbNo: '999-12345678', origin: 'CAN', destination: 'FRA', carrier: 'LH', status: 'departed', weight: 450, pieces: 12 },
      { mawbNo: '999-87654321', origin: 'SZX', destination: 'ORD', carrier: 'CX', status: 'warehouse_in', weight: 1200, pieces: 45 },
      { mawbNo: '160-55667788', origin: 'PVG', destination: 'LHR', carrier: 'CA', status: 'pending', weight: 200, pieces: 5 }
    ]);
  }
};

router.get('/mawbs', authenticateToken, async (req, res) => {
  try {
    await seedIfEmpty();
    const allMawbs = await db.select().from(mawbs).orderBy(desc(mawbs.createdAt));
    res.json(allMawbs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching mawbs' });
  }
});

router.post('/mawbs/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, ...rest } = req.body;
  try {
    await db.update(mawbs).set({ status, ...rest }).where(eq(mawbs.id, parseInt(id)));
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

export default router;
