document.addEventListener('DOMContentLoaded', async () => {
    const tablaJuzgadosCuerpo = document.getElementById('tabla-juzgados-cuerpo');

    async function obtenerJuzgados() {
        try {
            const response = await axios.get('/api/juzgados');
            const juzgados = response.data;

            tablaJuzgadosCuerpo.innerHTML = '';

            juzgados.forEach(juzgado => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${juzgado.Juzgado || 'No disponible'}</td>
                    <td>${juzgado.Juez || 'No disponible'}</td>
                    <td>${juzgado.departamento || 'No disponible'}</td>
                    <td>${juzgado.ciudad || 'No disponible'}</td>
                    <td>${juzgado.Direccion || 'No disponible'}</td>
                    <td>${juzgado.Telefono || 'No disponible'}</td>
                    <td>${juzgado.Email || 'No disponible'}</td>
                `;

                // Agregar eventos a la fila
                row.addEventListener('mouseover', () => {
                    row.style.cursor = 'pointer';
                });

                row.addEventListener('click', () => {
                    // Redirigir a juzgadosEdit.html con el ID del juzgado
                    window.location.href = `juzgadosEdit.html?id=${juzgado.id}`;
                });

                tablaJuzgadosCuerpo.appendChild(row);
            });
        } catch (error) {
            console.error('Error al obtener los juzgados:', error);
        }
    }

    await obtenerJuzgados();
});