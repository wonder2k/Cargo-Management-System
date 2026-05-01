import { Router } from 'express';
import { db } from '../db';
import { accountsReceivable } from '../db/schema';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/ar', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const allAR = await db.select().from(accountsReceivable);
  res.json(allAR);
});

router.post('/ar', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const result = await db.insert(accountsReceivable).values(req.body).returning();
  res.json(result[0]);
});

router.put('/ar/:id', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const result = await db.update(accountsReceivable).set(req.body).where(eq(accountsReceivable.id, parseInt(req.params.id))).returning();
  res.json(result[0]);
});

router.get('/ap', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const allAP = await db.select().from(accountsPayable);
  res.json(allAP);
});

router.post('/ap', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const result = await db.insert(accountsPayable).values(req.body).returning();
  res.json(result[0]);
});

router.get('/invoices', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const allInvoices = await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  res.json(allInvoices);
});

router.post('/invoices', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const result = await db.insert(invoices).values(req.body).returning();
  res.json(result[0]);
});

router.put('/invoices/:id', authenticateToken, authorizeRole(['admin', 'finance']), async (req, res) => {
  const result = await db.update(invoices).set(req.body).where(eq(invoices.id, parseInt(req.params.id))).returning();
  res.json(result[0]);
});

export default router;
