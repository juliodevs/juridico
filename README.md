# Sistema de Gestión Jurídica

Sistema web para la gestión interna de un despacho jurídico colombiano. Administra clientes, procesos legales y juzgados, con autenticación por roles, notificaciones automáticas por correo electrónico y WhatsApp, alertas de audiencias próximas, consulta en tiempo real de la Rama Judicial, y un panel de administración configurable.

---

## Tabla de contenidos

- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Comandos disponibles](#comandos-disponibles)
- [API — Endpoints principales](#api--endpoints-principales)
- [Despliegue en producción (PM2)](#despliegue-en-producción-pm2)
- [Migraciones de base de datos](#migraciones-de-base-de-datos)
- [Tests](#tests)
- [Seguridad](#seguridad)

---

## Características principales

| Módulo | Descripción |
|---|---|
| **Autenticación** | Login JWT con roles `admin` y `abogado`. Contraseñas hasheadas con bcrypt. Rate limiting en `/login`. |
| **Clientes** | CRUD completo: documento, nombre, apellidos, teléfono, ciudad, email. |
| **Procesos** | CRUD con radicado judicial, estado, fecha de audiencia, juzgado asignado y cliente vinculado. |
| **Juzgados** | CRUD de juzgados con ciudad y departamento. |
| **Consulta Rama Judicial** | Pantalla para consultar masiva o individualmente el estado de radicados en la API pública de la Rama Judicial. Detecta cambios recientes con reintentos automáticos y backoff exponencial. |
| **Notificaciones** | Email vía SMTP (Nodemailer) + link de WhatsApp. Configuración desde el panel admin, cifrada en BD. |
| **Alertas de audiencias** | Cron job diario que detecta audiencias próximas y notifica por email y WhatsApp. |
| **Panel admin** | Configuración de SMTP, WhatsApp, alertas y datos del despacho desde la interfaz. Los valores sensibles se cifran con AES-256-CBC. |
| **Dashboard** | Resumen de clientes, procesos activos y próximas audiencias. |

---

## Stack tecnológico

### Backend
- **Node.js LTS** + **TypeScript** (strict mode)
- **Express 4** — API REST versionada `/api/v1/`
- **MySQL 8** — pool de conexiones vía `mysql2/promise`
- **JWT** (`jsonwebtoken`) + **bcryptjs**
- **Helmet** + **CORS** + **express-rate-limit**
- **express-validator** para validación de entradas
- **Nodemailer** para envío de correos SMTP
- **node-cron** para alertas automáticas
- **Vitest** + **Supertest** para tests

### Frontend
- **Vue 3** (Composition API + `<script setup>`)
- **Vite** como build tool
- **Tailwind CSS** para estilos
- **Vue Router 4** con guardias de autenticación y rol
- **Pinia** para estado global
- **Axios** para comunicación con la API

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 LTS |
| npm | 9+ |
| MySQL | 8.0 |
| PM2 (producción) | 5+ |

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd juridico
```

### 2. Instalar dependencias

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores reales
```

### 4. Ejecutar migraciones SQL

```bash
# Conéctate a MySQL y ejecuta en orden:
mysql -u root -p juridico < migrations/001_inicial.sql
mysql -u root -p juridico < migrations/002_configuracion.sql
# ... resto de migraciones en orden numérico
```

### 5. Crear el usuario administrador inicial

```bash
npm run seed:admin
```

### 6. Iniciar en desarrollo

```bash
# Terminal 1 — Backend (con recarga automática)
npm run dev

# Terminal 2 — Frontend (con HMR)
cd client && npm run dev
```

El backend queda disponible en `http://localhost:3000` y el frontend en `http://localhost:5173`.

---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

| Variable | Requerida | Descripción |
|---|---|---|
| `PORT` | ✅ | Puerto del servidor (default: 3000) |
| `NODE_ENV` | ✅ | `development` / `production` / `test` |
| `DB_HOST` | ✅ | Host de MySQL |
| `DB_USER` | ✅ | Usuario de MySQL |
| `DB_PASSWORD` | ✅ | Contraseña de MySQL |
| `DB_NAME` | ✅ | Nombre de la base de datos |
| `JWT_SECRET` | ✅ | Secreto JWT — mínimo 32 caracteres aleatorios |
| `JWT_EXPIRES_IN` | ✅ | Duración del token (ej: `8h`) |
| `ENCRYPTION_KEY` | ✅ | Clave AES-256 — **exactamente 32 caracteres** |

> **Nota:** Las configuraciones de SMTP, WhatsApp y alertas se gestionan desde el panel de administración (`/admin/configuracion`) y se guardan cifradas en la tabla `configuracion` de la BD. No van en `.env`.

---

## Estructura del proyecto

```
juridico/
├── src/                    # Backend TypeScript
│   ├── config/             # Validación de env y configuración de BD
│   ├── controllers/        # Lógica de negocio de cada entidad
│   ├── db/pool.ts          # Pool de conexiones MySQL
│   ├── jobs/               # Cron jobs (alertas de audiencias)
│   ├── middleware/         # auth, requireAdmin, errorHandler, validate
│   ├── models/             # Interfaces TypeScript de dominio
│   ├── routes/v1/          # Rutas versionadas /api/v1/
│   ├── services/           # configService, emailService, notificationService...
│   ├── __tests__/          # Tests unitarios e integración
│   ├── app.ts              # Configuración Express (exportado para tests)
│   └── index.ts            # Arranque del servidor
├── client/                 # Frontend Vue 3 + Vite
│   └── src/
│       ├── components/     # Componentes reutilizables
│       ├── views/          # Vistas de cada módulo
│       ├── router/         # Rutas + guardias
│       ├── stores/         # Pinia stores
│       └── services/       # Llamadas Axios a la API
├── migrations/             # Archivos SQL numerados (ejecutar manualmente)
├── scripts/                # Utilidades (seed-admin, etc.)
├── logs/                   # Logs de PM2 (generados en producción)
├── ecosystem.config.js     # Configuración PM2
├── vitest.config.ts        # Configuración de tests
├── .env.example            # Plantilla de variables de entorno
└── package.json
```

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Backend en desarrollo con nodemon |
| `npm run build` | Compilar TypeScript → `dist/` |
| `npm start` | Iniciar backend compilado |
| `npm run start:prod` | Iniciar con `NODE_ENV=production` |
| `npm test` | Ejecutar suite de tests (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run seed:admin` | Crear usuario administrador inicial |
| `cd client && npm run dev` | Frontend en desarrollo (HMR) |
| `cd client && npm run build` | Compilar frontend → `client/dist/` |

---

## API — Endpoints principales

Todos los endpoints requieren header `Authorization: Bearer <token>` excepto `/auth/login`.

### Autenticación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | ❌ | Iniciar sesión, devuelve JWT |

### Clientes
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/clientes` | ✅ | Listar todos |
| GET | `/api/v1/clientes/:id` | ✅ | Obtener uno |
| POST | `/api/v1/clientes` | ✅ | Crear nuevo |
| PUT | `/api/v1/clientes/:id` | ✅ | Actualizar |
| DELETE | `/api/v1/clientes/:id` | ✅ | Eliminar |

### Procesos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/procesos` | ✅ | Listar todos |
| GET | `/api/v1/procesos/:id` | ✅ | Obtener uno |
| POST | `/api/v1/procesos` | ✅ | Crear nuevo |
| PUT | `/api/v1/procesos/:id` | ✅ | Actualizar |
| DELETE | `/api/v1/procesos/:id` | ✅ | Eliminar |
| PATCH | `/api/v1/procesos/:id/revisar` | ✅ | Registrar revisión |

### Administración (solo rol `admin`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/v1/admin/configuracion` | ✅ Admin | Leer configuración |
| PUT | `/api/v1/admin/configuracion/:clave` | ✅ Admin | Actualizar campo |
| GET | `/api/v1/admin/usuarios` | ✅ Admin | Listar usuarios |

---

## Despliegue en producción (PM2)

### 1. Compilar la aplicación

```bash
npm run build
cd client && npm run build && cd ..
```

### 2. Exportar variables de entorno en el servidor

```bash
export NODE_ENV=production
export PORT=3000
export DB_HOST=localhost
export DB_USER=juridico_user
export DB_PASSWORD=<contraseña-segura>
export DB_NAME=juridico
export JWT_SECRET=<secreto-min-32-chars>
export JWT_EXPIRES_IN=8h
export ENCRYPTION_KEY=<exactamente-32-chars>
```

### 3. Iniciar con PM2

```bash
# Instalar PM2 globalmente (una sola vez)
npm install -g pm2

# Iniciar en modo producción
pm2 start ecosystem.config.js --env production

# Ver estado
pm2 status

# Persistir entre reinicios del servidor
pm2 save
pm2 startup
```

### Comandos PM2 útiles

```bash
pm2 logs juridico-api          # logs en tiempo real
pm2 reload juridico-api        # recarga sin downtime (cluster)
pm2 restart juridico-api       # reinicio completo
pm2 stop juridico-api          # detener
pm2 monit                      # monitor de CPU/RAM en tiempo real
```

---

## Migraciones de base de datos

Las migraciones están en `migrations/` con nombres numerados (`001_inicial.sql`, `002_...`, etc.).

**Regla:** Nunca modificar una migración ya ejecutada. Para cambios de esquema, crear una nueva migración con el siguiente número.

```bash
# Ejecutar una migración específica
mysql -u root -p juridico < migrations/005_nueva_columna.sql
```

---

## Tests

La suite usa **Vitest** para tests unitarios y **Supertest** para tests de integración HTTP.

```bash
# Ejecutar todos los tests
npm test

# Con reporte de cobertura
npm run test:coverage
```

**Archivos de test:**

| Archivo | Tipo | Cobertura |
|---|---|---|
| `auth.middleware.test.ts` | Unitario | Middleware de autenticación JWT |
| `requireAdmin.middleware.test.ts` | Unitario | Middleware de autorización por rol |
| `errorHandler.middleware.test.ts` | Unitario | Manejo global de errores |
| `emailService.test.ts` | Unitario | Servicio de envío de correos |
| `configService.test.ts` | Unitario | Cifrado AES-256 y caché de configuración |
| `auth.integration.test.ts` | Integración | Flujo completo de login |
| `clientes.integration.test.ts` | Integración | CRUD de clientes vía HTTP |

Los tests de integración usan mocks del pool de BD (`vi.mock`) para no requerir conexión real a MySQL.

---

## Seguridad

### Medidas implementadas

| Área | Medida |
|---|---|
| **Autenticación** | JWT con expiración configurable. No se almacenan tokens en BD. |
| **Contraseñas** | Hash bcrypt (factor 10). Nunca se devuelven al cliente. |
| **Autorización** | Middleware `auth` en todas las rutas protegidas. `requireAdmin` para rutas admin. |
| **Configuración sensible** | Valores SMTP y WhatsApp cifrados con AES-256-CBC + IV aleatorio en BD. |
| **Rate limiting** | 100 req/15min global + 5 intentos/15min en `/login`. |
| **Headers HTTP** | Helmet.js configura CSP, HSTS, X-Frame-Options, etc. |
| **CORS** | Lista blanca de orígenes. Deshabilitado para orígenes no permitidos. |
| **Queries SQL** | 100% parametrizadas. Sin concatenación de strings con datos de usuario. |
| **Stack traces** | `errorHandler.ts` los oculta siempre. El cliente recibe solo un mensaje genérico. |
| **Variables de entorno** | `.env` en `.gitignore`. Solo `.env.example` en el repositorio. |

### Reporte de vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, no abras un issue público. Contacta directamente al equipo del despacho.

---

## Licencia

Uso interno del despacho jurídico. Todos los derechos reservados.
