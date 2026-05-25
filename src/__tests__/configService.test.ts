/**
 * Tests unitarios — configService
 *
 * Verifica el cifrado AES-256-CBC:
 * - Un secreto guardado vía updateConfig se lee descifrado en getConfig
 * - El mismo texto produce ciphertexts distintos en cada cifrado (IV aleatorio)
 * - Campos no-secretos se devuelven en texto plano
 * - El caché evita consultas repetidas a la BD dentro del TTL
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted(): variables disponibles dentro de vi.mock() factories ─────────
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('../db/pool', () => ({
    default: { query: queryMock },
}));

import { getConfig, updateConfig, invalidarCache } from '../services/configService';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Simula la BD: getConfig lee, updateConfig actualiza y podemos re-leer */
function simularBD(filas: { clave: string; valor: string | null; es_secreto: boolean }[]) {
    // Mapa mutable para simular el estado de la BD
    const bd = new Map(filas.map(f => [f.clave, f]));

    queryMock.mockImplementation((sql: string, params?: unknown[]) => {
        // SELECT para getConfig
        if (sql.includes('SELECT clave')) {
            return [Array.from(bd.values())];
        }
        // SELECT para updateConfig (lee es_secreto)
        if (sql.includes('SELECT es_secreto')) {
            const clave = (params as string[])[0];
            const fila  = bd.get(clave);
            return fila ? [[{ es_secreto: fila.es_secreto }]] : [[]];
        }
        // UPDATE para updateConfig
        if (sql.includes('UPDATE configuracion')) {
            const [nuevoValor, clave] = params as [string, string];
            const fila = bd.get(clave);
            if (fila) bd.set(clave, { ...fila, valor: nuevoValor });
            return [{ affectedRows: 1 }];
        }
        return [[]];
    });
}

describe('configService', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        invalidarCache();
    });

    it('devuelve campos no-secretos en texto plano', async () => {
        simularBD([{ clave: 'despacho_nombre', valor: 'Despacho Test', es_secreto: false }]);
        const config = await getConfig();
        expect(config['despacho_nombre']).toBe('Despacho Test');
    });

    it('devuelve cadena vacía para valores NULL en BD', async () => {
        simularBD([{ clave: 'smtp_host', valor: null, es_secreto: false }]);
        const config = await getConfig();
        expect(config['smtp_host']).toBe('');
    });

    it('cifra y descifra correctamente un campo secreto (round-trip)', async () => {
        const textoOriginal = 'mi_password_smtp_secreto';
        simularBD([{ clave: 'smtp_password', valor: null, es_secreto: true }]);

        // updateConfig cifra el valor
        await updateConfig('smtp_password', textoOriginal);

        // getConfig debe descifrar y devolver el texto original
        const config = await getConfig();
        expect(config['smtp_password']).toBe(textoOriginal);
    });

    it('dos cifrados del mismo texto producen ciphertexts distintos (IV aleatorio)', async () => {
        const texto = 'misma_contrasena';
        const cifrados: string[] = [];

        simularBD([{ clave: 'smtp_password', valor: null, es_secreto: true }]);

        // Capturamos el valor cifrado de dos llamadas a updateConfig
        queryMock.mockImplementationOnce((_sql: string) => [[{ es_secreto: true }]]);
        queryMock.mockImplementationOnce((_sql: string, params: unknown[]) => {
            cifrados.push((params as string[])[0]);
            return [{ affectedRows: 1 }];
        });
        await updateConfig('smtp_password', texto);
        invalidarCache();

        queryMock.mockImplementationOnce((_sql: string) => [[{ es_secreto: true }]]);
        queryMock.mockImplementationOnce((_sql: string, params: unknown[]) => {
            cifrados.push((params as string[])[0]);
            return [{ affectedRows: 1 }];
        });
        await updateConfig('smtp_password', texto);

        // Ambos ciphertexts deben ser distintos
        expect(cifrados).toHaveLength(2);
        expect(cifrados[0]).not.toBe(cifrados[1]);
    });

    it('usa caché: la segunda llamada a getConfig no consulta la BD', async () => {
        simularBD([{ clave: 'smtp_host', valor: 'smtp.ejemplo.com', es_secreto: false }]);
        await getConfig();
        await getConfig(); // segunda llamada → debe ser del caché
        // queryMock solo debe haberse llamado una vez (la primera)
        expect(queryMock).toHaveBeenCalledTimes(1);
    });

    it('invalidarCache fuerza reconsulta en la siguiente llamada', async () => {
        simularBD([{ clave: 'smtp_host', valor: 'smtp1.com', es_secreto: false }]);
        await getConfig();
        invalidarCache();
        simularBD([{ clave: 'smtp_host', valor: 'smtp2.com', es_secreto: false }]);
        const config = await getConfig();
        expect(config['smtp_host']).toBe('smtp2.com');
    });

    it('lanza error al intentar updateConfig de una clave inexistente', async () => {
        queryMock.mockResolvedValueOnce([[]]); // SELECT devuelve vacío
        await expect(updateConfig('clave_inventada', 'valor')).rejects.toThrow(/no encontrada/i);
    });
});
