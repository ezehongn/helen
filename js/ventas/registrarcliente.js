/* ========================================
   REGISTRAR CLIENTE EN LA PANTALLA VENTAS
======================================== */

let modalCliente;
let formularioNuevoCliente;

let funcionDespuesDeCrearCliente = null;

/* ========================================
   INICIALIZAR
======================================== */

function inicializarModalNuevoCliente() {
  modalCliente = document.getElementById("modal-cliente");

  formularioNuevoCliente = document.getElementById("formulario-nuevo-cliente");

  if (!modalCliente || !formularioNuevoCliente) {
    console.error("No se encontró el modal de nuevo cliente.");

    return;
  }

  document
    .getElementById("cerrar-modal-cliente")
    ?.addEventListener("click", cerrarModalCliente);

  document
    .getElementById("cancelar-nuevo-cliente")
    ?.addEventListener("click", cerrarModalCliente);

  formularioNuevoCliente.addEventListener("submit", registrarNuevoCliente);

  modalCliente.addEventListener("click", (evento) => {
    if (evento.target === modalCliente) {
      cerrarModalCliente();
    }
  });
}

/* ========================================
   ABRIR MODAL
======================================== */

window.abrirModalNuevoCliente = function (despuesDeCrear = null) {
  funcionDespuesDeCrearCliente = despuesDeCrear;

  limpiarFormularioCliente();

  modalCliente.classList.add("visible");

  setTimeout(() => {
    document.getElementById("nuevo-cliente-nombre")?.focus();
  }, 50);
};

/* ========================================
   CERRAR MODAL
======================================== */

function cerrarModalCliente() {
  modalCliente.classList.remove("visible");

  limpiarFormularioCliente();

  funcionDespuesDeCrearCliente = null;
}

/* ========================================
   LIMPIAR FORMULARIO
======================================== */

function limpiarFormularioCliente() {
  if (!formularioNuevoCliente) {
    return;
  }

  formularioNuevoCliente.reset();

  const mensaje = document.getElementById("mensaje-modal-cliente");

  if (mensaje) {
    mensaje.textContent = "";

    mensaje.className = "mensaje-modal-cliente";
  }

  const boton = document.getElementById("guardar-nuevo-cliente");

  if (boton) {
    boton.disabled = false;

    boton.textContent = "Guardar cliente";
  }
}

/* ========================================
   REGISTRAR CLIENTE
======================================== */

async function registrarNuevoCliente(evento) {
  evento.preventDefault();

  const nombre = document.getElementById("nuevo-cliente-nombre").value.trim();

  const apellido = document
    .getElementById("nuevo-cliente-apellido")
    .value.trim();

  const dni = document.getElementById("nuevo-cliente-dni").value.trim();

  const telefono = document
    .getElementById("nuevo-cliente-telefono")
    .value.trim();

  if (!nombre || !apellido || !dni || !telefono) {
    mostrarErrorCliente("Completá todos los campos.");

    return;
  }

  const boton = document.getElementById("guardar-nuevo-cliente");

  try {
    boton.disabled = true;

    boton.textContent = "Guardando...";

    const { collection, addDoc, getDocs, query, where, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    /*
     * Verificar que no exista
     * otro cliente con el mismo DNI.
     */

    const consultaDni = query(
      collection(window.db, "clientes"),
      where("dni", "==", dni),
    );

    const resultadoDni = await getDocs(consultaDni);

    if (!resultadoDni.empty) {
      mostrarErrorCliente("Ya existe un cliente registrado con ese DNI.");

      boton.disabled = false;

      boton.textContent = "Guardar cliente";

      return;
    }

    const usuario = sessionStorage.getItem("usuarioOperativo") || "Gon";

    const cliente = {
      nombre: nombre,

      apellido: apellido,

      dni: dni,

      telefono: telefono,

      creadoEn: serverTimestamp(),

      usuarioCreador: usuario,
    };

    const referencia = await addDoc(collection(window.db, "clientes"), cliente);

    console.log("Cliente creado:", referencia.id);

    const clienteCreado = {
      id: referencia.id,

      ...cliente,
    };

    /*
     * Si Ventas nos pasó una función,
     * seleccionamos automáticamente
     * el nuevo cliente.
     */

    if (typeof funcionDespuesDeCrearCliente === "function") {
      funcionDespuesDeCrearCliente(clienteCreado);
    }

    cerrarModalCliente();
  } catch (error) {
    console.error("Error registrando cliente:", error);

    mostrarErrorCliente("No se pudo registrar el cliente. Intentá nuevamente.");

    boton.disabled = false;

    boton.textContent = "Guardar cliente";
  }
}

/* ========================================
   MOSTRAR ERROR
======================================== */

function mostrarErrorCliente(mensaje) {
  const elemento = document.getElementById("mensaje-modal-cliente");

  if (!elemento) {
    return;
  }

  elemento.textContent = mensaje;

  elemento.className = "mensaje-modal-cliente visible error";
}

/* ========================================
   INICIALIZAR CUANDO SE CARGA EL SCRIPT
======================================== */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarModalNuevoCliente);
} else {
  inicializarModalNuevoCliente();
}
