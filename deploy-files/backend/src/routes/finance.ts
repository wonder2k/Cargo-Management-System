import { Router } from 'express';
import { db } from '../db';
import { accountsReceivable } from '../db/schema';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/ar', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const allAR = await db.select().from(accountsReceivable);
  res.json(allAR);
});

export default router;
