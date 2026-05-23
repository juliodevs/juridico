import express from 'express';
import { auth } from '../../middleware/auth';
import {
    obtenerProcesos,
    guardarProceso,
} from '../../controllers/procesosController';

const router = express.Router();

// Todas las rutas de procesos requieren autenticación JWT
router.use(auth);

router.get('/procesos', obtenerProcesos);
router.post('/procesos', guardarProceso);

export default router;
