// ✅ Ajuste final para envío directo a WhatsApp con formato compatible

document.addEventListener("DOMContentLoaded", function () {
    const notificarBtn = document.getElementById("notificar-btn");
    if (notificarBtn) {
        notificarBtn.removeEventListener("click", enviarCambiosWhatsApp);
        notificarBtn.addEventListener("click", enviarCambiosWhatsApp);
    }
});

let ejecucionEnCurso = false;

function enviarCambiosWhatsApp() {
    if (ejecucionEnCurso) return;
    ejecucionEnCurso = true;

    const numeroWhatsApp = "573132726969";
    const tabla = document.getElementById("tabla-cuerpo");
    if (!tabla || tabla.rows.length === 0) {
        alert("⚠️ No hay datos en la tabla para enviar.");
        ejecucionEnCurso = false;
        return;
    }

    let mensaje = "🔹 *Actualización de casos con cambios:*%0A%0A";
    let hayCambios = false;

    for (let fila of tabla.rows) {
        let fechaUltimaActuacion = fila.cells[1]?.textContent.trim();
        let despacho = fila.cells[2]?.textContent.trim();
        let sujetos = fila.cells[3]?.textContent.trim();
        let cambio = fila.cells[5]?.textContent.trim();

        // ✅ Solo notificar si 'cambio' es 'Sí'
        if (cambio.toLowerCase() === "sí") {
            hayCambios = true;
            mensaje += `📅 *Fecha:* ${fechaUltimaActuacion}%0A🏢 *Despacho:* ${despacho}%0A👥 *Sujetos:* ${sujetos}%0A%0A`;
        }
    }

    if (hayCambios) {
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`;
        window.location.href = urlWhatsApp;
    } else {
        alert("✅ No hay cambios relevantes para notificación.");
    }

    ejecucionEnCurso = false;
}