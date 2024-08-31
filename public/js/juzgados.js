

document.addEventListener('DOMContentLoaded', async function() {
    // Obtén las referencias a los elementos del DOM
    const departamentoSelect = document.getElementById('departamento');
    const ciudadSelect = document.getElementById('ciudad');
    const departamentoSearch = document.getElementById('departamento-search');
    const ciudadSearch = document.getElementById('ciudad-search');
    const form = document.getElementById('juzgado-form');
    const cancelarBtn = document.getElementById('cancelar-btn');

    // Función para manejar errores
    function manejarError(mensaje, error) {
        console.error(mensaje, error);
        alert(mensaje);
    }

    // Función para crear opciones en un select
    function crearOpciones(selectElement, items, placeholder) {
        selectElement.innerHTML = `<option value="">${placeholder}</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nombre;
            selectElement.appendChild(option);
        });
    }

    // Función para obtener y mostrar los juzgados
    async function obtenerJuzgados() {
        try {
            const response = await axios.get('/api/juzgados');
            console.log(response.data);
        } catch (error) {
            manejarError('Error al obtener los juzgados:', error);
        }
    }

    // Función para obtener departamentos con búsqueda
    async function obtenerDepartamentos(query = '') {
        try {
            const response = await axios.get('/api/departamentos', { params: { query } });
            crearOpciones(departamentoSelect, response.data, 'Seleccione un departamento');
        } catch (error) {
            manejarError('Error al obtener departamentos:', error);
        }
    }

    // Función para obtener ciudades con búsqueda
    async function obtenerCiudades(departamentoId, query = '') {
        try {
            const response = await axios.get('/api/ciudades', { params: { departamentoId, query } });
            crearOpciones(ciudadSelect, response.data, 'Seleccione una ciudad');
        } catch (error) {
            manejarError('Error al obtener ciudades:', error);
        }
    }

    // Llamar a la función para obtener los departamentos al cargar la página
    await obtenerDepartamentos();

    // Manejar el cambio de selección de departamento
    if (departamentoSelect) {
        departamentoSelect.addEventListener('change', async function() {
            const departamentoId = this.value;
            if (departamentoId) {
                await obtenerCiudades(departamentoId);
            } else {
                ciudadSelect.innerHTML = '<option value="">Seleccione una ciudad</option>';
            }
        });
    }

    // Manejar el evento click del botón cancelar
    if (cancelarBtn) {
        cancelarBtn.addEventListener('click', function() {
            window.location.href = 'juzgadosList.html';
        });
    }

    // Manejar la búsqueda en el campo de departamento
    if (departamentoSearch) {
        departamentoSearch.addEventListener('input', function() {
            obtenerDepartamentos(this.value);
        });
    }

    // Manejar la búsqueda en el campo de ciudad
    if (ciudadSearch) {
        ciudadSearch.addEventListener('input', function() {
            const departamentoId = departamentoSelect.value;
            if (departamentoId) {
                obtenerCiudades(departamentoId, this.value);
            }
        });
    }

    // Validar existencia del formulario antes de agregar el evento
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const datos = {
                juzgado: document.getElementById('juzgado').value,
                juez: document.getElementById('juez').value,
                email: document.getElementById('email').value,
                direccion: document.getElementById('direccion').value,
                telefono: document.getElementById('telefono').value,
                departamento: document.getElementById('departamento').value,
                ciudad: document.getElementById('ciudad').value
            };

            try {
                const response = await axios.post('/api/guardarJuzgado', datos);
                alert(response.data.message);
            } catch (error) {
                manejarError('Error al guardar el juzgado:', error);
            }
        });
    } else {
        console.error('Formulario con ID "juzgado-form" no encontrado');
    }
});
