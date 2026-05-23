<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
    total_clientes:          number
    procesos_activos:        number
    audiencias_proximas:     number
    procesos_sin_actualizar: number
}

// ── Estado ─────────────────────────────────────────────────────────────────────

const stats   = ref<DashboardStats | null>(null)
const loading = ref(true)
const error   = ref('')

// ── Cargar KPIs ────────────────────────────────────────────────────────────────

async function cargarStats(): Promise<void> {
    loading.value = true
    error.value   = ''
    try {
        const response = await axios.get<DashboardStats>('/api/v1/dashboard/stats', {
            headers: { Authorization: `Bearer ${authStore.token}` },
        })
        stats.value = response.data
    } catch (err: unknown) {
        error.value = 'No se pudieron cargar las estadísticas. Verifica la conexión al servidor.'
        console.error('[Dashboard] Error al cargar stats:', err)
    } finally {
        loading.value = false
    }
}

onMounted(cargarStats)

// ── Definición de tarjetas KPI ────────────────────────────────────────────────

interface KpiCard {
    key:         keyof DashboardStats
    label:       string
    descripcion: string
    colorClass:  string
    bgClass:     string
    iconPath:    string
}

const kpiCards: KpiCard[] = [
    {
        key:         'total_clientes',
        label:       'Total Clientes',
        descripcion: 'Clientes registrados',
        colorClass:  'text-blue-600',
        bgClass:     'bg-blue-50',
        iconPath:    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
        key:         'procesos_activos',
        label:       'Procesos Activos',
        descripcion: 'En curso actualmente',
        colorClass:  'text-green-600',
        bgClass:     'bg-green-50',
        iconPath:    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
        key:         'audiencias_proximas',
        label:       'Audiencias Próximas',
        descripcion: 'En los próximos 7 días',
        colorClass:  'text-amber-600',
        bgClass:     'bg-amber-50',
        iconPath:    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
        key:         'procesos_sin_actualizar',
        label:       'Sin Actualizar',
        descripcion: 'Procesos con +30 días sin cambios',
        colorClass:  'text-red-600',
        bgClass:     'bg-red-50',
        iconPath:    'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
]
</script>

<template>
    <div>
        <!-- Encabezado -->
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p class="text-gray-500 text-sm mt-1">Resumen general del despacho jurídico</p>
        </div>

        <!-- Estado de carga -->
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div
                v-for="i in 4"
                :key="i"
                class="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-gray-100 rounded-xl" />
                    <div class="flex-1 space-y-2">
                        <div class="h-4 bg-gray-100 rounded w-3/4" />
                        <div class="h-7 bg-gray-100 rounded w-1/2" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Error -->
        <div
            v-else-if="error"
            class="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3 text-red-700"
        >
            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd" />
            </svg>
            <div>
                <p class="font-medium">Error al cargar estadísticas</p>
                <p class="text-sm mt-0.5">{{ error }}</p>
            </div>
            <button
                @click="cargarStats"
                class="ml-auto text-sm underline hover:no-underline"
            >
                Reintentar
            </button>
        </div>

        <!-- Tarjetas KPI -->
        <div v-else-if="stats" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div
                v-for="card in kpiCards"
                :key="card.key"
                class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
                <div class="flex items-center gap-4">
                    <!-- Ícono -->
                    <div :class="['w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', card.bgClass]">
                        <svg :class="['w-6 h-6', card.colorClass]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="card.iconPath" />
                        </svg>
                    </div>
                    <!-- Texto -->
                    <div class="min-w-0">
                        <p class="text-sm text-gray-500 truncate">{{ card.label }}</p>
                        <p :class="['text-3xl font-bold', card.colorClass]">
                            {{ stats[card.key] }}
                        </p>
                        <p class="text-xs text-gray-400 mt-0.5">{{ card.descripcion }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Panel de bienvenida (visible siempre que haya datos) -->
        <div v-if="stats && !loading" class="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">
                Bienvenido al Sistema de Gestión Jurídica
            </h2>
            <p class="text-gray-500 text-sm">
                Estás conectado como
                <strong class="text-gray-700">{{ authStore.nombreUsuario }}</strong>
                <span class="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="authStore.esAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'">
                    {{ authStore.usuario?.rol }}
                </span>
            </p>
            <div v-if="stats.audiencias_proximas > 0" class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clip-rule="evenodd" />
                </svg>
                Tienes <strong class="mx-1">{{ stats.audiencias_proximas }}</strong>
                audiencia{{ stats.audiencias_proximas !== 1 ? 's' : '' }} programada{{ stats.audiencias_proximas !== 1 ? 's' : '' }} en los próximos 7 días.
            </div>
        </div>
    </div>
</template>
