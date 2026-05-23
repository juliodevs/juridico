import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

// ── Obtener todos los procesos ────────────────────────────────────────────────
export const obtenerProcesos = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [rows] = await pool.query(`
            SELECT p.idproceso, p.sujetosProcesales, p.radicado, p.juzgado,
                   CONCAT(c.nombre, ' ', c.apellidos) AS nombreCompletoCliente
            FROM procesos p
            LEFT JOIN clientes c ON p.idCliente = c.id
        `);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

// ── Guardar un nuevo proceso ──────────────────────────────────────────────────
export const guardarProceso = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { sujetosProcesales, radicado, juzgado, idCliente } = req.body;
        await pool.query(
            'INSERT INTO procesos (sujetosProcesales, radicado, juzgado, idCliente) VALUES (?, ?, ?, ?)',
            [sujetosProcesales, radicado, juzgado, idCliente]
        );
        res.status(201).json({ message: 'Proceso guardado exitosamente' });
    } catch (error) {
        next(error);
    }
};
