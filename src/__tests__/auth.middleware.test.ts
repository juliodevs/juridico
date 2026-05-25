/**
 * Tests unitarios — middleware auth
 *
 * Verifica que el middleware JWT:
 *   - rechaza solicitudes sin Authorization header (401)
 *   - rechaza tokens con formato incorrecto (401)
 *   - rechaza tokens inválidos o expirados (401)
 *   - acepta tokens válidos y adjunta req.user (next())
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth';
import { JwtPayload } from '../models/Usuario';

// ── Helpers para crear mocks de Express ───────────────────────────────────────
function mockReq(headers: Record<string, string> = {}): Partial<Request> {
    return { headers } as Partial<Request>;
}

function mockRes(): Partial<Response> & { statusCode: number; body: unknown } {
    const res = { statusCode: 200, body: null as unknown } as Partial<Response> & { statusCode: number; body: unknown };
    res.status = vi.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
    }) as unknown as Response['status'];
    res.json = vi.fn().mockImplementation((data: unknown) => {
        res.body = data;
        return res;
    }) as unknown as Response['json'];
    return res;
}

const nextFn = vi.fn() as NextFunction;

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('auth middleware', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('responde 401 cuando no hay header Authorization', () => {
        const req  = mockReq();
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        expect(res.statusCode).toBe(401);
        expect(res.body).toMatchObject({ error: expect.any(String) });
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('responde 401 cuando el header no empieza con "Bearer "', () => {
        const req  = mockReq({ authorization: 'Basic dXNlcjpwYXNz' });
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        expect(res.statusCode).toBe(401);
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('responde 401 cuando el token está vacío', () => {
        const req  = mockReq({ authorization: 'Bearer ' });
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        expect(res.statusCode).toBe(401);
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('responde 401 cuando el token es inválido (firma incorrecta)', () => {
        const req  = mockReq({ authorization: 'Bearer token.invalido.firma' });
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        expect(res.statusCode).toBe(401);
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('responde 401 cuando el token está expirado', () => {
        const payload: JwtPayload = { id: 1, email: 'a@b.com', rol: 'abogado' };
        const expiredToken = jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: '-1s' });
        const req  = mockReq({ authorization: `Bearer ${expiredToken}` });
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        expect(res.statusCode).toBe(401);
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('llama next() y adjunta req.user cuando el token es válido', () => {
        const payload: JwtPayload = { id: 42, email: 'admin@test.com', rol: 'admin' };
        const token = jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: '1h' });
        const req  = mockReq({ authorization: `Bearer ${token}` });
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        expect(nextFn).toHaveBeenCalledOnce();
        expect((req as Request).user).toBeDefined();
        expect((req as Request).user?.id).toBe(42);
        expect((req as Request).user?.rol).toBe('admin');
    });

    it('la respuesta de error nunca expone el stack trace', () => {
        const req  = mockReq({ authorization: 'Bearer invalido' });
        const res  = mockRes();
        auth(req as Request, res as Response, nextFn);
        const body = res.body as Record<string, unknown>;
        expect(body).not.toHaveProperty('stack');
    });
});
