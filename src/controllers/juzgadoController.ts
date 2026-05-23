import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

// ── Obtener todos los juzgados ────────────────────────────────────────────────
export const obtenerJuzgados = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [rows] = await pool.query(`
            SELECT j.*, d.nombre AS departamento, c.nombre AS ciudad
            FROM juzgados j
            JOIN departamentos d ON j.departamento_id = d.id
            JOIN ciudades c ON j.ciudad_id = c.id
        `);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

// ── Obtener un juzgado por ID ─────────────────────────────────────────────────
export const obtenerJuzgadoPorId = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT j.juzgado, j.juez, j.email, j.direccion, j.telefono,
                   d.nombre AS departamento, c.nombre AS ciudad
            FROM juzgados j
            JOIN departamentos d ON j.departamento_id = d.id
            JOIN ciudades c ON j.ciudad_id = c.id
            WHERE j.id = ?
        `, [id]);

        const juzgados = rows as { id: number }[];
        if (juzgados.length === 0) {
            res.status(404).json({ error: 'Juzgado no encontrado' });
            return;
        }
        res.status(200).json(juzgados[0]);
    } catch (error) {
        next(error);
    }
};

// ── Guardar un nuevo juzgado ──────────────────────────────────────────────────
export const guardarJuzgado = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { juzgado, juez, email, direccion, telefono, departamento, ciudad } = req.body;
        await pool.query(
            'INSERT INTO juzgados (juzgado, juez, email, direccion, telefono, departamento_id, ciudad_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [juzgado, juez, email, direccion, telefono, departamento, ciudad]
        );
        res.status(201).json({ message: 'Juzgado guardado exitosamente' });
    } catch (error) {
        next(error);
    }
};

// ── Actualizar un juzgado ─────────────────────────────────────────────────────
export const actualizarJuzgado = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { juzgado, juez, email, direccion, telefono, departamento, ciudad } = req.body;

        const [result] = await pool.query(
            `UPDATE juzgados
             SET juzgado = ?, juez = ?, email = ?,
                 direccion = ?, telefono = ?,
                 departamento_id = ?, ciudad_id = ?
             WHERE id = ?`,
            [juzgado, juez, email ?? null, direccion ?? null, telefono ?? null, departamento, ciudad, id]
        );

        const updateResult = result as { affectedRows: number };
        if (updateResult.affectedRows === 0) {
            res.status(404).json({ error: 'Juzgado no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Juzgado actualizado exitosamente' });
    } catch (error) {
        next(error);
    }
};

// ── Eliminar un juzgado ───────────────────────────────────────────────────────
export const eliminarJuzgado = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM juzgados WHERE id = ?',
            [id]
        );

        const deleteResult = result as { affectedRows: number };
        if (deleteResult.affectedRows === 0) {
            res.status(404).json({ error: 'Juzgado no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Juzgado eliminado exitosamente' });
    } catch (error) {
        next(error);
    }
};
