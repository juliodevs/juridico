/**
 * emailService — Envío de correos electrónicos via Nodemailer.
 *
 * Lee la configuración SMTP en tiempo de ejecución desde configService,
 * por lo que refleja cambios del panel admin sin reiniciar el servidor.
 *
 * SEGURIDAD: las credenciales SMTP nunca se loguean ni se devuelven al cliente.
 */

import nodemailer from 'nodemailer';
import { getConfig } from './configService';

export interface EmailResult {
    enviado: boolean;
    messageId?: string;
}

/**
 * Envía un correo electrónico usando la configuración SMTP almacenada en BD.
 *
 * @param para    - Dirección de destino
 * @param asunto  - Asunto del correo
 * @param htmlBody - Contenido HTML del correo
 * @throws Error descriptivo si la configuración SMTP está incompleta
 */
export async function enviarNotificacion(
    para: string,
    asunto: string,
    htmlBody: string
): Promise<EmailResult> {
    const config = await getConfig();

    // Validar configuración mínima
    if (!config['smtp_host']) {
        throw new Error(
            'El servidor SMTP no está configurado. Ve al panel de administración → Correo saliente.'
        );
    }
    if (!config['smtp_usuario'] || !config['smtp_password']) {
        throw new Error(
            'Las credenciales SMTP están incompletas. Configura smtp_usuario y smtp_password.'
        );
    }

    const port = parseInt(config['smtp_port'] || '587', 10);
    const secure = config['smtp_seguridad'] === 'ssl'; // true → puerto 465; false → TLS/STARTTLS

    const transporter = nodemailer.createTransport({
        host: config['smtp_host'],
        port,
        secure,
        auth: {
            user: config['smtp_usuario'],
            pass: config['smtp_password'],
        },
        // Para Gmail con TLS en puerto 587
        ...(config['smtp_seguridad'] === 'tls' && {
            tls: { rejectUnauthorized: true },
        }),
    });

    const info = await transporter.sendMail({
        from: config['email_from'] || config['smtp_usuario'],
        to: para,
        subject: asunto,
        html: htmlBody,
    });

    return { enviado: true, messageId: info.messageId };
}
