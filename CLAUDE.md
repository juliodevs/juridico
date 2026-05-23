# CLAUDE.md — Sistema de Gestión Jurídica

Este archivo da a Claude Code el contexto completo del proyecto. Léelo al iniciar **cualquier** sesión antes de tocar código.

---

## Proyecto

Sistema web para la gestión interna de un despacho jurídico. Permite administrar clientes, procesos legales y juzgados, con autenticación por roles, notificaciones automáticas por correo y WhatsApp, alertas de audiencias próximas y un panel de administración configurable.

---

## Stack

### Backend
- **Runtime:** Node.js LTS
- **Lenguaje:** TypeScript (strict mode activado)
- **Framework:** Express 4
- **Base de datos:** MySQL 8 — acceso vía `mysql2/promise` con **pool de conexiones**
- **Autenticación:** JWT (`jsonwebtoken`) + hash de contraseñas (`bcryptjs`)
- **Seguridad HTTP:** Helmet.js + CORS + express-rate-limit
- **Validación:** express-validator
- **Notificaciones:** Nodemailer (SMTP configurable desde BD) + WhatsApp link
- **Tareas programadas:** node-cron
- **Tests:** Vitest + Supertest

### Frontend
- **Framework:** Vue 3 (Composition API)
- **Build tool:** Vite
- **Estilos:** Tailwind CSS
- **Routing:** Vue Router 4 (rutas protegidas por JWT)
- **Estado global:** Pinia
- **HTTP:** Axios

---

## Estructura de carpetas

```
juridico/
├── src/                          ← Backend TypeScript
│   ├── config/
│   │   ├── env.ts                ← validación de variables de entorno al arrancar
│   │   └── database.ts           ← configuración del pool MySQL
│   ├── db/
│   │   └── pool.ts               ← instancia del pool (mysql2/promise)
│   ├── models/                   ← interfaces TypeScript de dominio
│   │   ├── Cliente.ts
│   │   ├── Proceso.ts
│   │   ├── Usuario.ts
│   │   ├── Juzgado.ts
│   │   └── Configuracion.ts
│   ├── middleware/
│   │   ├── auth.ts               ← verifica JWT en Authorization header
│   │   ├── requireAdmin.ts       ← verifica rol admin en el payload JWT
│   │   ├── errorHandler.ts       ← captura global de errores (nunca expone stack)
│   │   └── validate.ts           ← wrapper de express-validator
│   ├── controllers/              ← lógica de cada entidad
│   ├── routes/
│   │   └── v1/                   ← rutas versionadas /api/v1/
│   ├── services/
│   │   ├── configService.ts      ← lee configuración de BD con caché en memoria
│   │   ├── emailService.ts       ← envío de correos via Nodemailer
│   │   ├── whatsappService.ts    ← generación de links wa.me con mensaje formateado
│   │   └── notificationService.ts ← orquesta email + WhatsApp
│   ├── jobs/
│   │   └── alertasAudiencias.ts  ← cron job diario: busca audiencias próximas y notifica
│   └── index.ts                  ← arranque del servidor
│
├── client/                       ← Frontend Vue 3 + Vite
│   ├── src/
│   │   ├── components/           ← componentes reutilizables (botones, tablas, modales)
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── Clientes.vue
│   │   │   ├── Procesos.vue
│   │   │   ├── Juzgados.vue
│   │   │   └── admin/
│   │   │       ├── Configuracion.vue
│   │   │       └── Usuarios.vue
│   │   ├── router/               ← Vue Router con guardias de autenticación y rol
│   │   ├── stores/               ← Pinia: authStore, configStore
│   │   ├── services/             ← llamadas axios al API backend
│   │   └── layouts/
│   │       └── MainLayout.vue    ← sidebar + navbar compartidos
│   └── vite.config.ts            ← proxy /api → localhost:3000 en desarrollo
│
├── .claude/
│   ├── commands/
│   │   ├── test.md               ← /test: corre la suite de pruebas
│   │   └── nueva-migracion.md    ← /nueva-migracion: crea archivo SQL de migración
│   └── agents/
│       ├── security-reviewer.md  ← audita el código por vulnerabilidades
│       └── frontend-builder.md   ← especialista en componentes Vue 3 + Tailwind
│
├── migrations/                   ← archivos SQL numerados: 001_inicial.sql, etc.
├── .env                          ← ⚠️ NUNCA en git
├── .env.example                  ← plantilla pública de variables
├── .gitignore
├── PROJECT_BRIEF.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── CLAUDE_CODE_GUIDE.md
└── package.json
```

---

## Convenciones de código

- **TypeScript:** strict mode. Toda función exportada debe tener tipos explícitos en parámetros y retorno.
- **Async/await:** siempre. Cero callbacks en código nuevo.
- **Errores:** lanzar con `throw new Error(mensaje)` en servicios; los controllers los capturan con try/catch y llaman `next(error)` para que el errorHandler global responda.
- **Validación:** todo endpoint POST/PUT debe pasar por `express-validator` antes de llegar al controller.
- **Queries SQL:** siempre con parámetros preparados (`?`). Nunca concatenación de strings con datos del usuario.
- **Commits:** formato `tipo(alcance): descripción` — ej: `feat(auth): agregar endpoint login`, `fix(procesos): corregir validación de radicado`.
- **Branches:** `main` para producción, `feature/<nombre>` para desarrollo.
- **Tests:** un archivo `*.test.ts` por cada controller y servicio.

---

## Comandos útiles

| Acción | Comando |
|---|---|
| Instalar dependencias backend | `npm install` |
| Correr backend en desarrollo | `npm run dev` |
| Compilar backend | `npm run build` |
| Correr backend compilado | `npm start` |
| Instalar dependencias frontend | `cd client && npm install` |
| Correr frontend en desarrollo | `cd client && npm run dev` |
| Compilar frontend | `cd client && npm run build` |
| Correr todos los tests | `npm test` |
| Correr tests con cobertura | `npm run test:coverage` |

---

## Variables de entorno requeridas

Todas están en `.env.example`. Las críticas:

```
# Servidor
PORT=3000

# Base de datos (infraestructura — nunca en panel admin)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=juridico

# JWT
JWT_SECRET=           ← mínimo 32 caracteres, aleatorio
JWT_EXPIRES_IN=8h

# Cifrado de configuración sensible en BD
ENCRYPTION_KEY=       ← 32 caracteres para AES-256
```

> Las configuraciones de SMTP, WhatsApp, alertas y datos del despacho se gestionan desde el panel de administración y se almacenan cifradas en la tabla `configuracion`.

---

## Restricciones importantes

- ⛔ **Nunca** modificar `.env` ni hardcodear credenciales en el código.
- ⛔ **No** ejecutar `DROP TABLE`, `DELETE FROM` sin WHERE, ni `git push --force` sin confirmación explícita de Julio.
- ⛔ **No** exponer stack traces al cliente — el `errorHandler.ts` los oculta siempre.
- ✅ **Antes** de cambios que tocan más de 3 archivos, activar **plan mode** (`Shift+Tab`).
- ✅ **Verificar** que los tests del módulo afectado pasan antes de cerrar la sesión.
- ✅ **Toda** ruta nueva debe estar protegida con `auth` middleware como mínimo. Las rutas de admin además con `requireAdmin`.

---

## Contexto del negocio

Despacho jurídico colombiano. Los procesos tienen radicados de la Rama Judicial. Las notificaciones son críticas: un correo o alerta de audiencia perdida puede tener consecuencias legales. Prioridad máxima en confiabilidad de los servicios de notificación.

---

## Archivos relacionados

- [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) — qué resuelve y para quién.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — diseño técnico detallado.
- [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) — hitos y tareas.
- [`CLAUDE_CODE_GUIDE.md`](CLAUDE_CODE_GUIDE.md) — guion de sesiones de Claude Code.
