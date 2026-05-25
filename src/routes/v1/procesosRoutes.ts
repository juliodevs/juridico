import express from 'express';
import { body, param } from 'express-validator';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    obtenerProcesos,
    guardarProceso,
    actualizarProceso,
    eliminarProceso,
    revisarProceso,
} from '../../controllers/procesosController';

const router = express.Router();

// Todas las rutas de procesos requieren autenticación JWT
router.use(auth);

// Validaciones reutilizables
const procesoBodyRules = [
    body('sujetosProcesales')
        .notEmpty().withMessage('Los sujetos procesales son requeridos')
        .isLength({ max: 300 }).withMessage('Los sujetos procesales no pueden superar 300 caracteres'),
    body('radicado')
        .notEmpty().withMessage('El radicado es requerido')
        .isLength({ max: 100 }).withMessage('El radicado no puede superar 100 caracteres'),
    body('juzgado')
        .notEmpty().withMessage('El juzgado es requerido')
        .isLength({ max: 200 }).withMessage('El juzgado no puede superar 200 caracteres'),
    body('idCliente')
        .notEmpty().withMessage('El ID del cliente es requerido')
        .isInt({ min: 1 }).withMessage('El ID del cliente debe ser un número entero positivo'),
    body('fecha_audiencia')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601().withMessage('La fecha de audiencia debe tener formato YYYY-MM-DD')
        .toDate(),
    body('estado')
        .optional()
        .isIn(['activo', 'cerrado', 'suspendido']).withMessage('El estado debe ser: activo, cerrado o suspendido'),
];

const idParamRule = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

// ── Rutas ─────────────────────────────────────────────────────────────────────
router.get('/procesos', obtenerProcesos);
router.post('/procesos', validate(procesoBodyRules), guardarProceso);
router.patch('/procesos/:id/revisar', validate(idParamRule), revisarProceso);
router.put('/procesos/:id', validate([...idParamRule, ...procesoBodyRules]), actualizarProceso);
router.delete('/procesos/:id', validate(idParamRule), eliminarProceso);

export default router;
