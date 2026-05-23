/**
 * notificationService — Orquestador de notificaciones (Email + WhatsApp).
 *
 * Usa Promise.allSettled para que un fallo en email NO cancele la
 * generación del link WhatsApp, y viceversa.
 *
 * El llamador decide si los errores bloquean la operación principal.
 * La recomendación del proyecto es tratarlos como advertencias.
 */

import { enviarNotificacion } from './emailService';
import { generarLink, ProcesoParaWhatsApp } from './whatsappService';
import { getConfig } from './configService';

export interface NotificacionResult {
    emailEnviado: boolean;
    whatsappLink: string | null;
    errores: string[];
}

/**
 * Envía notificaciones de email y genera link WhatsApp para un proceso.
 *
 * @param proceso       - Datos del proceso para personalizar mensajes
 * @param asunto        - Asunto del correo
 * @param htmlBody      - Cuerpo HTML del correo
 * @param emailDestino  - Destinatario específico (si no se usa email_destinatarios de config)
 */
export async function notificar(
    proceso: ProcesoParaWhatsApp,
    asunto: string,
    htmlBody: string,
    emailDestino?: string
): Promise<NotificacionResult> {
    const config = await getConfig();

    // Determinar destinatario de email
    const destinatario =
        emailDestino ||
        config['email_destinatarios'] ||
        config['email_from'] ||
        '';

    // Ejecutar email y WhatsApp en paralelo — uno no bloquea al otro
    const [emailResult, whatsappResult] = await Promise.allSettled([
        // Solo intentar email si está activo y hay destinatario
        config['alerta_email_activo'] !== 'false' && destinatario
            ? enviarNotificacion(destinatario, asunto, htmlBody)
            : Promise.resolve({ enviado: false }),

        // WhatsApp siempre se intenta (generarLink ya verifica si está activo)
        generarLink(proceso),
    ]);

    const errores: string[] = [];

    if (emailResult.status === 'rejected') {
        errores.push(`Email: ${(emailResult.reason as Error).message}`);
    }
    if (whatsappResult.status === 'rejected') {
        errores.push(`WhatsApp: ${(whatsappResult.reason as Error).message}`);
    }

    return {
        emailEnviado:
            emailResult.status === 'fulfilled' && emailResult.value.enviado,
        whatsappLink:
            whatsappResult.status === 'fulfilled' ? whatsappResult.value : null,
        errores,
    };
}
