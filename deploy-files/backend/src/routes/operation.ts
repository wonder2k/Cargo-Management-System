import { Router } from 'express';
import { db } from '../db';
import { mawbs, bookings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all MAWBs (with optional status filter)
router.get('/mawbs', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.select().from(mawbs);

    if (status) {
      query = query.where(eq(mawbs.status, status as string)) as any;
    }

    const allMawbs = await (query as any).orderBy(desc(mawbs.createdAt));
    res.json(allMawbs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching mawbs' });
  }
});

// CREATE a new MAWB
router.post('/mawbs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const newMawb = await db.insert(mawbs).values({
      ...req.body,
      mawbNo: req.body.mawbNo || `MAWB-${Date.now().toString().slice(-6)}`,
    }).returning();
    res.status(201).json(newMawb[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create MAWB' });
  }
});

// UPDATE MAWB status (and linked booking)
router.post('/mawbs/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, ...rest } = req.body;

  try {
    const [mawb] = await db.select().from(mawbs).where(eq(mawbs.id, parseInt(id)));
    if (!mawb) return res.status(404).json({ message: 'MAWB not found' });

    await db.update(mawbs).set({
      status,
      ...rest,
      updatedAt: new Date(),
    }).where(eq(mawbs.id, parseInt(id)));

    // If associated booking exists, update it too
    if (mawb.bookingNo) {
      await db.update(bookings).set({ status, updatedAt: new Date() }).where(eq(bookings.bookingNo, mawb.bookingNo));
    }

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

// GET tracking by MAWB number
router.get('/tracking/:mawbNo', authenticateToken, async (req, res) => {
  try {
    const [mawb] = await db.select().from(mawbs).where(eq(mawbs.mawbNo, req.params.mawbNo));
    if (!mawb) return res.status(404).json({ message: 'MAWB not found' });

    res.json({
      mawbNo: mawb.mawbNo,
      status: mawb.status,
      trackingLogs: mawb.trackingLogs || [],
      origin: mawb.origin,
      destination: mawb.destination,
      flightNo: mawb.flightNo,
      flightDate: mawb.flightDate,
      atd: mawb.atd,
      ata: mawb.ata,
      lastActivity: mawb.lastActivity,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tracking' });
  }
});

export default router;
