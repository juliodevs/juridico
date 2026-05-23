import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

// ── Obtener ciudades por nombre y/o departamento ──────────────────────────────
export const obtenerCiudades = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { query, departamentoId } = req.query;

        if (query) {
            const [rows] = await pool.query(
                'SELECT * FROM ciudades WHERE nombre LIKE ? AND departamento_id = ?',
                [`%${query}%`, departamentoId]
            );
            res.status(200).json(rows);
        } else {
            const [rows] = await pool.query(
                'SELECT * FROM ciudades WHERE departamento_id = ?',
                [departamentoId]
            );
            res.status(200).json(rows);
        }
    } catch (error) {
        next(error);
    }
};
