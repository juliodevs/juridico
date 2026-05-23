/**
 * Interfaz de dominio para la tabla de configuración dinámica.
 * Los valores con es_secreto=true se almacenan cifrados en BD.
 */
export interface Configuracion {
    id?: number;
    clave: string;
    valor: string;
    es_secreto: boolean;
    descripcion?: string;
    updated_at?: Date;
}

/**
 * Claves predefinidas del sistema de configuración.
 */
export type ClavesConfiguracion =
    // SMTP
    | 'smtp_host'
    | 'smtp_port'
    | 'smtp_seguridad'
    | 'smtp_usuario'
    | 'smtp_password'
    | 'email_from'
    | 'email_destinatarios'
    // WhatsApp
    | 'whatsapp_numero'
    | 'whatsapp_plantilla'
    | 'whatsapp_activo'
    // Alertas
    | 'alerta_dias_anticipacion'
    | 'alerta_hora'
    | 'alerta_email_activo'
    | 'alerta_whatsapp_activo'
    // Datos del despacho
    | 'despacho_nombre'
    | 'despacho_direccion'
    | 'despacho_telefono'
    | 'despacho_logo_url';
