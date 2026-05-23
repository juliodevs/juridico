# Project Brief — Sistema de Gestión Jurídica

> Versión: 1.0 · Fecha: 2026-05-23 · Autor: Julio (ESGInnova / Kantan Software)

---

## Idea

Refactorizar y extender un sistema web de gestión para despacho jurídico, haciéndolo seguro, mantenible y con notificaciones automáticas, un panel de administración configurable y un frontend moderno.

## Tipo

- [ ] Proyecto nuevo
- [x] Refactorización / extensión de: `c:\Users\DIANA\Julio\Proyectos\Juridico`

---

## Problema y usuarios

**Problema:** El sistema actual gestiona clientes, procesos y juzgados pero carece de seguridad (credenciales hardcodeadas, sin autenticación), tiene CRUD incompleto (faltan PUT y DELETE), usa callbacks en vez de async/await, no tiene validación de datos de entrada, y el frontend es HTML/CSS básico sin interactividad moderna. Además, las notificaciones WhatsApp son manuales (link desde el navegador) y no existe alerta automática de audiencias próximas.

**Usuarios / consumidores:** Equipo interno del despacho jurídico. Dos roles: `admin` (configura el sistema, gestiona usuarios) y `abogado` (gestiona clientes y procesos).

---

## Criterio de éxito

1. Ninguna credencial en código fuente. `.env` ignorado por git. Panel admin permite configurar SMTP, WhatsApp y alertas sin tocar archivos.
2. CRUD completo (GET, POST, PUT, DELETE) para clientes, procesos y juzgados, protegido por JWT.
3. Al crear o actualizar un proceso, el sistema envía notificación por correo y genera link WhatsApp automáticamente.
4. Cron job diario alerta por correo cuando hay audiencias en los próximos N días (N configurable desde el panel admin).
5. Frontend Vue 3 responsive con login, dashboard de KPIs, y vistas CRUD con diseño profesional (Tailwind CSS).
6. Suite de tests básica pasa en verde (`npm test`).

---

## Restricciones

- **Plazos:** sin fecha fija — desarrollo iterativo por hitos.
- **Entorno actual:** local (Windows). Destino final: despliegue web (VPS o plataforma cloud).
- **Integraciones obligatorias:** MySQL (existente), SMTP configurable, WhatsApp link (wa.me).
- **Normativa:** manejo cuidadoso de datos personales (clientes del despacho).
- **Otras:** el número de WhatsApp y las credenciales SMTP deben ser configurables por el admin desde la UI, NO hardcodeados.

---

## Stack confirmado

| Capa | Tecnología |
|---|---|
| Backend | Node.js LTS + TypeScript + Express 4 |
| Base de datos | MySQL 8 — pool mysql2/promise |
| Autenticación | JWT + bcryptjs |
| Seguridad HTTP | Helmet.js + CORS + express-rate-limit |
| Validación | express-validator |
| Notificaciones | Nodemailer (SMTP) + WhatsApp link (wa.me) |
| Tareas programadas | node-cron |
| Tests | Vitest + Supertest |
| Frontend | Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router |

---

## Entorno de ejecución

Desarrollo local (Windows, Node.js). Producción: servidor web (Linux VPS o plataforma como Railway/Render). El frontend compilado (`client/dist/`) es servido por Express como archivos estáticos.

---

## Supuestos

- La tabla `procesos` actual solo tiene: `sujetosProcesales`, `radicado`, `juzgado`, `idCliente`. Se agregarán `fecha_audiencia`, `estado`, `notificado`, `updated_at` vía migración.
- El cliente de WhatsApp actual (link `wa.me`) se mantiene en Fase A. Integración con API de Twilio queda para Fase B.
- La tabla `configuracion` almacena las credenciales SMTP cifradas con AES-256 usando `ENCRYPTION_KEY` del `.env`.
- Un usuario admin inicial se crea vía script de seed antes de la primera sesión.
