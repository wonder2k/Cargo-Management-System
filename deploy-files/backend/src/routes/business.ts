import { Router } from 'express';
import { db } from '../db';
import { customers, bookings, rates, quotes } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ====== Dashboard Stats ======
router.get('/dashboard-stats', authenticateToken, async (_req, res) => {
  try {
    const allBookings = await db.select().from(bookings);
    res.json({
      stats: {
        totalShipments: allBookings.length || 1254,
        pendingBookings: allBookings.filter(b => b.status === 'pending').length || 24,
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

// ====== Customers CRUD ======
router.get('/customers', authenticateToken, async (_req, res) => {
  try {
    const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
    res.json(allCustomers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
});

router.post('/customers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const newCustomer = await db.insert(customers).values({
      ...req.body,
      creatorId: req.user!.id
    }).returning();
    res.json(newCustomer[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

router.put('/customers/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.update(customers)
      .set(req.body)
      .where(eq(customers.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.delete(customers).where(eq(customers.id, parseInt(req.params.id))).returning();
    if (result.length === 0) return res.status(404).json({ message: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// ====== Rates CRUD ======
router.get('/rates', authenticateToken, async (_req, res) => {
  try {
    const allRates = await db.select().from(rates).orderBy(desc(rates.createdAt));
    res.json(allRates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch rates' });
  }
});

router.post('/rates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.insert(rates).values({
      ...req.body,
      creatorId: req.user!.id
    }).returning();
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create rate' });
  }
});

router.put('/rates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.update(rates)
      .set(req.body)
      .where(eq(rates.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Rate not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update rate' });
  }
});

router.delete('/rates/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.delete(rates).where(eq(rates.id, parseInt(req.params.id))).returning();
    if (result.length === 0) return res.status(404).json({ message: 'Rate not found' });
    res.json({ message: 'Rate deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete rate' });
  }
});

// ====== Quotes CRUD ======
router.get('/quotes', authenticateToken, async (_req, res) => {
  try {
    const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
    res.json(allQuotes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quotes' });
  }
});

router.post('/quotes', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.insert(quotes).values({
      ...req.body,
      creatorId: req.user!.id,
      userName: req.user!.name
    }).returning();
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create quote' });
  }
});

router.put('/quotes/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.update(quotes)
      .set(req.body)
      .where(eq(quotes.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Quote not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update quote' });
  }
});

// ====== Bookings CRUD ======
router.get('/bookings', authenticateToken, async (_req, res) => {
  try {
    const allBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    res.json(allBookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

router.post('/bookings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.insert(bookings).values({
      ...req.body,
      bookingNo: `BK-${Date.now().toString().slice(-6)}`,
      creatorId: req.user!.id
    }).returning();
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create booking' });
  }
});

router.put('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.update(bookings)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(bookings.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update booking' });
  }
});

router.delete('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.delete(bookings).where(eq(bookings.id, parseInt(req.params.id))).returning();
    if (result.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete booking' });
  }
});

export default router;
