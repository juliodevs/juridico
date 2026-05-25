/**
 * app.ts — Configuración de la aplicación Express.
 *
 * Separado del arranque del servidor (index.ts) para que los tests
 * puedan importar `app` sin iniciar la BD ni el listener HTTP.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';

// ── Rutas v1 /api/v1 ──────────────────────────────────────────────────────────
import authRoutes         from './routes/v1/authRoutes';
import clienteRoutes      from './routes/v1/clienteRoutes';
import procesosRoutes     from './routes/v1/procesosRoutes';
import juzgadoRoutes      from './routes/v1/juzgadoRoutes';
import departamentoRoutes from './routes/v1/departamentoRoutes';
import ciudadRoutes       from './routes/v1/ciudadRoutes';
import adminRoutes        from './routes/v1/adminRoutes';
import dashboardRoutes    from './routes/v1/dashboardRoutes';
import ramaJudicialRoutes from './routes/v1/ramaJudicialRoutes';

const app = express();

// ── Seguridad HTTP ────────────────────────────────────────────────────────────
app.use(helmet());

// CORS: mismo origen en producción; :5173 y :3000 en desarrollo
const allowedOrigins =
    process.env['NODE_ENV'] === 'production'
        ? [`http://localhost:${process.env['PORT'] ?? '3000'}`]
        : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`Origen no permitido por CORS: ${origin}`));
            }
        },
        credentials: true,
    })
);

// ── Rate limiting global: 100 req / 15 min por IP ─────────────────────────────
// Se omite en entorno de test para evitar 429 en suites con múltiples requests
if (process.env['NODE_ENV'] !== 'test') {
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.' },
    });
    app.use(globalLimiter);
}

// ── Parseo de body ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API v1 ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',           authRoutes);
app.use('/api/v1/admin',          adminRoutes);
app.use('/api/v1/rama-judicial',  ramaJudicialRoutes);
app.use('/api/v1',       dashboardRoutes);
app.use('/api/v1',       clienteRoutes);
app.use('/api/v1',       procesosRoutes);
app.use('/api/v1',       juzgadoRoutes);
app.use('/api/v1',       departamentoRoutes);
app.use('/api/v1',       ciudadRoutes);

// ── Servir frontend Vue (solo producción) ─────────────────────────────────────
if (process.env['NODE_ENV'] === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

// ── Middleware global de errores (debe ir ÚLTIMO) ─────────────────────────────
app.use(errorHandler);

export default app;
