/**
 * Tests unitarios — middleware errorHandler
 *
 * Garantiza que:
 * - Errores con status personalizado responden con ese status
 * - Errores sin status responden 500 con mensaje genérico
 * - El stack trace NUNCA llega al cliente
 * - Los errores de validación (400) sí devuelven el mensaje específico
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../middleware/errorHandler';

function mockRes() {
    const res = { statusCode: 200, body: null as unknown } as {
        statusCode: number; body: unknown;
        status: Response['status']; json: Response['json'];
    };
    res.status = vi.fn().mockImplementation((code: number) => { res.statusCode = code; return res; }) as unknown as Response['status'];
    res.json   = vi.fn().mockImplementation((data: unknown) => { res.body = data; return res; }) as unknown as Response['json'];
    return res;
}

const reqMock  = {} as Request;
const nextMock = vi.fn() as NextFunction;

describe('errorHandler middleware', () => {

    beforeEach(() => vi.clearAllMocks());

    it('usa el status del error cuando está definido', () => {
        const err = Object.assign(new Error('Recurso no encontrado'), { status: 404 });
        const res = mockRes();
        errorHandler(err, reqMock, res as unknown as Response, nextMock);
        expect(res.statusCode).toBe(404);
        expect((res.body as Record<string, unknown>).error).toBe('Recurso no encontrado');
    });

    it('responde 500 con mensaje genérico cuando no hay status', () => {
        const err = new Error('Detalle interno muy sensible');
        const res = mockRes();
        errorHandler(err, reqMock, res as unknown as Response, nextMock);
        expect(res.statusCode).toBe(500);
        // El mensaje específico NO debe llegar al cliente en errores 500
        const body = res.body as Record<string, unknown>;
        expect(body.error).not.toBe('Detalle interno muy sensible');
        expect(typeof body.error).toBe('string');
    });

    it('nunca incluye el stack trace en la respuesta', () => {
        const err = new Error('Error con stack');
        err.stack = 'Error: Error con stack\n    at app.ts:99\n    at ...';
        const res = mockRes();
        errorHandler(err, reqMock, res as unknown as Response, nextMock);
        const bodyStr = JSON.stringify(res.body);
        expect(bodyStr).not.toContain('at app.ts');
        expect(bodyStr).not.toContain('stack');
    });

    it('usa statusCode (alternativo a status) cuando está definido', () => {
        const err = Object.assign(new Error('Bad Request'), { statusCode: 400 });
        const res = mockRes();
        errorHandler(err, reqMock, res as unknown as Response, nextMock);
        expect(res.statusCode).toBe(400);
    });

    it('la respuesta siempre incluye la clave "error"', () => {
        const err = new Error('Cualquier error');
        const res = mockRes();
        errorHandler(err, reqMock, res as unknown as Response, nextMock);
        expect(res.body).toHaveProperty('error');
    });
});
