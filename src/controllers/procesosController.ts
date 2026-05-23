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
        const { sujetosProcesales, radicado, juzgado, idCliente, fecha_audiencia, estado } = req.body;
        await pool.query(
            `INSERT INTO procesos (sujetosProcesales, radicado, juzgado, idCliente, fecha_audiencia, estado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [sujetosProcesales, radicado, juzgado, idCliente, fecha_audiencia ?? null, estado ?? 'activo']
        );
        res.status(201).json({ message: 'Proceso guardado exitosamente' });
    } catch (error) {
        next(error);
    }
};

// ── Actualizar un proceso ─────────────────────────────────────────────────────
export const actualizarProceso = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { sujetosProcesales, radicado, juzgado, idCliente, fecha_audiencia, estado } = req.body;

        const [result] = await pool.query(
            `UPDATE procesos
             SET sujetosProcesales = ?, radicado = ?, juzgado = ?,
                 idCliente = ?, fecha_audiencia = ?, estado = ?,
                 notificado = FALSE
             WHERE idproceso = ?`,
            [sujetosProcesales, radicado, juzgado, idCliente, fecha_audiencia ?? null, estado ?? 'activo', id]
        );

        const updateResult = result as { affectedRows: number };
        if (updateResult.affectedRows === 0) {
            res.status(404).json({ error: 'Proceso no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Proceso actualizado exitosamente' });
    } catch (error) {
        next(error);
    }
};

// ── Eliminar un proceso ───────────────────────────────────────────────────────
export const eliminarProceso = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM procesos WHERE idproceso = ?',
            [id]
        );

        const deleteResult = result as { affectedRows: number };
        if (deleteResult.affectedRows === 0) {
            res.status(404).json({ error: 'Proceso no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Proceso eliminado exitosamente' });
    } catch (error) {
        next(error);
    }
};
