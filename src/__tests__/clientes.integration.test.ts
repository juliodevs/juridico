/**
 * Tests de integración — CRUD /api/v1/clientes
 *
 * Verifica el ciclo completo: autenticación → validación → BD mock → respuesta HTTP.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/Usuario';

// ── vi.hoisted(): variables disponibles dentro de vi.mock() factories ─────────
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../db/pool', () => ({
    default: { query: queryMock, execute: vi.fn(), end: vi.fn() },
}));

vi.mock('../services/configService', () => ({
    getConfig: vi.fn().mockResolvedValue({}), updateConfig: vi.fn(), invalidarCache: vi.fn(),
}));

import app from '../app';

// ── Helpers ───────────────────────────────────────────────────────────────────
function tokenAdmin(): string {
    const payload: JwtPayload = { id: 1, email: 'admin@test.com', rol: 'admin' };
    return jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: '1h' });
}

function tokenAbogado(): string {
    const payload: JwtPayload = { id: 2, email: 'abogado@test.com', rol: 'abogado' };
    return jwt.sign(payload, process.env['JWT_SECRET']!, { expiresIn: '1h' });
}

const clienteEjemplo = {
    id: 1, nombre: 'María', apellidos: 'García', telefono: '3001234567',
    email: 'maria@test.com', direccion: 'Calle 1', ciudad_id: 1, ciudad: 'Medellín',
};

describe('GET /api/v1/clientes', () => {

    beforeEach(() => vi.clearAllMocks());

    it('devuelve 401 sin token', async () => {
        const res = await request(app).get('/api/v1/clientes');
        expect(res.status).toBe(401);
    });

    it('devuelve 200 con array cuando hay clientes', async () => {
        queryMock.mockResolvedValueOnce([[clienteEjemplo]]);
        const res = await request(app)
            .get('/api/v1/clientes')
            .set('Authorization', `Bearer ${tokenAdmin()}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('devuelve 200 con array vacío cuando no hay clientes', async () => {
        queryMock.mockResolvedValueOnce([[]]);
        const res = await request(app)
            .get('/api/v1/clientes')
            .set('Authorization', `Bearer ${tokenAbogado()}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe('POST /api/v1/clientes', () => {

    beforeEach(() => vi.clearAllMocks());

    it('devuelve 400 cuando faltan campos requeridos', async () => {
        const res = await request(app)
            .post('/api/v1/clientes')
            .set('Authorization', `Bearer ${tokenAdmin()}`)
            .send({ nombre: 'Solo nombre' }); // sin apellidos
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('errors');
    });

    it('devuelve 400 con email inválido', async () => {
        const res = await request(app)
            .post('/api/v1/clientes')
            .set('Authorization', `Bearer ${tokenAdmin()}`)
            .send({ nombre: 'Test', apellidos: 'Test', email: 'no-es-email' });
        expect(res.status).toBe(400);
    });

    it('devuelve 201 con datos válidos', async () => {
        queryMock.mockResolvedValueOnce([{ insertId: 10, affectedRows: 1 }]);
        const res = await request(app)
            .post('/api/v1/clientes')
            .set('Authorization', `Bearer ${tokenAdmin()}`)
            .send({
                numero_documento: '1234567890',
                nombre: 'Carlos', apellidos: 'López', telefono: '3009876543',
                email: 'carlos@test.com', ciudad: 'Medellín',
            });
        expect(res.status).toBe(201);
    });
});

describe('PUT /api/v1/clientes/:id', () => {

    beforeEach(() => vi.clearAllMocks());

    it('devuelve 404 cuando el cliente no existe', async () => {
        queryMock.mockResolvedValueOnce([{ affectedRows: 0 }]);
        const res = await request(app)
            .put('/api/v1/clientes/999')
            .set('Authorization', `Bearer ${tokenAdmin()}`)
            .send({
                numero_documento: '9999999999',
                nombre: 'Test', apellidos: 'Test', telefono: '3001111111',
                email: 'test@test.com', ciudad: 'Bogotá',
            });
        expect(res.status).toBe(404);
    });

    it('devuelve 200 cuando el cliente existe y los datos son válidos', async () => {
        queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app)
            .put('/api/v1/clientes/1')
            .set('Authorization', `Bearer ${tokenAdmin()}`)
            .send({
                numero_documento: '1234567890',
                nombre: 'Carlos', apellidos: 'López', telefono: '3009876543',
                email: 'carlos@test.com', ciudad: 'Medellín',
            });
        expect(res.status).toBe(200);
    });
});

describe('DELETE /api/v1/clientes/:id', () => {

    beforeEach(() => vi.clearAllMocks());

    it('devuelve 404 cuando el cliente no existe', async () => {
        queryMock.mockResolvedValueOnce([{ affectedRows: 0 }]);
        const res = await request(app)
            .delete('/api/v1/clientes/999')
            .set('Authorization', `Bearer ${tokenAdmin()}`);
        expect(res.status).toBe(404);
    });

    it('devuelve 200 cuando el cliente existe', async () => {
        queryMock.mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app)
            .delete('/api/v1/clientes/1')
            .set('Authorization', `Bearer ${tokenAdmin()}`);
        expect(res.status).toBe(200);
    });
});
