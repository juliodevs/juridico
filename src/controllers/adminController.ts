import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { getConfig, updateConfig } from '../services/configService';
import { enviarNotificacion } from '../services/emailService';

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface ConfigRow {
    id: number;
    clave: string;
    valor: string | null;
    es_secreto: boolean;
    descripcion: string | null;
}

// ── Configuración ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/configuracion
 * Devuelve todas las claves de configuración.
 * SEGURIDAD: los campos con es_secreto=TRUE se devuelven como '****'.
 * Nunca se envían los valores reales al cliente.
 */
export const getConfiguracion = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [rows] = await pool.query(
            'SELECT id, clave, valor, es_secreto, descripcion FROM configuracion ORDER BY clave'
        );
        const configRows = rows as ConfigRow[];

        const configuracion = configRows.map((row) => ({
            id: row.id,
            clave: row.clave,
            // Nunca exponer valores secretos al cliente
            valor: row.es_secreto && row.valor ? '****' : (row.valor ?? ''),
            es_secreto: row.es_secreto,
            descripcion: row.descripcion ?? '',
        }));

        res.status(200).json(configuracion);
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/v1/admin/configuracion
 * Recibe un objeto { clave: "valor", ... } y actualiza cada clave.
 * configService.updateConfig cifra automáticamente los campos secretos.
 *
 * Responde 207 si alguna clave no existe (parcialmente actualizado).
 * Responde 200 si todas las claves se actualizaron correctamente.
 */
export const updateConfiguracion = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const updates = req.body as Record<string, string>;
        const claves = Object.keys(updates);

        if (claves.length === 0) {
            res.status(400).json({ error: 'No se enviaron claves para actualizar' });
            return;
        }

        const errores: string[] = [];

        for (const clave of claves) {
            try {
                await updateConfig(clave, updates[clave] ?? '');
            } catch (err) {
                errores.push(`${clave}: ${(err as Error).message}`);
            }
        }

        if (errores.length > 0) {
            res.status(207).json({
                message: 'Algunas claves no se pudieron actualizar',
                actualizadas: claves.length - errores.length,
                errores,
            });
            return;
        }

        res.status(200).json({
            message: 'Configuración actualizada exitosamente',
            actualizadas: claves.length,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/admin/configuracion/test-email
 * Envía un correo de prueba usando la configuración SMTP actual.
 * Valida campos mínimos antes de intentar el envío.
 */
export const testEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const config = await getConfig();

        // Validar configuración mínima antes de intentar enviar
        const camposFaltantes: string[] = [];
        if (!config['smtp_host'])     camposFaltantes.push('smtp_host');
        if (!config['smtp_port'])     camposFaltantes.push('smtp_port');
        if (!config['smtp_usuario'])  camposFaltantes.push('smtp_usuario');
        if (!config['smtp_password']) camposFaltantes.push('smtp_password');
        if (!config['email_from'])    camposFaltantes.push('email_from');

        if (camposFaltantes.length > 0) {
            res.status(400).json({
                error: 'Configuración SMTP incompleta',
                camposFaltantes,
            });
            return;
        }

        // Destinatario: el solicitante (req.user.email) o email_from como fallback
        const destinatario = req.user?.email ?? config['email_from'];

        await enviarNotificacion(
            destinatario,
            '✅ Correo de prueba — Sistema de Gestión Jurídica',
            `
            <div style="font-family: Arial, sans-serif; max-width: 500px;">
                <h2 style="color: #1a56db;">¡Configuración SMTP correcta!</h2>
                <p>Este correo confirma que la configuración de correo saliente
                   del <strong>Sistema de Gestión Jurídica</strong> funciona correctamente.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                    Servidor: ${config['smtp_host']}:${config['smtp_port']} (${config['smtp_seguridad'] || 'tls'})
                </p>
            </div>
            `
        );

        res.status(200).json({
            message: `Correo de prueba enviado exitosamente a ${destinatario}`,
            smtp_host: config['smtp_host'],
        });
    } catch (error) {
        next(error);
    }
};

// ── Usuarios ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/usuarios
 * Lista todos los usuarios. Nunca devuelve password_hash.
 */
export const getUsuarios = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [rows] = await pool.query(
            'SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC'
        );
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/admin/usuarios
 * Crea un nuevo usuario. Hashea la contraseña con bcrypt (saltRounds: 12).
 */
export const createUsuario = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { nombre, email, password, rol } = req.body;

        // Verificar email único
        const [existing] = await pool.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        if ((existing as { id: number }[]).length > 0) {
            res.status(409).json({ error: 'Ya existe un usuario con ese email' });
            return;
        }

        const password_hash = await bcrypt.hash(password as string, 12);

        await pool.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, TRUE)',
            [nombre, email, password_hash, rol ?? 'abogado']
        );

        res.status(201).json({ message: 'Usuario creado exitosamente' });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/v1/admin/usuarios/:id
 * Actualiza nombre, email, rol y estado activo de un usuario.
 */
export const updateUsuario = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, email, rol, activo } = req.body;

        const [result] = await pool.query(
            'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ? WHERE id = ?',
            [nombre, email, rol, activo, id]
        );

        const updateResult = result as { affectedRows: number };
        if (updateResult.affectedRows === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/admin/usuarios/:id
 * Soft delete: marca activo=FALSE. No elimina el registro.
 * Restricción: un admin no puede desactivar su propia cuenta.
 */
export const deleteUsuario = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const requestingUserId = req.user?.id;

        // Prevenir auto-desactivación
        if (requestingUserId !== undefined && Number(id) === requestingUserId) {
            res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
            return;
        }

        const [result] = await pool.query(
            'UPDATE usuarios SET activo = FALSE WHERE id = ?',
            [id]
        );

        const updateResult = result as { affectedRows: number };
        if (updateResult.affectedRows === 0) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
        next(error);
    }
};
