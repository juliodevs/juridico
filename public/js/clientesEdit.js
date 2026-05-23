document.addEventListener('DOMContentLoaded', async () => {
    // Obtener los elementos del DOM
    const documentoSpan = document.getElementById('documento');
    const nombreSpan = document.getElementById('nombre');
    const apellidoSpan = document.getElementById('apellido');
    const ciudadSpan = document.getElementById('ciudad');
    const telefonoSpan = document.getElementById('telefono');
    const emailSpan = document.getElementById('email');

    // Función para obtener el ID del cliente desde la URL
    function obtenerIdClienteDesdeURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    // Función para obtener el cliente por ID
    async function obtenerClientePorId(id) {
        console.log('Obteniendo cliente con ID:', id);
        try {
            const response = await axios.get(`/api/clientes/${id}`);
            const clienteData = response.data;
            // Mostrar los datos en el formulario
            documentoSpan.textContent = clienteData.numero_documento;
            nombreSpan.textContent = clienteData.nombre;
            apellidoSpan.textContent = clienteData.apellidos;
            ciudadSpan.textContent = clienteData.ciudad;
            telefonoSpan.textContent = clienteData.telefono;
            emailSpan.textContent = clienteData.email;
        } catch (error) {
            console.error('Error al obtener el cliente:', error);
        }
    }

    // Obtener el ID del cliente y llamar a la función para obtener los datos
    const clienteId = obtenerIdClienteDesdeURL();
    if (clienteId) {
        obtenerClientePorId(clienteId);
    } else {
        console.error('No se encontró el ID del cliente en la URL');
    }
});