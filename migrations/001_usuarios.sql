-- =============================================================
-- Migración 001 — Tabla de usuarios del sistema
-- Ejecutar: mysql -u root -p juridico < migrations/001_usuarios.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id          INT           NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(100)  NOT NULL,
    email       VARCHAR(255)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol         ENUM('admin', 'abogado') NOT NULL DEFAULT 'abogado',
    activo      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
