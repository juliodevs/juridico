document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Enviar solicitud GET al servidor para obtener los datos de los clientes
        const { data: clientes } = await axios.get('/api/clientes');

        // Obtener el elemento de la tabla donde se insertarán las filas
        const tablaClientesCuerpo = document.getElementById('tabla-clientes-cuerpo');

        // Limpiar el contenido actual de la tabla
        tablaClientesCuerpo.innerHTML = '';

        // Crear un fragmento de documento para mejorar el rendimiento
        const fragment = document.createDocumentFragment();

        // Construir el HTML de todas las filas
        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cliente.numero_documento}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.apellidos}</td>
                <td>${cliente.direccion}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.ciudad}</td>
                <td>${cliente.email}</td>
                <td>${cliente.radicado}</td>
            `;

            // Agregar eventos a la fila
            row.addEventListener('mouseover', () => {
                row.style.cursor = 'pointer';
            });

            row.addEventListener('click', () => {
                // Redirigir a clientesEdit.html con el ID del cliente
                window.location.href = `clientesEdit.html?id=${cliente.id}`;
            });

            // Añadimos la fila al fragmento
            fragment.appendChild(row);
        });

        // Insertar el fragmento en la tabla
        tablaClientesCuerpo.appendChild(fragment);
    } catch (error) {
        console.error('Error al cargar los datos de los clientes:', error);
    }
});