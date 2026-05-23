import express from 'express';
import { auth } from '../../middleware/auth';
import {
    obtenerClientes,
    obtenerClientePorId,
    guardarCliente,
} from '../../controllers/clienteController';

const router = express.Router();

// Todas las rutas de clientes requieren autenticación JWT
router.use(auth);

router.get('/clientes', obtenerClientes);
router.post('/clientes', guardarCliente);
router.get('/clientes/:id', obtenerClientePorId);

export default router;
