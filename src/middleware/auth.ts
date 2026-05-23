import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/Usuario';
import { env } from '../config/env';

/**
 * Middleware de autenticación JWT.
 * - Extrae el token del header: Authorization: Bearer <token>
 * - Verifica y decodifica el token con JWT_SECRET
 * - Adjunta el payload a req.user para uso en controllers
 * - Responde 401 si el token está ausente, inválido o expirado
 */
export function auth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de autenticación requerido' });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Token de autenticación requerido' });
        return;
    }

    try {
        const payload = jwt.verify(token, env.jwt.secret) as JwtPayload;
        req.user = payload;
        next();
    } catch (_err) {
        // Mensaje genérico — no revelar si expiró o es inválido
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}
