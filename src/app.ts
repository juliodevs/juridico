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

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Se omite en entorno de test para evitar 429 en suites con múltiples requests
if (process.env['NODE_ENV'] !== 'test') {
    /**
     * Limitador general: protege endpoints de negocio (auth, CRUD, dashboard).
     * Excluye las rutas del proxy Rama Judicial, que tienen su propio limitador.
     * 300 req / 15 min es suficiente para un despacho pequeño con varios usuarios.
     */
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.' },
        // Las consultas al proxy de Rama Judicial se excluyen: cada radicado
        // genera 2 peticiones y una consulta masiva puede sumar cientos de requests.
        skip: (req) => req.path.startsWith('/api/v1/rama-judicial'),
    });
    app.use(globalLimiter);

    /**
     * Limitador específico del proxy Rama Judicial.
     * Permite consultas masivas de hasta ~200 radicados (2 req × 200 = 400 req).
     * La ventana larga de 30 min coincide con la pausa natural entre consultas.
     */
    const ramaJudicialLimiter = rateLimit({
        windowMs: 30 * 60 * 1000,   // 30 minutos
        max: 500,                    // 500 proxy-calls por ventana (~250 radicados completos)
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Límite de consultas al proxy de Rama Judicial alcanzado. Espera 30 minutos.' },
    });
    app.use('/api/v1/rama-judicial', ramaJudicialLimiter);
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
