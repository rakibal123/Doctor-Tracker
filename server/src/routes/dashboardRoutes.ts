import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

// Protect all dashboard endpoints with JWT authentication middleware
router.use(requireAuth);

router.get('/stats', getDashboardStats);

export default router;
