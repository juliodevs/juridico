/**
 * Tests unitarios — emailService
 *
 * Usa vi.mock para evitar llamadas reales a Nodemailer y a configService.
 * Verifica que:
 * - Se lanza error si smtp_host está vacío
 * - Se lanza error si faltan credenciales SMTP
 * - Con config válida, se llama sendMail y se devuelve { enviado: true }
 * - Las credenciales SMTP nunca aparecen en la respuesta al cliente
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (deben declararse ANTES del import del módulo bajo test) ─────────────

// Mock de configService
vi.mock('../services/configService', () => ({
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    invalidarCache: vi.fn(),
}));

// Mock de nodemailer
const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
    default: {
        createTransport: vi.fn(() => ({
            sendMail: sendMailMock,
        })),
    },
}));

import { enviarNotificacion } from '../services/emailService';
import { getConfig } from '../services/configService';

// ── Helper ────────────────────────────────────────────────────────────────────
function configValida() {
    return {
        smtp_host:      'smtp.test.com',
        smtp_port:      '587',
        smtp_seguridad: 'tls',
        smtp_usuario:   'user@test.com',
        smtp_password:  'password123',
        email_from:     'despacho@test.com',
    };
}

describe('emailService — enviarNotificacion', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        sendMailMock.mockResolvedValue({ messageId: 'test-id-123' });
    });

    it('lanza error cuando smtp_host está vacío', async () => {
        vi.mocked(getConfig).mockResolvedValue({ ...configValida(), smtp_host: '' });
        await expect(
            enviarNotificacion('dest@test.com', 'Asunto', '<p>cuerpo</p>')
        ).rejects.toThrow(/SMTP/i);
    });

    it('lanza error cuando smtp_usuario está vacío', async () => {
        vi.mocked(getConfig).mockResolvedValue({ ...configValida(), smtp_usuario: '' });
        await expect(
            enviarNotificacion('dest@test.com', 'Asunto', '<p>cuerpo</p>')
        ).rejects.toThrow(/credenciales/i);
    });

    it('lanza error cuando smtp_password está vacío', async () => {
        vi.mocked(getConfig).mockResolvedValue({ ...configValida(), smtp_password: '' });
        await expect(
            enviarNotificacion('dest@test.com', 'Asunto', '<p>cuerpo</p>')
        ).rejects.toThrow(/credenciales/i);
    });

    it('devuelve { enviado: true } con configuración válida', async () => {
        vi.mocked(getConfig).mockResolvedValue(configValida());
        const result = await enviarNotificacion('dest@test.com', 'Asunto prueba', '<p>HTML</p>');
        expect(result.enviado).toBe(true);
        expect(result.messageId).toBe('test-id-123');
    });

    it('llama sendMail con los parámetros correctos', async () => {
        vi.mocked(getConfig).mockResolvedValue(configValida());
        await enviarNotificacion('dest@test.com', 'Mi asunto', '<b>contenido</b>');
        expect(sendMailMock).toHaveBeenCalledOnce();
        const callArgs = sendMailMock.mock.calls[0][0] as Record<string, string>;
        expect(callArgs.to).toBe('dest@test.com');
        expect(callArgs.subject).toBe('Mi asunto');
        expect(callArgs.html).toBe('<b>contenido</b>');
    });

    it('la respuesta { enviado, messageId } no contiene credenciales SMTP', async () => {
        vi.mocked(getConfig).mockResolvedValue(configValida());
        const result = await enviarNotificacion('dest@test.com', 'Asunto', '<p>HTML</p>');
        const resultStr = JSON.stringify(result);
        expect(resultStr).not.toContain('password123');
        expect(resultStr).not.toContain('smtp_password');
    });
});
