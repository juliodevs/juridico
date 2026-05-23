/**
 * Script para crear el usuario administrador inicial.
 *
 * Uso: npx ts-node scripts/seed-admin.ts
 *
 * Variables de entorno requeridas (.env):
 *   ADMIN_EMAIL    — email del administrador
 *   ADMIN_PASSWORD — contraseña en texto plano (se hasheará con bcrypt)
 *   ADMIN_NOMBRE   — nombre completo del administrador
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

async function seedAdmin(): Promise<void> {
    const email = process.env['ADMIN_EMAIL'];
    const password = process.env['ADMIN_PASSWORD'];
    const nombre = process.env['ADMIN_NOMBRE'];

    if (!email || !password || !nombre) {
        console.error('❌ Faltan variables de entorno: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE');
        process.exit(1);
    }

    // Verificar que no es el placeholder de ejemplo
    if (password === 'cambia_esto_por_password_seguro') {
        console.error('❌ Cambia ADMIN_PASSWORD en .env antes de ejecutar el seed.');
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: process.env['DB_HOST'],
        port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
        user: process.env['DB_USER'],
        password: process.env['DB_PASSWORD'],
        database: process.env['DB_NAME'],
    });

    try {
        // Verificar si ya existe un admin con ese email
        const [rows] = await connection.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        const existentes = rows as { id: number }[];

        if (existentes.length > 0) {
            console.log(`⚠️  Ya existe un usuario con el email ${email}. No se creó un duplicado.`);
            return;
        }

        const SALT_ROUNDS = 12;
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await connection.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, passwordHash, 'admin', true]
        );

        console.log(`✅ Usuario administrador creado exitosamente:`);
        console.log(`   Nombre : ${nombre}`);
        console.log(`   Email  : ${email}`);
        console.log(`   Rol    : admin`);
    } finally {
        await connection.end();
    }
}

seedAdmin().catch((err) => {
    console.error('❌ Error al crear el administrador:', err.message);
    process.exit(1);
});
