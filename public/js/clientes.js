document.addEventListener('DOMContentLoaded', () => {
    // Obtener referencias a los elementos del formulario
    const form = document.getElementById('nuevo-cliente-form');
    const numeroDocumento = document.getElementById('nuevo-numero-documento');
    const nombre = document.getElementById('nuevo-nombre');
    const apellidos = document.getElementById('nuevo-apellidos');
    const telefono = document.getElementById('nuevo-telefono');
    const direccion = document.getElementById('nuevo-direccion');
    const ciudad = document.getElementById('nuevo-ciudad');

    // Manejar el evento de envío del formulario
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evitar el envío normal del formulario

        // Obtener los valores de los campos
        const clienteData = {
            numero_documento: numeroDocumento.value.trim(),
            nombre: nombre.value.trim(),
            apellidos: apellidos.value.trim(),
            telefono: telefono.value.trim(),
            direccion: direccion.value.trim(),
            ciudad: ciudad.value.trim()
        };

        try {
            // Enviar los datos al servidor usando axios
            const response = await axios.post('/api/guardarCliente', clienteData);
            
            // Manejar la respuesta del servidor
            console.log('Cliente guardado exitosamente:', response.data);
            
            // Redirigir a la página de clientes
            window.location.href = 'clientes.html'; // Redirigir a la página de clientes

        } catch (error) {
            // Manejar errores en la solicitud
            console.error('Error al guardar el cliente:', error);
            alert('Hubo un problema al guardar el cliente. Inténtalo de nuevo.');
        }
    });

    // Manejar el clic en el botón Cancelar
    document.getElementById('cancelar-btn').addEventListener('click', () => {
        // Redirigir a la página de clientes
        window.location.href = 'clientes.html';
    });
});



