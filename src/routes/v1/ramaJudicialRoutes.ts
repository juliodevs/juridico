import express from 'express';
import { auth } from '../../middleware/auth';
import { consultarProceso, consultarActuaciones } from '../../controllers/ramaJudicialController';

const router = express.Router();

// Todas las rutas requieren autenticación JWT
router.use(auth);

// GET /api/v1/rama-judicial/proceso?radicado=xxxxx
router.get('/proceso', consultarProceso);

// GET /api/v1/rama-judicial/actuaciones/:idProceso
router.get('/actuaciones/:idProceso', consultarActuaciones);

export default router;
