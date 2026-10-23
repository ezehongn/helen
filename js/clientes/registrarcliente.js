// REGISTRO DE CLIENTES CON DEUDA PREVIA AL SISTEMA
let callbackDespuesRegistrarCliente = null;
let productosDisponiblesDeudaInicial = [];
let contadorFilasDeudaInicial = 0;
const IDENTIFICADOR_PRODUCTO_LIBRE = "__PRODUCTO_LIBRE__";

function obtenerElementosRegistrarCliente() {
  return {
    modal: document.getElementById("modal-registrar-cliente"),
    formulario: document.getElementById("formulario-registrar-cliente"),
    nombre: document.getElementById("registrar-cliente-nombre"),
    apellido: document.getElementById("registrar-cliente-apellido"),
    dni: document.getElementById("registrar-cliente-dni"),
    telefono: document.getElementById("registrar-cliente-telefono"),
    observaciones: document.getElementById("registrar-cliente-observaciones"),
    fechaDeuda: document.getElementById("registrar-cliente-fecha-deuda"),
    listaProductos: document.getElementById("lista-productos-adeudados"),
    agregarProducto: document.getElementById("agregar-producto-adeudado"),
    agregarProductoLibre: document.getElementById("agregar-producto-libre"),
    totalDeuda: document.getElementById("total-deuda-inicial"),
    cantidadProductos: document.getElementById("cantidad-productos-adeudados"),
    tipoInteres: document.getElementById("registrar-cliente-tipo-interes"),
    valorInteres: document.getElementById("registrar-cliente-valor-interes"),
    interesCalculado: document.getElementById("registrar-cliente-interes-calculado"),
    mensaje: document.getElementById("mensaje-modal-registrar-cliente"),
    cerrar: document.getElementById("cerrar-modal-registrar-cliente"),
    cancelar: document.getElementById("cancelar-registrar-cliente"),
    guardar: document.getElementById("guardar-registrar-cliente"),
  };
}

function escaparHTMLRegistroCliente(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearPrecioRegistroCliente(valor) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);
}

function obtenerMontoDeuda(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "")
    return 0;
  let texto = String(valor).trim().replace(/\$/g, "").replace(/\s/g, "");
  if (texto.includes(".") && texto.includes(","))
    texto = texto.replace(/\./g, "").replace(",", ".");
  else if (texto.includes(",")) texto = texto.replace(",", ".");
  else if (texto.includes(".") && texto.split(".")[1]?.length === 3)
    texto = texto.replace(/\./g, "");
  const monto = Number(texto);
  return Number.isFinite(monto) ? Math.round(monto * 100) / 100 : 0;
}

async function cargarProductosParaDeudaInicial() {
  const { listaProductos } = obtenerElementosRegistrarCliente();
  if (!listaProductos) return;
  listaProductos.innerHTML =
    '<div class="estado-productos-vacio">Cargando productos…</div>';
  try {
    const { collection, getDocs, query, where } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
    const usuario = sessionStorage.getItem("usuarioOperativo") || "Gon";
    const referencia = collection(window.db, "productos");
    const consulta = query(referencia, where("creadoPor", "==", usuario));
    const snapshot = await getDocs(consulta);
    productosDisponiblesDeudaInicial = snapshot.docs
      .map((documento) => {
        const datos = documento.data();
        return {
          id: documento.id,
          nombre: datos.nombre || "Producto sin nombre",
          precio: Number(datos.precio) || 0,
          talles: Array.isArray(datos.talles) ? datos.talles : [],
          estado: datos.estado || "activo",
        };
      })
      .filter((producto) => producto.estado !== "inactivo")
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    actualizarOpcionesProductosDeudaInicial();
  } catch (error) {
    console.error("Error cargando productos para deuda inicial:", error);
    productosDisponiblesDeudaInicial = [];
    listaProductos.innerHTML =
      '<div class="estado-productos-vacio">No se pudieron cargar los productos. Revisá la conexión e intentá nuevamente.</div>';
  }
}

function obtenerTallesProductoDeudaInicial(producto) {
  return (Array.isArray(producto?.talles) ? producto.talles : [])
    .map((item) =>
      typeof item === "object"
        ? String(item?.talle || "").trim()
        : String(item || "").trim(),
    )
    .filter(Boolean);
}

function construirOpcionesProductoDeudaInicial() {
  return productosDisponiblesDeudaInicial
    .map((producto) => {
      const talles = obtenerTallesProductoDeudaInicial(producto);
      if (!talles.length) {
        return `<option value="${escaparHTMLRegistroCliente(producto.id)}" data-talle="">${escaparHTMLRegistroCliente(producto.nombre)}</option>`;
      }
      return talles
        .map(
          (talle) =>
            `<option value="${escaparHTMLRegistroCliente(producto.id)}" data-talle="${escaparHTMLRegistroCliente(talle)}">${escaparHTMLRegistroCliente(producto.nombre)} (Talle ${escaparHTMLRegistroCliente(talle)})</option>`,
        )
        .join("");
    })
    .join("");
}

function obtenerOpcionesFiltradasDeudaInicial(texto) {
  const termino = String(texto || "")
    .trim()
    .toLocaleLowerCase("es");
  const opciones = [];
  productosDisponiblesDeudaInicial.forEach((producto) => {
    const talles = obtenerTallesProductoDeudaInicial(producto);
    const variantes = talles.length ? talles : [""];
    variantes.forEach((talle) => {
      const etiqueta = `${producto.nombre}${talle ? ` (Talle ${talle})` : ""}`;
      if (!termino || etiqueta.toLocaleLowerCase("es").includes(termino)) {
        opciones.push({ producto, talle, etiqueta });
      }
    });
  });
  return opciones.slice(0, 100);
}

function renderizarOpcionesBuscadorDeudaInicial(fila, texto = "") {
  const lista = fila.querySelector(".opciones-producto-adeudado");
  if (!lista) return;
  const opciones = obtenerOpcionesFiltradasDeudaInicial(texto);
  if (!opciones.length) {
    lista.innerHTML =
      '<div class="opcion-producto-sin-resultados">No se encontraron productos</div>';
  } else {
    lista.innerHTML = opciones
      .map(
        ({ producto, talle, etiqueta }) => `
      <button type="button" class="opcion-producto-adeudado" role="option"
        data-producto-id="${escaparHTMLRegistroCliente(producto.id)}"
        data-talle="${escaparHTMLRegistroCliente(talle)}">
        <span>${escaparHTMLRegistroCliente(etiqueta)}</span>
        <small>${escaparHTMLRegistroCliente(formatearPrecioRegistroCliente(producto.precio))}</small>
      </button>`,
      )
      .join("");
  }
  lista.hidden = false;
}

function seleccionarProductoDeudaInicial(fila, productoId, talle) {
  const producto = productosDisponiblesDeudaInicial.find(
    (item) => item.id === productoId,
  );
  if (!producto) return;
  const buscador = fila.querySelector(".buscador-producto-adeudado");
  const idOculto = fila.querySelector(".producto-id-adeudado");
  const talleOculto = fila.querySelector(".talle-producto-adeudado");
  const lista = fila.querySelector(".opciones-producto-adeudado");
  const importe = fila.querySelector(".importe-producto-adeudado");
  const etiquetaTalle = talle ? ` (Talle ${talle})` : "";
  if (buscador) buscador.value = `${producto.nombre}${etiquetaTalle}`;
  if (idOculto) idOculto.value = producto.id;
  if (talleOculto) talleOculto.value = talle || "";
  if (lista) lista.hidden = true;
  actualizarPrecioFilaDeudaInicial(fila);
  if (importe && !importe.value.trim())
    importe.value = producto.precio ? String(producto.precio) : "";
  actualizarResumenDeudaInicial();
}

function actualizarOpcionesProductosDeudaInicial() {
  const elementos = obtenerElementosRegistrarCliente();
  elementos.listaProductos
    ?.querySelectorAll(".fila-producto-adeudado")
    .forEach((fila) => {
      const buscador = fila.querySelector(".buscador-producto-adeudado");
      if (buscador && !fila.querySelector(".producto-id-adeudado")?.value) {
        buscador.placeholder = productosDisponiblesDeudaInicial.length
          ? "Escribí para buscar un producto…"
          : "No hay productos disponibles";
      }
    });
}

function agregarFilaProductoAdeudado() {
  const elementos = obtenerElementosRegistrarCliente();
  if (!elementos.listaProductos) return;
  // El mensaje de carga no debe quedar mezclado con las filas del formulario.
  elementos.listaProductos
    .querySelectorAll(".estado-productos-vacio")
    .forEach((nodo) => nodo.remove());
  const idFila = ++contadorFilasDeudaInicial;
  const fila = document.createElement("div");
  fila.className = "fila-producto-adeudado";
  fila.dataset.filaId = String(idFila);
  fila.innerHTML = `
    <div class="selector-producto-contenedor">
      <input class="buscador-producto-adeudado" type="text" role="combobox" aria-label="Buscar producto adeudado" aria-autocomplete="list" aria-expanded="false" placeholder="Escribí para buscar un producto…" autocomplete="off" required>
      <input class="producto-id-adeudado" type="hidden" required>
      <input class="talle-producto-adeudado" type="hidden">
      <div class="opciones-producto-adeudado" role="listbox" hidden></div>
    </div>
    <input class="precio-producto-adeudado" type="text" aria-label="Precio del producto" placeholder="$0" readonly>
    <input class="importe-producto-adeudado" type="text" inputmode="decimal" aria-label="Importe adeudado" placeholder="Ej. 28.000" required>
    <button type="button" class="boton-quitar-producto-adeudado" aria-label="Quitar producto" title="Quitar producto">×</button>`;
  const buscador = fila.querySelector(".buscador-producto-adeudado");
  const lista = fila.querySelector(".opciones-producto-adeudado");
  const inputImporte = fila.querySelector(".importe-producto-adeudado");

  buscador.addEventListener("focus", () => {
    buscador.setAttribute("aria-expanded", "true");
    renderizarOpcionesBuscadorDeudaInicial(fila, buscador.value);
  });
  buscador.addEventListener("input", () => {
    fila.querySelector(".producto-id-adeudado").value = "";
    fila.querySelector(".talle-producto-adeudado").value = "";
    fila.querySelector(".precio-producto-adeudado").value = "";
    buscador.setCustomValidity("");
    buscador.setAttribute("aria-expanded", "true");
    renderizarOpcionesBuscadorDeudaInicial(fila, buscador.value);
    actualizarResumenDeudaInicial();
  });
  buscador.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      lista.hidden = true;
      buscador.setAttribute("aria-expanded", "false");
    } else if (evento.key === "Enter" && !lista.hidden) {
      const primeraOpcion = lista.querySelector(".opcion-producto-adeudado");
      if (primeraOpcion) {
        evento.preventDefault();
        seleccionarProductoDeudaInicial(
          fila,
          primeraOpcion.dataset.productoId,
          primeraOpcion.dataset.talle || "",
        );
        buscador.setAttribute("aria-expanded", "false");
      }
    }
  });
  lista.addEventListener("mousedown", (evento) => evento.preventDefault());
  lista.addEventListener("click", (evento) => {
    const opcion = evento.target.closest(".opcion-producto-adeudado");
    if (!opcion) return;
    seleccionarProductoDeudaInicial(
      fila,
      opcion.dataset.productoId,
      opcion.dataset.talle || "",
    );
    buscador.setAttribute("aria-expanded", "false");
  });
  buscador.addEventListener("blur", () => {
    window.setTimeout(() => {
      lista.hidden = true;
      buscador.setAttribute("aria-expanded", "false");
      const idSeleccionado = fila.querySelector(".producto-id-adeudado").value;
      if (!idSeleccionado && buscador.value.trim()) {
        buscador.setCustomValidity("Seleccioná un producto de la lista.");
      }
    }, 120);
  });
  inputImporte.addEventListener("input", actualizarResumenDeudaInicial);
  fila
    .querySelector(".boton-quitar-producto-adeudado")
    .addEventListener("click", () => {
      fila.remove();
      actualizarResumenDeudaInicial();
    });
  elementos.listaProductos.appendChild(fila);
  actualizarResumenDeudaInicial();
}

function agregarFilaProductoLibre() {
  const elementos = obtenerElementosRegistrarCliente();

  if (!elementos.listaProductos) return;

  elementos.listaProductos
    .querySelectorAll(".estado-productos-vacio")
    .forEach((nodo) => nodo.remove());

  const idFila = ++contadorFilasDeudaInicial;
  const fila = document.createElement("div");

  fila.className = "fila-producto-adeudado fila-producto-libre";
  fila.dataset.filaId = String(idFila);
  fila.dataset.tipoProducto = "libre";

  fila.innerHTML = `
    <div class="selector-producto-contenedor">
      <input
        class="nombre-producto-libre"
        type="text"
        aria-label="Nombre del producto libre"
        placeholder="Nombre del producto..."
        autocomplete="off"
        required
      >
    </div>

    <input
      class="precio-producto-adeudado"
      type="text"
      inputmode="decimal"
      aria-label="Precio del producto libre"
      placeholder="Ej. 60.000"
      required
    >

    <input
      class="importe-producto-adeudado"
      type="text"
      inputmode="decimal"
      aria-label="Importe adeudado"
      placeholder="Ej. 35.000"
      required
    >

    <button
      type="button"
      class="boton-quitar-producto-adeudado"
      aria-label="Quitar producto"
      title="Quitar producto"
    >×</button>
  `;

  fila.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", actualizarResumenDeudaInicial);
  });

  fila
    .querySelector(".boton-quitar-producto-adeudado")
    .addEventListener("click", () => {
      fila.remove();
      actualizarResumenDeudaInicial();
    });

  elementos.listaProductos.appendChild(fila);
  actualizarResumenDeudaInicial();

  fila.querySelector(".nombre-producto-libre").focus();
}

function actualizarPrecioFilaDeudaInicial(fila) {
  if (!fila) return;
  const idProducto = fila.querySelector(".producto-id-adeudado")?.value;
  const producto = productosDisponiblesDeudaInicial.find(
    (item) => item.id === idProducto,
  );
  const inputPrecio = fila.querySelector(".precio-producto-adeudado");
  if (inputPrecio)
    inputPrecio.value = producto
      ? formatearPrecioRegistroCliente(producto.precio)
      : "";
}

function obtenerProductosAdeudadosFormulario() {
  const elementos = obtenerElementosRegistrarCliente();

  const filas = [
    ...(elementos.listaProductos?.querySelectorAll(".fila-producto-adeudado") ||
      []),
  ];

  return filas
    .map((fila) => {
      const montoAdeudado = obtenerMontoDeuda(
        fila.querySelector(".importe-producto-adeudado")?.value,
      );

      // Producto ingresado manualmente
      if (fila.dataset.tipoProducto === "libre") {
        const nombre = fila
          .querySelector(".nombre-producto-libre")
          ?.value.trim();

        const precioProducto = obtenerMontoDeuda(
          fila.querySelector(".precio-producto-adeudado")?.value,
        );

        if (!nombre || precioProducto <= 0 || montoAdeudado <= 0) {
          return null;
        }

        return {
          productoId: IDENTIFICADOR_PRODUCTO_LIBRE,
          tipoProducto: "libre",
          identificadorEspecial: "PRODUCTO_LIBRE",
          nombre,
          talle: "",
          precioProducto,
          montoAdeudado,
          saldoPendiente: montoAdeudado,
        };
      }

      // Producto existente del inventario
      const productoId =
        fila.querySelector(".producto-id-adeudado")?.value || "";

      const producto = productosDisponiblesDeudaInicial.find(
        (item) => item.id === productoId,
      );

      if (!producto || montoAdeudado <= 0) return null;

      return {
        productoId: producto.id,
        tipoProducto: "inventario",
        nombre: producto.nombre,
        talle: fila.querySelector(".talle-producto-adeudado")?.value || "",
        precioProducto: producto.precio,
        montoAdeudado,
        saldoPendiente: montoAdeudado,
      };
    })
    .filter(Boolean);
}

function obtenerImporteProductosDeudaInicial() {
  const elementos = obtenerElementosRegistrarCliente();
  const filas = [
    ...(elementos.listaProductos?.querySelectorAll(".fila-producto-adeudado") || []),
  ];
  return filas.reduce(
    (suma, fila) =>
      suma +
      obtenerMontoDeuda(
        fila.querySelector(".importe-producto-adeudado")?.value,
      ),
    0,
  );
}

function obtenerInteresDeudaInicial() {
  const elementos = obtenerElementosRegistrarCliente();
  const valor = obtenerMontoDeuda(elementos.valorInteres?.value);
  if (valor <= 0) return 0;

  if (elementos.tipoInteres?.value === "porcentaje") {
    return Math.round(obtenerImporteProductosDeudaInicial() * (valor / 100) * 100) / 100;
  }

  return Math.round(valor * 100) / 100;
}

function actualizarResumenDeudaInicial() {
  const elementos = obtenerElementosRegistrarCliente();
  const filas = [
    ...(elementos.listaProductos?.querySelectorAll(".fila-producto-adeudado") ||
      []),
  ];
  const totalProductos = filas.reduce(
    (suma, fila) =>
      suma +
      obtenerMontoDeuda(
        fila.querySelector(".importe-producto-adeudado")?.value,
      ),
    0,
  );
  const interes = obtenerInteresDeudaInicial();
  const total = totalProductos + interes;

  if (elementos.totalDeuda)
    elementos.totalDeuda.textContent = formatearPrecioRegistroCliente(total);
  if (elementos.interesCalculado)
    elementos.interesCalculado.textContent = formatearPrecioRegistroCliente(interes);
  if (elementos.cantidadProductos) {
    elementos.cantidadProductos.textContent = `${filas.length} ${filas.length === 1 ? "producto adeudado" : "productos adeudados"}`;
  }
}

function obtenerFechaLocalISORegistroCliente() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function limpiarFormularioRegistrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();
  elementos.formulario?.reset();
  if (elementos.fechaDeuda)
    elementos.fechaDeuda.value = obtenerFechaLocalISORegistroCliente();
  if (elementos.tipoInteres) elementos.tipoInteres.value = "porcentaje";
  if (elementos.valorInteres) {
    elementos.valorInteres.value = "";
    elementos.valorInteres.placeholder = "Ej. 10 para 10%";
  }
  if (elementos.listaProductos) elementos.listaProductos.innerHTML = "";
  if (elementos.mensaje) {
    elementos.mensaje.textContent = "";
    elementos.mensaje.style.color = "";
  }
  if (elementos.guardar) {
    elementos.guardar.disabled = false;
    elementos.guardar.textContent = "Registrar cliente";
  }
  contadorFilasDeudaInicial = 0;
  actualizarResumenDeudaInicial();
}

function abrirModalRegistrarCliente(callback = null) {
  const elementos = obtenerElementosRegistrarCliente();
  if (!elementos.modal) {
    console.error("No existe el modal de registrar cliente.");
    return;
  }
  callbackDespuesRegistrarCliente = callback;
  limpiarFormularioRegistrarCliente();
  elementos.modal.hidden = false;
  requestAnimationFrame(() => elementos.modal.classList.add("visible"));
  cargarProductosParaDeudaInicial().then(() => {
    const estado = elementos.listaProductos?.querySelector(
      ".estado-productos-vacio",
    );
    if (estado?.textContent.includes("No se pudieron cargar")) return;
    estado?.remove();
    if (
      elementos.listaProductos &&
      !elementos.listaProductos.querySelector(".fila-producto-adeudado")
    )
      agregarFilaProductoAdeudado();
  });
  elementos.nombre?.focus();
}

function cerrarModalRegistrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();
  if (!elementos.modal) return;
  elementos.modal.classList.remove("visible");
  setTimeout(() => {
    elementos.modal.hidden = true;
  }, 200);
  callbackDespuesRegistrarCliente = null;
}

function mostrarMensajeRegistrarCliente(mensaje, tipo = "error") {
  const elemento = obtenerElementosRegistrarCliente().mensaje;
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.style.color = tipo === "exito" ? "#23804b" : "#d9534f";
}

function validarRegistrarCliente(elementos) {
  if (!elementos.nombre.value.trim()) {
    mostrarMensajeRegistrarCliente("Ingresá el nombre del cliente.");
    elementos.nombre.focus();
    return false;
  }
  if (!elementos.apellido.value.trim()) {
    mostrarMensajeRegistrarCliente("Ingresá el apellido del cliente.");
    elementos.apellido.focus();
    return false;
  }
  if (!elementos.fechaDeuda?.value) {
    mostrarMensajeRegistrarCliente("Seleccioná la fecha de la deuda.");
    elementos.fechaDeuda?.focus();
    return false;
  }
  const valorInteres = obtenerMontoDeuda(elementos.valorInteres?.value);
  if (elementos.valorInteres?.value.trim() && valorInteres < 0) {
    mostrarMensajeRegistrarCliente("El interés no puede ser negativo.");
    elementos.valorInteres.focus();
    return false;
  }
  const filas = [
    ...(elementos.listaProductos?.querySelectorAll(".fila-producto-adeudado") ||
      []),
  ];
  if (!filas.length) {
    mostrarMensajeRegistrarCliente("Agregá al menos un producto adeudado.");
    return false;
  }
  for (const fila of filas) {
    const importe = fila.querySelector(".importe-producto-adeudado");
    const monto = obtenerMontoDeuda(importe?.value);

    if (fila.dataset.tipoProducto === "libre") {
      const nombre = fila.querySelector(".nombre-producto-libre")?.value.trim();

      const campoNombre = fila.querySelector(".nombre-producto-libre");
      const campoPrecio = fila.querySelector(".precio-producto-adeudado");
      const precio = obtenerMontoDeuda(campoPrecio?.value);

      if (!nombre) {
        mostrarMensajeRegistrarCliente("Ingresá el nombre del producto libre.");
        campoNombre?.focus();
        return false;
      }

      if (precio <= 0) {
        mostrarMensajeRegistrarCliente(
          "El precio del producto debe ser mayor a $0.",
        );
        campoPrecio?.focus();
        return false;
      }

      if (monto <= 0) {
        mostrarMensajeRegistrarCliente(
          "El importe adeudado debe ser mayor a $0.",
        );
        importe?.focus();
        return false;
      }

      continue;
    }

    const selector = fila.querySelector(".buscador-producto-adeudado");
    const idProducto = fila.querySelector(".producto-id-adeudado")?.value;

    if (!idProducto) {
      mostrarMensajeRegistrarCliente(
        "Seleccioná un producto de la lista en cada fila.",
      );
      selector?.focus();
      return false;
    }

    if (monto <= 0) {
      mostrarMensajeRegistrarCliente(
        "El importe adeudado de cada producto debe ser mayor a $0.",
      );
      importe?.focus();
      return false;
    }

    const producto = productosDisponiblesDeudaInicial.find(
      (item) => item.id === idProducto,
    );

    if (producto && monto > producto.precio) {
      mostrarMensajeRegistrarCliente(
        `El importe adeudado de ${producto.nombre} no puede superar su precio (${formatearPrecioRegistroCliente(producto.precio)}).`,
      );
      importe?.focus();
      return false;
    }
  }
  return true;
}

async function verificarDniExistente(dni) {
  const { collection, getDocs, query, where } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
  const snapshot = await getDocs(
    query(collection(window.db, "clientes"), where("dni", "==", dni)),
  );
  return !snapshot.empty;
}

async function registrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();
  if (!elementos.formulario || !validarRegistrarCliente(elementos)) return;
  const nombre = elementos.nombre.value.trim();
  const apellido = elementos.apellido.value.trim();
  const dni = elementos.dni.value.trim();
  const telefono = elementos.telefono.value.trim();
  const observaciones = elementos.observaciones.value.trim();
  const fechaDeuda = elementos.fechaDeuda.value;
  const productosAdeudados = obtenerProductosAdeudadosFormulario();
  const deudaProductos = productosAdeudados.reduce(
    (total, producto) => total + producto.montoAdeudado,
    0,
  );
  const tipoInteres = elementos.tipoInteres?.value || "porcentaje";
  const valorInteres = obtenerMontoDeuda(elementos.valorInteres?.value);
  const interes = obtenerInteresDeudaInicial();
  const deuda = deudaProductos + interes;
  const botonGuardar = elementos.guardar;
  try {
    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando…";
    mostrarMensajeRegistrarCliente("");
    const { collection, doc, serverTimestamp, writeBatch, Timestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
    if (dni && (await verificarDniExistente(dni))) {
      mostrarMensajeRegistrarCliente(
        "Ya existe un cliente registrado con ese DNI.",
      );
      elementos.dni.focus();
      return;
    }
    const clienteRef = doc(collection(window.db, "clientes"));
    const usuario = sessionStorage.getItem("usuarioOperativo") || "Gon";
    const datosCliente = {
      nombre,
      apellido,
      deudaTotal: deuda,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
      usuarioCreador: usuario,
    };
    if (dni) datosCliente.dni = dni;
    if (telefono) datosCliente.telefono = telefono;
    if (observaciones) datosCliente.observaciones = observaciones;
    const movimientoRef = doc(
      collection(window.db, "clientes", clienteRef.id, "movimientos"),
    );
    const batch = writeBatch(window.db);
    batch.set(clienteRef, datosCliente);
    batch.set(movimientoRef, {
      tipo: "deuda_inicial",
      monto: deudaProductos,
      montoAplicado: 0,
      productosAdeudados,
      fecha: Timestamp.fromDate(new Date(`${fechaDeuda}T12:00:00`)),
      usuario,
      descripcion: observaciones || "Deuda anterior al registro en el sistema",
      creadoEn: serverTimestamp(),
    });

    if (interes > 0) {
      const interesRef = doc(
        collection(window.db, "clientes", clienteRef.id, "movimientos"),
      );
      batch.set(interesRef, {
        tipo: "interes",
        monto: interes,
        tipoInteres,
        valor: valorInteres,
        origen: "deuda_inicial",
        fecha: Timestamp.fromDate(new Date(`${fechaDeuda}T12:00:00`)),
        usuario,
        descripcion: "Interés agregado al registrar deuda anterior",
        creadoEn: serverTimestamp(),
      });
    }

    await batch.commit();

    mostrarMensajeRegistrarCliente(
      "Cliente registrado correctamente.",
      "exito",
    );
    setTimeout(async () => {
      const callback = callbackDespuesRegistrarCliente;
      cerrarModalRegistrarCliente();
      if (typeof callback === "function") await callback();
      callbackDespuesRegistrarCliente = null;
    }, 500);
  } catch (error) {
    console.error("Error registrando cliente:", error);
    mostrarMensajeRegistrarCliente(
      "No se pudo registrar el cliente. Intentá nuevamente.",
    );
  } finally {
    botonGuardar.disabled = false;
    botonGuardar.textContent = "Registrar cliente";
  }
}

function inicializarRegistrarCliente() {
  const elementos = obtenerElementosRegistrarCliente();
  if (!elementos.modal) {
    console.error("No se encontró el modal de registrar cliente.");
    return;
  }
  elementos.cerrar?.addEventListener("click", cerrarModalRegistrarCliente);
  elementos.cancelar?.addEventListener("click", cerrarModalRegistrarCliente);
  elementos.agregarProducto?.addEventListener(
    "click",
    agregarFilaProductoAdeudado,
  );
  elementos.agregarProductoLibre?.addEventListener(
    "click",
    agregarFilaProductoLibre,
  );
  elementos.tipoInteres?.addEventListener("change", () => {
    if (elementos.valorInteres) {
      elementos.valorInteres.placeholder =
        elementos.tipoInteres.value === "porcentaje"
          ? "Ej. 10 para 10%"
          : "Ej. 5000";
    }
    actualizarResumenDeudaInicial();
  });
  elementos.valorInteres?.addEventListener("input", actualizarResumenDeudaInicial);
  elementos.modal.addEventListener("click", (evento) => {
    if (evento.target === elementos.modal) cerrarModalRegistrarCliente();
  });
  elementos.formulario?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await registrarCliente();
  });
}

window.abrirModalRegistrarCliente = abrirModalRegistrarCliente;
window.cerrarModalRegistrarCliente = cerrarModalRegistrarCliente;

inicializarRegistrarCliente();
