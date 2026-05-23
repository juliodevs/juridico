import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory que ejecuta un array de validaciones express-validator
 * y responde 400 con la lista de errores si alguna falla.
 *
 * Uso en rutas:
 *   router.post('/ruta', validate([
 *       body('campo').notEmpty().withMessage('Campo requerido'),
 *   ]), controllerFn);
 */
export const validate = (validations: ValidationChain[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Ejecutar todas las validaciones en paralelo
        await Promise.all(validations.map((v) => v.run(req)));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        next();
    };
};
