-- ============================================================
-- Migración 003: Tabla de configuración dinámica
-- Almacena toda la configuración del despacho.
-- Los campos con es_secreto=TRUE se guardan cifrados con AES-256-CBC.
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion (
    id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    clave      VARCHAR(100)    NOT NULL UNIQUE COMMENT 'Clave única de configuración',
    valor      TEXT            NULL     COMMENT 'Valor (cifrado si es_secreto=TRUE)',
    es_secreto BOOLEAN         NOT NULL DEFAULT FALSE COMMENT 'TRUE → valor cifrado en BD',
    descripcion VARCHAR(255)   NULL     COMMENT 'Descripción legible para el panel admin',
    updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed: todas las claves predefinidas del sistema ─────────────────────────
-- INSERT IGNORE salta filas que ya existen (idempotente — seguro re-ejecutar)
INSERT IGNORE INTO configuracion (clave, valor, es_secreto, descripcion) VALUES

-- Correo saliente (SMTP)
('smtp_host',       NULL,    FALSE, 'Servidor SMTP (ej: smtp.gmail.com)'),
('smtp_port',       '587',   FALSE, 'Puerto SMTP (generalmente 587 para TLS o 465 para SSL)'),
('smtp_seguridad',  'tls',   FALSE, 'Tipo de seguridad: tls o ssl'),
('smtp_usuario',    NULL,    FALSE, 'Correo con el que se autentifica en el servidor SMTP'),
('smtp_password',   NULL,    TRUE,  'Contraseña o app-password del correo SMTP'),
('email_from',      NULL,    FALSE, 'Nombre y correo del remitente (ej: Despacho <info@despacho.com>)'),
('email_destinatarios', NULL, FALSE, 'Correos adicionales que reciben copia de alertas (separados por coma)'),

-- WhatsApp
('whatsapp_numero',    NULL,   FALSE, 'Número WhatsApp del despacho con código de país (ej: 573001234567)'),
('whatsapp_plantilla', 'Recordatorio de audiencia para el proceso {{radicado}} del cliente {{cliente}}. Fecha: {{fecha_audiencia}}. Estado: {{estado}}.', FALSE, 'Plantilla de mensaje. Variables: {{radicado}}, {{cliente}}, {{fecha_audiencia}}, {{estado}}'),
('whatsapp_activo',    'false', FALSE, 'Activar envío de links WhatsApp: true o false'),

-- Alertas automáticas
('alerta_dias_anticipacion', '3',     FALSE, 'Días de anticipación para enviar alerta de audiencia'),
('alerta_hora',              '08:00', FALSE, 'Hora de ejecución del cron de alertas (formato HH:MM)'),
('alerta_email_activo',      'true',  FALSE, 'Enviar alerta por correo: true o false'),
('alerta_whatsapp_activo',   'false', FALSE, 'Enviar alerta por WhatsApp: true o false'),

-- Datos del despacho
('despacho_nombre',    NULL, FALSE, 'Nombre del despacho jurídico'),
('despacho_direccion', NULL, FALSE, 'Dirección física del despacho'),
('despacho_telefono',  NULL, FALSE, 'Teléfono de contacto del despacho'),
('despacho_logo_url',  NULL, FALSE, 'URL del logotipo del despacho (para correos y reportes)');
