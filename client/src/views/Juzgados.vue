<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import api from '../services/api'
import BaseModal from '../components/BaseModal.vue'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Juzgado {
    id:              number
    juzgado:         string
    juez:            string | null
    email:           string | null
    direccion:       string | null
    telefono:        string | null
    departamento_id: number
    ciudad_id:       number
    departamento:    string
    ciudad:          string
}

interface Departamento { id: number; nombre: string }
interface Ciudad       { id: number; nombre: string }

type JuzgadoForm = {
    id?:          number
    juzgado:      string
    juez:         string
    email:        string
    direccion:    string
    telefono:     string
    departamento: number
    ciudad:       number
}

// ── Estado ─────────────────────────────────────────────────────────────────────
const juzgados      = ref<Juzgado[]>([])
const departamentos = ref<Departamento[]>([])
const ciudades      = ref<Ciudad[]>([])
const busqueda      = ref('')
const loading       = ref(true)
const errorPage     = ref('')

const modalOpen = ref(false)
const modalMode = ref<'crear' | 'editar'>('crear')
const saving    = ref(false)
const saveError = ref('')
const form      = ref<JuzgadoForm>(nuevoForm())

const deleteOpen      = ref(false)
const deleting        = ref(false)
const juzgadoABorrar  = ref<Juzgado | null>(null)
const loadingCiudades = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────────
function nuevoForm(): JuzgadoForm {
    return { juzgado: '', juez: '', email: '', direccion: '', telefono: '', departamento: 0, ciudad: 0 }
}

// ── Computed ──────────────────────────────────────────────────────────────────
const juzgadosFiltrados = computed(() => {
    const q = busqueda.value.trim().toLowerCase()
    if (!q) return juzgados.value
    return juzgados.value.filter(j =>
        j.juzgado.toLowerCase().includes(q) ||
        (j.juez?.toLowerCase().includes(q) ?? false) ||
        j.departamento.toLowerCase().includes(q) ||
        j.ciudad.toLowerCase().includes(q) ||
        (j.telefono?.toLowerCase().includes(q) ?? false)
    )
})

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(() => form.value.departamento, async (depId) => {
    if (!depId) { ciudades.value = []; return }
    loadingCiudades.value = true
    try {
        const { data } = await api.get<Ciudad[]>(`/departamentos/${depId}/ciudades`)
        ciudades.value    = data
        form.value.ciudad = 0
    } finally {
        loadingCiudades.value = false
    }
})

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cargar(): Promise<void> {
    loading.value   = true
    errorPage.value = ''
    try {
        const [jRes, dRes] = await Promise.all([
            api.get<Juzgado[]>('/juzgados'),
            api.get<Departamento[]>('/departamentos'),
        ])
        juzgados.value      = jRes.data
        departamentos.value = dRes.data
    } catch {
        errorPage.value = 'No se pudieron cargar los juzgados.'
    } finally {
        loading.value = false
    }
}

async function abrirCrear(): Promise<void> {
    modalMode.value = 'crear'
    form.value      = nuevoForm()
    ciudades.value  = []
    saveError.value = ''
    modalOpen.value = true
}

async function abrirEditar(j: Juzgado): Promise<void> {
    modalMode.value = 'editar'
    // Cargar ciudades del departamento del juzgado
    loadingCiudades.value = true
    try {
        const { data } = await api.get<Ciudad[]>(`/departamentos/${j.departamento_id}/ciudades`)
        ciudades.value = data
    } finally {
        loadingCiudades.value = false
    }
    form.value = {
        id:          j.id,
        juzgado:     j.juzgado,
        juez:        j.juez       ?? '',
        email:       j.email      ?? '',
        direccion:   j.direccion  ?? '',
        telefono:    j.telefono   ?? '',
        departamento: j.departamento_id,
        ciudad:       j.ciudad_id,
    }
    saveError.value = ''
    modalOpen.value = true
}

async function guardar(): Promise<void> {
    saving.value    = true
    saveError.value = ''
    try {
        if (modalMode.value === 'crear') {
            await api.post('/juzgados', form.value)
        } else {
            await api.put(`/juzgados/${form.value.id}`, form.value)
        }
        modalOpen.value = false
        await cargar()
    } catch (err: unknown) {
        const e = err as { response?: { data?: { errors?: { msg: string }[]; error?: string } } }
        saveError.value = e.response?.data?.errors?.[0]?.msg
            ?? e.response?.data?.error
            ?? 'Error al guardar el juzgado.'
    } finally {
        saving.value = false
    }
}

function confirmarEliminar(j: Juzgado): void {
    juzgadoABorrar.value = j
    deleteOpen.value     = true
}

async function eliminar(): Promise<void> {
    if (!juzgadoABorrar.value) return
    deleting.value = true
    try {
        await api.delete(`/juzgados/${juzgadoABorrar.value.id}`)
        deleteOpen.value = false
        await cargar()
    } finally {
        deleting.value = false
    }
}

onMounted(cargar)
</script>

<template>
    <div>
        <!-- Encabezado -->
        <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Juzgados</h1>
                <p class="text-gray-500 text-sm mt-0.5">{{ juzgados.length }} juzgados registrados</p>
            </div>
            <button @click="abrirCrear"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Juzgado
            </button>
        </div>

        <!-- Barra de búsqueda -->
        <div class="mb-5">
            <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                </svg>
                <input
                    v-model="busqueda"
                    type="text"
                    placeholder="Buscar por nombre, juez, departamento o ciudad…"
                    class="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
                <button v-if="busqueda" @click="busqueda = ''"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <div v-if="errorPage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {{ errorPage }} <button @click="cargar" class="ml-2 underline">Reintentar</button>
        </div>

        <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200">
            <div v-for="i in 4" :key="i" class="flex gap-4 px-6 py-4 border-b last:border-0 animate-pulse">
                <div class="h-4 bg-gray-100 rounded flex-1" />
                <div class="h-4 bg-gray-100 rounded w-24" />
            </div>
        </div>

        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Juzgado</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Juez</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Teléfono</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Departamento</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Ciudad</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="juzgadosFiltrados.length === 0">
                            <td colspan="6" class="px-6 py-10 text-center text-gray-400 text-sm">
                                {{ busqueda ? 'No se encontraron juzgados con ese criterio.' : 'No hay juzgados registrados.' }}
                            </td>
                        </tr>
                        <tr v-for="j in juzgadosFiltrados" :key="j.id" class="hover:bg-gray-50 transition">
                            <td class="px-4 py-3 text-sm text-gray-900 font-medium">{{ j.juzgado }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{{ j.juez ?? '—' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{{ j.telefono ?? '—' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{{ j.departamento }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{{ j.ciudad }}</td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button @click="abrirEditar(j)" class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button @click="confirmarEliminar(j)" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition" title="Eliminar">
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
        <BaseModal :open="modalOpen" :title="modalMode === 'crear' ? 'Nuevo Juzgado' : 'Editar Juzgado'" @close="modalOpen = false">
            <form @submit.prevent="guardar" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Juzgado *</label>
                    <input v-model="form.juzgado" required maxlength="200" class="input-field" placeholder="Ej: Juzgado 1 Civil del Circuito de Medellín" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
                        <select v-model.number="form.departamento" required class="input-field">
                            <option :value="0" disabled>Selecciona departamento</option>
                            <option v-for="d in departamentos" :key="d.id" :value="d.id">{{ d.nombre }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                        <select v-model.number="form.ciudad" required class="input-field" :disabled="!form.departamento || loadingCiudades">
                            <option :value="0" disabled>
                                {{ loadingCiudades ? 'Cargando…' : 'Selecciona ciudad' }}
                            </option>
                            <option v-for="c in ciudades" :key="c.id" :value="c.id">{{ c.nombre }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Juez</label>
                        <input v-model="form.juez" maxlength="150" class="input-field" placeholder="Nombre del juez" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input v-model="form.telefono" maxlength="20" class="input-field" placeholder="Ej: 6042345678" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input v-model="form.email" type="email" maxlength="150" class="input-field" placeholder="juzgado@mail.com" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input v-model="form.direccion" maxlength="200" class="input-field" placeholder="Dirección del juzgado" />
                    </div>
                </div>

                <div v-if="saveError" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{{ saveError }}</div>

                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" @click="modalOpen = false"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
                    <button type="submit" :disabled="saving"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition flex items-center gap-2">
                        <svg v-if="saving" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z"/>
                        </svg>
                        {{ saving ? 'Guardando…' : (modalMode === 'crear' ? 'Crear Juzgado' : 'Guardar Cambios') }}
                    </button>
                </div>
            </form>
        </BaseModal>

        <!-- ── Modal Eliminar ─────────────────────────────────────────────── -->
        <BaseModal :open="deleteOpen" title="Confirmar eliminación" size="sm" @close="deleteOpen = false">
            <p class="text-gray-600 text-sm mb-5">
                ¿Eliminar el juzgado <strong class="text-gray-900">{{ juzgadoABorrar?.juzgado }}</strong>?
                Esta acción no se puede deshacer.
            </p>
            <div class="flex justify-end gap-3">
                <button @click="deleteOpen = false"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Cancelar</button>
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
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition
           disabled:bg-gray-50 disabled:text-gray-400;
}
</style>
