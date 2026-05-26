/**
 * consultaStore — Estado global de la consulta a la Rama Judicial.
 *
 * Responsabilidades:
 *  1. Guardar los resultados de la última consulta en memoria (filas, errores,
 *     progreso) para que persistan al navegar entre rutas.
 *  2. Persistir el resumen KPI en localStorage para que el Dashboard lo muestre
 *     incluso tras recargar la página.
 *
 * La data de filas/errores NO se persiste en localStorage (puede ser grande);
 * solo sobrevive mientras la SPA esté abierta.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

// ── Tipos compartidos ─────────────────────────────────────────────────────────

export interface FilaResultado {
    numero:               number
    radicado:             string
    idProceso:            number
    fechaUltimaActuacion: string
    despacho:             string
    sujetosProcesales:    string
    tipoActuacion:        string
    ultimaAnotacion:      string
    registraCambio:       boolean
}

export interface ErrorItem {
    radicado:  string
    idProceso: string
    error:     string
}

export interface ProgresoConsulta {
    actual:     number
    total:      number
    conCambios: number
    loteActual: number
    lotesTotal: number
}

export interface ResultadoConsulta {
    fecha:      string   // ISO 8601
    total:      number
    conCambios: number
    sinCambios: number
    conError:   number
    dias:       number
}

// ── Clave localStorage (solo para el resumen KPI) ─────────────────────────────
const STORAGE_KEY = 'juridico_ultima_consulta_rama'

export const useConsultaStore = defineStore('consulta', () => {

    // ── KPI persistido en localStorage (para Dashboard) ───────────────────────
    const ultimaConsulta = ref<ResultadoConsulta | null>(null)

    function cargarDesdeStorage(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) ultimaConsulta.value = JSON.parse(raw) as ResultadoConsulta
        } catch {
            localStorage.removeItem(STORAGE_KEY)
        }
    }

    function registrarResultado(data: ResultadoConsulta): void {
        ultimaConsulta.value = data
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch { /* ignorar si localStorage está lleno */ }
    }

    // ── Estado en memoria de la última consulta ───────────────────────────────
    /** Filas de resultado (una por proceso encontrado en la RJ) */
    const filas           = ref<FilaResultado[]>([])
    /** Errores definitivos (agotaron reintentos) */
    const erroresConsulta = ref<ErrorItem[]>([])
    /** Texto del mensaje de estado / progreso */
    const mensajeProgreso = ref('')
    /** Contadores de progreso */
    const progreso = ref<ProgresoConsulta>({
        actual: 0, total: 0, conCambios: 0, loteActual: 0, lotesTotal: 0,
    })
    /** Radicados procesándose en este momento (chip animado) */
    const loteEnCurso  = ref<string[]>([])
    /** ¿Hay una consulta en curso? */
    const consultando  = ref(false)
    /** Contador incremental para numerar filas */
    const contadorFilas = ref(1)

    // ── Limpiar solo los resultados en memoria ────────────────────────────────
    function limpiarResultados(): void {
        filas.value           = []
        erroresConsulta.value = []
        loteEnCurso.value     = []
        mensajeProgreso.value = ''
        contadorFilas.value   = 1
        progreso.value        = { actual: 0, total: 0, conCambios: 0, loteActual: 0, lotesTotal: 0 }
    }

    // ── Limpiar todo (resultados + KPI en localStorage) ───────────────────────
    function limpiar(): void {
        limpiarResultados()
        ultimaConsulta.value = null
        localStorage.removeItem(STORAGE_KEY)
    }

    return {
        // KPI
        ultimaConsulta, cargarDesdeStorage, registrarResultado,
        // Estado en memoria
        filas, erroresConsulta, mensajeProgreso, progreso,
        loteEnCurso, consultando, contadorFilas,
        // Acciones
        limpiarResultados, limpiar,
    }
})
