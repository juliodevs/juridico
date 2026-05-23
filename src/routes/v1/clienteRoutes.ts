import express from 'express';
import { body, param } from 'express-validator';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
    obtenerClientes,
    obtenerClientePorId,
    guardarCliente,
    actualizarCliente,
    eliminarCliente,
} from '../../controllers/clienteController';

const router = express.Router();

// Todas las rutas de clientes requieren autenticación JWT
router.use(auth);

// Validaciones reutilizables
const clienteBodyRules = [
    body('numero_documento')
        .notEmpty().withMessage('El número de documento es requerido')
        .isLength({ max: 20 }).withMessage('El número de documento no puede superar 20 caracteres'),
    body('nombre')
        .notEmpty().withMessage('El nombre es requerido')
        .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),
    body('apellidos')
        .notEmpty().withMessage('Los apellidos son requeridos')
        .isLength({ max: 100 }).withMessage('Los apellidos no pueden superar 100 caracteres'),
    body('telefono')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 20 }).withMessage('El teléfono no puede superar 20 caracteres'),
    body('email')
        .optional({ nullable: true, checkFalsy: true })
        .isEmail().withMessage('El email debe tener un formato válido')
        .isLength({ max: 150 }).withMessage('El email no puede superar 150 caracteres'),
    body('ciudad')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 100 }).withMessage('La ciudad no puede superar 100 caracteres'),
    body('direccion')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ max: 200 }).withMessage('La dirección no puede superar 200 caracteres'),
];

const idParamRule = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

// ── Rutas ─────────────────────────────────────────────────────────────────────
router.get('/clientes', obtenerClientes);
router.get('/clientes/:id', validate(idParamRule), obtenerClientePorId);
router.post('/clientes', validate(clienteBodyRules), guardarCliente);
router.put('/clientes/:id', validate([...idParamRule, ...clienteBodyRules]), actualizarCliente);
router.delete('/clientes/:id', validate(idParamRule), eliminarCliente);

export default router;
