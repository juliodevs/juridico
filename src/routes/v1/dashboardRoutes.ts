import express from 'express';
import { auth } from '../../middleware/auth';
import { getDashboardStats } from '../../controllers/dashboardController';

const router = express.Router();

// Requiere autenticación JWT (no requiere admin — cualquier usuario autenticado puede ver el dashboard)
router.use(auth);

router.get('/dashboard/stats', getDashboardStats);

export default router;
