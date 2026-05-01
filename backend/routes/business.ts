import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.get('/rates', authenticateToken, (req, res) => res.json([]));
router.get('/quotes', authenticateToken, (req, res) => res.json([]));
router.get('/customers', authenticateToken, (req, res) => res.json([]));
export default router;
