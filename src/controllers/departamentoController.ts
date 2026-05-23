import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

// ── Obtener todos los departamentos (con búsqueda opcional) ──────────────────
export const obtenerDepartamentos = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { query } = req.query;

        if (query) {
            const [rows] = await pool.query(
                'SELECT * FROM departamentos WHERE nombre LIKE ?',
                [`%${query}%`]
            );
            res.status(200).json(rows);
        } else {
            const [rows] = await pool.query('SELECT * FROM departamentos');
            res.status(200).json(rows);
        }
    } catch (error) {
        next(error);
    }
};

// ── Obtener ciudades por departamento ─────────────────────────────────────────
export const obtenerCiudadesPorDepartamento = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { departamentoId } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM ciudades WHERE departamento_id = ?',
            [departamentoId]
        );
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};
