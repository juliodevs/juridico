import 'dotenv/config';
import { validateEnv } from './config/env';

// Valida variables de entorno al arrancar — termina el proceso si falta alguna
validateEnv();

import app from './app';
import { testConnection } from './db/pool';
import { iniciarAlertasAudiencias } from './jobs/alertasAudiencias';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

async function startServer(): Promise<void> {
    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log(`   Entorno: ${process.env['NODE_ENV'] ?? 'development'}`);
        });
        await iniciarAlertasAudiencias();
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error);
        process.exit(1);
    }
}

startServer();
