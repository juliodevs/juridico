<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

// Sidebar colapsado en móvil
const sidebarOpen = ref(false)

function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar(): void {
    sidebarOpen.value = false
}

async function handleLogout(): Promise<void> {
    authStore.logout()
    await router.push('/login')
}

// ── Elementos del menú ────────────────────────────────────────────────────────

interface NavItem {
    name:  string
    path:  string
    label: string
}

const navItems: NavItem[] = [
    { name: 'Dashboard',        path: '/dashboard',          label: 'Dashboard'          },
    { name: 'Clientes',         path: '/clientes',           label: 'Clientes'           },
    { name: 'Procesos',         path: '/procesos',           label: 'Procesos'           },
    { name: 'Juzgados',         path: '/juzgados',           label: 'Juzgados'           },
    { name: 'ConsultaProcesos', path: '/consulta-procesos',  label: 'Consulta Rama Jud.' },
]

const adminItems: NavItem[] = [
    { name: 'AdminConfiguracion', path: '/admin/configuracion', label: 'Configuración' },
    { name: 'AdminUsuarios',      path: '/admin/usuarios',      label: 'Usuarios'      },
]

function isActive(path: string): boolean {
    return route.path.startsWith(path)
}
</script>

<template>
    <div class="flex h-screen bg-gray-50 overflow-hidden">

        <!-- ── Overlay para cerrar sidebar en móvil ───────────────────────── -->
        <div
            v-if="sidebarOpen"
            class="fixed inset-0 z-20 bg-black/50 lg:hidden"
            @click="closeSidebar"
        />

        <!-- ── Sidebar ────────────────────────────────────────────────────── -->
        <aside
            :class="[
                'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col',
                'transform transition-transform duration-300 ease-in-out',
                'lg:static lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            ]"
        >
            <!-- Logo del despacho -->
            <div class="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
                <div class="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-900 truncate">Sistema Jurídico</p>
                    <p class="text-xs text-gray-500 truncate">Gestión de Despacho</p>
                </div>
            </div>

            <!-- Navegación principal -->
            <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <router-link
                    v-for="item in navItems"
                    :key="item.name"
                    :to="item.path"
                    @click="closeSidebar"
                    :class="[
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive(item.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    ]"
                >
                    <!-- Íconos por sección -->
                    <template v-if="item.name === 'Dashboard'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </template>
                    <template v-else-if="item.name === 'Clientes'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </template>
                    <template v-else-if="item.name === 'Procesos'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </template>
                    <template v-else-if="item.name === 'Juzgados'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </template>
                    <template v-else-if="item.name === 'ConsultaProcesos'">
                        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                        </svg>
                    </template>
                    {{ item.label }}
                </router-link>

                <!-- Sección Admin (solo si es admin) -->
                <template v-if="authStore.esAdmin">
                    <div class="pt-4 pb-1 px-3">
                        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administración</p>
                    </div>
                    <router-link
                        v-for="item in adminItems"
                        :key="item.name"
                        :to="item.path"
                        @click="closeSidebar"
                        :class="[
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            isActive(item.path)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                        ]"
                    >
                        <template v-if="item.name === 'AdminConfiguracion'">
                            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </template>
                        <template v-else-if="item.name === 'AdminUsuarios'">
                            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </template>
                        {{ item.label }}
                    </router-link>
                </template>
            </nav>

            <!-- Usuario en pie del sidebar -->
            <div class="px-4 py-4 border-t border-gray-100">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-blue-700 text-sm font-semibold">
                            {{ authStore.nombreUsuario.charAt(0).toUpperCase() }}
                        </span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{{ authStore.nombreUsuario }}</p>
                        <p class="text-xs text-gray-500 capitalize">{{ authStore.usuario?.rol }}</p>
                    </div>
                </div>
            </div>
        </aside>

        <!-- ── Área principal ─────────────────────────────────────────────── -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

            <!-- Navbar superior -->
            <header class="bg-white border-b border-gray-200 flex items-center justify-between px-4 h-16 flex-shrink-0">
                <!-- Botón hamburguesa (solo en móvil) -->
                <button
                    class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
                    @click="toggleSidebar"
                    aria-label="Abrir menú"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <!-- Título de la página actual -->
                <h2 class="text-lg font-semibold text-gray-800 hidden lg:block">
                    {{ route.name as string ?? '' }}
                </h2>

                <!-- Acciones de usuario -->
                <div class="flex items-center gap-3 ml-auto">
                    <span class="hidden sm:block text-sm text-gray-600">
                        Bienvenido, <strong>{{ authStore.nombreUsuario }}</strong>
                    </span>
                    <button
                        @click="handleLogout"
                        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                        title="Cerrar sesión"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span class="hidden sm:inline">Salir</span>
                    </button>
                </div>
            </header>

            <!-- Contenido de la vista activa -->
            <main class="flex-1 overflow-y-auto p-6">
                <router-view />
            </main>
        </div>
    </div>
</template>
