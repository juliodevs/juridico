import express from 'express';
import { body, param } from 'express-validator';
import { auth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/requireAdmin';
import { validate } from '../../middleware/validate';
import {
    getConfiguracion,
    updateConfiguracion,
    testEmail,
    getUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
} from '../../controllers/adminController';

const router = express.Router();

// Todas las rutas admin requieren autenticación JWT + rol admin
router.use(auth, requireAdmin);

// ── Configuración ─────────────────────────────────────────────────────────────
router.get('/configuracion', getConfiguracion);
router.put('/configuracion', updateConfiguracion);
router.post('/configuracion/test-email', testEmail);

// ── Usuarios ──────────────────────────────────────────────────────────────────
const idParamRule = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

router.get('/usuarios', getUsuarios);

router.post(
    '/usuarios',
    validate([
        body('nombre')
            .notEmpty().withMessage('El nombre es requerido')
            .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
        body('email')
            .notEmpty().withMessage('El email es requerido')
            .isEmail().withMessage('El email debe tener un formato válido')
            .isLength({ max: 150 }).withMessage('El email no puede superar 150 caracteres'),
        body('password')
            .notEmpty().withMessage('La contraseña es requerida')
            .isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres'),
        body('rol')
            .optional()
            .isIn(['admin', 'abogado']).withMessage('El rol debe ser admin o abogado'),
    ]),
    createUsuario
);

router.put(
    '/usuarios/:id',
    validate([
        ...idParamRule,
        body('nombre')
            .notEmpty().withMessage('El nombre es requerido')
            .isLength({ max: 100 }),
        body('email')
            .notEmpty().withMessage('El email es requerido')
            .isEmail().withMessage('El email debe tener un formato válido')
            .isLength({ max: 150 }),
        body('rol')
            .notEmpty().withMessage('El rol es requerido')
            .isIn(['admin', 'abogado']).withMessage('El rol debe ser admin o abogado'),
        body('activo')
            .notEmpty().withMessage('El campo activo es requerido')
            .isBoolean().withMessage('El campo activo debe ser true o false'),
    ]),
    updateUsuario
);

router.delete('/usuarios/:id', validate(idParamRule), deleteUsuario);

export default router;
