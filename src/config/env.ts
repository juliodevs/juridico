/**
 * Validación de variables de entorno requeridas al arrancar el servidor.
 * Si falta alguna variable crítica, el proceso termina con un error claro.
 */

const REQUIRED_ENV_VARS = [
    'PORT',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
] as const;

export function validateEnv(): void {
    const missing: string[] = [];

    for (const varName of REQUIRED_ENV_VARS) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Error: Faltan las siguientes variables de entorno requeridas:');
        missing.forEach((v) => console.error(`   - ${v}`));
        console.error('\nCopia .env.example como .env y completa los valores reales.');
        process.exit(1);
    }
}

// Exportar los valores tipados para uso en el proyecto
export const env = {
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    db: {
        host: process.env['DB_HOST'] as string,
        port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
        user: process.env['DB_USER'] as string,
        password: process.env['DB_PASSWORD'] as string,
        name: process.env['DB_NAME'] as string,
        poolMax: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
        poolMin: parseInt(process.env['DB_POOL_MIN'] ?? '2', 10),
        poolAcquire: parseInt(process.env['DB_POOL_ACQUIRE'] ?? '30000', 10),
        poolIdle: parseInt(process.env['DB_POOL_IDLE'] ?? '10000', 10),
    },
    jwt: {
        secret: process.env['JWT_SECRET'] as string,
        expiresIn: process.env['JWT_EXPIRES_IN'] ?? '8h',
    },
    encryptionKey: process.env['ENCRYPTION_KEY'] as string,
} as const;
