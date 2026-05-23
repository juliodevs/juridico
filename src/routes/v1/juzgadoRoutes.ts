import express from 'express';
import { auth } from '../../middleware/auth';
import {
    obtenerJuzgados,
    obtenerJuzgadoPorId,
    guardarJuzgado,
} from '../../controllers/juzgadoController';

const router = express.Router();

// Todas las rutas de juzgados requieren autenticación JWT
router.use(auth);

router.get('/juzgados', obtenerJuzgados);
router.get('/juzgados/:id', obtenerJuzgadoPorId);
router.post('/juzgados', guardarJuzgado);

export default router;
