import { Request, Response, NextFunction } from 'express';

/**
 * Middleware global de manejo de errores (4 parámetros — Express lo detecta automáticamente).
 * - Loguea el stack trace en el servidor para debugging.
 * - NUNCA expone el stack trace al cliente.
 * - Responde siempre con un mensaje amigable.
 */
export function errorHandler(
    err: Error & { status?: number; statusCode?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Log completo del error en el servidor (nunca va al cliente)
    console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
    if (process.env['NODE_ENV'] !== 'production') {
        console.error(err.stack);
    }

    const statusCode = err.status ?? err.statusCode ?? 500;

    // Mensaje amigable al cliente — sin stack, sin detalles internos
    const mensaje =
        statusCode === 500
            ? 'Error interno del servidor. Intenta de nuevo más tarde.'
            : err.message;

    res.status(statusCode).json({
        error: mensaje,
    });
}
