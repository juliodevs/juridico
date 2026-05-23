document.addEventListener("DOMContentLoaded", async () => {
    const clienteSelect = document.getElementById("cliente");
    const form = document.getElementById("nuevo-proceso-form");
    
    // Función para obtener clientes desde la API y llenar el select
    async function cargarClientes() {
        try {
            const response = await axios.get("/api/clientes");
            const clientes = response.data;
            
            clientes.forEach(cliente => {
                const option = document.createElement("option");
                option.value = cliente.id;
                option.textContent = cliente.nombre;
                clienteSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error al obtener los clientes:", error);
        }
    }
    
    // Cargar clientes al cargar la página
    await cargarClientes();
    
    // Manejo del envío del formulario
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const sujetosProcesales = document.getElementById("sujetos_procesales").value;
        const radicado = document.getElementById("radicado").value;
        const juzgado = document.getElementById("Juzgado").value;
        const idCliente = clienteSelect.value;

        if (!sujetosProcesales || !radicado || !juzgado || !idCliente) {
            alert("Por favor, complete todos los campos.");
            return;
        }

        const nuevoProceso = {
            sujetosProcesales: sujetosProcesales,  
            radicado: radicado,
            juzgado: juzgado,
            idCliente: idCliente
        };

        try {
            const response = await axios.post("/api/guardarProceso", nuevoProceso);
            alert("Proceso guardado exitosamente");
            form.reset();
        } catch (error) {
            console.error("Error al guardar el proceso:", error);
            alert("Hubo un error al guardar el proceso. Intente nuevamente.");
        }
    });

    // Manejo del botón Cancelar
    document.getElementById("cancelar-btn").addEventListener("click", () => {
        form.reset();
    });
});
