document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Enviar solicitud GET al servidor para obtener los datos de los clientes
        // Desestructuramos la respuesta para obtener directamente los datos de los clientes
        const { data: clientes } = await axios.get('/api/clientes');

        // Obtener el elemento de la tabla donde se insertarán las filas
        const tablaClientesCuerpo = document.getElementById('tabla-clientes-cuerpo');

        // Limpiar el contenido actual de la tabla
        tablaClientesCuerpo.innerHTML = '';

        // Crear un fragmento de documento para mejorar el rendimiento
        // Al usar un DocumentFragment, evitamos múltiples reflows y repaints en el DOM
        const fragment = document.createDocumentFragment();

        // Construir el HTML de todas las filas
        // Iteramos sobre cada cliente y creamos una fila de tabla (tr) con sus datos
        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cliente.numero_documento}</td>
                <td>${cliente.nombre}</td>
                <td>${cliente.apellidos}</td>
                <td>${cliente.direccion}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.ciudad}</td>
            `;
            // Añadimos la fila al fragmento
            fragment.appendChild(row);
        });

        // Insertar el fragmento en la tabla
        // Al insertar el fragmento de una sola vez, mejoramos el rendimiento
        tablaClientesCuerpo.appendChild(fragment);
    } catch (error) {
        // Manejo de errores
        // En caso de error, mostramos un mensaje en la consola
        console.error('Error al cargar los datos de los clientes:', error);
    }
});