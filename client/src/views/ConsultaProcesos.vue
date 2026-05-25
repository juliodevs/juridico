<script setup lang="ts">
import { ref, computed } from 'vue'
import api from '../services/api'
import { useConsultaStore } from '../stores/consultaStore'

const consultaStore = useConsultaStore()

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ProcesoInterno {
    radicado: string
    estado:   string   // 'activo' | 'cerrado' | 'suspendido'
}

interface RJProceso {
    idProceso:            number
    fechaUltimaActuacion: string | null
    despacho:             string | null
    sujetosProcesales:    string | null
}

interface RJActuacion {
    anotacion:      string | null
    fechaActuacion: string | null
}

interface FilaResultado {
    numero:               number
    radicado:             string
    idProceso:            number
    fechaUltimaActuacion: string
    despacho:             string
    sujetosProcesales:    string
    ultimaAnotacion:      string
    registraCambio:       boolean
}

interface ErrorItem {
    radicado:  string
    idProceso: string
    error:     string
}

// NOTA: la instancia rjApi fue eliminada.
// Las llamadas a la Rama Judicial ahora van por nuestro backend (/api/v1/rama-judicial/...)
// para evitar el bloqueo CORS del navegador.

// ── Constantes ─────────────────────────────────────────────────────────────────
/** Radicados que se consultan simultáneamente en cada lote */
const LOTE = 5
/** Pausa entre lotes (ms) para no saturar la API de la Rama Judicial */
const PAUSA_ENTRE_LOTES = 1500

// ── Estado ─────────────────────────────────────────────────────────────────────
const filas           = ref<FilaResultado[]>([])
const erroresConsulta = ref<ErrorItem[]>([])
const consultando     = ref(false)
const contadorFilas   = ref(1)

// Consulta individual
const radicadoManual = ref('')

// Configuración
const diasReciente = ref(3)

// Progreso
const progreso         = ref({ actual: 0, total: 0, conCambios: 0, loteActual: 0, lotesTotal: 0 })
const mensajeProgreso  = ref('')
const loteEnCurso      = ref<string[]>([])

// ── Utilidades ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function esReciente(fecha: string | null, dias: number): boolean {
    if (!fecha) return false
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaComparar = new Date(fecha)
    const diff = (hoy.getTime() - fechaComparar.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= dias
}


async function ejecutarConReintentos<T>(
    fn: () => Promise<T>,
    radicado: string,
    idProceso = 'N/A',
    maxIntentos = 5,
    delayInicial = 2000
): Promise<T | null> {
    let intentos = 0
    let delayActual = delayInicial

    while (intentos < maxIntentos) {
        try {
            return await fn()
        } catch (err: unknown) {
            intentos++
            const axiosErr = err as { response?: { status?: number } }
            const status   = axiosErr.response?.status ?? 0
            const erroresReintentar = [429, 500, 502, 503, 504]

            if (intentos < maxIntentos && (erroresReintentar.includes(status) || !status)) {
                console.warn(`🔄 Reintento ${intentos}/${maxIntentos} — ${radicado} (HTTP ${status || 'red'})`)
                await delay(delayActual)
                delayActual *= 2
            } else {
                const mensaje = status ? `Error ${status}` : 'Error de red'
                erroresConsulta.value.push({ radicado, idProceso, error: mensaje })
                return null
            }
        }
    }
    return null
}

// ── Llamadas a la Rama Judicial ───────────────────────────────────────────────

async function obtenerActuaciones(idProceso: number, radicado: string): Promise<RJActuacion> {
    try {
        // Llamamos a nuestro proxy backend — evita el bloqueo CORS del navegador
        const { data } = await api.get<{ actuaciones?: RJActuacion[] }>(
            `/rama-judicial/actuaciones/${idProceso}`
        )
        if (!data?.actuaciones?.length) {
            return { anotacion: 'Sin actuaciones', fechaActuacion: null }
        }
        return data.actuaciones[0]
    } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } }
        const status   = axiosErr.response?.status ?? 0
        const tipoError = status === 404 ? 'Proceso no encontrado'
            : status              ? `Error ${status}`
            : 'Fallo en conexión'
        erroresConsulta.value.push({ radicado, idProceso: String(idProceso), error: tipoError })
        return { anotacion: tipoError, fechaActuacion: null }
    }
}

async function consultarRadicado(radicado: string, soloActivos = false): Promise<void> {
    await ejecutarConReintentos(async () => {
        // Llamamos a nuestro proxy backend — evita el bloqueo CORS del navegador
        const { data } = await api.get<{ procesos?: RJProceso[] }>(
            '/rama-judicial/proceso',
            { params: { radicado, SoloActivos: soloActivos } }
        )

        const procesos = data.procesos
        if (!procesos?.length) {
            erroresConsulta.value.push({ radicado, idProceso: 'N/A', error: 'Radicado sin procesos' })
            return
        }

        for (const proceso of procesos) {
            const { idProceso } = proceso
            if (!idProceso) {
                erroresConsulta.value.push({ radicado, idProceso: 'N/A', error: 'ID de proceso no válido' })
                continue
            }

            const actuacion = await ejecutarConReintentos(
                () => obtenerActuaciones(idProceso, radicado),
                radicado, String(idProceso)
            )
            if (!actuacion) continue
            if (actuacion.anotacion === 'Proceso no encontrado') continue

            const cambio = esReciente(proceso.fechaUltimaActuacion, diasReciente.value)
            if (cambio) progreso.value.conCambios++

            filas.value.push({
                numero:               contadorFilas.value++,
                radicado,
                idProceso,
                fechaUltimaActuacion: proceso.fechaUltimaActuacion ?? 'N/A',
                despacho:             proceso.despacho              ?? 'N/A',
                sujetosProcesales:    proceso.sujetosProcesales      ?? 'N/A',
                ultimaAnotacion:      actuacion.anotacion             ?? 'N/A',
                registraCambio:       cambio,
            })
        }
    }, radicado)
}

// ── Acciones ──────────────────────────────────────────────────────────────────

async function consultaMasiva(): Promise<void> {
    consultando.value     = true
    filas.value           = []
    erroresConsulta.value = []
    contadorFilas.value   = 1
    loteEnCurso.value     = []
    progreso.value        = { actual: 0, total: 0, conCambios: 0, loteActual: 0, lotesTotal: 0 }
    mensajeProgreso.value = 'Cargando radicados del sistema…'

    try {
        // soloActivos=1 → el backend filtra WHERE estado = 'activo'
        // Así no consultamos radicados de procesos cerrados o suspendidos
        const { data: procesosData } = await api.get<ProcesoInterno[]>('/procesos', {
            params: { soloActivos: 1 },
        })

        // Extraer y limpiar radicados (ignorar vacíos/nulos)
        const radicados = procesosData
            .map(p => p.radicado?.trim())
            .filter((r): r is string => Boolean(r))

        if (!radicados.length) {
            mensajeProgreso.value = '⚠️ No hay radicados registrados en el sistema'
            consultando.value = false
            return
        }

        const lotesTotal = Math.ceil(radicados.length / LOTE)
        progreso.value.total     = radicados.length
        progreso.value.lotesTotal = lotesTotal

        // Procesar en lotes: cada lote corre en paralelo con Promise.allSettled
        for (let i = 0; i < radicados.length; i += LOTE) {
            const lote     = radicados.slice(i, i + LOTE)
            const loteNum  = Math.floor(i / LOTE) + 1

            progreso.value.loteActual = loteNum
            loteEnCurso.value         = lote
            mensajeProgreso.value     =
                `Lote ${loteNum} / ${lotesTotal} — consultando ${lote.length} radicados en paralelo`

            // ✅ Todos los radicados del lote se consultan AL MISMO TIEMPO
            // soloActivos=true → la Rama Judicial devuelve solo procesos activos en su sistema
            await Promise.allSettled(lote.map(r => consultarRadicado(r, true)))

            progreso.value.actual = Math.min(i + LOTE, radicados.length)

            // Pausa breve entre lotes para respetar el rate-limit de la Rama Judicial
            if (i + LOTE < radicados.length) {
                mensajeProgreso.value = `Lote ${loteNum}/${lotesTotal} listo. Preparando siguiente lote…`
                await delay(PAUSA_ENTRE_LOTES)
            }
        }

        loteEnCurso.value = []

        // Persistir resultado en el store para que el Dashboard lo muestre
        consultaStore.registrarResultado({
            fecha:      new Date().toISOString(),
            total:      radicados.length,
            conCambios: progreso.value.conCambios,
            sinCambios: radicados.length - progreso.value.conCambios - erroresConsulta.value.length,
            conError:   erroresConsulta.value.length,
            dias:       diasReciente.value,
        })

        mensajeProgreso.value =
            `✅ Finalizado — ${radicados.length} radicados consultados, ` +
            `${progreso.value.conCambios} con actuaciones en los últimos ${diasReciente.value} días`

    } catch (err) {
        console.error('Error en consulta masiva:', err)
        mensajeProgreso.value = '❌ Error al cargar los radicados del sistema'
    } finally {
        consultando.value = false
    }
}

async function consultaIndividual(): Promise<void> {
    const radicado = radicadoManual.value.trim()
    if (!radicado) return

    consultando.value     = true
    filas.value           = []
    erroresConsulta.value = []
    contadorFilas.value   = 1
    verDetalleCambios.value = false
    progreso.value          = { actual: 0, total: 1, conCambios: 0, loteActual: 0, lotesTotal: 0 }
    mensajeProgreso.value   = `Consultando ${radicado} en la Rama Judicial…`

    try {
        // soloActivos=true → solo procesos activos en la Rama Judicial
        await consultarRadicado(radicado, true)
        progreso.value.actual = 1

        // Persistir resultado individual en el store
        consultaStore.registrarResultado({
            fecha:      new Date().toISOString(),
            total:      filas.value.length,
            conCambios: filasConCambios.value.length,
            sinCambios: filas.value.length - filasConCambios.value.length,
            conError:   erroresConsulta.value.length,
            dias:       diasReciente.value,
        })

        mensajeProgreso.value = filas.value.length
            ? `✅ ${filas.value.length} proceso(s) encontrado(s) para ese radicado`
            : '⚠️ No se encontraron procesos para ese radicado'
    } finally {
        consultando.value = false
    }
}

function limpiar(): void {
    filas.value             = []
    erroresConsulta.value   = []
    loteEnCurso.value       = []
    verDetalleCambios.value = false
    progreso.value          = { actual: 0, total: 0, conCambios: 0, loteActual: 0, lotesTotal: 0 }
    mensajeProgreso.value   = ''
    contadorFilas.value     = 1
}

// ── Computed ──────────────────────────────────────────────────────────────────

const porcentaje = computed(() =>
    progreso.value.total
        ? Math.round((progreso.value.actual / progreso.value.total) * 100)
        : 0
)

const filasConCambios = computed(() => filas.value.filter(f => f.registraCambio))
const conCambios      = computed(() => filasConCambios.value.length)
const sinCambios      = computed(() => filas.value.filter(f => !f.registraCambio).length)

/** Controla la visibilidad de la tabla de detalle de cambios */
const verDetalleCambios = ref(false)
</script>

<template>
    <div>
        <!-- Encabezado -->
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900">Consulta de Procesos</h1>
            <p class="text-gray-500 text-sm mt-0.5">
                Verifica actualizaciones en la Rama Judicial para los radicados del sistema
            </p>
        </div>

        <!-- Panel de controles -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <div class="flex flex-wrap gap-5 items-end">

                <!-- Configuración: días reciente -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Considerar reciente si la actuación es de los últimos
                    </label>
                    <div class="flex items-center gap-2">
                        <input
                            v-model.number="diasReciente"
                            type="number" min="1" max="30"
                            class="w-20 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <span class="text-sm text-gray-500">días</span>
                    </div>
                </div>

                <!-- Separador vertical -->
                <div class="hidden md:block w-px h-12 bg-gray-200 self-center" />

                <!-- Consulta individual -->
                <div class="flex-1 min-w-56">
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Consultar un radicado específico
                    </label>
                    <form @submit.prevent="consultaIndividual" class="flex gap-2">
                        <input
                            v-model="radicadoManual"
                            type="text"
                            placeholder="Ej: 05001310300120230001"
                            :disabled="consultando"
                            class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <button
                            type="submit"
                            :disabled="consultando || !radicadoManual.trim()"
                            class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition flex-shrink-0"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
                            </svg>
                            Consultar
                        </button>
                    </form>
                </div>

                <!-- Separador vertical -->
                <div class="hidden md:block w-px h-12 bg-gray-200 self-center" />

                <!-- Consulta masiva -->
                <div>
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Todos los radicados del sistema
                    </label>
                    <button
                        @click="consultaMasiva"
                        :disabled="consultando"
                        class="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition"
                    >
                        <svg v-if="consultando" class="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z"/>
                        </svg>
                        <svg v-else class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span v-if="consultando && progreso.lotesTotal > 0">
                            Lote {{ progreso.loteActual }}/{{ progreso.lotesTotal }}
                        </span>
                        <span v-else-if="consultando">Iniciando…</span>
                        <span v-else>Consultar todos</span>
                    </button>
                    <p class="text-xs text-gray-400 mt-1">{{ LOTE }} radicados simultáneos por lote</p>
                </div>

                <!-- Botón limpiar -->
                <button
                    v-if="filas.length > 0 || erroresConsulta.length > 0"
                    @click="limpiar"
                    :disabled="consultando"
                    class="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Limpiar resultados"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Limpiar
                </button>
            </div>
        </div>

        <!-- Barra de progreso -->
        <div v-if="progreso.total > 0 || consultando" class="bg-white rounded-xl border border-gray-200 p-4 mb-5">

            <!-- Mensaje + porcentaje -->
            <div class="flex items-center justify-between mb-2 text-sm">
                <span class="text-gray-600 truncate pr-4">{{ mensajeProgreso }}</span>
                <span v-if="progreso.total > 0" class="text-gray-500 font-mono flex-shrink-0">
                    {{ progreso.actual }}/{{ progreso.total }} — {{ porcentaje }}%
                </span>
            </div>

            <!-- Barra de progreso principal -->
            <div v-if="progreso.total > 0" class="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div
                    class="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    :style="{ width: `${porcentaje}%` }"
                />
            </div>

            <!-- Chips del lote actual (radicados procesándose ahora) -->
            <div v-if="consultando && loteEnCurso.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                <span class="text-xs text-gray-400 self-center mr-1">En proceso:</span>
                <span
                    v-for="r in loteEnCurso" :key="r"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono animate-pulse"
                >
                    <svg class="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z"/>
                    </svg>
                    {{ r.length > 20 ? r.slice(0, 10) + '…' + r.slice(-8) : r }}
                </span>
            </div>

            <!-- KPIs dentro del panel — aparecen al terminar la consulta -->
            <div v-if="!consultando && filas.length > 0" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">

                <!-- Total consultados -->
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-700">{{ filas.length }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">Consultados</p>
                </div>

                <!-- Con cambios — CLICKABLE -->
                <button
                    @click="conCambios > 0 && (verDetalleCambios = !verDetalleCambios)"
                    :disabled="conCambios === 0"
                    :class="[
                        conCambios > 0
                            ? 'cursor-pointer hover:bg-green-50 rounded-lg'
                            : 'cursor-default',
                        verDetalleCambios ? 'ring-2 ring-green-400 ring-offset-1 rounded-lg bg-green-50' : ''
                    ]"
                    class="text-center px-2 py-1 transition-all w-full group"
                >
                    <div class="flex items-center justify-center gap-1">
                        <p class="text-2xl font-bold" :class="conCambios > 0 ? 'text-green-600' : 'text-gray-300'">
                            {{ conCambios }}
                        </p>
                        <svg
                            v-if="conCambios > 0"
                            :class="verDetalleCambios ? 'rotate-180 text-green-500' : 'text-green-300'"
                            class="w-3.5 h-3.5 transition-transform duration-200 mt-1 flex-shrink-0"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                    <p class="text-xs mt-0.5" :class="conCambios > 0 ? 'text-green-500 font-medium' : 'text-gray-300'">
                        Con cambios
                    </p>
                    <p v-if="conCambios > 0" class="text-xs text-green-400 leading-tight">
                        últimos {{ diasReciente }} días · ver ↓
                    </p>
                </button>

                <!-- Sin cambios -->
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-400">{{ sinCambios }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">Sin cambios</p>
                </div>

                <!-- Con error -->
                <div class="text-center">
                    <p class="text-2xl font-bold" :class="erroresConsulta.length > 0 ? 'text-red-500' : 'text-gray-300'">
                        {{ erroresConsulta.length }}
                    </p>
                    <p class="text-xs mt-0.5" :class="erroresConsulta.length > 0 ? 'text-red-400' : 'text-gray-300'">
                        Con error
                    </p>
                </div>
            </div>
        </div>

        <!-- ── Tabla de detalle: procesos CON CAMBIOS ─────────────────────────── -->
        <transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
        >
            <div
                v-if="verDetalleCambios && filasConCambios.length > 0"
                class="bg-white rounded-xl border border-green-300 overflow-hidden mb-5 shadow-sm"
            >
                <div class="px-5 py-3 border-b border-green-200 bg-green-50 flex items-start justify-between gap-3">
                    <div>
                        <h2 class="text-sm font-semibold text-green-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0"/>
                            </svg>
                            Procesos con cambios recientes
                            <span class="font-normal text-green-600">({{ filasConCambios.length }})</span>
                        </h2>
                        <p class="text-xs text-green-600 mt-0.5 ml-6">
                            Actuaciones registradas en los últimos {{ diasReciente }} días
                        </p>
                    </div>
                    <button
                        @click="verDetalleCambios = false"
                        class="text-green-400 hover:text-green-700 transition flex-shrink-0 mt-0.5"
                        title="Cerrar"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-green-100 text-sm">
                        <thead class="bg-green-50">
                            <tr>
                                <th class="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wider w-10">#</th>
                                <th class="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Radicado</th>
                                <th class="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wider hidden md:table-cell">Últ. Actuación</th>
                                <th class="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wider hidden lg:table-cell">Despacho</th>
                                <th class="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wider hidden lg:table-cell">Sujetos Procesales</th>
                                <th class="px-3 py-3 text-left text-xs font-semibold text-green-600 uppercase tracking-wider">Última Anotación</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-green-100">
                            <tr
                                v-for="(fila, idx) in filasConCambios"
                                :key="`cambio-${fila.radicado}-${fila.idProceso}`"
                                class="bg-green-50 hover:bg-green-100 transition"
                            >
                                <td class="px-3 py-3 text-green-400 font-mono text-xs">{{ idx + 1 }}</td>
                                <td class="px-3 py-3">
                                    <span class="font-mono text-xs font-semibold text-gray-900">{{ fila.radicado }}</span>
                                </td>
                                <td class="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                                    <span class="text-green-700 font-semibold">{{ fila.fechaUltimaActuacion }}</span>
                                </td>
                                <td class="px-3 py-3 text-gray-600 hidden lg:table-cell max-w-xs truncate">
                                    {{ fila.despacho }}
                                </td>
                                <td class="px-3 py-3 text-gray-600 hidden lg:table-cell max-w-xs truncate">
                                    {{ fila.sujetosProcesales }}
                                </td>
                                <td class="px-3 py-3 text-gray-700 max-w-sm">
                                    <span class="line-clamp-2">{{ fila.ultimaAnotacion }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </transition>

        <!-- Tabla de resultados (todos) -->
        <div v-if="filas.length > 0" class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
            <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 class="text-sm font-semibold text-gray-700">
                    Resultados
                    <span class="ml-1 text-gray-400 font-normal">({{ filas.length }} registros)</span>
                </h2>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100 text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
                            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Radicado</th>
                            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Últ. Actuación</th>
                            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Despacho</th>
                            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Sujetos Procesales</th>
                            <th class="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Última Anotación</th>
                            <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Cambio</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr
                            v-for="fila in filas"
                            :key="`${fila.radicado}-${fila.idProceso}`"
                            :class="fila.registraCambio ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'"
                            class="transition"
                        >
                            <td class="px-3 py-3 text-gray-400">{{ fila.numero }}</td>
                            <td class="px-3 py-3">
                                <span class="font-mono text-xs text-gray-900">{{ fila.radicado }}</span>
                            </td>
                            <td class="px-3 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                                {{ fila.fechaUltimaActuacion }}
                            </td>
                            <td class="px-3 py-3 text-gray-500 hidden lg:table-cell max-w-xs truncate">
                                {{ fila.despacho }}
                            </td>
                            <td class="px-3 py-3 text-gray-500 hidden lg:table-cell max-w-xs truncate">
                                {{ fila.sujetosProcesales }}
                            </td>
                            <td class="px-3 py-3 text-gray-600 max-w-sm">
                                <span class="line-clamp-2">{{ fila.ultimaAnotacion }}</span>
                            </td>
                            <td class="px-3 py-3 text-center">
                                <span
                                    :class="fila.registraCambio
                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                        : 'bg-gray-100 text-gray-500 border border-gray-200'"
                                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                >
                                    <span v-if="fila.registraCambio">✓ Sí</span>
                                    <span v-else>— No</span>
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tabla de errores -->
        <div v-if="erroresConsulta.length > 0" class="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div class="px-5 py-3 border-b border-red-100 bg-red-50">
                <h2 class="text-sm font-semibold text-red-700">
                    Radicados con error
                    <span class="ml-1 font-normal text-red-500">({{ erroresConsulta.length }})</span>
                </h2>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-red-100 text-sm">
                    <thead class="bg-red-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-red-500 uppercase tracking-wider">Radicado</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-red-500 uppercase tracking-wider hidden md:table-cell">ID Proceso</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-red-500 uppercase tracking-wider">Error</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-red-50">
                        <tr v-for="(e, idx) in erroresConsulta" :key="idx" class="hover:bg-red-50 transition">
                            <td class="px-4 py-2 font-mono text-xs text-gray-800">{{ e.radicado }}</td>
                            <td class="px-4 py-2 text-gray-500 hidden md:table-cell">{{ e.idProceso }}</td>
                            <td class="px-4 py-2 text-red-600">{{ e.error }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Estado vacío inicial -->
        <div
            v-if="!consultando && filas.length === 0 && erroresConsulta.length === 0 && !mensajeProgreso"
            class="bg-white rounded-xl border border-gray-200 p-12 text-center"
        >
            <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p class="text-gray-500 text-sm font-medium">Sin resultados aún</p>
            <p class="text-gray-400 text-xs mt-1">
                Ingresa un radicado específico o usa <strong>Consulta Masiva</strong> para revisar todos los procesos del sistema.
            </p>
        </div>
    </div>
</template>
