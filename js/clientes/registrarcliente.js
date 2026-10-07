// ========================================
// REGISTRAR CLIENTE EN LA PANTALLA CLIENTE
// ========================================

let callbackDespuesRegistrarCliente = null;

// ========================================
// ELEMENTOS DEL MODAL
// ========================================

function obtenerElementosRegistrarCliente() {
  return {
    modal: document.getElementById("modal-registrar-cliente"),

    formulario: document.getElementById("formulario-registrar-cliente"),

    nombre: document.getElementById("registrar-cliente-nombre"),

    apellido: document.getElementById("registrar-cliente-apellido"),

    dni: document.getElementById("registrar-cliente-dni"),

    telefono: document.getElementById("registrar-cliente-telefono"),

    deuda: document.getElementById("registrar-cliente-deuda"),

    fechaDeuda: document.getElementById("registrar-cliente-fecha-deuda"),

    observaciones: document.getElementById("registrar-cliente-observaciones"),

    mensaje: document.getElementById("mensaje-modal-registrar-cliente"),

    cerrar: document.getElementById("cerrar-modal-registrar-cliente"),

    cancelar: document.getElementById("cancelar-registrar-cliente"),

    guardar: document.getElementById("guardar-registrar-cliente"),
  };
}

// ========================================
// ABRIR MODAL
// ========================================

function abrirModalRegistrarCliente(callback = null) {
  const elementos = obtenerElementosRegistrarCliente();

  if (!elementos.modal) {
    console.error("No existe el modal de registrar cliente.");
    return;
  }

  callbackDespuesRegistrarCliente = callback;

  elementos.formulario?.reset();

  if (elementos.mensaje) {
    elementos.mensaje.textContent = "";
    elementos.mensaje.style.color = "";
  }

  elementos.modal.hidden = false;

  requestAnimationFrame(() => {
    elementos.modal.classList.add("visible");
  });

  elementos.nombre?.focus();
}

// ========================================
// CERRAR MODAL
// ========================================

function cerrarModalRegistrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();

  if (!elementos.modal) return;

  elementos.modal.classList.remove("visible");

  setTimeout(() => {
    elementos.modal.hidden = true;
  }, 200);

  callbackDespuesRegistrarCliente = null;
}

// ========================================
// MENSAJE
// ========================================

function mostrarMensajeRegistrarCliente(mensaje, tipo = "error") {
  const elemento = document.getElementById("mensaje-modal-registrar-cliente");

  if (!elemento) return;

  elemento.textContent = mensaje;

  if (tipo === "exito") {
    elemento.style.color = "#2e8b57";
  } else {
    elemento.style.color = "#d9534f";
  }
}

// ========================================
// CONVERTIR IMPORTE
// ========================================

function obtenerMontoDeuda(valor) {
  if (!valor) return 0;

  let texto = String(valor).trim().replace(/\$/g, "").replace(/\s/g, "");

  /*
   * Permitimos formatos como:
   *
   * 25000
   * 25000,50
   * 25.000
   * 25.000,50
   */

  if (texto.includes(".") && texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  } else if (texto.includes(".") && texto.split(".")[1]?.length === 3) {
    texto = texto.replace(/\./g, "");
  }

  const monto = Number(texto);

  if (!Number.isFinite(monto)) {
    return 0;
  }

  return Math.round(monto * 100) / 100;
}

// ========================================
// VALIDAR DATOS
// ========================================

function validarRegistrarCliente(elementos) {
  const nombre = elementos.nombre.value.trim();

  const apellido = elementos.apellido.value.trim();

  const dni = elementos.dni.value.trim();

  const telefono = elementos.telefono.value.trim();

  const deuda = obtenerMontoDeuda(elementos.deuda.value);

  if (!nombre) {
    mostrarMensajeRegistrarCliente("Ingresá el nombre del cliente.");

    elementos.nombre.focus();
    return false;
  }

  if (!apellido) {
    mostrarMensajeRegistrarCliente("Ingresá el apellido del cliente.");

    elementos.apellido.focus();
    return false;
  }

  if (!dni) {
    mostrarMensajeRegistrarCliente("Ingresá el DNI del cliente.");

    elementos.dni.focus();
    return false;
  }

  if (!telefono) {
    mostrarMensajeRegistrarCliente("Ingresá el teléfono del cliente.");

    elementos.telefono.focus();
    return false;
  }

  if (elementos.deuda.value.trim() && deuda <= 0) {
    mostrarMensajeRegistrarCliente("El monto de la deuda debe ser mayor a $0.");

    elementos.deuda.focus();
    return false;
  }

  if (deuda > 0 && !elementos.fechaDeuda.value) {
    mostrarMensajeRegistrarCliente("Seleccioná la fecha de la deuda.");

    elementos.fechaDeuda.focus();
    return false;
  }

  return true;
}

// ========================================
// VERIFICAR DNI EXISTENTE
// ========================================

async function verificarDniExistente(dni) {
  const { collection, getDocs, query, where } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

  const referencia = collection(window.db, "clientes");

  const consulta = query(referencia, where("dni", "==", dni));

  const snapshot = await getDocs(consulta);

  return !snapshot.empty;
}

// ========================================
// REGISTRAR CLIENTE
// ========================================

async function registrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();

  if (!elementos.formulario) return;

  if (!validarRegistrarCliente(elementos)) {
    return;
  }

  const nombre = elementos.nombre.value.trim();

  const apellido = elementos.apellido.value.trim();

  const dni = elementos.dni.value.trim();

  const telefono = elementos.telefono.value.trim();

  const deuda = obtenerMontoDeuda(elementos.deuda.value);

  const fechaDeuda = elementos.fechaDeuda.value || null;

  const observaciones = elementos.observaciones.value.trim();

  const botonGuardar = elementos.guardar;

  try {
    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando...";

    mostrarMensajeRegistrarCliente("", "exito");

    // ========================================
    // FIREBASE
    // ========================================

    const {
      collection,
      doc,
      getDocs,
      query,
      serverTimestamp,
      setDoc,
      where,
      Timestamp,
    } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    // ========================================
    // VERIFICAR DNI
    // ========================================

    const dniExistente = await verificarDniExistente(dni);

    if (dniExistente) {
      mostrarMensajeRegistrarCliente(
        "Ya existe un cliente registrado con ese DNI.",
      );

      elementos.dni.focus();

      return;
    }

    // ========================================
    // REFERENCIA DEL CLIENTE
    // ========================================

    const clienteRef = doc(collection(window.db, "clientes"));

    // ========================================
    // USUARIO OPERATIVO
    // ========================================

    const usuario = sessionStorage.getItem("usuarioOperativo") || "Gon";

    // ========================================
    // FECHA DE LA DEUDA
    // ========================================

    let fechaMovimiento = serverTimestamp();

    if (fechaDeuda) {
      const partes = fechaDeuda.split("-");

      const fecha = new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2]),
        12,
        0,
        0,
      );

      fechaMovimiento = Timestamp.fromDate(fecha);
    }

    // ========================================
    // DATOS DEL CLIENTE
    // ========================================

    const datosCliente = {
      nombre,

      apellido,

      dni,

      telefono,

      deudaTotal: deuda,

      creadoEn: serverTimestamp(),

      actualizadoEn: serverTimestamp(),

      usuarioCreador: usuario,
    };

    if (observaciones) {
      datosCliente.observaciones = observaciones;
    }

    // ========================================
    // GUARDAR CLIENTE
    // ========================================

    await setDoc(clienteRef, datosCliente);

    // ========================================
    // REGISTRAR DEUDA INICIAL
    // ========================================

    if (deuda > 0) {
      const movimientoRef = doc(
        collection(window.db, "clientes", clienteRef.id, "movimientos"),
      );

      await setDoc(movimientoRef, {
        tipo: "deuda_inicial",

        monto: deuda,

        montoAplicado: 0,

        fecha: fechaMovimiento,

        usuario,

        descripcion: observaciones || "Deuda inicial",

        creadoEn: serverTimestamp(),
      });
    }

    // ========================================
    // ÉXITO
    // ========================================

    mostrarMensajeRegistrarCliente(
      "Cliente registrado correctamente.",
      "exito",
    );

    // Esperamos un momento para
    // mostrar el mensaje de éxito.

    setTimeout(async () => {
      const callback = callbackDespuesRegistrarCliente;

      cerrarModalRegistrarCliente();

      if (typeof callback === "function") {
        await callback();
      }

      callbackDespuesRegistrarCliente = null;
    }, 500);
  } catch (error) {
    console.error("Error registrando cliente:", error);

    mostrarMensajeRegistrarCliente(
      "No se pudo registrar el cliente. Intentá nuevamente.",
    );
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Guardar cliente";
  }
}

// ========================================
// INICIALIZAR
// ========================================

function inicializarRegistrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();

  if (!elementos.modal) {
    console.error("No se encontró el modal registrar cliente.");
    return;
  }

  // ========================================
  // BOTÓN PRINCIPAL
  // ========================================

  // ========================================
  // CERRAR
  // ========================================

  elementos.cerrar?.addEventListener("click", cerrarModalRegistrarCliente);

  elementos.cancelar?.addEventListener("click", cerrarModalRegistrarCliente);

  // ========================================
  // CLICK FUERA DEL MODAL
  // ========================================

  elementos.modal.addEventListener("click", (evento) => {
    if (evento.target === elementos.modal) {
      cerrarModalRegistrarCliente();
    }
  });

  // ========================================
  // FORMULARIO
  // ========================================

  elementos.formulario?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    await registrarCliente();
  });
}

// ========================================
// EXPONER FUNCIONES
// ========================================

window.abrirModalRegistrarCliente = abrirModalRegistrarCliente;

window.cerrarModalRegistrarCliente = cerrarModalRegistrarCliente;

// ========================================
// INICIAR
// ========================================

inicializarRegistrarCliente();
