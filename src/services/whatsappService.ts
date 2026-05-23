/**
 * whatsappService — Generación de links wa.me con mensaje pre-rellenado.
 *
 * No envía mensajes directamente (WhatsApp no tiene API pública gratuita).
 * Genera un link que el usuario puede hacer clic para abrir la conversación.
 *
 * Variables disponibles en la plantilla:
 *   {{radicado}}        → número de radicado del proceso
 *   {{cliente}}         → nombre completo del cliente
 *   {{fecha_audiencia}} → fecha formateada
 *   {{estado}}          → estado del proceso
 */

import { getConfig } from './configService';

export interface ProcesoParaWhatsApp {
    radicado: string;
    nombreCliente?: string;
    fecha_audiencia?: Date | string | null;
    estado?: string;
}

/**
 * Genera un link wa.me con el mensaje de la plantilla configurada.
 *
 * @returns URL completa de WhatsApp, o null si WhatsApp no está activo
 *          o el número no está configurado.
 */
export async function generarLink(
    proceso: ProcesoParaWhatsApp
): Promise<string | null> {
    const config = await getConfig();

    // Respetar el switch de activación
    if (config['whatsapp_activo'] !== 'true') return null;

    const numero = config['whatsapp_numero']?.replace(/[^0-9]/g, '');
    if (!numero) return null;

    const plantilla =
        config['whatsapp_plantilla'] ||
        'Recordatorio de audiencia para el proceso {{radicado}} del cliente {{cliente}}. Fecha: {{fecha_audiencia}}. Estado: {{estado}}.';

    // Formatear fecha en español (Colombia)
    let fechaFormateada = 'No programada';
    if (proceso.fecha_audiencia) {
        const fecha = new Date(proceso.fecha_audiencia);
        if (!isNaN(fecha.getTime())) {
            fechaFormateada = fecha.toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
    }

    const mensaje = plantilla
        .replace(/\{\{radicado\}\}/g, proceso.radicado)
        .replace(/\{\{cliente\}\}/g, proceso.nombreCliente || 'Cliente')
        .replace(/\{\{fecha_audiencia\}\}/g, fechaFormateada)
        .replace(/\{\{estado\}\}/g, proceso.estado || 'activo');

    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
