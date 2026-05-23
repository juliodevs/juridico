import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autorización por rol.
 * Debe usarse DESPUÉS del middleware auth (requiere req.user ya verificado).
 * Responde 403 si el usuario autenticado no tiene rol 'admin'.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user || req.user.rol !== 'admin') {
        res.status(403).json({ error: 'Acceso restringido a administradores' });
        return;
    }
    next();
}
