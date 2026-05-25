<script setup lang="ts">
/**
 * Modal genérico con overlay, título y botón de cierre.
 * Usa <Teleport to="body"> para renderizarse fuera del árbol de componentes.
 */
defineProps<{
    title: string
    open:  boolean
    size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{
    close: []
}>()
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div
                v-if="open"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
            >
                <!-- Overlay -->
                <div class="absolute inset-0 bg-black/50" @click="emit('close')" />

                <!-- Contenido del modal -->
                <div
                    :class="[
                        'relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col',
                        size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg',
                    ]"
                >
                    <!-- Cabecera -->
                    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
                        <button
                            @click="emit('close')"
                            class="text-gray-400 hover:text-gray-600 transition rounded-lg p-1 hover:bg-gray-100"
                            aria-label="Cerrar"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- Cuerpo scrollable -->
                    <div class="px-6 py-5 overflow-y-auto flex-1">
                        <slot />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
