<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { Usuario } from '../stores/authStore'

const router    = useRouter()
const authStore = useAuthStore()

const email    = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function handleLogin(): Promise<void> {
    error.value   = ''
    loading.value = true
    try {
        const response = await axios.post<{ token: string; usuario: Usuario }>(
            '/api/v1/auth/login',
            { email: email.value, password: password.value }
        )
        authStore.login(response.data.token, response.data.usuario)
        await router.push('/dashboard')
    } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 401) {
            error.value = 'Credenciales incorrectas. Verifica tu correo y contraseña.'
        } else if (status === 429) {
            error.value = 'Demasiados intentos fallidos. Espera 15 minutos e intenta de nuevo.'
        } else {
            error.value = 'No se pudo conectar con el servidor. Intenta de nuevo.'
        }
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

            <!-- Encabezado -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                    <!-- Ícono de balanza de justicia -->
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Sistema Jurídico</h1>
                <p class="text-gray-500 text-sm mt-1">Gestión de Despacho</p>
            </div>

            <!-- Formulario -->
            <form @submit.prevent="handleLogin" class="space-y-5">
                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                        Correo electrónico
                    </label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        required
                        autocomplete="email"
                        placeholder="admin@despacho.com"
                        class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-400"
                    />
                </div>

                <!-- Contraseña -->
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                    </label>
                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        required
                        autocomplete="current-password"
                        placeholder="••••••••"
                        class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 placeholder-gray-400"
                    />
                </div>

                <!-- Mensaje de error -->
                <div
                    v-if="error"
                    class="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-start gap-2"
                    role="alert"
                >
                    <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clip-rule="evenodd" />
                    </svg>
                    {{ error }}
                </div>

                <!-- Botón de submit -->
                <button
                    type="submit"
                    :disabled="loading"
                    class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                    <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 12 5.373 12 12h4z" />
                    </svg>
                    {{ loading ? 'Iniciando sesión...' : 'Iniciar sesión' }}
                </button>
            </form>

            <p class="text-center text-xs text-gray-400 mt-6">
                Sistema de Gestión Jurídica &copy; {{ new Date().getFullYear() }}
            </p>
        </div>
    </div>
</template>
