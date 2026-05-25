/**
 * ramaJudicialController — Proxy hacia la API pública de la Rama Judicial.
 *
 * El navegador no puede llamar directamente a consultaprocesos.ramajudicial.gov.co
 * porque esa API no incluye cabeceras CORS. Este controller actúa como intermediario:
 *
 *   Browser → POST /api/v1/rama-judicial/... → Node.js → Rama Judicial → Node.js → Browser
 *
 * Los códigos HTTP de error se reenvían al cliente para que el frontend
 * pueda aplicar su lógica de reintentos (429, 500, 502, 503, 504).
 */

import https from 'https';
import axios, { AxiosError } from 'axios';
import { Request, Response, NextFunction } from 'express';

// Instancia axios apuntando a la API de la Rama Judicial
const rjApi = axios.create({
    baseURL: 'https://consultaprocesos.ramajudicial.gov.co:448/api/v2',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept':       'application/json',
    },
    // La Rama Judicial usa certificados TLS que a veces no son verificables
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extrae el status HTTP y body de un error de Axios para reenviarlo al cliente.
 * Si la Rama Judicial devuelve 429 (rate limit), el frontend puede reintentar.
 */
function manejarErrorRJ(err: unknown, res: Response): void {
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
        // Error con respuesta de la Rama Judicial (4xx / 5xx)
        const status = axiosErr.response.status;
        const data   = axiosErr.response.data ?? { error: `Rama Judicial respondió con HTTP ${status}` };
        res.status(status).json(data);
    } else if (axiosErr.request) {
        // Petición enviada pero sin respuesta (timeout, red)
        res.status(504).json({ error: 'No hubo respuesta de la Rama Judicial (timeout o red)' });
    } else {
        res.status(502).json({ error: 'Error al contactar la Rama Judicial' });
    }
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/rama-judicial/proceso?radicado=xxxxx[&SoloActivos=true]
 *
 * Consulta los procesos asociados a un número de radicación.
 * SoloActivos: true por defecto — solo se devuelven procesos activos en la Rama Judicial.
 * Pasa SoloActivos=false explícitamente para incluir procesos inactivos/archivados.
 */
export const consultarProceso = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { radicado, SoloActivos } = req.query;

        if (!radicado || typeof radicado !== 'string' || !radicado.trim()) {
            res.status(400).json({ error: 'El parámetro "radicado" es requerido' });
            return;
        }

        // Interpretamos el query param: cualquier valor distinto de 'false' se trata como true.
        // Esto garantiza que el default sea siempre "solo activos" cuando el cliente no envía el parámetro.
        const soloActivos = SoloActivos !== 'false';

        const { data } = await rjApi.get('/Procesos/Consulta/NumeroRadicacion', {
            params: {
                numero:      radicado.trim(),
                SoloActivos: soloActivos,
                pagina:      1,
            },
        });

        res.json(data);
    } catch (err) {
        if ((err as AxiosError).isAxiosError) {
            manejarErrorRJ(err, res);
        } else {
            next(err);
        }
    }
};

/**
 * GET /api/v1/rama-judicial/actuaciones/:idProceso
 *
 * Consulta las actuaciones de un proceso por su ID interno de Rama Judicial.
 */
export const consultarActuaciones = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { idProceso } = req.params;

        if (!idProceso || isNaN(Number(idProceso))) {
            res.status(400).json({ error: 'El parámetro "idProceso" debe ser un número válido' });
            return;
        }

        const { data } = await rjApi.get(`/Proceso/Actuaciones/${idProceso}`);

        res.json(data);
    } catch (err) {
        if ((err as AxiosError).isAxiosError) {
            manejarErrorRJ(err, res);
        } else {
            next(err);
        }
    }
};
