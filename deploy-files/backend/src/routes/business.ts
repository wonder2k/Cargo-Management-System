import { Router } from 'express';
import { db } from '../db';
import { customers } from '../db/schema';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/customers', authenticateToken, async (req, res) => {
  const allCustomers = await db.select().from(customers);
  res.json(allCustomers);
});

router.post('/customers', authenticateToken, async (req: any, res) => {
  const newCustomer = await db.insert(customers).values({
    ...req.body,
    creatorId: req.user.id
  }).returning();
  res.json(newCustomer[0]);
});

export default router;
