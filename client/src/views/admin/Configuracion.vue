<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../../services/api'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ConfigItem {
    id:          number
    clave:       string
    valor:       string
    es_secreto:  boolean
    descripcion: string
}

// ── Estado ─────────────────────────────────────────────────────────────────────
const config    = ref<ConfigItem[]>([])
const loading   = ref(true)
const errorPage = ref('')
const tabActiva = ref<'email' | 'whatsapp' | 'alertas' | 'despacho'>('email')

// Estado por sección
const saving    = ref<Record<string, boolean>>({})
const saveMsg   = ref<Record<string, string>>({})
const saveError = ref<Record<string, string>>({})

// Formularios por sección (mapa clave → valor que el usuario edita)
const formsEdit = ref<Record<string, string>>({})

// Test email
const testingEmail  = ref(false)
const testEmailMsg  = ref('')
const testEmailErr  = ref('')

// ── Definición de secciones ───────────────────────────────────────────────────
const secciones = {
    email: {
        label:  'Correo Saliente (SMTP)',
        claves: ['smtp_host','smtp_port','smtp_seguridad','smtp_usuario','smtp_password','email_from','email_destinatarios'],
    },
    whatsapp: {
        label:  'WhatsApp',
        claves: ['whatsapp_numero','whatsapp_plantilla','whatsapp_activo'],
    },
    alertas: {
        label:  'Alertas Automáticas',
        claves: ['alerta_dias_anticipacion','alerta_hora','alerta_email_activo','alerta_whatsapp_activo'],
    },
    despacho: {
        label:  'Datos del Despacho',
        claves: ['despacho_nombre','despacho_direccion','despacho_telefono','despacho_logo_url'],
    },
} as const

type SeccionKey = keyof typeof secciones

const tabs: { key: SeccionKey; label: string }[] = [
    { key: 'email',    label: 'Correo Saliente (SMTP)' },
    { key: 'whatsapp', label: 'WhatsApp'                },
    { key: 'alertas',  label: 'Alertas Automáticas'     },
    { key: 'despacho', label: 'Datos del Despacho'      },
]

const configMap = computed(() => {
    const map: Record<string, ConfigItem> = {}
    config.value.forEach(c => { map[c.clave] = c })
    return map
})

function getValorForm(clave: string): string {
    if (clave in formsEdit.value) return formsEdit.value[clave]
    const item = configMap.value[clave]
    if (!item) return ''
    if (item.es_secreto) return ''   // No prellenar secretos
    return item.valor ?? ''
}

function setValorForm(clave: string, val: string): void {
    formsEdit.value[clave] = val
}

function inputType(clave: string): string {
    if (clave === 'smtp_password') return 'password'
    if (clave.includes('email') && !clave.includes('activo')) return 'email'
    if (clave === 'smtp_port' || clave === 'alerta_dias_anticipacion') return 'number'
    if (clave === 'alerta_hora') return 'time'
    return 'text'
}

function isBoolean(clave: string): boolean {
    return ['whatsapp_activo','alerta_email_activo','alerta_whatsapp_activo'].includes(clave)
}

function isTextarea(clave: string): boolean {
    return clave === 'whatsapp_plantilla'
}

function isSelect(clave: string): boolean {
    return clave === 'smtp_seguridad'
}

// ── Acciones ──────────────────────────────────────────────────────────────────
async function cargarConfig(): Promise<void> {
    loading.value   = true
    errorPage.value = ''
    try {
        const { data } = await api.get<ConfigItem[]>('/admin/configuracion')
        config.value    = data
        formsEdit.value = {}
    } catch {
        errorPage.value = 'No se pudo cargar la configuración.'
    } finally {
        loading.value = false
    }
}

async function guardarSeccion(seccion: SeccionKey): Promise<void> {
    saving.value[seccion]    = true
    saveMsg.value[seccion]   = ''
    saveError.value[seccion] = ''

    // Construir payload: solo las claves de esta sección con valores editados
    const updates: Record<string, string> = {}
    for (const clave of secciones[seccion].claves) {
        const item    = configMap.value[clave]
        const editado = formsEdit.value[clave]

        if (item?.es_secreto) {
            // Solo enviar si el usuario escribió algo nuevo (no vacío)
            if (editado && editado.trim()) {
                updates[clave] = editado.trim()
            }
        } else if (editado !== undefined) {
            updates[clave] = editado
        } else {
            updates[clave] = item?.valor ?? ''
        }
    }

    try {
        await api.put('/admin/configuracion', updates)
        saveMsg.value[seccion] = '✅ Configuración guardada exitosamente'
        await cargarConfig()
        setTimeout(() => { saveMsg.value[seccion] = '' }, 3000)
    } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string; errores?: string[] } } }
        saveError.value[seccion] = e.response?.data?.error ?? 'Error al guardar.'
    } finally {
        saving.value[seccion] = false
    }
}

async function probarEmail(): Promise<void> {
    testingEmail.value = true
    testEmailMsg.value = ''
    testEmailErr.value = ''
    try {
        const { data } = await api.post<{ message: string }>('/admin/configuracion/test-email', {})
        testEmailMsg.value = data.message
    } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string; camposFaltantes?: string[] } } }
        const faltantes = e.response?.data?.camposFaltantes
        testEmailErr.value = faltantes
            ? `Configuración incompleta. Faltan: ${faltantes.join(', ')}`
            : (e.response?.data?.error ?? 'Error al enviar correo de prueba.')
    } finally {
        testingEmail.value = false
    }
}

onMounted(cargarConfig)
</script>

<template>
    <div>
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900">Configuración</h1>
            <p class="text-gray-500 text-sm mt-0.5">Ajustes del sistema de gestión jurídica</p>
        </div>

        <div v-if="errorPage" class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-4">
            {{ errorPage }} <button @click="cargarConfig" class="ml-2 underline">Reintentar</button>
        </div>

        <div v-else-if="loading" class="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p class="text-gray-400 text-sm">Cargando configuración…</p>
        </div>

        <div v-else>
            <!-- ── Pestañas ─────────────────────────────────────────────────── -->
            <div class="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    @click="tabActiva = tab.key"
                    :class="[
                        'px-4 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px',
                        tabActiva === tab.key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700',
                    ]"
                >
                    {{ tab.label }}
                </button>
            </div>

            <!-- ── Contenido de la sección activa (acceso directo, sin v-for) ─ -->
            <div class="bg-white rounded-xl border border-gray-200 p-6">
                <div class="space-y-5 max-w-xl">
                    <template v-for="clave in secciones[tabActiva].claves" :key="clave">

                        <!-- Toggle booleano -->
                        <div v-if="isBoolean(clave)" class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-700">{{ configMap[clave]?.descripcion ?? clave }}</p>
                                <p class="text-xs text-gray-400">{{ clave }}</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    class="sr-only peer"
                                    :checked="(formsEdit[clave] ?? configMap[clave]?.valor) === 'true'"
                                    @change="setValorForm(clave, ($event.target as HTMLInputElement).checked ? 'true' : 'false')"
                                />
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <!-- Textarea -->
                        <div v-else-if="isTextarea(clave)">
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                {{ configMap[clave]?.descripcion ?? clave }}
                            </label>
                            <textarea
                                rows="3"
                                class="input-field resize-none"
                                :placeholder="clave"
                                :value="getValorForm(clave)"
                                @input="setValorForm(clave, ($event.target as HTMLTextAreaElement).value)"
                            />
                            <p class="text-xs text-gray-400 mt-1">{{ clave }}</p>
                        </div>

                        <!-- Select (smtp_seguridad) -->
                        <div v-else-if="isSelect(clave)">
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                {{ configMap[clave]?.descripcion ?? clave }}
                            </label>
                            <select
                                class="input-field"
                                :value="getValorForm(clave)"
                                @change="setValorForm(clave, ($event.target as HTMLSelectElement).value)"
                            >
                                <option value="tls">TLS (puerto 587)</option>
                                <option value="ssl">SSL (puerto 465)</option>
                            </select>
                        </div>

                        <!-- Input normal (texto, número, email, password, time) -->
                        <div v-else>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                {{ configMap[clave]?.descripcion ?? clave }}
                                <span v-if="configMap[clave]?.es_secreto" class="ml-1 text-xs text-amber-600 font-normal">(cifrado)</span>
                            </label>
                            <input
                                :type="inputType(clave)"
                                class="input-field"
                                :placeholder="configMap[clave]?.es_secreto && configMap[clave]?.valor === '****'
                                    ? '••••••••  (tiene valor guardado)'
                                    : clave"
                                :value="getValorForm(clave)"
                                @input="setValorForm(clave, ($event.target as HTMLInputElement).value)"
                            />
                        </div>

                    </template>
                </div>

                <!-- Test de correo (solo en pestaña email) -->
                <div v-if="tabActiva === 'email'" class="mt-6 pt-5 border-t border-gray-100">
                    <div class="flex items-center gap-3 flex-wrap">
                        <button
                            @click="probarEmail"
                            :disabled="testingEmail"
                            class="flex items-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-4 py-2 rounded-lg transition"
                        >
                            <svg v-if="testingEmail" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z"/>
                            </svg>
                            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {{ testingEmail ? 'Enviando…' : 'Probar conexión de correo' }}
                        </button>
                        <span v-if="testEmailMsg" class="text-sm text-green-700">{{ testEmailMsg }}</span>
                        <span v-if="testEmailErr" class="text-sm text-red-600">{{ testEmailErr }}</span>
                    </div>
                </div>

                <!-- Botón guardar -->
                <div class="mt-6 flex items-center gap-4 flex-wrap">
                    <button
                        @click="guardarSeccion(tabActiva)"
                        :disabled="saving[tabActiva]"
                        class="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-5 py-2.5 rounded-lg transition"
                    >
                        <svg v-if="saving[tabActiva]" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z"/>
                        </svg>
                        {{ saving[tabActiva] ? 'Guardando…' : 'Guardar sección' }}
                    </button>
                    <span v-if="saveMsg[tabActiva]"   class="text-sm text-green-700">{{ saveMsg[tabActiva]   }}</span>
                    <span v-if="saveError[tabActiva]" class="text-sm text-red-600">  {{ saveError[tabActiva] }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.input-field {
    @apply w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition;
}
</style>
