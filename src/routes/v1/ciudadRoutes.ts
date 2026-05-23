import express from 'express';
import { auth } from '../../middleware/auth';
import { obtenerCiudades } from '../../controllers/ciudadController';

const router = express.Router();

// Todas las rutas de ciudades requieren autenticación JWT
router.use(auth);

router.get('/ciudades', obtenerCiudades);

export default router;
