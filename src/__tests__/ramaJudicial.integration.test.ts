/**
 * Tests de integración — proxy Rama Judicial
 *   GET /api/v1/rama-judicial/proceso
 *   GET /api/v1/rama-judicial/actuaciones/:idProceso
 *
 * Verifica validaciones de entrada y el comportamiento del proxy:
 *   - parámetros inválidos → 400 sin llamar a la RJ
 *   - respuesta exitosa de la RJ → reenvía datos al cliente
 *   - error de red (timeout/sin respuesta) → 504
 *   - error HTTP de la RJ (4xx/5xx) → reenvía el mismo status
 *
 * No se realiza ninguna petición real a consultaprocesos.ramajudicial.gov.co:
 * axios se mockea completo dentro de cada test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/Usuario';

// ── vi.hoisted(): disponible dentro de vi.mock() factories ────────────────────
const { axiosGetMock } = vi.hoisted(() => ({
    axiosGetMock: vi.fn(),
}));

// Mock global de axios — intercepta todas las llamadas del controller
vi.mock('axios', async () => {
    const real = await vi.importActual<typeof import('axios')>('axios');
    return {
        ...real,
        default: {
            ...real.default,
            create: vi.fn().mockReturnValue({
                get: axiosGetMock,
            }),
        },
    };
});

// El controller importa pool indirectamente vía app → necesita mock igual que los demás
vi.mock('../db/pool', () => ({
    default: { query: vi.fn().mockResolvedValue([[]]), execute: vi.fn(), end: vi.fn() },
}));

vi.mock('../services/configService', () => ({
    getConfig:      vi.fn().mockResolvedValue({}),
    updateConfig:   vi.fn(),
    invalidarCache: vi.fn(),
}));

import app from '../app';

// ── Token de prueba ───────────────────────────────────────────────────────────
function tokenValido(): string {
    const payload: JwtPayload = { id: 1, email: 'abogado@test.com', rol: 'abogado' };
    return jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: '1h' });
}

// ── Respuesta típica de la Rama Judicial ──────────────────────────────────────
const procesoRJ = {
    idProceso:            12345,
    fechaUltimaActuacion: '2024-11-15',
    despacho:             'JUZGADO 01 CIVIL CIRCUITO MEDELLÍN',
    sujetosProcesales:    'DEMANDANTE: JUAN PÉREZ / DEMANDADO: EMPRESA S.A.',
};

const actuacionRJ = {
    actuacion:      'SENTENCIA',
    anotacion:      'Se profiere sentencia de segunda instancia...',
    fechaActuacion: '2024-11-15',
    isVisiblePublico: 'S',
};

// ── Suite: GET /proceso ───────────────────────────────────────────────────────

describe('GET /api/v1/rama-judicial/proceso', () => {

    beforeEach(() => vi.clearAllMocks());

    it('devuelve 401 sin token', async () => {
        const res = await request(app).get('/api/v1/rama-judicial/proceso?radicado=12345');
        expect(res.status).toBe(401);
    });

    it('devuelve 400 cuando falta el parámetro radicado', async () => {
        const res = await request(app)
            .get('/api/v1/rama-judicial/proceso')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        // No debe haber llamado a la Rama Judicial
        expect(axiosGetMock).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando radicado está vacío', async () => {
        const res = await request(app)
            .get('/api/v1/rama-judicial/proceso?radicado=   ')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(400);
        expect(axiosGetMock).not.toHaveBeenCalled();
    });

    it('devuelve 200 con los procesos cuando la RJ responde correctamente', async () => {
        axiosGetMock.mockResolvedValueOnce({
            data: { procesos: [procesoRJ] },
        });
        const res = await request(app)
            .get('/api/v1/rama-judicial/proceso?radicado=05001310300120230001')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('procesos');
        expect(Array.isArray(res.body.procesos)).toBe(true);
        expect(res.body.procesos[0]).toMatchObject({
            idProceso: 12345,
            despacho:  expect.any(String),
        });
    });

    it('devuelve 200 con array vacío cuando la RJ no encuentra el radicado', async () => {
        axiosGetMock.mockResolvedValueOnce({ data: { procesos: [] } });
        const res = await request(app)
            .get('/api/v1/rama-judicial/proceso?radicado=99999999999999999999')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(200);
        expect(res.body.procesos).toEqual([]);
    });

    it('reenvía el status HTTP cuando la RJ responde con error (403 rate-limit)', async () => {
        const axiosErr = Object.assign(new Error('Forbidden'), {
            isAxiosError: true,
            response: { status: 403, data: { message: 'Too many requests' } },
        });
        axiosGetMock.mockRejectedValueOnce(axiosErr);
        const res = await request(app)
            .get('/api/v1/rama-judicial/proceso?radicado=05001310300120230001')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(403);
    });

    it('devuelve 504 cuando la RJ no responde (timeout)', async () => {
        const axiosErr = Object.assign(new Error('Timeout'), {
            isAxiosError: true,
            request:      {},   // hay request pero no response → timeout
        });
        axiosGetMock.mockRejectedValueOnce(axiosErr);
        const res = await request(app)
            .get('/api/v1/rama-judicial/proceso?radicado=05001310300120230001')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(504);
    });
});

// ── Suite: GET /actuaciones/:idProceso ────────────────────────────────────────

describe('GET /api/v1/rama-judicial/actuaciones/:idProceso', () => {

    beforeEach(() => vi.clearAllMocks());

    it('devuelve 401 sin token', async () => {
        const res = await request(app).get('/api/v1/rama-judicial/actuaciones/12345');
        expect(res.status).toBe(401);
    });

    it('devuelve 400 cuando idProceso no es numérico', async () => {
        const res = await request(app)
            .get('/api/v1/rama-judicial/actuaciones/abc')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(axiosGetMock).not.toHaveBeenCalled();
    });

    it('devuelve 200 con la lista de actuaciones cuando la RJ responde', async () => {
        axiosGetMock.mockResolvedValueOnce({
            data: { actuaciones: [actuacionRJ] },
        });
        const res = await request(app)
            .get('/api/v1/rama-judicial/actuaciones/12345')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('actuaciones');
        expect(Array.isArray(res.body.actuaciones)).toBe(true);
    });

    it('la respuesta incluye los campos "actuacion" y "anotacion"', async () => {
        // Verifica que el proxy reenvía los campos que el frontend consume:
        //   actuacion → nombre corto del tipo de actuación (ej: "SENTENCIA")
        //   anotacion → descripción larga
        axiosGetMock.mockResolvedValueOnce({
            data: { actuaciones: [actuacionRJ] },
        });
        const res = await request(app)
            .get('/api/v1/rama-judicial/actuaciones/12345')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(200);
        const primera = res.body.actuaciones[0];
        expect(primera).toHaveProperty('actuacion', 'SENTENCIA');
        expect(primera).toHaveProperty('anotacion');
        expect(typeof primera.anotacion).toBe('string');
    });

    it('devuelve 504 cuando la RJ no responde (timeout)', async () => {
        const axiosErr = Object.assign(new Error('Timeout'), {
            isAxiosError: true,
            request:      {},
        });
        axiosGetMock.mockRejectedValueOnce(axiosErr);
        const res = await request(app)
            .get('/api/v1/rama-judicial/actuaciones/12345')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(504);
    });

    it('reenvía el status HTTP cuando la RJ responde con 500', async () => {
        const axiosErr = Object.assign(new Error('Internal'), {
            isAxiosError: true,
            response: { status: 500, data: { error: 'Internal Server Error' } },
        });
        axiosGetMock.mockRejectedValueOnce(axiosErr);
        const res = await request(app)
            .get('/api/v1/rama-judicial/actuaciones/12345')
            .set('Authorization', `Bearer ${tokenValido()}`);
        expect(res.status).toBe(500);
    });
});
