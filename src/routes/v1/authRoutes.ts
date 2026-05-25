import express from 'express';
import rateLimit from 'express-rate-limit';
import { login } from '../../controllers/authController';

const router = express.Router();

/**
 * Rate limit estricto para login: máximo 5 intentos por IP en 15 minutos.
 * Se omite en entorno de test para evitar 429 en suites con múltiples requests.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    },
    skip: () => process.env['NODE_ENV'] === 'test',
});

// POST /api/v1/auth/login
router.post('/login', loginLimiter, login);

export default router;
