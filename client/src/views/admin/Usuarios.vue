<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../services/api'
import BaseModal from '../../components/BaseModal.vue'
import { useAuthStore } from '../../stores/authStore'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Usuario {
    id:         number
    nombre:     string
    email:      string
    rol:        'admin' | 'abogado'
    activo:     boolean
    created_at: string
}

// ── Estado ─────────────────────────────────────────────────────────────────────
const authStore = useAuthStore()
const usuarios   = ref<Usuario[]>([])
const loading    = ref(true)
const errorPage  = ref('')

const modalOpen = ref(false)
const saving    = ref(false)
const saveError = ref('')
const form      = ref({ nombre: '', email: '', password: '', rol: 'abogado' as 'admin' | 'abogado' })

const updatingId = ref<number | null>(null)

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cargar(): Promise<void> {
    loading.value   = true
    errorPage.value = ''
    try {
        const { data } = await api.get<Usuario[]>('/admin/usuarios')
        usuarios.value = data
    } catch {
        errorPage.value = 'No se pudieron cargar los usuarios.'
    } finally {
        loading.value = false
    }
}

function abrirCrear(): void {
    form.value      = { nombre: '', email: '', password: '', rol: 'abogado' }
    saveError.value = ''
    modalOpen.value = true
}

async function crearUsuario(): Promise<void> {
    saving.value    = true
    saveError.value = ''
    try {
        await api.post('/admin/usuarios', form.value)
        modalOpen.value = false
        await cargar()
    } catch (err: unknown) {
        const e = err as { response?: { data?: { errors?: { msg: string }[]; error?: string } } }
        saveError.value = e.response?.data?.errors?.[0]?.msg
            ?? e.response?.data?.error
            ?? 'Error al crear el usuario.'
    } finally {
        saving.value = false
    }
}

async function cambiarRol(u: Usuario): Promise<void> {
    updatingId.value = u.id
    const nuevoRol   = u.rol === 'admin' ? 'abogado' : 'admin'
    try {
        await api.put(`/admin/usuarios/${u.id}`, { nombre: u.nombre, email: u.email, rol: nuevoRol, activo: u.activo })
        await cargar()
    } finally {
        updatingId.value = null
    }
}

async function toggleActivo(u: Usuario): Promise<void> {
    updatingId.value = u.id
    try {
        if (u.activo) {
            // Desactivar (soft delete)
            await api.delete(`/admin/usuarios/${u.id}`)
        } else {
            // Reactivar
            await api.put(`/admin/usuarios/${u.id}`, { nombre: u.nombre, email: u.email, rol: u.rol, activo: true })
        }
        await cargar()
    } finally {
        updatingId.value = null
    }
}

function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(cargar)
</script>

<template>
    <div>
        <!-- Encabezado -->
        <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
                <h1 class="text-2xl font-bold text-gray-900">Usuarios</h1>
                <p class="text-gray-500 text-sm mt-0.5">{{ usuarios.length }} usuarios en el sistema</p>
            </div>
            <button @click="abrirCrear"
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Usuario
            </button>
        </div>

        <div v-if="errorPage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {{ errorPage }} <button @click="cargar" class="ml-2 underline">Reintentar</button>
        </div>

        <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200">
            <div v-for="i in 3" :key="i" class="flex gap-4 px-6 py-4 border-b last:border-0 animate-pulse">
                <div class="h-4 bg-gray-100 rounded w-32 flex-1" />
                <div class="h-6 bg-gray-100 rounded-full w-20" />
            </div>
        </div>

        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Creado</th>
                            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="usuarios.length === 0">
                            <td colspan="6" class="px-6 py-10 text-center text-gray-400 text-sm">
                                No hay usuarios registrados.
                            </td>
                        </tr>
                        <tr v-for="u in usuarios" :key="u.id" class="hover:bg-gray-50 transition">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ u.nombre }}</td>
                            <td class="px-4 py-3 text-sm text-gray-500">{{ u.email }}</td>
                            <td class="px-4 py-3">
                                <span :class="[
                                    'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
                                    u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700',
                                ]">{{ u.rol }}</span>
                            </td>
                            <td class="px-4 py-3">
                                <span :class="[
                                    'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                    u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                                ]">{{ u.activo ? 'Activo' : 'Inactivo' }}</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">{{ formatFecha(u.created_at) }}</td>
                            <td class="px-4 py-3 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <!-- Cambiar rol (no aplica al propio usuario) -->
                                    <button
                                        v-if="u.id !== authStore.usuario?.id"
                                        @click="cambiarRol(u)"
                                        :disabled="updatingId === u.id"
                                        class="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50 transition disabled:opacity-50"
                                        :title="`Cambiar a ${u.rol === 'admin' ? 'abogado' : 'admin'}`"
                                    >
                                        → {{ u.rol === 'admin' ? 'Abogado' : 'Admin' }}
                                    </button>
                                    <!-- Activar / Desactivar -->
                                    <button
                                        v-if="u.id !== authStore.usuario?.id"
                                        @click="toggleActivo(u)"
                                        :disabled="updatingId === u.id"
                                        :class="[
                                            'text-xs px-2 py-1 rounded transition disabled:opacity-50',
                                            u.activo
                                                ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                                : 'text-green-600 hover:text-green-800 hover:bg-green-50',
                                        ]"
                                    >
                                        {{ u.activo ? 'Desactivar' : 'Activar' }}
                                    </button>
                                    <span v-if="u.id === authStore.usuario?.id" class="text-xs text-gray-400 italic pr-2">
                                        (tú)
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ── Modal Nuevo Usuario ────────────────────────────────────────── -->
        <BaseModal :open="modalOpen" title="Nuevo Usuario" size="sm" @close="modalOpen = false">
            <form @submit.prevent="crearUsuario" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input v-model="form.nombre" required maxlength="100" class="input-field" placeholder="Nombre y apellidos" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input v-model="form.email" required type="email" maxlength="150" class="input-field" placeholder="correo@despacho.com" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                    <input v-model="form.password" required type="password" minlength="8" class="input-field" placeholder="Mínimo 8 caracteres" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select v-model="form.rol" class="input-field">
                        <option value="abogado">Abogado</option>
                        <option value="admin">Administrador</option>
                    </select>
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
                        {{ saving ? 'Creando…' : 'Crear Usuario' }}
                    </button>
                </div>
            </form>
        </BaseModal>
    </div>
</template>

<style scoped>
.input-field {
    @apply w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition;
}
</style>
