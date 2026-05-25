/**
 * Tests unitarios — middleware requireAdmin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { JwtPayload } from '../models/Usuario';

function mockReqWithUser(user?: JwtPayload): Partial<Request> {
    return { user } as Partial<Request>;
}

function mockRes() {
    const res = { statusCode: 200, body: null as unknown } as {
        statusCode: number; body: unknown;
        status: Response['status']; json: Response['json'];
    };
    res.status = vi.fn().mockImplementation((code: number) => { res.statusCode = code; return res; }) as unknown as Response['status'];
    res.json   = vi.fn().mockImplementation((data: unknown) => { res.body = data; return res; }) as unknown as Response['json'];
    return res;
}

const nextFn = vi.fn() as NextFunction;

describe('requireAdmin middleware', () => {

    beforeEach(() => vi.clearAllMocks());

    it('responde 403 cuando no hay req.user (no autenticado)', () => {
        const res = mockRes();
        requireAdmin(mockReqWithUser(undefined) as Request, res as unknown as Response, nextFn);
        expect(res.statusCode).toBe(403);
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('responde 403 cuando el usuario tiene rol "abogado"', () => {
        const res = mockRes();
        requireAdmin(
            mockReqWithUser({ id: 2, email: 'ab@b.com', rol: 'abogado' }) as Request,
            res as unknown as Response, nextFn
        );
        expect(res.statusCode).toBe(403);
        expect(nextFn).not.toHaveBeenCalled();
    });

    it('llama next() cuando el usuario tiene rol "admin"', () => {
        const res = mockRes();
        requireAdmin(
            mockReqWithUser({ id: 1, email: 'admin@b.com', rol: 'admin' }) as Request,
            res as unknown as Response, nextFn
        );
        expect(nextFn).toHaveBeenCalledOnce();
        expect(res.statusCode).toBe(200); // no se modificó
    });

    it('el mensaje de error no revela detalles internos', () => {
        const res = mockRes();
        requireAdmin(mockReqWithUser(undefined) as Request, res as unknown as Response, nextFn);
        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty('error');
        expect(body).not.toHaveProperty('stack');
    });
});
