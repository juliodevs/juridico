import express from 'express';
import { obtenerCiudades } from '../controllers/ciudadController';

const router = express.Router();

// Ruta para obtener ciudades por nombre y departamento
router.get('/ciudades', obtenerCiudades);

export default router;
