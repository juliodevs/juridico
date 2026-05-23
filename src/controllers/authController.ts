import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import pool from '../db/pool';
import { env } from '../config/env';

interface UsuarioRow {
    id: number;
    nombre: string;
    email: string;
    password_hash: string;
    rol: 'admin' | 'abogado';
    activo: boolean;
}

/**
 * POST /api/v1/auth/login
 * Autentica un usuario por email y contraseña.
 * Devuelve un JWT firmado si las credenciales son válidas.
 *
 * Seguridad:
 * - Mensaje de error genérico (no revela si el email existe o no)
 * - Verifica que la cuenta esté activa antes de generar el token
 * - Nunca devuelve password_hash al cliente
 */
export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email y contraseña son requeridos' });
            return;
        }

        // Buscar usuario — solo campos necesarios, sin datos sensibles adicionales
        const [rows] = await pool.query(
            'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
            [email]
        );

        const usuarios = rows as UsuarioRow[];

        // Respuesta genérica para no revelar si el email existe o no
        if (usuarios.length === 0) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const usuario = usuarios[0];

        if (!usuario.activo) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        // Payload del JWT — solo datos necesarios para autorización
        const payload = {
            id: usuario.id,
            email: usuario.email,
            rol: usuario.rol,
        };

        const signOptions: SignOptions = {
            expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
        };
        const token = jwt.sign(payload, env.jwt.secret, signOptions);

        // Nunca devolver password_hash en la respuesta
        res.status(200).json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
            },
        });
    } catch (error) {
        next(error);
    }
};
