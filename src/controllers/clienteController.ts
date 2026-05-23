import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';

// ── Obtener todos los clientes ────────────────────────────────────────────────
export const obtenerClientes = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [rows] = await pool.query('SELECT * FROM clientes');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

// ── Obtener un cliente por ID ─────────────────────────────────────────────────
export const obtenerClientePorId = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM clientes WHERE id = ?',
            [id]
        );
        const clientes = rows as { id: number }[];

        if (clientes.length === 0) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        res.status(200).json(clientes[0]);
    } catch (error) {
        next(error);
    }
};

// ── Guardar un nuevo cliente ──────────────────────────────────────────────────
export const guardarCliente = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { numero_documento, nombre, apellidos, telefono, direccion, ciudad, email, radicado } = req.body;
        await pool.query(
            'INSERT INTO clientes (numero_documento, nombre, apellidos, telefono, direccion, ciudad, email, radicado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [numero_documento, nombre, apellidos, telefono, direccion, ciudad, email, radicado]
        );
        res.status(201).json({ message: 'Cliente guardado exitosamente' });
    } catch (error) {
        next(error);
    }
};

// ── Actualizar un cliente ─────────────────────────────────────────────────────
export const actualizarCliente = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { numero_documento, nombre, apellidos, telefono, direccion, ciudad, email, radicado } = req.body;

        const [result] = await pool.query(
            `UPDATE clientes
             SET numero_documento = ?, nombre = ?, apellidos = ?,
                 telefono = ?, direccion = ?, ciudad = ?, email = ?, radicado = ?
             WHERE id = ?`,
            [numero_documento, nombre, apellidos, telefono, direccion ?? null, ciudad ?? null, email ?? null, radicado ?? null, id]
        );

        const updateResult = result as { affectedRows: number };
        if (updateResult.affectedRows === 0) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Cliente actualizado exitosamente' });
    } catch (error) {
        next(error);
    }
};

// ── Eliminar un cliente ───────────────────────────────────────────────────────
export const eliminarCliente = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM clientes WHERE id = ?',
            [id]
        );

        const deleteResult = result as { affectedRows: number };
        if (deleteResult.affectedRows === 0) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Cliente eliminado exitosamente' });
    } catch (error) {
        next(error);
    }
};
