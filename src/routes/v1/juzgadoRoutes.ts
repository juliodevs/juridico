import express from 'express';
import { body, param } from 'express-validator';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    obtenerJuzgados,
    obtenerJuzgadoPorId,
    guardarJuzgado,
    actualizarJuzgado,
    eliminarJuzgado,
} from '../../controllers/juzgadoController';

const router = express.Router();

// Todas las rutas de juzgados requieren autenticación JWT
router.use(auth);

// Validaciones reutilizables
const juzgadoBodyRules = [
    body('juzgado')
        .notEmpty().withMessage('El nombre del juzgado es requerido')
        .isLength({ max: 200 }).withMessage('El nombre del juzgado no puede superar 200 caracteres'),
    body('juez')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 150 }).withMessage('El nombre del juez no puede superar 150 caracteres'),
    body('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail().withMessage('El email debe tener un formato válido')
        .isLength({ max: 150 }).withMessage('El email no puede superar 150 caracteres'),
    body('direccion')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 200 }).withMessage('La dirección no puede superar 200 caracteres'),
    body('telefono')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 20 }).withMessage('El teléfono no puede superar 20 caracteres'),
    body('departamento')
        .notEmpty().withMessage('El departamento es requerido')
        .isInt({ min: 1 }).withMessage('El departamento debe ser un ID numérico válido'),
    body('ciudad')
        .notEmpty().withMessage('La ciudad es requerida')
        .isInt({ min: 1 }).withMessage('La ciudad debe ser un ID numérico válido'),
];

const idParamRule = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

// ── Rutas ─────────────────────────────────────────────────────────────────────
router.get('/juzgados', obtenerJuzgados);
router.get('/juzgados/:id', validate(idParamRule), obtenerJuzgadoPorId);
router.post('/juzgados', validate(juzgadoBodyRules), guardarJuzgado);
router.put('/juzgados/:id', validate([...idParamRule, ...juzgadoBodyRules]), actualizarJuzgado);
router.delete('/juzgados/:id', validate(idParamRule), eliminarJuzgado);

export default router;
