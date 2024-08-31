// Crear una instancia de axios con configuración predeterminada
const api = axios.create({
    baseURL: 'https://consultaprocesos.ramajudicial.gov.co:448/api/v2',
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
    params: {
        pagina: 1
    }
});

// Obtener el formulario de consulta por su ID
const form = document.getElementById('consulta-form');

if (form) {
    // Agregar un evento de escucha para el envío del formulario
    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevenir el comportamiento predeterminado del formulario

        // Obtener el campo de entrada del radicado por su ID
        const radicadoInput = document.getElementById('radicado');

        if (radicadoInput) {
            const radicado = radicadoInput.value; // Obtener el valor del radicado

            // Función para consultar procesos por número de radicado
            async function getByNameField(radicado, SoloActivos = false) {
                try {
                    // Realizar la consulta a la API
                    const { data } = await api(`/Procesos/Consulta/NumeroRadicacion`, {
                        params: {
                            numero: radicado,
                            SoloActivos
                        }
                    });

                    const procesos = data.procesos;
                    //console.log("Procesos encontrados:", procesos);

                    if (procesos && procesos.length > 0) {
                        const tablaCuerpo = document.getElementById('tabla-cuerpo');
                        tablaCuerpo.innerHTML = ''; // Limpiar la tabla antes de agregar nuevas filas

                        for (let i = 0; i < procesos.length; i++) {
                            const { idProceso, fechaUltimaActuacion, despacho, sujetosProcesales } = procesos[i];

                            // Manejar sujetos procesales como un array
                            const sujetosProcesalesArray = Array.isArray(sujetosProcesales)
                                ? sujetosProcesales
                                : (sujetosProcesales ? [sujetosProcesales] : []);
                            const procesados = sujetosProcesalesArray.length > 0 ? sujetosProcesalesArray[0] : 'N/A';

                            // Obtener la fecha de hoy y de ayer
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(today.getDate() - 1);
                            
                            const fechaHoy = today.toISOString().split('T')[0]; // yyyy-mm-dd
                            const fechaAyer = yesterday.toISOString().split('T')[0]; // yyyy-mm-dd
                            
                            // Validar si la fecha de última actuación es hoy o ayer
                            const registraCambioValue = (fechaUltimaActuacion && 
                                (fechaUltimaActuacion.split('T')[0] === fechaHoy || fechaUltimaActuacion.split('T')[0] === fechaAyer)) ? 'Sí' : 'No';
                            
                            // Obtener detalles adicionales del proceso
                            const { ultimaActuacion } = await getDatils(idProceso);
                            console.log("Detalles adicionales del proceso:", ultimaActuacion);

                            // Crear una nueva fila en la tabla
                            const nuevaFila = document.createElement('tr');
                            nuevaFila.innerHTML = `
                                <td>${fechaUltimaActuacion || 'N/A'}</td>
                                <td>${despacho || 'N/A'}</td>
                                <td>${procesados}</td>                               
                                <td>${ultimaActuacion.anotacion || 'N/A'}</td>
                                <td class="${registraCambioValue === 'Sí' ? 'registra-cambio-si' : 'registra-cambio-no'}">${registraCambioValue}</td> <!-- Nueva columna -->
                            `;
                            tablaCuerpo.appendChild(nuevaFila);
                        }
                        
                    } else {
                        console.error("No se encontraron procesos.");
                        alert("No se encontraron procesos para el número de radicado ingresado."); // Aviso al usuario
                    }

                } catch (error) {
                    console.error("Error al consultar el radicado:", error);
                    alert("Ocurrió un error al consultar el radicado. Por favor, inténtelo de nuevo."); // Aviso al usuario
                }
            }

            // Función para obtener detalles adicionales del proceso
            async function getDatils(idProceso) {
                try {
                    const { data } = await api(`/Proceso/Actuaciones/${idProceso}`);
                    const actuaciones = data.actuaciones;
                    const ultimaActuacion = actuaciones[0] || { anotacion: 'No hay anotaciones', fechaActuacion: 'N/A' }; // Manejar caso de sin actuaciones
                    
                    return { ultimaActuacion };
                } catch (error) {
                    console.error("Error al consultar el nuevo endpoint:", error);
                    return { ultimaActuacion: { anotacion: 'Error en la consulta', fechaActuacion: 'N/A' } };
                }
            }

            // Llamar a la función para consultar procesos por número de radicado
            await getByNameField(radicado);
        } else {
            console.error("El elemento de entrada 'radicado' no se encontró.");
            alert("Por favor, ingrese un número de radicado válido."); // Aviso al usuario
        }
    });
} else {
    console.error("El formulario 'consulta-form' no se encontró.");
}

// Obtener el enlace de administración y su submenú por sus IDs
const adminLink = document.getElementById('admin-link');
const adminSubmenu = document.getElementById('admin-submenu');

if (adminLink && adminSubmenu) {
    // Mostrar/Ocultar el submenú de administración al hacer clic en el enlace
    adminLink.addEventListener('click', function() {
        adminSubmenu.style.display = adminSubmenu.style.display === 'block' ? 'none' : 'block';
    });

    // Redirigir a la página de Juzgados al hacer clic en el enlace de Juzgados
    const juzgadosLink = document.getElementById('juzgados-link');
    if (juzgadosLink) {
        juzgadosLink.addEventListener('click', function() {
            window.location.href = 'juzgados.html';
        });
    }
}

// Obtener el enlace de registro y su submenú por sus IDs
const registroLink = document.getElementById('registro-link');
const registroSubmenu = document.getElementById('registro-submenu');

if (registroLink && registroSubmenu) {
    // Mostrar/Ocultar el submenú de registro al hacer clic en el enlace
    registroLink.addEventListener('click', function() {
        registroSubmenu.style.display = registroSubmenu.style.display === 'block' ? 'none' : 'block';
    });
}