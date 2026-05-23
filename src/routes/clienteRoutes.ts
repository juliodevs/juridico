import express from 'express';
import { obtenerClientes, guardarCliente, obtenerClientePorId } from '../controllers/clienteController';

const router = express.Router();

// Ruta para obtener todos los clientes
router.get('/clientes', obtenerClientes);

// Ruta para guardar un cliente
router.post('/clientes', guardarCliente);

// Ruta para obtener un cliente por ID
router.get('/clientes/:id', obtenerClientePorId);

export default router;