import { Router } from 'express';
import { db } from '../db';
import { customers } from '../db/schema';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    // In a real app we would query the DB for these
    res.json({
      stats: {
        totalShipments: 1254,
        pendingBookings: 24,
        activeOperations: 45,
        monthlyRevenue: 854300,
        revenueGrowth: 12.5,
        shipmentGrowth: 8.2
      },
      recentOperations: [
        { key: '1', no: 'MAWB-2025001', flow: 'PVG - FRA', status: 'In Transit', date: '2025-05-01' },
        { key: '2', no: 'MAWB-2025002', flow: 'HKG - LAX', status: 'Completed', date: '2025-05-01' },
        { key: '3', no: 'MAWB-2025003', flow: 'CAN - AMS', status: 'Draft', date: '2025-05-02' },
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

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
