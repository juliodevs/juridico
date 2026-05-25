/**
 * consultaStore — Guarda los resultados de la última consulta a la Rama Judicial.
 *
 * Persiste en localStorage para sobrevivir recargas de página.
 * El Dashboard lee de aquí para mostrar el KPI sin necesidad de
 * que el usuario esté en la pantalla de ConsultaProcesos.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ResultadoConsulta {
    fecha:      string   // ISO 8601
    total:      number
    conCambios: number
    sinCambios: number
    conError:   number
    dias:       number   // umbral de días "reciente" usado en esa consulta
}

const STORAGE_KEY = 'juridico_ultima_consulta_rama'

export const useConsultaStore = defineStore('consulta', () => {

    // ── Estado ─────────────────────────────────────────────────────────────────
    const ultimaConsulta = ref<ResultadoConsulta | null>(null)

    // ── Inicializar desde localStorage al montar la app ────────────────────────
    function cargarDesdeStorage(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) ultimaConsulta.value = JSON.parse(raw) as ResultadoConsulta
        } catch {
            localStorage.removeItem(STORAGE_KEY)
        }
    }

    // ── Registrar resultado al finalizar una consulta ──────────────────────────
    function registrarResultado(data: ResultadoConsulta): void {
        ultimaConsulta.value = data
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch {
            // Si localStorage está lleno o bloqueado, ignorar
        }
    }

    // ── Limpiar ────────────────────────────────────────────────────────────────
    function limpiar(): void {
        ultimaConsulta.value = null
        localStorage.removeItem(STORAGE_KEY)
    }

    return { ultimaConsulta, cargarDesdeStorage, registrarResultado, limpiar }
})
