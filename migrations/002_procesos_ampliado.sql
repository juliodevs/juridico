-- ============================================================
-- Migración 002: Ampliar tabla procesos
-- Agrega campos necesarios para alertas y ciclo de vida del proceso.
-- ============================================================

ALTER TABLE procesos
    ADD COLUMN fecha_audiencia DATE NULL COMMENT 'Fecha de la próxima audiencia (NULL si no aplica)',
    ADD COLUMN estado ENUM('activo', 'cerrado', 'suspendido') NOT NULL DEFAULT 'activo' COMMENT 'Estado actual del proceso',
    ADD COLUMN notificado BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE si ya se envió notificación de audiencia próxima',
    ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última modificación del registro';

-- Índice para acelerar la consulta del cron job de alertas
CREATE INDEX idx_procesos_audiencia ON procesos (fecha_audiencia, notificado, estado);
