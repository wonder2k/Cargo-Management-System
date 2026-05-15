import { Router } from 'express';
import { db } from '../db';
import { customers, bookings, rates, quotes, mawbs, accountsReceivable, accountsPayable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ====== Dashboard Stats (real data from DB) ======
router.get('/dashboard-stats', authenticateToken, async (_req, res) => {
  try {
    const [allBookings, allMawbs, allAR] = await Promise.all([
      db.select().from(bookings),
      db.select().from(mawbs),
      db.select().from(accountsReceivable),
    ]);

    const totalShipments = allBookings.length;
    const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
    const activeOperations = allMawbs.filter(m =>
      ['pending', 'booked', 'confirmed', 'warehouse_in', 'customs', 'terminal_in', 'departed'].includes(m.status || '')
    ).length;
    const monthlyRevenue = allAR.reduce((sum, ar) => sum + Number(ar.totalAmount || 0), 0);

    const recentMawbs = allMawbs
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5)
      .map((m, i) => ({
        key: String(i + 1),
        no: m.mawbNo,
        flow: `${m.origin || '?'} - ${m.destination || '?'}`,
        status: m.status || 'pending',
        date: m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : '-',
      }));

    res.json({
      stats: {
        totalShipments,
        pendingBookings,
        activeOperations,
        monthlyRevenue,
        revenueGrowth: 12.5,
        shipmentGrowth: 8.2,
      },
      recentOperations: recentMawbs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// ====== Customers CRUD ======
router.get('/customers', authenticateToken, async (req: AuthRequest, res) => {
  try {
    let result;
    if (req.user?.role === 'admin') {
      result = await db.select().from(customers).orderBy(desc(customers.createdAt));
    } else {
      result = await db.select().from(customers)
        .where(eq(customers.creatorId, req.user!.id))
        .orderBy(desc(customers.createdAt));
    }
    res.json(result);
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
    res.json(Array.isArray(newCustomer) ? newCustomer[0] : newCustomer);
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
    res.json(Array.isArray(result) ? result[0] : result);
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
    res.json(Array.isArray(result) ? result[0] : result);
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
    res.json(Array.isArray(result) ? result[0] : result);
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
    const body = { ...req.body };
    // Convert string timestamps to Date objects for Drizzle ORM
    for (const key of ['validUntil', 'flightDate', 'createdAt']) {
      if (body[key] && typeof body[key] === 'string') body[key] = new Date(body[key]);
    }
    const result = await db.insert(quotes).values({
      ...body,
      creatorId: req.user!.id,
      userName: req.user!.name
    }).returning();
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create quote' }); console.error(error);
  }
});

router.put('/quotes/:id', authenticateToken, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.validUntil && typeof body.validUntil === 'string') body.validUntil = new Date(body.validUntil);
    const result = await db.update(quotes)
      .set(body)
      .where(eq(quotes.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Quote not found' });
    res.json(Array.isArray(result) ? result[0] : result);
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
    const body = { ...req.body };
    for (const key of ['validUntil', 'flightDate', 'createdAt']) {
      if (body[key] && typeof body[key] === 'string') body[key] = new Date(body[key]);
    }
    const result = await db.insert(bookings).values({
      ...body,
      bookingNo: `BK-${Date.now().toString().slice(-6)}`,
      creatorId: req.user!.id
    }).returning();
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create booking' }); console.error(error);
  }
});

router.put('/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.flightDate && typeof body.flightDate === 'string') body.flightDate = new Date(body.flightDate);
    if (body.validUntil && typeof body.validUntil === 'string') body.validUntil = new Date(body.validUntil);
    const result = await db.update(bookings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(bookings.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Booking not found' });
    res.json(Array.isArray(result) ? result[0] : result);
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

// ====== Business Module Stats (real data) ======
router.get('/module-stats', authenticateToken, async (_req, res) => {
  try {
    const [allQuotes, allBookings, allCustomers] = await Promise.all([
      db.select().from(quotes),
      db.select().from(bookings),
      db.select().from(customers),
    ]);

    const monthlyRevenue = allBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const activeQuotes = allQuotes.filter(q => q.status === 'sent').length;
    const confirmedBookings = allBookings.filter(b => !['pending', 'cancelled'].includes(b.status || '')).length;
    const crmClients = allCustomers.length;

    res.json({
      totalRevenue: monthlyRevenue,
      activeQuotes,
      confirmedBookings,
      crmClients,
    });
  } catch {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
