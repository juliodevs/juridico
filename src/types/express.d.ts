/**
 * Extensión global del tipo Request de Express.
 * Usa import() dinámico para evitar convertir este archivo en módulo,
 * lo que garantiza que ts-node lo cargue correctamente como declaración global.
 */
declare namespace Express {
    interface Request {
        user?: import('../models/Usuario').JwtPayload;
    }
}
