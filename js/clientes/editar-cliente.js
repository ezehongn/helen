/* ========================================
   EDITAR CLIENTE
======================================== */

let clienteEditando = null;
let callbackEdicionCliente = null;


/* ========================================
   ABRIR MODAL
======================================== */

window.abrirModalEditarCliente = function (
    cliente,
    callback = null
) {
    if (!cliente) {
        return;
    }

    clienteEditando = cliente;
    callbackEdicionCliente = callback;

    const modal = document.getElementById(
        "modal-editar-cliente"
    );

    if (!modal) {
        console.error(
            "No se encontró el modal de editar cliente."
        );

        return;
    }

    document.getElementById(
        "editar-nombre-cliente"
    ).value = cliente.nombre || "";

    document.getElementById(
        "editar-apellido-cliente"
    ).value = cliente.apellido || "";

    document.getElementById(
        "editar-dni-cliente"
    ).value = cliente.dni || "";

    document.getElementById(
        "editar-telefono-cliente"
    ).value = cliente.telefono || "";

    modal.removeAttribute("hidden");
    modal.classList.add("visible");

    document.body.style.overflow = "hidden";

    document.getElementById(
        "editar-nombre-cliente"
    )?.focus();
};


/* ========================================
   CERRAR MODAL
======================================== */

function cerrarModalEditarCliente() {

    const modal = document.getElementById(
        "modal-editar-cliente"
    );

    if (!modal) {
        return;
    }

    modal.classList.remove("visible");
    modal.setAttribute("hidden", "");

    document.body.style.overflow = "";

    clienteEditando = null;
    callbackEdicionCliente = null;
}


/* ========================================
   GUARDAR CAMBIOS
======================================== */

async function guardarCambiosCliente() {

    if (!clienteEditando) {
        return;
    }

    const nombre =
        document.getElementById(
            "editar-nombre-cliente"
        )?.value.trim();

    const apellido =
        document.getElementById(
            "editar-apellido-cliente"
        )?.value.trim();

    const dni =
        document.getElementById(
            "editar-dni-cliente"
        )?.value.trim();

    const telefono =
        document.getElementById(
            "editar-telefono-cliente"
        )?.value.trim();

    if (!nombre || !apellido) {
        return;
    }

    const boton = document.getElementById(
        "guardar-editar-cliente"
    );

    try {

        if (boton) {
            boton.disabled = true;
            boton.textContent = "Guardando...";
        }

        const {
            doc,
            updateDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
        );

        const referenciaCliente = doc(
            window.db,
            "clientes",
            clienteEditando.id
        );

        await updateDoc(
            referenciaCliente,
            {
                nombre,
                apellido,
                dni,
                telefono
            }
        );

        if (typeof callbackEdicionCliente === "function") {
            await callbackEdicionCliente();
        }

        cerrarModalEditarCliente();

    } catch (error) {

        console.error(
            "Error al editar cliente:",
            error
        );

    } finally {

        if (boton) {
            boton.disabled = false;
            boton.textContent = "Guardar cambios";
        }

    }
}


/* ========================================
   EVENTOS
======================================== */

function inicializarEditarCliente() {

    document
        .getElementById("cerrar-modal-editar-cliente")
        ?.addEventListener(
            "click",
            cerrarModalEditarCliente
        );

    document
        .getElementById("cancelar-editar-cliente")
        ?.addEventListener(
            "click",
            cerrarModalEditarCliente
        );

    document
        .getElementById("guardar-editar-cliente")
        ?.addEventListener(
            "click",
            guardarCambiosCliente
        );

    document
        .getElementById("modal-editar-cliente")
        ?.addEventListener(
            "click",
            (evento) => {

                if (
                    evento.target.id ===
                    "modal-editar-cliente"
                ) {
                    cerrarModalEditarCliente();
                }

            }
        );
}

inicializarEditarCliente();