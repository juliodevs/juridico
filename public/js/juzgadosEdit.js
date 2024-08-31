document.addEventListener('DOMContentLoaded', async () => {
    // Obtener los elementos del DOM
    const juzgadoSpan = document.getElementById('juzgado');
    const juezSpan = document.getElementById('juez');
    const emailSpan = document.getElementById('email');
    const telefonoSpan = document.getElementById('telefono');
    const departamentoSpan = document.getElementById('departamento');
    const ciudadSpan = document.getElementById('ciudad');

    // Función para obtener el ID del juzgado desde la URL
    function obtenerIdJuzgadoDesdeURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async function obtenerJuzgadoPorId(id) {
        console.log('Obteniendo juzgado con ID:', id);
        try {
            const response = await axios.get(`/api/juzgados/${id}`);
            const juzgadoData = response.data;
            // Mostrar los datos en el formulario
            juzgadoSpan.textContent = juzgadoData.juzgado;
            juezSpan.textContent = juzgadoData.juez;
            emailSpan.textContent = juzgadoData.email;
            telefonoSpan.textContent = juzgadoData.telefono;
            departamentoSpan.textContent = juzgadoData.departamento;
            ciudadSpan.textContent = juzgadoData.ciudad;
        } catch (error) {
            console.error('Error al obtener el juzgado:', error);
        }
    }

    // Obtener el ID del juzgado y llamar a la función para obtener los datos
    const juzgadoId = obtenerIdJuzgadoDesdeURL();
    if (juzgadoId) {
        obtenerJuzgadoPorId(juzgadoId);
    } else {
        console.error('No se encontró el ID del juzgado en la URL');
    }
});