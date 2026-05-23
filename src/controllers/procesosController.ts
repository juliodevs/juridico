import { Request, Response, NextFunction } from 'express';
import pool from '../db/pool';
import { notificar } from '../services/notificationService';

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

        // ── Notificación (no bloqueante — un fallo aquí no cancela el guardado) ─
        let whatsappLink: string | null = null;
        let advertenciasNotificacion: string[] = [];

        try {
            // Obtener nombre del cliente para personalizar los mensajes
            const [clienteRows] = await pool.query(
                'SELECT CONCAT(nombre, " ", apellidos) AS nombreCliente FROM clientes WHERE id = ?',
                [idCliente]
            );
            const clientes = clienteRows as { nombreCliente: string }[];
            const nombreCliente = clientes[0]?.nombreCliente;

            const estadoProceso = (estado ?? 'activo') as string;
            const asunto = `Nuevo proceso registrado: ${radicado}`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #1a56db;">Proceso Registrado</h2>
                    <p><strong>Radicado:</strong> ${radicado}</p>
                    <p><strong>Cliente:</strong> ${nombreCliente ?? 'N/A'}</p>
                    <p><strong>Estado:</strong> ${estadoProceso}</p>
                    ${fecha_audiencia ? `<p><strong>Fecha de audiencia:</strong> ${fecha_audiencia}</p>` : ''}
                </div>
            `;

            const resultado = await notificar(
                { radicado, nombreCliente, fecha_audiencia: fecha_audiencia ?? null, estado: estadoProceso },
                asunto,
                htmlBody
            );
            whatsappLink = resultado.whatsappLink;
            advertenciasNotificacion = resultado.errores;
        } catch (notifError) {
            console.error('[procesos] Error en notificación al guardar proceso:', notifError);
        }

        res.status(201).json({
            message: 'Proceso guardado exitosamente',
            whatsappLink,
            ...(advertenciasNotificacion.length > 0 && { advertencias: advertenciasNotificacion }),
        });
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

        // ── Notificación (no bloqueante) ──────────────────────────────────────
        let whatsappLink: string | null = null;
        let advertenciasNotificacion: string[] = [];

        try {
            const [clienteRows] = await pool.query(
                'SELECT CONCAT(nombre, " ", apellidos) AS nombreCliente FROM clientes WHERE id = ?',
                [idCliente]
            );
            const clientes = clienteRows as { nombreCliente: string }[];
            const nombreCliente = clientes[0]?.nombreCliente;

            const estadoProceso = (estado ?? 'activo') as string;
            const asunto = `Proceso actualizado: ${radicado}`;
            const htmlBody = `
                <div style="font-family: Arial, sans-serif;">
                    <h2 style="color: #1a56db;">Proceso Actualizado</h2>
                    <p><strong>Radicado:</strong> ${radicado}</p>
                    <p><strong>Cliente:</strong> ${nombreCliente ?? 'N/A'}</p>
                    <p><strong>Estado:</strong> ${estadoProceso}</p>
                    ${fecha_audiencia ? `<p><strong>Fecha de audiencia:</strong> ${fecha_audiencia}</p>` : ''}
                </div>
            `;

            const resultado = await notificar(
                { radicado, nombreCliente, fecha_audiencia: fecha_audiencia ?? null, estado: estadoProceso },
                asunto,
                htmlBody
            );
            whatsappLink = resultado.whatsappLink;
            advertenciasNotificacion = resultado.errores;
        } catch (notifError) {
            console.error('[procesos] Error en notificación al actualizar proceso:', notifError);
        }

        res.status(200).json({
            message: 'Proceso actualizado exitosamente',
            whatsappLink,
            ...(advertenciasNotificacion.length > 0 && { advertencias: advertenciasNotificacion }),
        });
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
