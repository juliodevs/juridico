import express from 'express';
import { guardarJuzgado, obtenerJuzgados, obtenerJuzgadoPorId } from '../controllers/juzgadoController';

const router = express.Router();

// Ruta para guardar un nuevo juzgado
router.post('/guardarJuzgado', guardarJuzgado);

// Ruta para obtener todos los juzgados
router.get('/juzgados', obtenerJuzgados);

// Ruta para obtener un juzgado por ID
router.get('/juzgados/:id', obtenerJuzgadoPorId);

export default router;
