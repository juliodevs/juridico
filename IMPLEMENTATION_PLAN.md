# Implementation Plan — Sistema de Gestión Jurídica

> Versión: 1.0 · Fecha: 2026-05-23
> **Regla de oro:** ningún hito se cierra si hay credenciales en código, inputs sin validar, o rutas sin protección JWT.

---

## Resumen

Refactorización completa del sistema jurídico en 7 hitos: seguridad base → autenticación JWT → CRUD completo → panel admin configurable → notificaciones → frontend Vue 3 → testing y deploy.

---

## Hito 1 — Blindaje de seguridad y base sólida del backend

**Estado producido:** El servidor arranca limpio, sin ninguna credencial en código, con protección HTTP desde el primer commit.

**Tareas:**
1. Crear `.env` con todas las variables. Crear `.env.example` como plantilla pública.
2. Actualizar `.gitignore`: excluir `.env`, `dist/`, `node_modules/`, `client/dist/`.
3. Instalar y configurar **Helmet.js** (cabeceras HTTP seguras) y **CORS** con lista blanca.
4. Instalar **express-rate-limit** y aplicar límite global (100 req/15min por IP).
5. Crear `src/config/env.ts`: valida al arrancar que todas las variables críticas existen. Si falta alguna, el proceso termina con mensaje claro.
6. Crear `src/db/pool.ts`: reemplazar conexión simple por pool `mysql2/promise` con async/await.
7. Crear middleware `src/middleware/errorHandler.ts`: captura global, nunca expone stack trace al cliente.
8. Crear interfaces TypeScript en `src/models/`: `Cliente`, `Proceso`, `Usuario`, `Juzgado`, `Configuracion`.
9. Migrar **todos** los controllers existentes a async/await eliminando callbacks de mysql.

**Criterio de validación:**
- `npm run dev` arranca sin errores.
- `git log -p | grep -i password` no muestra ninguna credencial.
- Una petición a cualquier endpoint con input malformado devuelve error manejado, no stack trace.

**Commit recomendado:** `feat(security): blindaje base — env, pool, helmet, cors, rate-limit, error-handler`

---

## Hito 2 — Autenticación JWT

**Estado producido:** Solo usuarios autenticados acceden al sistema. Login protegido contra fuerza bruta.

**Tareas:**
1. Crear migración SQL `migrations/001_usuarios.sql`: tabla `usuarios` con campos id, nombre, email, password_hash, rol, activo, created_at.
2. Instalar `bcryptjs` + `jsonwebtoken` + sus tipos `@types/*`.
3. Crear script `scripts/seed-admin.ts`: crea el primer usuario admin. Contraseña leída de `.env` (no hardcodeada).
4. Crear endpoint `POST /api/v1/auth/login`: valida credenciales, devuelve JWT firmado con payload `{ id, email, rol }`.
5. Crear `src/middleware/auth.ts`: verifica JWT en header `Authorization: Bearer <token>`. Rechaza con 401 si inválido o expirado.
6. Crear `src/middleware/requireAdmin.ts`: verifica `rol === 'admin'` en el payload. Rechaza con 403 si no.
7. Aplicar `auth` middleware a **todas** las rutas existentes.
8. Aplicar rate limiting estricto en `/auth/login`: máx. 5 intentos / 15 minutos por IP.
9. Versionar rutas: `/api/clientes` → `/api/v1/clientes`, etc. (depende de tarea 7).

**Criterio de validación:**
- `POST /api/v1/auth/login` con credenciales correctas → 200 + token.
- `POST /api/v1/auth/login` con credenciales incorrectas → 401.
- Cualquier ruta sin token → 401.
- 6 intentos fallidos de login → 429 Too Many Requests.
- `GET /api/v1/clientes` con token válido → 200 con datos.

**Commit recomendado:** `feat(auth): JWT login + bcrypt + middleware auth/requireAdmin + rate-limit login`

---

## Hito 3 — CRUD completo y migración de base de datos

**Estado producido:** Todas las entidades tienen Create, Read, Update y Delete funcionales con validación de datos.

**Tareas:**
1. Crear migración `migrations/002_procesos_ampliado.sql`: agregar `fecha_audiencia`, `estado`, `notificado`, `updated_at` a tabla `procesos`.
2. Instalar `express-validator`. Crear `src/middleware/validate.ts`: wrapper que extrae errores y responde 400.
3. Completar CRUD **clientes**: agregar `PUT /api/v1/clientes/:id` y `DELETE /api/v1/clientes/:id` con validación.
4. Completar CRUD **procesos**: agregar `PUT /api/v1/procesos/:id` y `DELETE /api/v1/procesos/:id` con validación. El PUT incluye los nuevos campos.
5. Completar CRUD **juzgados**: agregar `PUT /api/v1/juzgados/:id` y `DELETE /api/v1/juzgados/:id`.
6. Agregar validación de inputs en **todos** los endpoints POST y PUT existentes (campos requeridos, tipos, longitudes máximas).
7. Verificar que el 100% de las queries usan parámetros preparados (`?`), ninguna concatena strings de usuario.

**Criterio de validación:**
- Postman: los 5 verbos HTTP funcionan correctamente en clientes, procesos y juzgados.
- POST con campo requerido vacío → 400 con mensaje descriptivo.
- PUT con `id` inexistente → 404.
- DELETE con `id` inexistente → 404.

**Commit recomendado:** `feat(crud): CRUD completo + validación inputs + migración procesos ampliado`

---

## Hito 3.5 — Panel de administración y configuración dinámica

**Estado producido:** El usuario admin puede configurar SMTP, WhatsApp, alertas y datos del despacho desde la UI. Las credenciales sensibles se guardan cifradas.

**Tareas:**
1. Crear migración `migrations/003_configuracion.sql`: tabla `configuracion` con claves predefinidas (seed inicial con valores por defecto vacíos).
2. Crear `src/services/configService.ts`: lee config de BD, descifra secretos con AES-256 (`ENCRYPTION_KEY` del `.env`), cachea en memoria con TTL de 5 minutos.
3. Crear rutas admin backend:
   - `GET /api/v1/admin/configuracion` → devuelve config (secretos enmascarados: `****`).
   - `PUT /api/v1/admin/configuracion` → actualiza claves, cifra secretos antes de guardar.
   Ambas rutas protegidas con `auth` + `requireAdmin`.
4. Crear rutas de gestión de usuarios (solo admin):
   - `GET /api/v1/admin/usuarios`
   - `POST /api/v1/admin/usuarios`
   - `PUT /api/v1/admin/usuarios/:id`
   - `DELETE /api/v1/admin/usuarios/:id` (soft delete: `activo = FALSE`)
5. Endpoint `POST /api/v1/admin/configuracion/test-email`: envía correo de prueba con la config actual.

**Criterio de validación:**
- Admin puede leer y actualizar configuración via API.
- Las contraseñas SMTP en BD están cifradas (verificar directamente en MySQL).
- Un usuario con rol `abogado` recibe 403 al intentar acceder a rutas `/admin/`.
- Endpoint de test-email envía correo real.

**Commit recomendado:** `feat(admin): panel configuración + configService AES-256 + gestión usuarios`

---

## Hito 4 — Notificaciones (Email + WhatsApp + Alertas automáticas)

**Estado producido:** El sistema notifica automáticamente al crear/actualizar procesos y alerta sobre audiencias próximas.

**Tareas:**
1. Crear `src/services/emailService.ts`: usa `configService` para obtener config SMTP en tiempo de ejecución. Función `enviarNotificacion(para, asunto, htmlBody)`.
2. Crear `src/services/whatsappService.ts`: genera link `wa.me/{numero}?text={mensaje}`. Mensaje usa plantilla configurable con variables `{{radicado}}`, `{{cliente}}`, `{{fecha_audiencia}}`, `{{estado}}`.
3. Crear `src/services/notificationService.ts`: orquesta email + WhatsApp. Devuelve resultado de cada canal. Si email falla, loguea y continúa (no cancela la operación principal).
4. Instalar `node-cron`. Crear `src/jobs/alertasAudiencias.ts`: cron job a la hora configurable, consulta procesos con `fecha_audiencia` entre hoy y hoy+N días donde `notificado = FALSE`, notifica y marca `notificado = TRUE`.
5. Conectar `notificationService` al controller de procesos en `POST` y `PUT /api/v1/procesos`.
6. Inicializar el cron job en `src/index.ts` al arrancar el servidor.

**Criterio de validación:**
- Al crear un proceso, se recibe correo en el destinatario configurado.
- La respuesta del POST incluye el link de WhatsApp generado.
- Al ejecutar el cron manualmente (invocar la función directamente), los procesos con audiencia próxima reciben notificación y `notificado` cambia a `TRUE`.
- Si el SMTP es inválido, el proceso se guarda igual y la respuesta incluye `{ advertencia: "No se pudo enviar el correo" }`.

**Commit recomendado:** `feat(notifications): email + whatsapp + cron alertas audiencias`

---

## Hito 5 — Frontend Vue 3 + Vite + Tailwind CSS

**Estado producido:** Interfaz moderna, responsive, conectada al API protegido, con login, dashboard y CRUD completo.

**Tareas:**
1. Crear proyecto `client/` con `npm create vite@latest client -- --template vue-ts`. Instalar Tailwind CSS, Vue Router 4, Pinia, Axios.
2. Configurar `client/vite.config.ts`: proxy `/api` → `http://localhost:3000` en desarrollo.
3. Crear **authStore** (Pinia): guarda JWT en `localStorage`, expone `isAuthenticated`, `usuario`, `esAdmin`. Método `logout()` limpia el storage.
4. Crear `client/src/router/index.ts`: guardia de navegación — redirige a `/login` si no hay token. Redirige a `/dashboard` si ya está autenticado y va a `/login`.
5. Crear `Login.vue`: formulario email/contraseña, llama al API, guarda token en authStore, redirige a dashboard.
6. Crear `MainLayout.vue`: sidebar con íconos y navegación (Dashboard, Clientes, Procesos, Juzgados, Admin), navbar con nombre de usuario y botón logout.
7. Crear `Dashboard.vue`: KPIs — procesos activos, audiencias próximas (7 días), clientes totales, procesos sin actualizar en +30 días. Cards con Tailwind.
8. Crear `Clientes.vue`: tabla con búsqueda, modal de creación/edición, confirmación de eliminación. Responsive.
9. Crear `Procesos.vue`: igual que clientes, con campos extendidos (fecha_audiencia, estado). Muestra link WhatsApp en la fila si está disponible.
10. Crear `Juzgados.vue`: CRUD de juzgados.
11. Crear `admin/Configuracion.vue` (solo visible para admin): formulario por secciones (Correo, WhatsApp, Alertas, Despacho). Botón "Probar correo".
12. Crear `admin/Usuarios.vue` (solo admin): listado, creación, edición de rol, desactivación.
13. Configurar Express en `src/index.ts` para servir `client/dist/` como estático en producción.

**Criterio de validación:**
- Login funciona. Token inválido redirige a `/login`.
- Un usuario `abogado` no ve el menú Admin.
- Dashboard muestra datos reales del API.
- CRUD completo funciona desde la UI en móvil y escritorio.
- `npm run build` (en `client/`) produce `dist/` sin errores.

**Commit recomendado:** `feat(frontend): Vue 3 + Tailwind — login, dashboard, CRUD, panel admin`

---

## Hito 6 — Testing y preparación para despliegue

**Estado producido:** El proyecto tiene tests básicos en verde y está listo para subir a producción.

**Tareas:**
1. Instalar Vitest + Supertest + `@vitest/coverage-v8`. Crear `vitest.config.ts` con entorno de test (`.env.test` con BD separada o mock).
2. Tests unitarios: `emailService` (mock Nodemailer), `configService` (mock de BD), middleware `auth` (token válido, inválido, expirado), middleware `requireAdmin` (rol admin, rol abogado).
3. Tests de integración con Supertest: `POST /api/v1/auth/login` (OK, credenciales malas, rate limit), CRUD completo de clientes (GET, POST, PUT, DELETE), CRUD de procesos.
4. Instalar PM2 globalmente. Crear `ecosystem.config.js` para arranque en producción con restart automático y logs rotativos.
5. Crear `README.md` completo: descripción, requisitos, setup paso a paso, variables de entorno, comandos, estructura de carpetas.
6. **Auditoría de seguridad final:**
   - `git log -p | grep -iE 'password|secret|key|token'` → sin coincidencias en el código.
   - Verificar que Helmet está activo: `curl -I http://localhost:3000` muestra `X-Content-Type-Options`, `X-Frame-Options`, etc.
   - Verificar que rutas sin token devuelven 401.
   - Verificar que rutas de admin con rol `abogado` devuelven 403.

**Criterio de validación:**
- `npm test` → todos los tests en verde, cobertura > 60%.
- `npm run build` → compila sin errores TypeScript.
- Checklist de seguridad completo ✅.

**Commit recomendado:** `feat(testing): suite Vitest + Supertest + PM2 config + README + auditoría seguridad`

---

## Dependencias entre hitos

```
Hito 1 (seguridad base)
  └── Hito 2 (auth JWT)
        └── Hito 3 (CRUD completo)
              └── Hito 3.5 (panel admin + configService)
                    └── Hito 4 (notificaciones)
                          └── Hito 5 (frontend Vue 3)
                                └── Hito 6 (testing + deploy)
```

---

## Checklist final del proyecto

- [ ] `npm test` pasa en verde
- [ ] `npm run build` compila sin errores
- [ ] `cd client && npm run build` compila sin errores
- [ ] README con instrucciones de setup completas
- [ ] `.env.example` documentado con todas las variables
- [ ] `.env` no aparece en `git log`
- [ ] No hay credenciales hardcodeadas en el código fuente
- [ ] Helmet activo (verificar headers HTTP)
- [ ] Rutas sin token devuelven 401
- [ ] Rutas admin con rol abogado devuelven 403
- [ ] `CLAUDE.md` actualizado con cambios finales
