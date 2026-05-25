import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import router from '../router'

/**
 * Instancia de Axios preconfigurada para el API del backend.
 *
 * - baseURL: '/api/v1' (el proxy de Vite redirige a localhost:3000 en desarrollo)
 * - Interceptor de request: agrega el token JWT del authStore al header Authorization
 * - Interceptor de response: si recibe 401, hace logout y redirige a /login
 */
const api = axios.create({
    baseURL: '/api/v1',
})

// ── Interceptor de petición: inyecta JWT ──────────────────────────────────────
api.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
    }
    return config
})

// ── Interceptor de respuesta: manejo de 401 ───────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        const status = (error as { response?: { status?: number } }).response?.status
        if (status === 401) {
            const auth = useAuthStore()
            auth.logout()
            void router.push('/login')
        }
        return Promise.reject(error)
    }
)

export default api
