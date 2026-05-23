import 'dotenv/config';
import { validateEnv } from './config/env';

// Valida variables de entorno al arrancar — termina el proceso si falta alguna
validateEnv();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { testConnection } from './db/pool';
import { errorHandler } from './middleware/errorHandler';

import clienteRoutes from './routes/clienteRoutes';
import procesosRoutes from './routes/procesosRoutes';
import departamentoRoutes from './routes/departamentoRoutes';
import ciudadRoutes from './routes/ciudadRoutes';
import juzgadoRoutes from './routes/juzgadoRoutes';

const app = express();

// ── Seguridad HTTP ────────────────────────────────────────────────────────────
app.use(helmet());

// CORS: solo permite el origen del frontend en desarrollo
const allowedOrigins =
    process.env['NODE_ENV'] === 'production'
        ? [] // En producción se configura según el dominio real
        : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
    cors({
        origin: (origin, callback) => {
            // Permite peticiones sin origen (ej: Postman, curl) en desarrollo
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
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas solicitudes desde esta IP. Intenta de nuevo en 15 minutos.',
    },
});
app.use(globalLimiter);

// ── Parseo de body ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ── Rutas de la API ───────────────────────────────────────────────────────────
app.use('/api', clienteRoutes);
app.use('/api', departamentoRoutes);
app.use('/api', ciudadRoutes);
app.use('/api', juzgadoRoutes);
app.use('/api', procesosRoutes);

// ── Ruta para servir el archivo HTML principal ────────────────────────────────
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Middleware global de errores (debe ir ÚLTIMO) ─────────────────────────────
app.use(errorHandler);

// ── Arranque del servidor ─────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

async function startServer(): Promise<void> {
    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`   Entorno: ${process.env['NODE_ENV'] ?? 'development'}`);
        });
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error);
        process.exit(1);
    }
}

startServer();
