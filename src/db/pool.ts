import mysql from 'mysql2/promise';
import { env } from '../config/env';

/**
 * Pool de conexiones MySQL usando mysql2/promise.
 * Todas las credenciales vienen de process.env a través de env.ts.
 * Nunca hardcodear credenciales aquí.
 */
const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: env.db.poolMax,
    queueLimit: 0,
    timezone: '+00:00',
});

/**
 * Verifica la conexión al iniciar el servidor.
 * Lanza un error si no puede conectarse — detiene el arranque.
 */
export async function testConnection(): Promise<void> {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a la base de datos MySQL');
    conn.release();
}

export default pool;
