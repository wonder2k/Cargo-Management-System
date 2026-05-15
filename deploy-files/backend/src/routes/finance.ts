import { Router } from 'express';
import { db } from '../db';
import { accountsReceivable, accountsPayable, invoices } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// ====== Accounts Receivable ======
router.get('/ar', authenticateToken, authorizeRole(['admin', 'finance']), async (_req, res) => {
  try {
    const allAR = await db.select().from(accountsReceivable).orderBy(desc(accountsReceivable.createdAt));
    res.json(allAR);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch AR' });
  }
});

router.post('/ar', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  try {
    const result = await db.insert(accountsReceivable).values(req.body).returning();
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create AR entry' });
  }
});

router.put('/ar/:id', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  try {
    const result = await db.update(accountsReceivable)
      .set(req.body)
      .where(eq(accountsReceivable.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'AR entry not found' });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update AR entry' });
  }
});

// ====== Accounts Payable ======
router.get('/ap', authenticateToken, authorizeRole(['admin', 'finance']), async (_req, res) => {
  try {
    const allAP = await db.select().from(accountsPayable).orderBy(desc(accountsPayable.createdAt));
    res.json(allAP);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch AP' });
  }
});

router.post('/ap', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  try {
    const result = await db.insert(accountsPayable).values(req.body).returning();
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create AP entry' });
  }
});

router.put('/ap/:id', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  try {
    const result = await db.update(accountsPayable)
      .set(req.body)
      .where(eq(accountsPayable.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'AP entry not found' });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update AP entry' });
  }
});

// ====== Invoices ======
router.get('/invoices', authenticateToken, authorizeRole(['admin', 'finance']), async (_req, res) => {
  try {
    const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
    res.json(allInvoices);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

router.post('/invoices', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  try {
    const result = await db.insert(invoices).values(req.body).returning();
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

router.put('/invoices/:id', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  try {
    const result = await db.update(invoices)
      .set(req.body)
      .where(eq(invoices.id, parseInt(req.params.id)))
      .returning();
    if (result.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update invoice' });
  }
});

// GET finance module summary stats (real data from DB)
router.get('/stats', authenticateToken, authorizeRole(['admin', 'finance']), async (_req, res) => {
  try {
    const [allAR, allAP] = await Promise.all([
      db.select().from(accountsReceivable),
      db.select().from(accountsPayable),
    ]);

    const totalAR = allAR.reduce((sum, ar) => sum + Number(ar.totalAmount || 0), 0);
    const totalAP = allAP.reduce((sum, ap) => sum + Number(ap.totalAmount || 0), 0);

    res.json({
      totalAR,
      totalAP,
      netProfit: totalAR - totalAP,
    });
  } catch {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
