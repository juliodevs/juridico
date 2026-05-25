<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * Muestra texto truncado a `limite` caracteres.
 * El usuario puede expandir/colapsar con el botón "ver más / ver menos".
 * Pensado para celdas de tabla con contenido potencialmente muy largo.
 */
const props = withDefaults(defineProps<{
    texto:   string
    limite?: number
}>(), { limite: 80 })

const expandido = ref(false)

const necesitaExpansion = computed(() => (props.texto?.length ?? 0) > props.limite)

const textoVisible = computed(() =>
    expandido.value || !necesitaExpansion.value
        ? props.texto
        : props.texto.slice(0, props.limite) + '…'
)
</script>

<template>
    <span class="leading-relaxed">
        {{ textoVisible }}
        <button
            v-if="necesitaExpansion"
            @click.stop="expandido = !expandido"
            class="ml-1 text-blue-500 hover:text-blue-700 text-xs font-medium whitespace-nowrap hover:underline focus:outline-none"
        >
            {{ expandido ? 'ver menos' : 'ver más' }}
        </button>
    </span>
</template>
