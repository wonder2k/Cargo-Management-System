import { Router } from 'express';
import { db } from '../db';
import { mawbs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/mawbs', authenticateToken, async (req, res) => {
  const allMawbs = await db.select().from(mawbs);
  res.json(allMawbs);
});

router.patch('/mawbs/:id', authenticateToken, async (req, res) => {
  const updated = await db.update(mawbs)
    .set(req.body)
    .where(eq(mawbs.id, parseInt(req.params.id)))
    .returning();
  res.json(updated[0]);
});

export default router;
