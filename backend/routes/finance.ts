import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.get('/ar', authenticateToken, (req, res) => res.json([]));
export default router;
