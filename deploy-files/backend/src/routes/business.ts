import { Router } from 'express';
import { db } from '../db';
import { customers, bookings, rates } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const allBookings = await db.select().from(bookings);
    res.json({
      stats: {
        totalShipments: allBookings.length || 1254,
        pendingBookings: 24,
        activeOperations: 45,
        monthlyRevenue: 854300,
        revenueGrowth: 12.5,
        shipmentGrowth: 8.2
      },
      recentOperations: [
        { key: '1', no: 'MAWB-2025001', flow: 'PVG - FRA', status: 'In Transit', date: '2025-05-01' },
        { key: '2', no: 'MAWB-2025002', flow: 'HKG - LAX', status: 'Completed', date: '2025-05-01' },
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

router.get('/rates', authenticateToken, async (req, res) => {
  const allRates = await db.select().from(rates);
  res.json(allRates);
});

router.post('/rates', authenticateToken, async (req, res) => {
  const result = await db.insert(rates).values(req.body).returning();
  res.json(result[0]);
});

router.get('/bookings', authenticateToken, async (req, res) => {
  const allBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  res.json(allBookings);
});

router.post('/bookings', authenticateToken, async (req: any, res) => {
  const result = await db.insert(bookings).values({
    ...req.body,
    bookingNo: `BK-${Date.now().toString().slice(-6)}`,
    creatorId: req.user.id
  }).returning();
  res.json(result[0]);
});

router.get('/quotes', authenticateToken, async (req, res) => {
  const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  res.json(allQuotes);
});

router.post('/quotes', authenticateToken, async (req: any, res) => {
  const result = await db.insert(quotes).values({
    ...req.body,
    creatorId: req.user.id,
    userName: req.user.name
  }).returning();
  res.json(result[0]);
});

export default router;
