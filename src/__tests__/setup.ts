/**
 * setup.ts — Se ejecuta ANTES de cada archivo de tests.
 * Carga las variables de entorno de .env.test para que los módulos
 * que leen process.env funcionen correctamente sin conectar a producción.
 */
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.test') });
