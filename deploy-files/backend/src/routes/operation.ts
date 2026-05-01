import { Router } from 'express';
import { db } from '../db';
import { mawbs, bookings } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/mawbs', authenticateToken, async (req, res) => {
  try {
    const allMawbs = await db.select().from(mawbs).orderBy(desc(mawbs.createdAt));
    res.json(allMawbs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching mawbs' });
  }
});

router.post('/mawbs/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, ...rest } = req.body;
  
  try {
    const [mawb] = await db.select().from(mawbs).where(eq(mawbs.id, parseInt(id)));
    if (!mawb) return res.status(404).json({ message: 'MAWB not found' });

    // Update MAWB
    await db.update(mawbs).set({ 
      status, 
      ...rest,
    }).where(eq(mawbs.id, parseInt(id)));

    // If associated booking exists, update it too
    if (mawb.bookingId) {
      await db.update(bookings).set({ status }).where(eq(bookings.id, mawb.bookingId));
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

export default router;
