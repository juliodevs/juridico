<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'
import BaseModal from '../components/BaseModal.vue'
import TextoExpandible from '../components/TextoExpandible.vue'

// ── Tipos ──────────────────────────────────────────────────────────────────────
type EstadoProceso = 'activo' | 'cerrado' | 'suspendido'

interface Proceso {
    idproceso:             number
    sujetosProcesales:     string
    radicado:              string
    juzgado:               string
    idCliente:             number
    fecha_audiencia:       string | null
    estado:                EstadoProceso
    nombreCompletoCliente: string | null
}

interface ClienteSimple {
    id:       number
    nombre:   string
    apellidos: string
}

type ProcesoForm = Omit<Proceso, 'idproceso' | 'nombreCompletoCliente'> & { idproceso?: number }

// ── Estado ─────────────────────────────────────────────────────────────────────
const procesos      = ref<Proceso[]>([])
const clientes      = ref<ClienteSimple[]>([])
const filtroEstado  = ref<'todos' | EstadoProceso>('todos')
const busqueda      = ref('')
const loading       = ref(true)
const errorPage     = ref('')
const whatsappLink  = ref<string | null>(null)

const modalOpen = ref(false)
const modalMode = ref<'crear' | 'editar'>('crear')
const saving    = ref(false)
const saveError = ref('')
const form      = ref<ProcesoForm>(nuevoForm())

const deleteOpen     = ref(false)
const deleting       = ref(false)
const procesoABorrar = ref<Proceso | null>(null)

// ── Helpers ───────────────────────────────────────────────────────────────────
function nuevoForm(): ProcesoForm {
    return { sujetosProcesales: '', radicado: '', juzgado: '',
             idCliente: 0, fecha_audiencia: null, estado: 'activo' }
}

const badgeClasses: Record<EstadoProceso, string> = {
    activo:     'bg-green-100 text-green-700',
    suspendido: 'bg-yellow-100 text-yellow-700',
    cerrado:    'bg-gray-100 text-gray-600',
}

// ── Computed ──────────────────────────────────────────────────────────────────
const procesosFiltrados = computed(() => {
    const porEstado = filtroEstado.value === 'todos'
        ? procesos.value
        : procesos.value.filter(p => p.estado === filtroEstado.value)

    const q = busqueda.value.trim().toLowerCase()
    if (!q) return porEstado

    return porEstado.filter(p =>
        p.radicado.toLowerCase().includes(q) ||
        p.sujetosProcesales.toLowerCase().includes(q) ||
        p.juzgado.toLowerCase().includes(q) ||
        (p.nombreCompletoCliente?.toLowerCase().includes(q) ?? false)
    )
})

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cargar(): Promise<void> {
    loading.value   = true
    errorPage.value = ''
    try {
        const [pRes, cRes] = await Promise.all([
            api.get<Proceso[]>('/procesos'),
            api.get<ClienteSimple[]>('/clientes'),
        ])
        procesos.value = pRes.data
        clientes.value = cRes.data
    } catch {
        errorPage.value = 'No se pudieron cargar los procesos.'
    } finally {
        loading.value = false
    }
}

function abrirCrear(): void {
    modalMode.value = 'crear'
    form.value      = nuevoForm()
    saveError.value = ''
    whatsappLink.value = null
    modalOpen.value = true
}

function abrirEditar(p: Proceso): void {
    modalMode.value = 'editar'
    form.value = {
        idproceso:         p.idproceso,
        sujetosProcesales: p.sujetosProcesales,
        radicado:          p.radicado,
        juzgado:           p.juzgado,
        idCliente:         p.idCliente,
        fecha_audiencia:   p.fecha_audiencia,
        estado:            p.estado,
    }
    saveError.value    = ''
    whatsappLink.value = null
    modalOpen.value    = true
}

async function guardar(): Promise<void> {
    saving.value    = true
    saveError.value = ''
    whatsappLink.value = null
    try {
        let data: { whatsappLink?: string | null }
        if (modalMode.value === 'crear') {
            const res = await api.post<{ whatsappLink?: string | null }>('/procesos', form.value)
            data = res.data
        } else {
            const res = await api.put<{ whatsappLink?: string | null }>(`/procesos/${form.value.idproceso}`, form.value)
            data = res.data
        }
        if (data.whatsappLink) {
            whatsappLink.value = data.whatsappLink
        } else {
            modalOpen.value = false
        }
        await cargar()
    } catch (err: unknown) {
        const e = err as { response?: { data?: { errors?: { msg: string }[]; error?: string } } }
        saveError.value = e.response?.data?.errors?.[0]?.msg
            ?? e.response?.data?.error
            ?? 'Error al guardar el proceso.'
    } finally {
        saving.value = false
    }
}

function confirmarEliminar(p: Proceso): void {
    procesoABorrar.value = p
    deleteOpen.value     = true
}

async function eliminar(): Promise<void> {
    if (!procesoABorrar.value) return
    deleting.value = true
    try {
        await api.delete(`/procesos/${procesoABorrar.value.idproceso}`)
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
                <h1 class="text-2xl font-bold text-gray-900">Procesos</h1>
                <p class="text-gray-500 text-sm mt-0.5">{{ procesos.length }} procesos en total</p>
            </div>
            <button @click="abrirCrear"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Proceso
            </button>
        </div>

        <!-- Barra de búsqueda -->
        <div class="mb-4">
            <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                </svg>
                <input
                    v-model="busqueda"
                    type="text"
                    placeholder="Buscar por radicado, contraparte, juzgado o cliente…"
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

        <!-- Filtros de estado -->
        <div class="flex gap-2 mb-5 flex-wrap">
            <button
                v-for="opt in [
                    { val: 'todos', label: 'Todos' },
                    { val: 'activo', label: 'Activos' },
                    { val: 'suspendido', label: 'Suspendidos' },
                    { val: 'cerrado', label: 'Cerrados' },
                ]"
                :key="opt.val"
                @click="filtroEstado = (opt.val as 'todos' | EstadoProceso)"
                :class="[
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                    filtroEstado === opt.val
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
                ]"
            >{{ opt.label }}</button>
        </div>

        <!-- Error -->
        <div v-if="errorPage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {{ errorPage }} <button @click="cargar" class="ml-2 underline">Reintentar</button>
        </div>

        <!-- Skeleton -->
        <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200">
            <div v-for="i in 5" :key="i" class="flex gap-4 px-6 py-4 border-b last:border-0 animate-pulse">
                <div class="h-4 bg-gray-100 rounded w-32 flex-1" />
                <div class="h-4 bg-gray-100 rounded w-24" />
                <div class="h-6 bg-gray-100 rounded-full w-16" />
            </div>
        </div>

        <!-- Tabla -->
        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full table-fixed divide-y divide-gray-100">
                    <colgroup>
                        <col class="w-36" />
                        <col />
                        <col />
                        <col class="w-32 hidden lg:table-column" />
                        <col class="w-24 hidden lg:table-column" />
                        <col class="w-24" />
                        <col class="w-20" />
                    </colgroup>
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Radicado</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contraparte</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Juzgado</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Cliente</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Audiencia</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="procesosFiltrados.length === 0">
                            <td colspan="7" class="px-6 py-10 text-center text-gray-400 text-sm">
                                {{ busqueda ? 'No se encontraron procesos con ese criterio.' : 'No hay procesos con el filtro seleccionado.' }}
                            </td>
                        </tr>
                        <tr v-for="p in procesosFiltrados" :key="p.idproceso" class="hover:bg-gray-50 transition">
                            <td class="px-4 py-3 text-xs text-gray-900 font-medium font-mono break-all">{{ p.radicado }}</td>
                            <td class="px-4 py-3 text-sm text-gray-700">
                                <TextoExpandible :texto="p.sujetosProcesales" :limite="50" />
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                                <TextoExpandible :texto="p.juzgado" :limite="45" />
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{{ p.nombreCompletoCliente ?? '—' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">
                                {{ p.fecha_audiencia ? new Date(p.fecha_audiencia).toLocaleDateString('es-CO') : '—' }}
                            </td>
                            <td class="px-4 py-3">
                                <span :class="['inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', badgeClasses[p.estado]]">
                                    {{ p.estado }}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <button @click="abrirEditar(p)" class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition" title="Editar">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    <button @click="confirmarEliminar(p)" class="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition" title="Eliminar">
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
            :title="modalMode === 'crear' ? 'Nuevo Proceso' : 'Editar Proceso'"
            size="lg"
            @close="modalOpen = false"
        >
            <!-- Link WhatsApp después de guardar -->
            <div v-if="whatsappLink" class="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p class="text-green-800 text-sm font-medium mb-2">✅ Proceso guardado exitosamente</p>
                <a :href="whatsappLink" target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.099 1.508 5.819L.057 23.625c-.069.259.046.534.277.665.11.063.232.094.352.094.092 0 .185-.019.271-.058l6.003-2.376A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.874a9.875 9.875 0 01-5.033-1.381l-.38-.228-3.946 1.561 1.592-3.833-.249-.393A9.843 9.843 0 012.126 12C2.126 6.544 6.544 2.126 12 2.126S21.874 6.544 21.874 12 17.456 21.874 12 21.874z"/>
                    </svg>
                    Abrir en WhatsApp
                </a>
                <button @click="modalOpen = false" class="ml-3 text-sm text-green-700 underline">Cerrar</button>
            </div>

            <form v-else @submit.prevent="guardar" class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Sujetos Procesales (Contraparte) *</label>
                        <input v-model="form.sujetosProcesales" required maxlength="300"
                            class="input-field" placeholder="Nombre de la contraparte" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Radicado *</label>
                        <input v-model="form.radicado" required maxlength="100"
                            class="input-field" placeholder="Ej: 05001310300120230001" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Juzgado *</label>
                        <input v-model="form.juzgado" required maxlength="200"
                            class="input-field" placeholder="Nombre del juzgado" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                        <select v-model.number="form.idCliente" required class="input-field">
                            <option value="0" disabled>Selecciona un cliente</option>
                            <option v-for="c in clientes" :key="c.id" :value="c.id">
                                {{ c.nombre }} {{ c.apellidos }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select v-model="form.estado" class="input-field">
                            <option value="activo">Activo</option>
                            <option value="suspendido">Suspendido</option>
                            <option value="cerrado">Cerrado</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Audiencia</label>
                        <input v-model="form.fecha_audiencia" type="date" class="input-field" />
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
                        {{ saving ? 'Guardando…' : (modalMode === 'crear' ? 'Crear Proceso' : 'Guardar Cambios') }}
                    </button>
                </div>
            </form>
        </BaseModal>

        <!-- ── Modal Eliminar ─────────────────────────────────────────────── -->
        <BaseModal :open="deleteOpen" title="Confirmar eliminación" size="sm" @close="deleteOpen = false">
            <p class="text-gray-600 text-sm mb-5">
                ¿Eliminar el proceso con radicado
                <strong class="text-gray-900">{{ procesoABorrar?.radicado }}</strong>?
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
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition;
}
</style>
