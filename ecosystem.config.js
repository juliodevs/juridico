/**
 * ecosystem.config.js — Configuración de PM2 para producción.
 *
 * Uso:
 *   pm2 start ecosystem.config.js          # iniciar
 *   pm2 reload ecosystem.config.js         # recarga sin downtime
 *   pm2 stop juridico-api                  # detener
 *   pm2 logs juridico-api                  # ver logs en tiempo real
 *   pm2 save && pm2 startup                # persistir entre reinicios del SO
 */

module.exports = {
    apps: [
        {
            name: 'juridico-api',

            // Archivo de entrada compilado (npm run build genera dist/)
            script: './dist/index.js',

            // ── Modo cluster: aprovecha todos los núcleos disponibles ──────────
            instances: 'max',
            exec_mode: 'cluster',

            // ── Variables de entorno ───────────────────────────────────────────
            // PM2 no carga .env automáticamente; las variables críticas se
            // definen aquí o se inyectan desde el entorno del sistema operativo.
            // NO pongas valores reales en este archivo — usa el gestor de secretos
            // del servidor (ej: variables de entorno del SO, AWS SSM, etc.).
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
                // Las variables de BD, JWT y ENCRYPTION_KEY se inyectan desde
                // el entorno del sistema: export DB_PASSWORD=... antes de
                // `pm2 start ecosystem.config.js --env production`
            },

            // ── Reinicio automático ───────────────────────────────────────────
            // Reiniciar si el proceso usa más de 500 MB de RAM
            max_memory_restart: '500M',

            // Tiempo mínimo (ms) que debe estar activo para no contarse como crash
            min_uptime: '10s',

            // Máximo de reinicios antes de marcar el proceso como errored
            max_restarts: 10,

            // Espera entre reinicios (ms)
            restart_delay: 5000,

            // ── Logs ──────────────────────────────────────────────────────────
            out_file: './logs/pm2-out.log',
            error_file: './logs/pm2-error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,

            // ── Watch (solo desarrollo) ───────────────────────────────────────
            // En producción usar reload/restart explícito, no watch
            watch: false,
            ignore_watch: ['node_modules', 'logs', 'client'],

            // ── Graceful shutdown ─────────────────────────────────────────────
            kill_timeout: 5000,
            listen_timeout: 10000,
            shutdown_with_message: true,
        },
    ],
};
