/**
 * alertasAudiencias — Cron job diario de alertas de audiencias próximas.
 *
 * Busca procesos con fecha_audiencia dentro de los próximos N días
 * (configurable desde el panel admin) y envía notificaciones.
 *
 * Después de notificar, marca el proceso con notificado=TRUE para no
 * volver a enviar la misma alerta. Se resetea a FALSE cuando se actualiza
 * la fecha de audiencia (lógica en procesosController).
 */

import cron from 'node-cron';
import pool from '../db/pool';
import { getConfig } from '../services/configService';
import { notificar } from '../services/notificationService';

interface ProcesoAudiencia {
    idproceso: number;
    radicado: string;
    sujetosProcesales: string;
    fecha_audiencia: Date;
    estado: string;
    nombreCliente: string | null;
}

/**
 * Ejecuta la búsqueda de audiencias próximas y envía notificaciones.
 * Se puede llamar directamente para pruebas manuales.
 */
export async function ejecutarAlertas(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔔 Ejecutando cron de alertas de audiencias...`);

    try {
        const config = await getConfig();
        const diasAnticipacion = parseInt(
            config['alerta_dias_anticipacion'] || '3',
            10
        );

        // Buscar procesos activos con audiencia próxima no notificados aún
        const [rows] = await pool.query(
            `SELECT
                p.idproceso,
                p.radicado,
                p.sujetosProcesales,
                p.fecha_audiencia,
                p.estado,
                CONCAT(c.nombre, ' ', c.apellidos) AS nombreCliente
             FROM procesos p
             LEFT JOIN clientes c ON p.idCliente = c.id
             WHERE p.fecha_audiencia BETWEEN CURDATE()
                AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
               AND p.notificado = FALSE
               AND p.estado = 'activo'`,
            [diasAnticipacion]
        );

        const procesos = rows as ProcesoAudiencia[];

        if (procesos.length === 0) {
            console.log(
                `[alertas] Sin audiencias próximas en los próximos ${diasAnticipacion} día(s).`
            );
            return;
        }

        console.log(
            `[alertas] ${procesos.length} proceso(s) con audiencia próxima. Notificando...`
        );

        let notificados = 0;

        for (const proceso of procesos) {
            const fecha = new Date(proceso.fecha_audiencia).toLocaleDateString(
                'es-CO',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            );

            const asunto = `⚖️ Recordatorio: Audiencia del proceso ${proceso.radicado} — ${fecha}`;

            const htmlBody = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1a56db;">Recordatorio de Audiencia</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; font-weight: bold; width: 40%;">Radicado:</td>
                            <td style="padding: 8px;">${proceso.radicado}</td>
                        </tr>
                        <tr style="background: #f9f9f9;">
                            <td style="padding: 8px; font-weight: bold;">Sujetos procesales:</td>
                            <td style="padding: 8px;">${proceso.sujetosProcesales}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold;">Cliente:</td>
                            <td style="padding: 8px;">${proceso.nombreCliente ?? 'N/A'}</td>
                        </tr>
                        <tr style="background: #f9f9f9;">
                            <td style="padding: 8px; font-weight: bold;">Fecha de audiencia:</td>
                            <td style="padding: 8px; color: #e02424; font-weight: bold;">${fecha}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-weight: bold;">Estado:</td>
                            <td style="padding: 8px;">${proceso.estado}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">
                        Este es un mensaje automático del Sistema de Gestión Jurídica.
                    </p>
                </div>
            `;

            const resultado = await notificar(
                {
                    radicado: proceso.radicado,
                    nombreCliente: proceso.nombreCliente ?? undefined,
                    fecha_audiencia: proceso.fecha_audiencia,
                    estado: proceso.estado,
                },
                asunto,
                htmlBody
            );

            // Marcar notificado=TRUE aunque haya habido errores de entrega
            // (para evitar re-envíos repetidos con config incorrecta)
            await pool.query(
                'UPDATE procesos SET notificado = TRUE WHERE idproceso = ?',
                [proceso.idproceso]
            );

            notificados++;

            if (resultado.errores.length > 0) {
                console.warn(
                    `[alertas] Proceso ${proceso.radicado}: advertencias de notificación:`,
                    resultado.errores.join(' | ')
                );
            } else {
                console.log(
                    `[alertas] ✉️  Proceso ${proceso.radicado}: email=${resultado.emailEnviado}, whatsapp=${resultado.whatsappLink ? 'link generado' : 'inactivo'}`
                );
            }
        }

        console.log(`[alertas] ✅ ${notificados} proceso(s) notificados.`);
    } catch (error) {
        // Nunca dejar que el cron rompa el servidor
        console.error('[alertas] ❌ Error en cron de alertas:', error);
    }
}

/**
 * Inicializa el cron job leyendo la hora configurada en BD.
 * Si la config no está disponible, usa 08:00 como fallback.
 */
export async function iniciarAlertasAudiencias(): Promise<void> {
    let cronPattern = '0 8 * * *'; // Default: 08:00 todos los días

    try {
        const config = await getConfig();
        const alertaHora = config['alerta_hora'] || '08:00';
        const [hora, minuto] = alertaHora.split(':').map(Number);

        if (!isNaN(hora) && !isNaN(minuto) && hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
            cronPattern = `${minuto} ${hora} * * *`;
        }
    } catch (err) {
        console.warn('[alertas] No se pudo leer hora de config, usando 08:00:', err);
    }

    cron.schedule(cronPattern, ejecutarAlertas, {
        timezone: 'America/Bogota',
    });

    console.log(`⏰ Cron de alertas de audiencias iniciado — patrón: "${cronPattern}" (America/Bogota)`);
}
