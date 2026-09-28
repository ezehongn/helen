/* ========================================
   CARGAR CSS DE VENTAS
======================================== */

function cargarCSSVentas() {
  if (document.getElementById("css-ventas")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-ventas";
  link.rel = "stylesheet";
  link.href = "css/ventas/ventas.css";

  document.head.appendChild(link);
}

/* ========================================
   VENTAS
======================================== */

let productosVenta = [];
let carritoVenta = [];
let clientesVenta = [];
let mediosPagoVenta = [];

let CONFIGURACION_TARJETA_CREDITO = {
  recargo3Cuotas: 10,
  recargo6Cuotas: 15,
};

async function cargarConfiguracionTarjetaCredito() {
  try {
    const { doc, getDoc } =
      await import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
      );

    const referencia = doc(window.db, "configuracion", "general");

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      return;
    }

    const datos = resultado.data();

    CONFIGURACION_TARJETA_CREDITO = {
      recargo3Cuotas: Number(datos.recargo3Cuotas) || 0,
      recargo6Cuotas: Number(datos.recargo6Cuotas) || 0,
    };

    console.log(
      "Configuración de recargos cargada:",
      CONFIGURACION_TARJETA_CREDITO
    );
  } catch (error) {
    console.error("Error cargando configuración de recargos:", error);
  }
}

let clienteSeleccionadoVenta = null;
let usuarioVentaActivo = null;
let cancelarEscuchaUltimasVentas = null;

/* ========================================
   INICIALIZACIÓN
======================================== */

async function inicializarVentas() {
  cargarCSSVentas();

  usuarioVentaActivo = sessionStorage.getItem("usuarioOperativo");

  console.log("Usuario activo en Ventas:", usuarioVentaActivo);

  await cargarConfiguracionTarjetaCredito();

  configurarEventosVentas();

  await cargarModalNuevoCliente();

  await cargarModalHistorialVentas();

  agregarMedioPagoVenta();

  cargarProductosVenta();

  iniciarEscuchaUltimasVentas();

  renderizarCarritoVenta();
}

/* ========================================
   MODAL NUEVO CLIENTE
======================================== */

async function cargarModalNuevoCliente() {
  try {
    const respuesta = await fetch("html/ventas/registrarcliente-modal.html");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de nuevo cliente.");
    }

    const html = await respuesta.text();

    document.body.insertAdjacentHTML("beforeend", html);

    cargarScriptNuevoCliente();
  } catch (error) {
    console.error("Error cargando modal de cliente:", error);
  }
}

function cargarScriptNuevoCliente() {
  if (document.getElementById("js-registrar-cliente")) {
    return;
  }

  const script = document.createElement("script");

  script.id = "js-registrar-cliente";

  script.src = `js/ventas/registrarcliente.js?t=${Date.now()}`;

  document.body.appendChild(script);
}

async function cargarModalHistorialVentas() {
  try {
    const respuesta = await fetch("html/ventas/historialventas-modal.html");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de historial.");
    }

    const html = await respuesta.text();

    document.body.insertAdjacentHTML("beforeend", html);

    cargarCSSHistorialVentas();

    cargarScriptHistorialVentas();
  } catch (error) {
    console.error("Error cargando modal de historial:", error);
  }
}

function cargarCSSHistorialVentas() {
  if (document.getElementById("css-historial-ventas")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-historial-ventas";

  link.rel = "stylesheet";

  link.href = "css/ventas/historialventas.css";

  document.head.appendChild(link);
}

function cargarScriptHistorialVentas() {
  if (document.getElementById("js-historial-ventas")) {
    return;
  }

  const script = document.createElement("script");

  script.id = "js-historial-ventas";

  script.src = `js/ventas/historialventas.js?t=${Date.now()}`;

  document.body.appendChild(script);
}

/* ========================================
   EVENTOS
======================================== */

function configurarEventosVentas() {
  document
    .getElementById("busqueda-productos-venta")
    ?.addEventListener("input", mostrarResultadosProductosVenta);

  document
    .getElementById("agregar-otro-producto")
    ?.addEventListener("click", () => {
      document.getElementById("busqueda-productos-venta")?.focus();
    });

  document
    .getElementById("limpiar-venta")
    ?.addEventListener("click", limpiarVenta);

  document
    .getElementById("busqueda-cliente-venta")
    ?.addEventListener("input", buscarClientesVenta);

  document
    .getElementById("limpiar-cliente-venta")
    ?.addEventListener("click", limpiarClienteVenta);

  document
    .getElementById("agregar-medio-pago")
    ?.addEventListener("click", agregarMedioPagoVenta);

  document
    .getElementById("registrar-venta")
    ?.addEventListener("click", registrarVenta);

  document
    .getElementById("nuevo-cliente-venta")
    ?.addEventListener("click", () => {
      if (window.abrirModalNuevoCliente) {
        window.abrirModalNuevoCliente((cliente) => {
          seleccionarClienteVenta(cliente);
        });
      }
    });

  document
    .getElementById("ver-historial-completo")
    ?.addEventListener("click", () => {
      if (window.abrirModalHistorialVentas) {
        window.abrirModalHistorialVentas();
      }
    });

  document.addEventListener("click", (evento) => {
    if (
      !evento.target.closest(".buscador-ventas") &&
      !evento.target.closest(".resultados-productos-venta")
    ) {
      document
        .getElementById("resultados-productos-venta")
        ?.classList.remove("visible");
    }

    if (
      !evento.target.closest(".buscador-cliente-venta") &&
      !evento.target.closest(".resultados-clientes-venta")
    ) {
      document
        .getElementById("resultados-clientes-venta")
        ?.classList.remove("visible");
    }
  });

  window.addEventListener("usuarioOperativoCambiado", async (evento) => {
    const nuevoUsuario = evento.detail.usuario;

    console.log("Ventas detectó cambio de usuario:", nuevoUsuario);

    usuarioVentaActivo = nuevoUsuario;

    // Limpiar el carrito del usuario anterior
    carritoVenta = [];

    // Recargar productos del nuevo usuario
    await cargarProductosVenta();

    // Cambiar escucha del historial al nuevo usuario
    iniciarEscuchaUltimasVentas();

    // Actualizar carrito
    renderizarCarritoVenta();
  });
}

/* ========================================
   PRODUCTOS
======================================== */

async function cargarProductosVenta() {
  try {
    const { collection, getDocs } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    if (!window.db) {
      throw new Error("Firebase Firestore no está inicializado.");
    }

    console.log("Cargando productos desde Firestore...");

    const referencia = collection(window.db, "productos");

    const snapshot = await getDocs(referencia);

    console.log("Productos encontrados en Firestore:", snapshot.size);

    const todosLosProductos = snapshot.docs.map((documento) => {
      const datos = documento.data();

      console.log(
        "PRODUCTO COMPLETO:",
        documento.id,
        JSON.stringify(datos, null, 2),
      );

      return {
        id: documento.id,

        ...datos,

        talles: Array.isArray(datos.talles) ? datos.talles : [],

        stock: Number(datos.stock) || 0,

        precio: Number(datos.precio) || 0,
      };
    });

    /*
     * Filtramos los productos del usuario actual.
     */

    productosVenta = todosLosProductos.filter((producto) => {
      const mismoUsuario =
        String(producto.creadoPor || "")
          .trim()
          .toLowerCase() ===
        String(usuarioVentaActivo || "")
          .trim()
          .toLowerCase();

      const productoActivo = producto.estado === "activo";

      return mismoUsuario && productoActivo;
    });

    console.log("Usuario activo:", usuarioVentaActivo);

    console.log("Productos disponibles para Ventas:", productosVenta);
  } catch (error) {
    console.error("Error cargando productos para Ventas:", error);

    mostrarMensajeVenta("No se pudieron cargar los productos.", "error");
  }
}

/* ========================================
   BUSCAR PRODUCTOS
======================================== */

function mostrarResultadosProductosVenta() {
  const input = document.getElementById("busqueda-productos-venta");

  const contenedor = document.getElementById("resultados-productos-venta");

  if (!input || !contenedor) {
    return;
  }

  const texto = input.value.trim().toLowerCase();

  if (!texto) {
    contenedor.innerHTML = "";

    contenedor.classList.remove("visible");

    return;
  }

  const resultados = productosVenta.filter((producto) => {
    return (
      String(producto.nombre || "")
        .toLowerCase()
        .includes(texto) ||
      String(producto.categoria || "")
        .toLowerCase()
        .includes(texto)
    );
  });

  contenedor.innerHTML = "";

  if (!resultados.length) {
    contenedor.innerHTML = `
            <div class="resultado-producto-venta">
                <div></div>

                <div class="info-resultado-producto">
                    <strong>No se encontraron productos</strong>
                    <span>Probá con otro nombre o categoría.</span>
                </div>
            </div>
        `;
  } else {
    resultados.forEach((producto) => {
      const elemento = document.createElement("div");

      elemento.className = "resultado-producto-venta";

      elemento.innerHTML = `

                    ${
                      producto.imagen
                        ? `
                                <img
                                    src="${producto.imagen}"
                                    alt=""
                                >
                            `
                        : `
                                <div class="resultado-producto-sin-imagen"></div>
                            `
                    }


                    <div class="info-resultado-producto">

                        <strong>
                            ${escaparHTMLVenta(producto.nombre)}
                        </strong>

                        <span>
                            ${escaparHTMLVenta(producto.categoria || "")}
                        </span>

                    </div>


                    <strong class="precio-resultado-producto">

                        ${formatearPrecioVenta(producto.precio)}

                    </strong>

                `;

      elemento.addEventListener("click", () => {
        agregarProductoAlCarrito(producto);

        input.value = "";

        contenedor.classList.remove("visible");
      });

      contenedor.appendChild(elemento);
    });
  }

  contenedor.classList.add("visible");
}

/* ========================================
   AGREGAR PRODUCTO AL CARRITO
======================================== */

function agregarProductoAlCarrito(producto) {
  const talleDisponible = producto.talles.find(
    (talle) => Number(talle.stock) > 0,
  );

  carritoVenta.push({
    id: `${producto.id}-${Date.now()}-${Math.random()}`,

    productoId: producto.id,

    nombre: producto.nombre,

    imagen: producto.imagen || "",

    precio: Number(producto.precio) || 0,

    talles: producto.talles || [],

    talle: talleDisponible?.talle || producto.talles[0]?.talle || "",

    cantidad: 1,
  });

  renderizarCarritoVenta();
}

/* ========================================
   CARRITO
======================================== */

function renderizarCarritoVenta() {
  const contenedor = document.getElementById("lista-carrito-ventas");

  const vacio = document.getElementById("carrito-vacio");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = "";

  if (!carritoVenta.length) {
    if (vacio) {
      vacio.style.display = "flex";
    }

    actualizarTotalesVenta();

    return;
  }

  if (vacio) {
    vacio.style.display = "none";
  }

  carritoVenta.forEach((item) => {
    const fila = document.createElement("div");

    fila.className = "fila-carrito-venta";

    const opcionesTalles = item.talles.length
      ? item.talles
          .map((talle) => {
            const stock = Number(talle.stock) || 0;

            return `
                                    <option
                                        value="${escaparHTMLVenta(talle.talle)}"
                                        ${
                                          String(talle.talle) ===
                                          String(item.talle)
                                            ? "selected"
                                            : ""
                                        }
                                        ${stock <= 0 ? "disabled" : ""}
                                    >
                                        ${escaparHTMLVenta(talle.talle)}
                                        ${
                                          stock > 0
                                            ? ` (${stock})`
                                            : " (agotado)"
                                        }
                                    </option>
                                `;
          })
          .join("")
      : `
                        <option value="">
                            Sin talle
                        </option>
                    `;

    fila.innerHTML = `

                <div class="producto-carrito-venta">

                    ${
                      item.imagen
                        ? `
                                <img
                                    src="${item.imagen}"
                                    alt=""
                                >
                            `
                        : `
                                <div class="producto-carrito-sin-imagen"></div>
                            `
                    }


                    <div class="info-carrito-producto">

                        <strong>
                            ${escaparHTMLVenta(item.nombre)}
                        </strong>

                        <span>
                            ${
                              item.talles.length
                                ? "Seleccioná un talle"
                                : "Sin talles"
                            }
                        </span>

                    </div>

                </div>


                <select
                    class="select-talle-venta"
                    ${item.talles.length ? "" : "disabled"}
                >
                    ${opcionesTalles}
                </select>


                <input
                    type="text"
                    inputmode="numeric"
                    class="cantidad-venta"
                    value="${item.cantidad}"
                >


                <div class="precio-unitario-venta">

                    ${formatearPrecioVenta(item.precio)}

                </div>


                <div class="subtotal-venta">

                    ${formatearPrecioVenta(item.precio * item.cantidad)}

                </div>


                <button
                    type="button"
                    class="boton-eliminar-carrito"
                    title="Eliminar producto"
                >
                    🗑
                </button>

            `;

    const select = fila.querySelector(".select-talle-venta");

    const cantidad = fila.querySelector(".cantidad-venta");

    select.addEventListener("change", () => {
      item.talle = select.value;

      validarCantidadCarrito(item, cantidad);
    });

    cantidad.addEventListener("input", () => {
      cantidad.value = cantidad.value.replace(/\D/g, "");

      item.cantidad = Number(cantidad.value) || 0;

      validarCantidadCarrito(item, cantidad);
    });

    fila
      .querySelector(".boton-eliminar-carrito")
      .addEventListener("click", () => {
        carritoVenta = carritoVenta.filter((otro) => otro.id !== item.id);

        renderizarCarritoVenta();
      });

    contenedor.appendChild(fila);
  });

  actualizarTotalesVenta();
}

/* ========================================
   VALIDAR CANTIDAD
======================================== */

function validarCantidadCarrito(item, input) {
  let stockDisponible = 0;

  if (item.talles.length) {
    const talle = item.talles.find(
      (otro) => String(otro.talle) === String(item.talle),
    );

    stockDisponible = Number(talle?.stock) || 0;
  } else {
    const producto = productosVenta.find(
      (producto) => producto.id === item.productoId,
    );

    stockDisponible = Number(producto?.stock) || 0;
  }

  if (stockDisponible > 0 && item.cantidad > stockDisponible) {
    item.cantidad = stockDisponible;
  }

  if (stockDisponible > 0 && item.cantidad < 1) {
    item.cantidad = 1;
  }

  input.value = item.cantidad || "";

  const fila = input.closest(".fila-carrito-venta");

  const subtotal = fila?.querySelector(".subtotal-venta");

  if (subtotal) {
    subtotal.textContent = formatearPrecioVenta(item.precio * item.cantidad);
  }

  actualizarTotalesVenta();
}

/* ========================================
   CLIENTES
======================================== */

async function cargarClientesVenta() {
  if (clientesVenta.length) {
    return;
  }

  const { collection, getDocs } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

  const snapshot = await getDocs(collection(window.db, "clientes"));

  clientesVenta = snapshot.docs.map((documento) => {
    return {
      id: documento.id,

      ...documento.data(),
    };
  });
}

async function buscarClientesVenta() {
  const input = document.getElementById("busqueda-cliente-venta");

  const contenedor = document.getElementById("resultados-clientes-venta");

  if (!input || !contenedor) {
    return;
  }

  const texto = input.value.trim().toLowerCase();

  if (!texto) {
    contenedor.innerHTML = "";

    contenedor.classList.remove("visible");

    return;
  }

  try {
    await cargarClientesVenta();

    const resultados = clientesVenta
      .filter((cliente) => {
        const nombreCompleto =
          `${cliente.nombre || ""} ${cliente.apellido || ""}`.toLowerCase();

        return (
          nombreCompleto.includes(texto) ||
          String(cliente.dni || "").includes(texto)
        );
      })
      .slice(0, 8);

    contenedor.innerHTML = "";

    resultados.forEach((cliente) => {
      const elemento = document.createElement("div");

      elemento.className = "resultado-cliente-venta";

      elemento.innerHTML = `

                    <strong>
                        ${escaparHTMLVenta(
                          `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim(),
                        )}
                    </strong>

                    <span>
                        DNI:
                        ${escaparHTMLVenta(cliente.dni || "")}

                        · Tel:
                        ${escaparHTMLVenta(cliente.telefono || "")}
                    </span>

                `;

      elemento.addEventListener("click", () => {
        seleccionarClienteVenta(cliente);

        contenedor.classList.remove("visible");
      });

      contenedor.appendChild(elemento);
    });

    if (!resultados.length) {
      contenedor.innerHTML = `
                <div class="resultado-cliente-venta">

                    <strong>
                        No se encontró el cliente
                    </strong>

                    <span>
                        Revisá el nombre, apellido o DNI.
                    </span>

                </div>
            `;
    }

    contenedor.classList.add("visible");
  } catch (error) {
    console.error("Error buscando clientes:", error);
  }
}

function seleccionarClienteVenta(cliente) {
  clienteSeleccionadoVenta = cliente;

  const input = document.getElementById("busqueda-cliente-venta");

  const contenedor = document.getElementById("cliente-seleccionado-venta");

  input.value = `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim();

  contenedor.innerHTML = `

        <span>

            ${escaparHTMLVenta(
              `${cliente.nombre || ""} ${cliente.apellido || ""}`.trim(),
            )}

            · DNI
            ${escaparHTMLVenta(cliente.dni || "")}

            · Tel.
            ${escaparHTMLVenta(cliente.telefono || "")}

        </span>

    `;

  contenedor.classList.add("seleccionado");

  actualizarEstadoBotonRegistrar();
}

function limpiarClienteVenta() {
  clienteSeleccionadoVenta = null;

  const input = document.getElementById("busqueda-cliente-venta");

  const contenedor = document.getElementById("cliente-seleccionado-venta");

  if (input) {
    input.value = "";
  }

  if (contenedor) {
    contenedor.classList.remove("seleccionado");

    contenedor.innerHTML = "<span>Venta sin cliente</span>";
  }

  actualizarEstadoBotonRegistrar();
}

/* ========================================
   MEDIOS DE PAGO
======================================== */

function agregarMedioPagoVenta() {
  mediosPagoVenta.push({
    id: `${Date.now()}-${Math.random()}`,

    tipo: "efectivo",

    importe: 0,
  });

  renderizarMediosPagoVenta();
}

function renderizarMediosPagoVenta() {
  const contenedor = document.getElementById("lista-medios-pago");

  const vacio = document.getElementById("sin-medios-pago");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = "";

  if (vacio) {
    vacio.style.display = mediosPagoVenta.length ? "none" : "block";
  }

  mediosPagoVenta.forEach((medio) => {
    const fila = document.createElement("div");

    fila.className = "fila-medio-pago";

    fila.innerHTML = `

    <div class="contenedor-medio-pago">

        <select class="select-medio-pago">

            <option
                value="efectivo"
                ${medio.tipo === "efectivo" ? "selected" : ""}
            >
                Efectivo
            </option>

            <option
                value="transferencia"
                ${medio.tipo === "transferencia" ? "selected" : ""}
            >
                Transferencia
            </option>

            <option
                value="debito"
                ${medio.tipo === "debito" ? "selected" : ""}
            >
                Tarjeta de débito
            </option>

            <option
                value="credito"
                ${medio.tipo === "credito" ? "selected" : ""}
            >
                Tarjeta de crédito
            </option>

        </select>

        ${
          medio.tipo === "credito"
            ? `
                <select class="select-cuotas-credito">

                    <option
                        value="3"
                        ${medio.cuotas === 3 ? "selected" : ""}
                    >
                        3 cuotas (+${CONFIGURACION_TARJETA_CREDITO.recargo3Cuotas}%)
                    </option>

                    <option
                        value="6"
                        ${medio.cuotas === 6 ? "selected" : ""}
                    >
                        6 cuotas (+${CONFIGURACION_TARJETA_CREDITO.recargo6Cuotas}%)
                    </option>

                </select>
              `
            : ""
        }

    </div>

    <input
        type="text"
        inputmode="decimal"
        class="importe-medio-pago"
        placeholder="$ 0"
        value="${medio.importe > 0 ? medio.importe : ""}"
    >

    <button
        type="button"
        class="boton-eliminar-medio-pago"
        title="Eliminar medio de pago"
    >
        ×
    </button>

`;

    fila
      .querySelector(".select-medio-pago")
      .addEventListener("change", (evento) => {
        medio.tipo = evento.target.value;

        if (medio.tipo === "credito") {
          medio.cuotas = medio.cuotas || 3;
        } else {
          delete medio.cuotas;
        }

        renderizarMediosPagoVenta();
      });

    fila
      .querySelector(".importe-medio-pago")
      .addEventListener("input", (evento) => {
        medio.importe = convertirNumeroVenta(evento.target.value);

        actualizarTotalesVenta();
      });

    fila
      .querySelector(".select-cuotas-credito")
      ?.addEventListener("change", (evento) => {
        medio.cuotas = Number(evento.target.value) || 3;

        actualizarTotalesVenta();
      });

    fila
      .querySelector(".boton-eliminar-medio-pago")
      .addEventListener("click", () => {
        mediosPagoVenta = mediosPagoVenta.filter(
          (otro) => otro.id !== medio.id,
        );

        renderizarMediosPagoVenta();
      });

    contenedor.appendChild(fila);
  });

  actualizarTotalesVenta();
}

/* ========================================
   TOTALES
======================================== */

function obtenerTotalVenta() {
  return carritoVenta.reduce((total, item) => {
    return total + (Number(item.precio) || 0) * (Number(item.cantidad) || 0);
  }, 0);
}

function obtenerRecargoTarjetaCredito(totalBase, cuotas) {
  if (cuotas === 3) {
    return totalBase * (CONFIGURACION_TARJETA_CREDITO.recargo3Cuotas / 100);
  }

  if (cuotas === 6) {
    return totalBase * (CONFIGURACION_TARJETA_CREDITO.recargo6Cuotas / 100);
  }

  return 0;
}

function obtenerRecargoVenta() {
  return mediosPagoVenta.reduce((total, medio) => {
    if (medio.tipo !== "credito") {
      return total;
    }

    const importe = Number(medio.importe) || 0;

    return total + obtenerRecargoTarjetaCredito(importe, medio.cuotas);
  }, 0);
}

function obtenerTotalEntregado() {
  return mediosPagoVenta.reduce((total, medio) => {
    const importe = Number(medio.importe) || 0;

    if (medio.tipo === "credito") {
      return (
        total + importe + obtenerRecargoTarjetaCredito(importe, medio.cuotas)
      );
    }

    return total + importe;
  }, 0);
}

function actualizarTotalesVenta() {
  const totalBase = obtenerTotalVenta();

  const recargo = obtenerRecargoVenta();

  const total = totalBase + recargo;

  const entregado = obtenerTotalEntregado();

  const vuelto = Math.max(entregado - total, 0);

  const saldo = Math.max(total - entregado, 0);

  document.getElementById("total-venta").textContent =
    formatearPrecioVenta(total);

  document.getElementById("total-a-pagar").textContent =
    formatearPrecioVenta(total);

  document.getElementById("total-entregado").textContent =
    formatearPrecioVenta(entregado);

  document.getElementById("vuelto-venta").textContent =
    formatearPrecioVenta(vuelto);

  document.getElementById("saldo-a-deber").textContent =
    formatearPrecioVenta(saldo);

  actualizarEstadoBotonRegistrar();
}

/* ========================================
   BOTÓN REGISTRAR
======================================== */

function actualizarEstadoBotonRegistrar() {
  const boton = document.getElementById("registrar-venta");

  if (!boton) {
    return;
  }

  const totalBase = obtenerTotalVenta();
  const recargo = obtenerRecargoVenta();
  const total = totalBase + recargo;

  const entregado = obtenerTotalEntregado();

  const saldo = Math.max(total - entregado, 0);

  boton.disabled =
    carritoVenta.length === 0 || (saldo > 0 && !clienteSeleccionadoVenta);
}

/* ========================================
   REGISTRAR VENTA
======================================== */

async function registrarVenta() {
  const totalBase = obtenerTotalVenta();
  const recargoTotal = obtenerRecargoVenta();
  const total = totalBase + recargoTotal;

  const entregado = obtenerTotalEntregado();

  const vuelto = Math.max(entregado - total, 0);
  const saldo = Math.max(total - entregado, 0);

  if (!carritoVenta.length) {
    mostrarMensajeVenta("Agregá al menos un producto.", "error");

    return;
  }

  if (saldo > 0 && !clienteSeleccionadoVenta) {
    mostrarMensajeVenta(
      "Si queda saldo a deber, debés seleccionar un cliente.",
      "error",
    );

    return;
  }

  if (!usuarioVentaActivo) {
    usuarioVentaActivo = "gon";

    sessionStorage.setItem("usuarioOperativo", "gon");
  }

  const boton = document.getElementById("registrar-venta");

  try {
    boton.disabled = true;

    boton.textContent = "Registrando...";

    const { collection, doc, runTransaction, serverTimestamp, getDocs } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const numero = await obtenerNumeroVenta(getDocs, collection);

    const referenciaVenta = doc(collection(window.db, "ventas"));

    await runTransaction(window.db, async (transaction) => {
      const productosLeidos = new Map();

      /*
       * Leer todos los productos involucrados.
       */

      for (const item of carritoVenta) {
        if (productosLeidos.has(item.productoId)) {
          continue;
        }

        const referenciaProducto = doc(window.db, "productos", item.productoId);

        const documento = await transaction.get(referenciaProducto);

        if (!documento.exists()) {
          throw new Error(`El producto "${item.nombre}" ya no existe.`);
        }

        productosLeidos.set(item.productoId, {
          referencia: referenciaProducto,

          datos: documento.data(),
        });
      }

      /*
       * Agrupar cantidades por producto y talle.
       */

      const descuentos = new Map();

      carritoVenta.forEach((item) => {
        const clave = `${item.productoId}__${item.talle}`;

        descuentos.set(
          clave,
          (descuentos.get(clave) || 0) + (Number(item.cantidad) || 0),
        );
      });

      const cambiosProductos = new Map();

      /*
       * Comprobar y descontar stock.
       */

      descuentos.forEach((cantidad, clave) => {
        const separador = clave.indexOf("__");

        const productoId = clave.slice(0, separador);

        const talleSeleccionado = clave.slice(separador + 2);

        const productoLeido = productosLeidos.get(productoId);

        const datos = productoLeido.datos;

        const talles = Array.isArray(datos.talles)
          ? datos.talles.map((talle) => ({
              ...talle,
            }))
          : [];

        if (talles.length) {
          const indice = talles.findIndex(
            (talle) => String(talle.talle) === String(talleSeleccionado),
          );

          if (indice === -1) {
            throw new Error(
              `El talle "${talleSeleccionado}" ya no existe para "${datos.nombre}".`,
            );
          }

          const stockActual = Number(talles[indice].stock) || 0;

          if (cantidad > stockActual) {
            throw new Error(
              `No hay stock suficiente de "${datos.nombre}" talle ${talleSeleccionado}.`,
            );
          }

          talles[indice].stock = stockActual - cantidad;
        }

        cambiosProductos.set(productoId, {
          referencia: productoLeido.referencia,

          datos: datos,

          talles: talles,
        });
      });

      /*
       * Guardar nuevos stocks.
       */

      cambiosProductos.forEach((cambio) => {
        if (cambio.talles.length) {
          const stockTotal = cambio.talles.reduce((total, talle) => {
            return total + (Number(talle.stock) || 0);
          }, 0);

          transaction.update(cambio.referencia, {
            talles: cambio.talles,

            stock: stockTotal,
          });
        } else {
          const cantidadTotal = carritoVenta
            .filter((item) => item.productoId === cambio.referencia.id)
            .reduce((total, item) => {
              return total + (Number(item.cantidad) || 0);
            }, 0);

          const stockActual = Number(cambio.datos.stock) || 0;

          transaction.update(cambio.referencia, {
            stock: stockActual - cantidadTotal,
          });
        }
      });

      /*
       * Guardar venta.
       */

      transaction.set(referenciaVenta, {
        numero: numero,

        usuario: usuarioVentaActivo,

        fecha: serverTimestamp(),

        cliente: clienteSeleccionadoVenta
          ? {
              id: clienteSeleccionadoVenta.id,

              nombre: clienteSeleccionadoVenta.nombre || "",

              apellido: clienteSeleccionadoVenta.apellido || "",

              dni: clienteSeleccionadoVenta.dni || "",

              telefono: clienteSeleccionadoVenta.telefono || "",
            }
          : null,

        productos: carritoVenta.map((item) => {
          return {
            productoId: item.productoId,

            nombre: item.nombre,

            talle: item.talle || "",

            cantidad: Number(item.cantidad) || 0,

            precioUnitario: Number(item.precio) || 0,

            subtotal: (Number(item.precio) || 0) * (Number(item.cantidad) || 0),
          };
        }),

        totalBase: totalBase,
        recargoTotal: recargoTotal,
        total: total,

        mediosPago: mediosPagoVenta
          .filter((medio) => Number(medio.importe) > 0)
          .map((medio) => ({
            tipo: medio.tipo,
            importe: Number(medio.importe) || 0,
            ...(medio.tipo === "credito"
              ? {
                  cuotas: medio.cuotas,
                  recargo: obtenerRecargoTarjetaCredito(
                    Number(medio.importe) || 0,
                    medio.cuotas,
                  ),
                }
              : {}),
          })),

        totalEntregado: entregado,

        vuelto: vuelto,

        saldoAdeber: saldo,

        estado: saldo > 0 ? "con_deuda" : "pagada",

        observaciones:
          document.getElementById("observaciones-venta")?.value.trim() || "",
      });
    });

    mostrarMensajeVenta(`Venta ${numero} registrada correctamente.`, "exito");

    limpiarVenta();

    await cargarProductosVenta();
  } catch (error) {
    console.error("Error registrando venta:", error);

    mostrarMensajeVenta(
      error.message || "No se pudo registrar la venta.",
      "error",
    );
  } finally {
    boton.disabled = false;

    boton.textContent = "✓ Registrar venta";

    actualizarEstadoBotonRegistrar();
  }
}

/* ========================================
   NÚMERO DE VENTA
======================================== */

async function obtenerNumeroVenta(getDocs, collection) {
  const snapshot = await getDocs(collection(window.db, "ventas"));

  let mayor = 0;

  snapshot.forEach((documento) => {
    const venta = documento.data();

    if (venta.usuario !== usuarioVentaActivo) {
      return;
    }

    const coincidencia = String(venta.numero || "").match(/(\d+)$/);

    if (coincidencia) {
      mayor = Math.max(mayor, Number(coincidencia[1]));
    }
  });

  return `V-${String(mayor + 1).padStart(6, "0")}`;
}

/* ========================================
   HISTORIAL
======================================== */

async function iniciarEscuchaUltimasVentas() {
  try {
    if (cancelarEscuchaUltimasVentas) {
      cancelarEscuchaUltimasVentas();
      cancelarEscuchaUltimasVentas = null;
    }

    const { collection, onSnapshot } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = collection(window.db, "ventas");

    cancelarEscuchaUltimasVentas = onSnapshot(
      referencia,
      (snapshot) => {
        const ventas = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
          .filter((venta) => venta.usuario === usuarioVentaActivo)
          .sort((a, b) => {
            const fechaA = obtenerFechaJS(a.fecha)?.getTime() || 0;
            const fechaB = obtenerFechaJS(b.fecha)?.getTime() || 0;

            return fechaB - fechaA;
          })
          .slice(0, 8);

        renderizarUltimasVentas(ventas);
      },
      (error) => {
        console.error("Error escuchando historial:", error);
      },
    );
  } catch (error) {
    console.error("Error iniciando escucha del historial:", error);
  }
}

function renderizarUltimasVentas(ventas) {
  const contenedor = document.getElementById("lista-ultimas-ventas");
  const vacio = document.getElementById("historial-vacio");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = "";

  if (vacio) {
    vacio.style.display = ventas.length ? "none" : "flex";
  }

  ventas.forEach((venta) => {
    const elemento = document.createElement("div");

    elemento.className = "item-venta-historial";

    const cliente = venta.cliente
      ? `${venta.cliente.nombre || ""} ${venta.cliente.apellido || ""}`.trim()
      : "Cliente general";

    const cantidadProductos = Array.isArray(venta.productos)
      ? venta.productos.length
      : 0;

    const conDeuda = Number(venta.saldoAdeber) > 0;

    elemento.innerHTML = `
      <div class="icono-venta-historial">
        🧾
      </div>

      <div class="info-venta-historial">

        <strong>
          #${escaparHTMLVenta(venta.numero || venta.id)}
        </strong>

        <span>
          ${formatearFechaVenta(venta.fecha)}
        </span>

        <span>
          ${escaparHTMLVenta(cliente)}
          ·
          ${cantidadProductos}
          ${cantidadProductos === 1 ? "producto" : "productos"}
        </span>

        <span
          class="estado-venta-historial ${conDeuda ? "deuda" : "pagada"}"
        >
          ●
          ${conDeuda ? "Con deuda" : "Pagada"}
        </span>

      </div>

      <div class="total-venta-historial">
        ${formatearPrecioVenta(venta.total)}
      </div>
    `;

    contenedor.appendChild(elemento);
  });
}

/* ========================================
   LIMPIAR VENTA
======================================== */

function limpiarVenta() {
  carritoVenta = [];

  clienteSeleccionadoVenta = null;

  mediosPagoVenta = [];

  const busquedaProducto = document.getElementById("busqueda-productos-venta");

  const observaciones = document.getElementById("observaciones-venta");

  if (busquedaProducto) {
    busquedaProducto.value = "";
  }

  if (observaciones) {
    observaciones.value = "";
  }

  document
    .getElementById("resultados-productos-venta")
    ?.classList.remove("visible");

  limpiarClienteVenta();

  agregarMedioPagoVenta();

  renderizarCarritoVenta();
}

/* ========================================
   MENSAJES
======================================== */

function mostrarMensajeVenta(mensaje, tipo) {
  const elemento = document.getElementById("mensaje-venta");

  if (!elemento) {
    return;
  }

  elemento.textContent = mensaje;

  elemento.className = `mensaje-venta visible ${tipo}`;

  clearTimeout(mostrarMensajeVenta.timer);

  mostrarMensajeVenta.timer = setTimeout(() => {
    elemento.classList.remove("visible");
  }, 4000);
}

/* ========================================
   UTILIDADES
======================================== */

function formatearPrecioVenta(valor) {
  return `$ ${(Number(valor) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function convertirNumeroVenta(valor) {
  const texto = String(valor ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!texto) {
    return 0;
  }

  if (texto.includes(",") && texto.includes(".")) {
    return Number(texto.replace(/\./g, "").replace(",", ".")) || 0;
  }

  if (texto.includes(",")) {
    return Number(texto.replace(",", ".")) || 0;
  }

  return Number(texto) || 0;
}

function escaparHTMLVenta(texto) {
  const div = document.createElement("div");

  div.textContent = texto ?? "";

  return div.innerHTML;
}

function obtenerFechaJS(fecha) {
  if (!fecha) {
    return null;
  }

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  const fechaJS = new Date(fecha);

  return Number.isNaN(fechaJS.getTime()) ? null : fechaJS;
}

function formatearFechaVenta(fecha) {
  const fechaJS = obtenerFechaJS(fecha);

  if (!fechaJS) {
    return "Sin fecha";
  }

  return fechaJS.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ========================================
   INICIAR
======================================== */

inicializarVentas();
