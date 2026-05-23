import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface Usuario {
    id:     number
    nombre: string
    email:  string
    rol:    'admin' | 'abogado'
}

// ── Store de autenticación ─────────────────────────────────────────────────────

export const useAuthStore = defineStore('auth', () => {
    // Estado — se restaura desde localStorage al recargar la página
    const token   = ref<string | null>(localStorage.getItem('token'))
    const usuario = ref<Usuario | null>(
        (() => {
            const raw = localStorage.getItem('usuario')
            if (!raw) return null
            try { return JSON.parse(raw) as Usuario }
            catch { return null }
        })()
    )

    // Getters computados
    const isAuthenticated = computed(() => !!token.value)
    const esAdmin         = computed(() => usuario.value?.rol === 'admin')
    const nombreUsuario   = computed(() => usuario.value?.nombre ?? '')

    // ── Acciones ──────────────────────────────────────────────────────────────

    /**
     * Persiste el token y los datos del usuario en memoria y localStorage.
     * Se llama después de un login exitoso.
     */
    function login(newToken: string, newUsuario: Usuario): void {
        token.value   = newToken
        usuario.value = newUsuario
        localStorage.setItem('token',   newToken)
        localStorage.setItem('usuario', JSON.stringify(newUsuario))
    }

    /**
     * Limpia el estado y elimina los datos del localStorage.
     * Se llama al hacer logout o cuando el API devuelve 401.
     */
    function logout(): void {
        token.value   = null
        usuario.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
    }

    return {
        token,
        usuario,
        isAuthenticated,
        esAdmin,
        nombreUsuario,
        login,
        logout,
    }
})
