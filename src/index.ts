import express from 'express';
import clienteRoutes from './routes/clienteRoutes';
import departamentoRoutes from './routes/departamentoRoutes';
import ciudadRoutes from './routes/ciudadRoutes';
import juzgadoRoutes from './routes/juzgadoRoutes';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api', clienteRoutes);
app.use('/api', departamentoRoutes);
app.use('/api', ciudadRoutes);
app.use('/api', juzgadoRoutes);

// Ruta para servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
