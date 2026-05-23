import express from 'express';
import { guardarProceso,obtenerProcesos } from '../controllers/procesosController';

const router = express.Router();

// Definir rutas
router.post('/guardarProceso', guardarProceso);
router.get('/procesos', obtenerProcesos);

export default router;

