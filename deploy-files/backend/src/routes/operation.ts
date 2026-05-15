import { Router } from 'express';
import { db } from '../db';
import { mawbs, bookings, accountsReceivable, accountsPayable } from '../db/schema';
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
    res.status(201).json(Array.isArray(newMawb) ? newMawb[0] : newMawb);
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

// GET operation module stats (real data from DB)
router.get('/stats', authenticateToken, async (_req, res) => {
  try {
    const allMawbs = await db.select().from(mawbs);
    const activeFlights = allMawbs.filter(m =>
      ['pending', 'booked', 'confirmed', 'warehouse_in', 'customs', 'terminal_in', 'departed'].includes(m.status || '')
    ).length;
    const inCustoms = allMawbs.filter(m => m.status === 'customs').length;
    const inWarehouse = allMawbs.filter(m => m.status === 'warehouse_in').length;
    const bookedPending = allMawbs.filter(m => m.status === 'booked').length;

    res.json({ activeFlights, inCustoms, inWarehouse, bookedPending });
  } catch {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// CREATE MAWB FROM BOOKING (finalization)
router.post('/mawbs/from-booking', authenticateToken, async (req: AuthRequest, res) => {
  const { bookingNo, mawbNo, warehouseId, entryTime, weight, chargeableWeight, pieces, volume } = req.body;
  if (!bookingNo || !mawbNo) return res.status(400).json({ message: 'bookingNo and mawbNo required' });

  try {
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingNo, bookingNo));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const newMawb = await db.insert(mawbs).values({
      mawbNo,
      bookingNo,
      origin: booking.origin,
      destination: booking.destination,
      carrier: booking.carrier,
      flightNo: booking.flightNo,
      flightDate: booking.flightDate,
      status: 'booked',
      weight: weight || booking.weight,
      chargeableWeight: chargeableWeight || booking.weight,
      pieces: pieces || booking.pieces,
      volume: volume || booking.volume,
      warehouse: warehouseId,
      warehouseEntryTime: entryTime ? new Date(entryTime) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await db.update(bookings).set({
      status: 'finalized',
      mawbNo,
      updatedAt: new Date(),
    }).where(eq(bookings.bookingNo, bookingNo));

    res.status(201).json(Array.isArray(newMawb) ? newMawb[0] : newMawb);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create MAWB from booking' });
  }
});

// CLOSE MAWB AND TRANSFER TO FINANCE
router.post('/mawbs/:id/close', authenticateToken, async (req, res) => {
  try {
    const [mawb] = await db.select().from(mawbs).where(eq(mawbs.id, parseInt(req.params.id)));
    if (!mawb) return res.status(404).json({ message: 'MAWB not found' });
    if (mawb.status === 'closed') return res.status(400).json({ message: 'MAWB already closed' });

    // Find associated booking
    let booking: any = null;
    if (mawb.bookingNo) {
      [booking] = await db.select().from(bookings).where(eq(bookings.bookingNo, mawb.bookingNo));
    }
    if (!booking) return res.status(404).json({ message: 'Associated booking not found, cannot close MAWB' });

    // Update MAWB status
    await db.update(mawbs).set({ status: 'closed', updatedAt: new Date() }).where(eq(mawbs.id, parseInt(req.params.id)));

    // Calculate AR (receivable from customer)
    const cw = Number(mawb.chargeableWeight || mawb.weight || 0);
    const unitPrice = Number(booking.unitPrice || 0);
    const fuelSurcharge = Number(booking.fuelSurcharge || 0);
    const securityScreening = Number(booking.securityScreening || 0);
    const terminalHandling = Number(booking.terminalHandling || 0);
    const arAmount = (unitPrice + fuelSurcharge + securityScreening + terminalHandling) * cw;

    // Calculate AP (payable to carrier/vendor)
    const costPrice = Number(booking.costPrice || unitPrice * 0.85);
    const apAmount = (costPrice + fuelSurcharge + securityScreening + terminalHandling) * cw;

    // Create AR entry
    await db.insert(accountsReceivable).values({
      mawbId: mawb.id,
      customerId: booking.customerId,
      totalAmount: arAmount,
      currency: booking.currency || 'CNY',
      status: 'unpaid',
      lineItems: [
        { name: 'Air Freight', quantity: cw, unitPrice, amount: unitPrice * cw },
        { name: 'Fuel Surcharge', quantity: cw, unitPrice: fuelSurcharge, amount: fuelSurcharge * cw },
        { name: 'Security Screening', quantity: cw, unitPrice: securityScreening, amount: securityScreening * cw },
        { name: 'Terminal Handling', quantity: cw, unitPrice: terminalHandling, amount: terminalHandling * cw },
      ],
      createdAt: new Date(),
    });

    // Create AP entry
    await db.insert(accountsPayable).values({
      mawbId: mawb.id,
      vendorName: mawb.carrier || 'Carrier',
      totalAmount: apAmount,
      currency: booking.currency || 'CNY',
      status: 'pending',
      lineItems: [
        { name: 'Air Freight (Cost)', quantity: cw, unitPrice: costPrice, amount: costPrice * cw },
        { name: 'Fuel Surcharge', quantity: cw, unitPrice: fuelSurcharge, amount: fuelSurcharge * cw },
        { name: 'Security Screening', quantity: cw, unitPrice: securityScreening, amount: securityScreening * cw },
        { name: 'Terminal Handling', quantity: cw, unitPrice: terminalHandling, amount: terminalHandling * cw },
      ],
      createdAt: new Date(),
    });

    // Sync booking status
    if (mawb.bookingNo) {
      await db.update(bookings).set({ status: 'closed', updatedAt: new Date() }).where(eq(bookings.bookingNo, mawb.bookingNo));
    }

    res.json({ message: 'MAWB closed, AR/AP created' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to close MAWB' });
  }
});

export default router;
