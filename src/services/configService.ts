/**
 * configService — Gestión de configuración dinámica del despacho.
 *
 * Lee la tabla `configuracion` de la BD, descifra los campos sensibles
 * (es_secreto=TRUE) usando AES-256-CBC, y cachea el resultado 5 minutos.
 *
 * SEGURIDAD:
 * - La clave de cifrado viene de ENCRYPTION_KEY (env.encryptionKey), 32 bytes.
 * - Cada valor secreto se cifra con un IV aleatorio → mismo texto produce
 *   ciphertexts distintos en cada escritura.
 * - Los valores descifrados NUNCA se envían al cliente; el controller
 *   los enmascara como '****'.
 */

import crypto from 'crypto';
import pool from '../db/pool';
import { env } from '../config/env';

interface ConfigRow {
    clave: string;
    valor: string | null;
    es_secreto: boolean;
}

export type ConfigMap = Record<string, string>;

// ── Caché en memoria ──────────────────────────────────────────────────────────
let cache: ConfigMap | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ── Cifrado AES-256-CBC ───────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // bytes

/**
 * Cifra un texto usando AES-256-CBC con IV aleatorio.
 * Formato del resultado: "iv_hex:ciphertext_hex"
 */
function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(env.encryptionKey, 'utf8');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descifra un texto en formato "iv_hex:ciphertext_hex".
 * Lanza error si el formato no es válido o la clave no coincide.
 */
function decrypt(encryptedText: string): string {
    const separatorIndex = encryptedText.indexOf(':');
    if (separatorIndex === -1) {
        throw new Error('Formato de valor cifrado inválido');
    }
    const ivHex = encryptedText.slice(0, separatorIndex);
    const ciphertextHex = encryptedText.slice(separatorIndex + 1);

    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const key = Buffer.from(env.encryptionKey, 'utf8');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Lee TODAS las claves de la tabla configuracion.
 * - Descifra los campos con es_secreto=TRUE.
 * - Cachea el resultado por 5 minutos.
 * - Si el descifrado falla (ej: ENCRYPTION_KEY cambió), retorna '' para esa clave.
 */
export async function getConfig(): Promise<ConfigMap> {
    const now = Date.now();
    if (cache !== null && now - cacheTimestamp < CACHE_TTL_MS) {
        return cache;
    }

    const [rows] = await pool.query(
        'SELECT clave, valor, es_secreto FROM configuracion'
    );
    const configRows = rows as ConfigRow[];

    const config: ConfigMap = {};

    for (const row of configRows) {
        if (row.valor === null || row.valor === '') {
            config[row.clave] = '';
            continue;
        }

        if (row.es_secreto) {
            try {
                config[row.clave] = decrypt(row.valor);
            } catch {
                // Valor cifrado corrupto o clave de cifrado cambiada → vacío
                config[row.clave] = '';
            }
        } else {
            config[row.clave] = row.valor;
        }
    }

    cache = config;
    cacheTimestamp = now;
    return config;
}

/**
 * Actualiza una clave de configuración.
 * - Si es_secreto=TRUE, cifra el valor antes de guardar.
 * - Invalida el caché para que la próxima lectura traiga datos frescos.
 * - Lanza error si la clave no existe (no crea claves nuevas por seguridad).
 */
export async function updateConfig(clave: string, valor: string): Promise<void> {
    const [rows] = await pool.query(
        'SELECT es_secreto FROM configuracion WHERE clave = ?',
        [clave]
    );
    const configRows = rows as { es_secreto: boolean }[];

    if (configRows.length === 0) {
        throw new Error(`Clave de configuración no encontrada: "${clave}"`);
    }

    const { es_secreto } = configRows[0];

    // Si el valor es vacío y el campo es secreto, guardamos NULL (no cifrado vacío)
    let valorAGuardar: string | null;
    if (valor === '' && es_secreto) {
        valorAGuardar = null;
    } else if (es_secreto) {
        valorAGuardar = encrypt(valor);
    } else {
        valorAGuardar = valor;
    }

    await pool.query(
        'UPDATE configuracion SET valor = ? WHERE clave = ?',
        [valorAGuardar, clave]
    );

    invalidarCache();
}

/**
 * Limpia el caché en memoria para forzar recarga en la próxima llamada.
 * Útil después de actualizaciones masivas.
 */
export function invalidarCache(): void {
    cache = null;
    cacheTimestamp = 0;
}
