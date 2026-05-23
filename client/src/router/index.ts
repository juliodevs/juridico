import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

// ── Definición de rutas ────────────────────────────────────────────────────────

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // ── Página pública ─────────────────────────────────────────────────────
        {
            path: '/login',
            name: 'Login',
            component: () => import('../views/Login.vue'),
        },

        // ── Rutas protegidas bajo el layout principal ──────────────────────────
        {
            path: '/',
            component: () => import('../layouts/MainLayout.vue'),
            children: [
                {
                    path: '',
                    redirect: '/dashboard',
                },
                {
                    path: 'dashboard',
                    name: 'Dashboard',
                    component: () => import('../views/Dashboard.vue'),
                },
                {
                    path: 'clientes',
                    name: 'Clientes',
                    component: () => import('../views/Clientes.vue'),
                },
                {
                    path: 'procesos',
                    name: 'Procesos',
                    component: () => import('../views/Procesos.vue'),
                },
                {
                    path: 'juzgados',
                    name: 'Juzgados',
                    component: () => import('../views/Juzgados.vue'),
                },
                {
                    path: 'admin/configuracion',
                    name: 'AdminConfiguracion',
                    component: () => import('../views/admin/Configuracion.vue'),
                    meta: { requiresAdmin: true },
                },
                {
                    path: 'admin/usuarios',
                    name: 'AdminUsuarios',
                    component: () => import('../views/admin/Usuarios.vue'),
                    meta: { requiresAdmin: true },
                },
            ],
        },

        // ── Catch-all → redirige al dashboard ─────────────────────────────────
        {
            path: '/:pathMatch(.*)*',
            redirect: '/dashboard',
        },
    ],
})

// ── Guardia de navegación global ───────────────────────────────────────────────

router.beforeEach((to) => {
    const auth = useAuthStore()

    // Ya autenticado y va a /login → dashboard
    if (to.name === 'Login' && auth.isAuthenticated) {
        return { name: 'Dashboard' }
    }

    // No autenticado y va a ruta protegida → login
    if (to.name !== 'Login' && !auth.isAuthenticated) {
        return { name: 'Login' }
    }

    // Ruta de admin y no es admin → dashboard
    if (to.meta.requiresAdmin && !auth.esAdmin) {
        return { name: 'Dashboard' }
    }
})

export default router
