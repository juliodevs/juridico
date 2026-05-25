/**
 * Tests de integración — POST /api/v1/auth/login
 *
 * Usa Supertest + mock del pool de BD.
 * Verifica el flujo completo: validación → BD → JWT → respuesta HTTP.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// ── vi.hoisted(): variables disponibles dentro de vi.mock() factories ─────────
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../db/pool', () => ({
    default: {
        query:   queryMock,
        execute: vi.fn(),
        end:     vi.fn(),
    },
}));

vi.mock('../services/configService', () => ({
    getConfig:      vi.fn().mockResolvedValue({}),
    updateConfig:   vi.fn(),
    invalidarCache: vi.fn(),
}));

import app from '../app';

// ── Datos de prueba ───────────────────────────────────────────────────────────
const PASSWORD_PLAIN = 'TestPassword123!';
let PASSWORD_HASH: string;

const USUARIO_ADMIN = {
    id: 1, nombre: 'Admin Test', email: 'admin@test.com',
    password_hash: '', rol: 'admin' as const, activo: true,
};

describe('POST /api/v1/auth/login', () => {

    beforeEach(async () => {
        vi.clearAllMocks();
        // Generar hash real para las pruebas (una sola vez sería suficiente,
        // pero aquí se hace por claridad)
        PASSWORD_HASH = await bcrypt.hash(PASSWORD_PLAIN, 10);
        USUARIO_ADMIN.password_hash = PASSWORD_HASH;
    });

    it('devuelve 400 cuando faltan email o contraseña', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@test.com' });   // sin password
        expect(res.status).toBe(400);
    });

    it('devuelve 401 con mensaje genérico cuando el email no existe', async () => {
        queryMock.mockResolvedValueOnce([[]]); // BD no encuentra el usuario
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'noexiste@test.com', password: 'cualquier' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Credenciales inválidas');
        // No debe revelar si el email existe o no
        expect(res.body.error).not.toMatch(/email/i);
        expect(res.body.error).not.toMatch(/no encontrado/i);
    });

    it('devuelve 401 cuando la contraseña es incorrecta', async () => {
        queryMock.mockResolvedValueOnce([[USUARIO_ADMIN]]);
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: USUARIO_ADMIN.email, password: 'contraseña_incorrecta' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('devuelve 401 cuando el usuario está inactivo', async () => {
        queryMock.mockResolvedValueOnce([[{ ...USUARIO_ADMIN, activo: false }]]);
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: USUARIO_ADMIN.email, password: PASSWORD_PLAIN });
        expect(res.status).toBe(401);
    });

    it('devuelve 200 + token JWT con credenciales válidas', async () => {
        queryMock.mockResolvedValueOnce([[USUARIO_ADMIN]]);
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: USUARIO_ADMIN.email, password: PASSWORD_PLAIN });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.split('.')).toHaveLength(3); // formato JWT válido
    });

    it('la respuesta incluye datos del usuario (sin password_hash)', async () => {
        queryMock.mockResolvedValueOnce([[USUARIO_ADMIN]]);
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: USUARIO_ADMIN.email, password: PASSWORD_PLAIN });
        expect(res.status).toBe(200);
        expect(res.body.usuario).toMatchObject({
            id: USUARIO_ADMIN.id,
            nombre: USUARIO_ADMIN.nombre,
            email: USUARIO_ADMIN.email,
            rol: USUARIO_ADMIN.rol,
        });
        expect(JSON.stringify(res.body)).not.toContain('password_hash');
        expect(JSON.stringify(res.body)).not.toContain(PASSWORD_HASH);
    });

    it('rutas protegidas devuelven 401 sin token', async () => {
        const res = await request(app).get('/api/v1/clientes');
        expect(res.status).toBe(401);
    });

    it('rutas protegidas aceptan token JWT válido', async () => {
        // Login para obtener token
        queryMock.mockResolvedValueOnce([[USUARIO_ADMIN]]);
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: USUARIO_ADMIN.email, password: PASSWORD_PLAIN });
        const token = loginRes.body.token as string;

        // Usar el token en una ruta protegida
        queryMock.mockResolvedValueOnce([[]]); // clientes vacíos
        const clientesRes = await request(app)
            .get('/api/v1/clientes')
            .set('Authorization', `Bearer ${token}`);
        expect(clientesRes.status).toBe(200);
    });

    it('rutas admin devuelven 403 para un usuario con rol abogado', async () => {
        const usuarioAbogado = { ...USUARIO_ADMIN, rol: 'abogado' as const, id: 2, email: 'abogado@test.com' };
        queryMock.mockResolvedValueOnce([[usuarioAbogado]]);
        const loginRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: usuarioAbogado.email, password: PASSWORD_PLAIN });
        const token = loginRes.body.token as string;

        const adminRes = await request(app)
            .get('/api/v1/admin/configuracion')
            .set('Authorization', `Bearer ${token}`);
        expect(adminRes.status).toBe(403);
    });
});
