import express from 'express';
import { auth } from '../../middleware/auth';
import {
    obtenerDepartamentos,
    obtenerCiudadesPorDepartamento,
} from '../../controllers/departamentoController';

const router = express.Router();

// Todas las rutas de departamentos requieren autenticación JWT
router.use(auth);

router.get('/departamentos', obtenerDepartamentos);
router.get('/departamentos/:departamentoId/ciudades', obtenerCiudadesPorDepartamento);

export default router;
