import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

/**
 * GET /api/v1/dashboard/stats
 * Devuelve las 4 métricas principales para el panel de control.
 * No requiere rol admin — todos los usuarios autenticados pueden verlo.
 */
export const getDashboardStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [rows] = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM clientes)                              AS total_clientes,
                (SELECT COUNT(*) FROM procesos WHERE estado = 'activo')      AS procesos_activos,
                (SELECT COUNT(*) FROM procesos
                 WHERE fecha_audiencia BETWEEN CURDATE()
                       AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                   AND estado = 'activo')                                    AS audiencias_proximas,
                (SELECT COUNT(*) FROM procesos
                 WHERE updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
                   AND estado = 'activo')                                    AS procesos_sin_actualizar
        `);

        const stats = (rows as Record<string, number>[])[0] ?? {};

        res.status(200).json({
            total_clientes:          Number(stats['total_clientes']          ?? 0),
            procesos_activos:        Number(stats['procesos_activos']        ?? 0),
            audiencias_proximas:     Number(stats['audiencias_proximas']     ?? 0),
            procesos_sin_actualizar: Number(stats['procesos_sin_actualizar'] ?? 0),
        });
    } catch (error) {
        next(error);
    }
};
