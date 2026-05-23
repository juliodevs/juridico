document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Enviar solicitud GET al servidor para obtener los datos de los procesos
        const { data: procesos } = await axios.get('/api/procesos');

        // Obtener el elemento de la tabla donde se insertarán las filas
        const tablaProcesosCuerpo = document.getElementById('tabla-proceso-cuerpo');

        // Verificar que el elemento existe
        if (!tablaProcesosCuerpo) {
            console.error("Error: No se encontró el elemento con id 'tabla-proceso-cuerpo'");
            return;
        }

        // Limpiar el contenido actual de la tabla
        tablaProcesosCuerpo.innerHTML = '';

        // Crear un fragmento de documento para mejorar el rendimiento
        const fragment = document.createDocumentFragment();

        procesos.forEach(proceso => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${proceso.sujetosProcesales}</td>
                <td>${proceso.radicado}</td>
                <td>${proceso.juzgado}</td>
                <td>${proceso.nombreCompletoCliente || 'Sin asignar'}</td>                
            `;
        

            // Agregar eventos a la fila
            row.addEventListener('mouseover', () => {
                row.style.cursor = 'pointer';
            });

            // Añadimos la fila al fragmento
            fragment.appendChild(row);
        });

        // Insertar el fragmento en la tabla
        tablaProcesosCuerpo.appendChild(fragment);
    } catch (error) {
        console.error('Error al cargar los datos de los procesos:', error);
    }
});
