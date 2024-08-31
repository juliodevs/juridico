import express from 'express';
import { obtenerDepartamentos, obtenerCiudadesPorDepartamento } from '../controllers/departamentoController';

const router = express.Router();

// Rutas para departamentos
router.get('/departamentos', obtenerDepartamentos);
router.get('/ciudades/:departamentoId', obtenerCiudadesPorDepartamento);

export default router;
