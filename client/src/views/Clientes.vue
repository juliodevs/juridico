<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'
import BaseModal from '../components/BaseModal.vue'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Cliente {
    id:               number
    numero_documento: string
    nombre:           string
    apellidos:        string
    telefono:         string | null
    email:            string | null
    ciudad:           string | null
    direccion:        string | null
    radicado:         string | null
}

type ClienteForm = Omit<Cliente, 'id'> & { id?: number }

// ── Estado ─────────────────────────────────────────────────────────────────────
const clientes   = ref<Cliente[]>([])
const loading    = ref(true)
const errorPage  = ref('')
const searchTerm = ref('')

// Modal crear/editar
const modalOpen = ref(false)
const modalMode = ref<'crear' | 'editar'>('crear')
const saving    = ref(false)
const saveError = ref('')
const form      = ref<ClienteForm>(nuevoForm())

// Modal eliminar
const deleteOpen     = ref(false)
const deleting       = ref(false)
const clienteABorrar = ref<Cliente | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────
function nuevoForm(): ClienteForm {
    return { numero_documento: '', nombre: '', apellidos: '',
             telefono: null, email: null, ciudad: null, direccion: null, radicado: null }
}

// ── Computed ──────────────────────────────────────────────────────────────────
const clientesFiltrados = computed(() => {
    const q = searchTerm.value.toLowerCase().trim()
    if (!q) return clientes.value
    return clientes.value.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.apellidos.toLowerCase().includes(q) ||
        c.numero_documento.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    )
})

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cargarClientes(): Promise<void> {
    loading.value  = true
    errorPage.value = ''
    try {
        const { data } = await api.get<Cliente[]>('/clientes')
        clientes.value = data
    } catch {
        errorPage.value = 'No se pudieron cargar los clientes.'
    } finally {
        loading.value = false
    }
}

function abrirCrear(): void {
    modalMode.value = 'crear'
    form.value      = nuevoForm()
    saveError.value = ''
    modalOpen.value = true
}

function abrirEditar(c: Cliente): void {
    modalMode.value = 'editar'
    form.value      = { ...c }
    saveError.value = ''
    modalOpen.value = true
}

async function guardar(): Promise<void> {
    saving.value    = true
    saveError.value = ''
    try {
        if (modalMode.value === 'crear') {
            await api.post('/clientes', form.value)
        } else {
            await api.put(`/clientes/${form.value.id}`, form.value)
        }
        modalOpen.value = false
        await cargarClientes()
    } catch (err: unknown) {
        const e = err as { response?: { data?: { errors?: { msg: string }[]; error?: string } } }
        saveError.value = e.response?.data?.errors?.[0]?.msg
            ?? e.response?.data?.error
            ?? 'Error al guardar el cliente.'
    } finally {
        saving.value = false
    }
}

function confirmarEliminar(c: Cliente): void {
    clienteABorrar.value = c
    deleteOpen.value     = true
}

async function eliminar(): Promise<void> {
    if (!clienteABorrar.value) return
    deleting.value = true
    try {
        await api.delete(`/clientes/${clienteABorrar.value.id}`)
        deleteOpen.value = false
        await cargarClientes()
    } catch {
        // el interceptor de api.ts maneja 401
    } finally {
        deleting.value = false
    }
}

onMounted(cargarClientes)
</script>

<template>
    <div>
        <!-- Encabezado + acciones -->
        <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
                <p class="text-gray-500 text-sm mt-0.5">{{ clientes.length }} registros en total</p>
            </div>
            <button
                @click="abrirCrear"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Cliente
            </button>
        </div>

        <!-- Barra de búsqueda -->
        <div class="relative mb-5">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
                v-model="searchTerm"
                type="search"
                placeholder="Buscar por nombre, apellidos o documento…"
                class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
        </div>

        <!-- Error de carga -->
        <div v-if="errorPage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {{ errorPage }}
            <button @click="cargarClientes" class="ml-2 underline">Reintentar</button>
        </div>

        <!-- Skeleton de carga -->
        <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div v-for="i in 5" :key="i" class="flex gap-4 px-6 py-4 border-b last:border-0 animate-pulse">
                <div class="h-4 bg-gray-100 rounded w-24" />
                <div class="h-4 bg-gray-100 rounded w-32 flex-1" />
                <div class="h-4 bg-gray-100 rounded w-20" />
            </div>
        </div>

        <!-- Tabla -->
        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full table-fixed divide-y divide-gray-100">
                    <colgroup>
                        <col class="w-32" />
                        <col />
                        <col />
                        <col class="w-28 hidden md:table-column" />
                        <col class="hidden lg:table-column" />
                        <col class="w-24 hidden lg:table-column" />
                        <col class="w-20" />
                    </colgroup>
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Documento</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Apellidos</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Teléfono</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Email</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Ciudad</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="clientesFiltrados.length === 0">
                            <td colspan="7" class="px-6 py-10 text-center text-gray-400 text-sm">
                                {{ searchTerm ? 'No se encontraron clientes con ese criterio.' : 'No hay clientes registrados.' }}
                            </td>
                        </tr>
                        <tr v-for="c in clientesFiltrados" :key="c.id" class="hover:bg-gray-50 transition">
                            <td class="px-4 py-3 text-sm text-gray-900 font-medium">{{ c.numero_documento }}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">{{ c.nombre }}</td>
                            <td class="px-4 py-3 text-sm text-gray-900">{{ c.apellidos }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{{ c.telefono ?? '—' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell truncate" :title="c.email ?? ''">{{ c.email ?? '—' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{{ c.ciudad ?? '—' }}</td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button @click="abrirEditar(c)" class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button @click="confirmarEliminar(c)" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition" title="Eliminar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ── Modal Crear / Editar ───────────────────────────────────────── -->
        <BaseModal
            :open="modalOpen"
            :title="modalMode === 'crear' ? 'Nuevo Cliente' : 'Editar Cliente'"
            @close="modalOpen = false"
        >
            <form @submit.prevent="guardar" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">No. Documento *</label>
                        <input v-model="form.numero_documento" required maxlength="20"
                            class="input-field" placeholder="Ej: 10987654321" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Radicado</label>
                        <input v-model="form.radicado" maxlength="100"
                            class="input-field" placeholder="Opcional" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                        <input v-model="form.nombre" required maxlength="100"
                            class="input-field" placeholder="Nombres del cliente" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                        <input v-model="form.apellidos" required maxlength="100"
                            class="input-field" placeholder="Apellidos del cliente" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input v-model="form.telefono" type="tel" maxlength="20"
                            class="input-field" placeholder="Ej: 3001234567" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input v-model="form.email" type="email" maxlength="150"
                            class="input-field" placeholder="correo@ejemplo.com" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                        <input v-model="form.ciudad" maxlength="100"
                            class="input-field" placeholder="Ej: Medellín" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input v-model="form.direccion" maxlength="200"
                            class="input-field" placeholder="Dirección completa" />
                    </div>
                </div>

                <div v-if="saveError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {{ saveError }}
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" @click="modalOpen = false"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                        Cancelar
                    </button>
                    <button type="submit" :disabled="saving"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition flex items-center gap-2">
                        <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z"/>
                        </svg>
                        {{ saving ? 'Guardando…' : (modalMode === 'crear' ? 'Crear Cliente' : 'Guardar Cambios') }}
                    </button>
                </div>
            </form>
        </BaseModal>

        <!-- ── Modal Confirmar Eliminar ───────────────────────────────────── -->
        <BaseModal :open="deleteOpen" title="Confirmar eliminación" size="sm" @close="deleteOpen = false">
            <p class="text-gray-600 text-sm mb-5">
                ¿Estás seguro de que deseas eliminar al cliente
                <strong class="text-gray-900">{{ clienteABorrar?.nombre }} {{ clienteABorrar?.apellidos }}</strong>?
                Esta acción no se puede deshacer.
            </p>
            <div class="flex justify-end gap-3">
                <button @click="deleteOpen = false"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    Cancelar
                </button>
                <button @click="eliminar" :disabled="deleting"
                    class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition">
                    {{ deleting ? 'Eliminando…' : 'Eliminar' }}
                </button>
            </div>
        </BaseModal>
    </div>
</template>

<style scoped>
.input-field {
    @apply w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition;
}
</style>
