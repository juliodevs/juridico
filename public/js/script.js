// ✅ Configuración de Axios
const api = axios.create({
    baseURL: 'https://consultaprocesos.ramajudicial.gov.co:448/api/v2',
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    params: { pagina: 1 }
});

let erroresRadicados = [];
let contadorFilas = 1; // contador para columna "Número"

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function esReciente(fecha, dias = 3) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(fecha);
    const diff = (hoy - fechaComparar) / (1000 * 60 * 60 * 24);
    return diff <= dias;
}

function agregarFilaTabla(proceso, radicado, ultimaActuacion, registraCambio, colorClass) {
    const tablaCuerpo = document.getElementById('tabla-cuerpo');
    const nuevaFila = document.createElement('tr');
    nuevaFila.innerHTML = `
        <td>${contadorFilas++}</td>
        <td>${radicado}</td>
        <td>${proceso.fechaUltimaActuacion || 'N/A'}</td>
        <td>${proceso.despacho || 'N/A'}</td>
        <td>${proceso.sujetosProcesales || 'N/A'}</td>
        <td>${ultimaActuacion.anotacion || 'N/A'}</td>
        <td class="${colorClass}">${registraCambio}</td>
    `;
    tablaCuerpo.appendChild(nuevaFila);
}

async function ejecutarConReintentos(fn, radicado, idProceso = 'N/A', maxIntentos = 5, delayInicial = 2000) {
    let intentos = 0;
    let delayActual = delayInicial;
    while (intentos < maxIntentos) {
        try {
            return await fn();
        } catch (error) {
            intentos++;
            const status = error.response?.status || 0;
            const erroresReintentar = [429, 500, 502, 503, 504];
            if (intentos < maxIntentos && (erroresReintentar.includes(status) || !status)) {
                console.warn(`🔄 Reintento ${intentos}/${maxIntentos} para radicado ${radicado} (error: ${status || 'desconocido'})`);
                await delay(delayActual);
                delayActual *= 2;
            } else {
                const mensaje = status ? `Error ${status}` : 'Error de red';
                console.error(`❌ Fallo definitivo en radicado ${radicado}: ${mensaje}`);
                erroresRadicados.push({ radicado, idProceso, error: mensaje });
                return null;
            }
        }
    }
}

async function getProcesos() {
    try {
        const { data: procesos } = await axios.get('/api/procesos');
        const radicados = procesos.map(p => p.radicado).filter(r => r !== null);
        return radicados;
    } catch (error) {
        console.error('❌ Error al cargar procesos:', error);
        return [];
    }
}

async function getDetails(idProceso, radicado) {
    try {
        const { data } = await api(`/Proceso/Actuaciones/${idProceso}`);
        if (!data?.actuaciones?.length) {
            return { ultimaActuacion: { anotacion: 'Sin actuaciones', fechaActuacion: 'N/A' } };
        }
        return { ultimaActuacion: data.actuaciones[0] };
    } catch (error) {
        let tipoError = 'Fallo en conexión';
        if (error.response) {
            tipoError = error.response.status === 404 ? 'Proceso no encontrado' : `Error ${error.response.status}`;
        }
        erroresRadicados.push({ radicado, idProceso, error: tipoError });
        return { ultimaActuacion: { anotacion: tipoError, fechaActuacion: 'N/A' } };
    }
}

async function getByNameField(radicado, SoloActivos = false) {
    await ejecutarConReintentos(async () => {
        const { data } = await api(`/Procesos/Consulta/NumeroRadicacion`, {
            params: { numero: radicado, SoloActivos }
        });

        const procesos = data.procesos;
        if (!procesos?.length) {
            erroresRadicados.push({ radicado, idProceso: 'N/A', error: 'Radicado sin procesos' });
            return;
        }

        for (const proceso of procesos) {
            const { idProceso, fechaUltimaActuacion, despacho, sujetosProcesales } = proceso;
            if (!idProceso) {
                erroresRadicados.push({ radicado, idProceso: 'N/A', error: 'ID no válido' });
                continue;
            }

            const detalle = await ejecutarConReintentos(() => getDetails(idProceso, radicado), radicado, idProceso);
            if (!detalle || detalle.ultimaActuacion.anotacion === 'Proceso no encontrado') continue;

            const cambio = esReciente(fechaUltimaActuacion);
            const clase = cambio ? 'registra-cambio-si' : 'registra-cambio-no';
            agregarFilaTabla(proceso, radicado, detalle.ultimaActuacion, cambio ? 'Sí' : 'No', clase);
        }
    }, radicado);
}

function calcularDelay(cantidad) {
    if (cantidad <= 10) return 1000;
    if (cantidad <= 30) return 2000;
    return 3000;
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("consulta-masiva-btn")?.addEventListener("click", async () => {
        try {
            erroresRadicados = [];
            contadorFilas = 1;
            const radicados = await getProcesos();
            const delayMs = calcularDelay(radicados.length);
            let total = 0, conCambios = 0;

            for (const radicado of radicados) {
                await getByNameField(radicado);
                total++;
                const filas = document.getElementById('tabla-cuerpo').getElementsByTagName("tr");
                const ultimaFila = filas[filas.length - 1];
                const cambio = ultimaFila?.getElementsByTagName("td")[6]?.textContent.trim();
                if (cambio === "Sí") conCambios++;
                await delay(delayMs);
            }

            setTimeout(() => {
                alert(`✅ Finalizado. Consultados: ${total}, Con cambios: ${conCambios}`);
                document.getElementById("tabla-cuerpo")?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } catch (error) {
            console.error("❌ Error en consulta masiva:", error);
            alert("❌ Ocurrió un error.");
        }
    });

    document.getElementById("consulta-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const radicado = document.getElementById("radicado").value.trim();
        if (!radicado) return alert("Ingrese un radicado válido.");
        contadorFilas = 1;
        await getByNameField(radicado);
    });

    document.getElementById('admin-link')?.addEventListener('click', () => {
        const submenu = document.getElementById('admin-submenu');
        submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
    });

    document.getElementById('juzgados-link')?.addEventListener('click', () => {
        window.location.href = 'juzgados.html';
    });

    document.getElementById('registro-link')?.addEventListener('click', () => {
        const submenu = document.getElementById('registro-submenu');
        submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
    });
});
