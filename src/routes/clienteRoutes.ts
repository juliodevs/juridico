import express from 'express';
import { guardarCliente, obtenerClientes } from '../controllers/clienteController';

const router = express.Router();

router.post('/guardarCliente', guardarCliente);
router.get('/clientes', obtenerClientes);

export default router;