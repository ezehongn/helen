/* ========================================
   CARGAR CSS DE CLIENTES
======================================== */

function cargarCSSClientes() {
  if (document.getElementById("css-clientes")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-clientes";
  link.rel = "stylesheet";
  link.href = "css/clientes/clientes.css";

  document.head.appendChild(link);
}

function cargarCSSHistorialCliente() {
  if (document.getElementById("css-historial-cliente")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-historial-cliente";

  link.rel = "stylesheet";

  link.href = "css/clientes/historial-modal.css";

  document.head.appendChild(link);
}

/* ========================================
   CLIENTES
======================================== */

let clientes = [];

let clienteSeleccionado = null;

let productosPendientesCliente = [];

let deudaInicialPendienteCliente = 0;

// Todas las ventas se cargan una sola vez al entrar
// en la pantalla Clientes.
let ventasClientes = [];

// Movimientos de cuenta corriente por cliente.
let movimientosClientes = {};

let paginaClientes = 1;

const CLIENTES_POR_PAGINA = 8;

/* ========================================
   INICIALIZACIÓN
======================================== */

async function inicializarClientes() {
  console.log("Inicializando pantalla Clientes...");

  cargarCSSClientes();

  cargarCSSHistorialCliente();

  await cargarModalHistorialCliente();

  await cargarScriptHistorialCliente();

  await cargarModalEditarCliente();
  await cargarScriptEditarCliente();

  await cargarModalRegistrarCliente();
  await cargarScriptRegistrarCliente();

  configurarEventosClientes();

  establecerFechaPago();

  /* ================================
       ESTADO INICIAL DEL DETALLE
  ================================ */

  const estadoVacio = document.getElementById("detalle-cliente-vacio");

  if (estadoVacio) {
    estadoVacio.style.display = "flex";
  }

  const contenido = document.getElementById("detalle-cliente-contenido");

  if (contenido) {
    contenido.style.display = "none";
  }

  /* ================================
       CARGAR DATOS
  ================================ */

  await cargarClientes();

  renderizarClientes();

  actualizarEstadisticasClientes();
}

/* ========================================
   EVENTOS
======================================== */

function configurarEventosClientes() {
  /* ================================
       BUSCADOR
  ================================ */

  document
    .getElementById("busqueda-clientes")
    ?.addEventListener("input", () => {
      paginaClientes = 1;

      renderizarClientes();
    });

  /* ================================
       FILTRO
  ================================ */

  document
    .getElementById("filtro-estado-clientes")
    ?.addEventListener("change", () => {
      paginaClientes = 1;

      renderizarClientes();
    });

  /* ================================
       ORDEN
  ================================ */

  document.getElementById("orden-clientes")?.addEventListener("change", () => {
    paginaClientes = 1;

    renderizarClientes();
  });

  /* ================================
       MONTO DE PAGO
  ================================ */

  document
    .getElementById("monto-pago-cliente")
    ?.addEventListener("input", () => {
      actualizarResumenPagoCliente(false);
    });

  /* ================================
       TIPO INTERÉS
  ================================ */

  document
    .getElementById("tipo-interes-cliente")
    ?.addEventListener("change", actualizarInteresCliente);

  /* ================================
       VALOR INTERÉS
  ================================ */

  document
    .getElementById("valor-interes-cliente")
    ?.addEventListener("input", actualizarInteresCliente);

  /* ================================
       ACTIVAR INTERÉS
  ================================ */

  const botonInteres = document.getElementById("activar-interes-cliente");

  botonInteres?.addEventListener("click", () => {
    const campos = document.getElementById("campos-interes");

    if (!campos) {
      console.error("No se encontró #campos-interes");
      return;
    }

    const estaOculto = campos.hasAttribute("hidden");

    if (estaOculto) {
      campos.removeAttribute("hidden");
      botonInteres.textContent = "− Quitar interés";
      actualizarInteresCliente();
    } else {
      campos.setAttribute("hidden", "");
      botonInteres.textContent = "+ Agregar interés";

      const valor = document.getElementById("valor-interes-cliente");

      if (valor) {
        valor.value = "";
      }

      actualizarInteresCliente();
    }
  });

  /* ================================
       REGISTRAR PAGO
  ================================ */

  document
    .getElementById("boton-registrar-pago")
    ?.addEventListener("click", registrarPagoCliente);

  /* ================================
       HISTORIAL
  ================================ */

  document
    .getElementById("boton-historial-cliente")
    ?.addEventListener("click", () => {
      if (!clienteSeleccionado) {
        return;
      }

      if (window.abrirHistorialCliente) {
        window.abrirHistorialCliente(clienteSeleccionado);
      }
    });

  /* ================================
       EDITAR
  ================================ */

  document
    .getElementById("boton-editar-cliente")
    ?.addEventListener("click", () => {
      if (!clienteSeleccionado) {
        return;
      }

      if (window.abrirModalEditarCliente) {
        window.abrirModalEditarCliente(clienteSeleccionado, async () => {
          await cargarClientes();

          const clienteActual = clientes.find(
            (cliente) => cliente.id === clienteSeleccionado.id,
          );

          if (clienteActual) {
            seleccionarCliente(clienteActual);
          }

          renderizarClientes();

          actualizarEstadisticasClientes();
        });
      }
    });

  document
    .getElementById("boton-eliminar-cliente")
    ?.addEventListener("click", eliminarCliente);

  document
    .getElementById("boton-registrar-cliente")
    ?.addEventListener("click", () => {
      if (window.abrirModalRegistrarCliente) {
        window.abrirModalRegistrarCliente(async () => {
          await cargarClientes();

          renderizarClientes();

          actualizarEstadisticasClientes();
        });

        return;
      }

      console.log("El modal de registrar cliente todavía no está conectado.");
    });

  /* ================================
       CAMBIO DE USUARIO OPERATIVO
  ================================ */

  window.addEventListener("usuarioOperativoCambiado", async () => {
    console.log("Usuario operativo cambiado. Recargando clientes...");

    paginaClientes = 1;

    await cargarClientes();

    renderizarClientes();

    actualizarEstadisticasClientes();
  });
}

/* ========================================
   CARGAR CLIENTES
======================================== */

async function cargarClientes() {
  try {
    const { collection, getDocs } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    /* ================================
       CLIENTES
    ================================ */

    const clientesSnapshot = await getDocs(collection(window.db, "clientes"));

    const clientesBase = clientesSnapshot.docs.map((documento) => {
      const datos = documento.data();

      return {
        id: documento.id,

        ...datos,

        nombre: datos.nombre || "",

        apellido: datos.apellido || "",

        dni: datos.dni || "",

        telefono: datos.telefono || "",
      };
    });

    /* ================================
       VENTAS
    ================================ */

    const ventasSnapshot = await getDocs(collection(window.db, "ventas"));

    ventasClientes = ventasSnapshot.docs.map((documento) => ({
      id: documento.id,

      ...documento.data(),
    }));

    /* ================================
       MOVIMIENTOS
    ================================ */

    movimientosClientes = {};

    await Promise.all(
      clientesBase.map(async (cliente) => {
        try {
          const movimientosSnapshot = await getDocs(
            collection(window.db, "clientes", cliente.id, "movimientos"),
          );

          movimientosClientes[cliente.id] = movimientosSnapshot.docs
            .map((documento) => ({
              id: documento.id,

              ...documento.data(),
            }))
            .sort(
              (a, b) =>
                obtenerFechaCliente(b.fecha || b.creadoEn) -
                obtenerFechaCliente(a.fecha || a.creadoEn),
            );
        } catch (error) {
          console.warn(
            `No se pudieron cargar los movimientos del cliente ${cliente.id}:`,
            error,
          );

          movimientosClientes[cliente.id] = [];
        }
      }),
    );

    /* ================================
       CALCULAR INFORMACIÓN
    ================================ */

    clientes = clientesBase
      .filter((cliente) => clienteEsVisibleParaUsuario(cliente))
      .map((cliente) => {
        const ventas = obtenerVentasCliente(cliente);

        const movimientos = movimientosClientes[cliente.id] || [];

        const deuda = calcularDeudaActualCliente(cliente, ventas, movimientos);

        const ultimoMovimiento = obtenerUltimoMovimientoCliente(
          ventas,
          movimientos,
        );

        return {
          ...cliente,

          deudaTotal: deuda,

          ultimoMovimiento,
        };
      });

    console.log("Clientes encontrados:", clientes.length);

    console.log("Ventas cargadas:", ventasClientes.length);
  } catch (error) {
    console.error("Error cargando clientes:", error);

    clientes = [];

    ventasClientes = [];

    movimientosClientes = {};

    const lista = document.getElementById("lista-clientes");

    if (lista) {
      lista.innerHTML = `
        <div class="estado-cargando-clientes">
          No se pudieron cargar los clientes.
        </div>
      `;
    }
  }
}

/* ========================================
   ESTADÍSTICAS
======================================== */

function actualizarEstadisticasClientes() {
  const total = clientes.length;

  const clientesDeuda = clientes.filter(
    (cliente) => obtenerDeudaCliente(cliente) > 0,
  ).length;

  const deudaTotal = clientes.reduce(
    (acumulado, cliente) => acumulado + obtenerDeudaCliente(cliente),
    0,
  );

  document
    .getElementById("estadistica-total-clientes")
    ?.replaceChildren(document.createTextNode(total));

  document
    .getElementById("estadistica-clientes-deuda")
    ?.replaceChildren(document.createTextNode(clientesDeuda));

  document
    .getElementById("estadistica-deuda-total")
    ?.replaceChildren(
      document.createTextNode(formatearPrecioCliente(deudaTotal)),
    );

  const totalCobrado = document.getElementById("estadistica-total-cobrado");

  if (totalCobrado) {
    totalCobrado.textContent = formatearPrecioCliente(calcularCobradoMes());
  }
}

/* ========================================
   RENDERIZAR CLIENTES
======================================== */

function renderizarClientes() {
  const lista = document.getElementById("lista-clientes");

  if (!lista) {
    return;
  }

  let resultado = [...clientes];

  /* ================================
       BUSQUEDA
  ================================ */

  const textoBusqueda =
    document.getElementById("busqueda-clientes")?.value.trim().toLowerCase() ||
    "";

  if (textoBusqueda) {
    resultado = resultado.filter((cliente) => {
      const nombreCompleto =
        `${cliente.nombre} ${cliente.apellido}`.toLowerCase();

      return (
        nombreCompleto.includes(textoBusqueda) ||
        String(cliente.dni).toLowerCase().includes(textoBusqueda) ||
        String(cliente.telefono).toLowerCase().includes(textoBusqueda)
      );
    });
  }

  /* ================================
       FILTRO ESTADO
  ================================ */

  const filtro =
    document.getElementById("filtro-estado-clientes")?.value || "todos";

  if (filtro === "deudores") {
    resultado = resultado.filter((cliente) => obtenerDeudaCliente(cliente) > 0);
  }

  if (filtro === "sin-deuda") {
    resultado = resultado.filter(
      (cliente) => obtenerDeudaCliente(cliente) <= 0,
    );
  }

  /* ================================
       ORDEN
  ================================ */

  const orden =
    document.getElementById("orden-clientes")?.value || "deuda-mayor";

  resultado.sort((a, b) => {
    if (orden === "deuda-mayor") {
      return obtenerDeudaCliente(b) - obtenerDeudaCliente(a);
    }

    if (orden === "deuda-menor") {
      return obtenerDeudaCliente(a) - obtenerDeudaCliente(b);
    }

    if (orden === "nombre") {
      return `${a.nombre} ${a.apellido}`.localeCompare(
        `${b.nombre} ${b.apellido}`,
        "es",
      );
    }

    if (orden === "reciente") {
      return (
        obtenerFechaCliente(b.ultimoMovimiento) -
        obtenerFechaCliente(a.ultimoMovimiento)
      );
    }

    return 0;
  });

  /* ================================
       PAGINACIÓN
  ================================ */

  const totalPaginas = Math.max(
    1,
    Math.ceil(resultado.length / CLIENTES_POR_PAGINA),
  );

  if (paginaClientes > totalPaginas) {
    paginaClientes = totalPaginas;
  }

  const inicio = (paginaClientes - 1) * CLIENTES_POR_PAGINA;

  const clientesPagina = resultado.slice(inicio, inicio + CLIENTES_POR_PAGINA);

  lista.innerHTML = "";

  if (clientesPagina.length === 0) {
    lista.innerHTML = `
      <div class="estado-cargando-clientes">
        No hay clientes para mostrar.
      </div>
    `;
  } else {
    clientesPagina.forEach((cliente) => {
      lista.appendChild(crearFilaCliente(cliente));
    });
  }

  renderizarPaginacionClientes(resultado.length, totalPaginas);
}

/* ========================================
   CREAR FILA
======================================== */

function crearFilaCliente(cliente) {
  const fila = document.createElement("div");

  fila.className = "cliente-listado";

  if (clienteSeleccionado && clienteSeleccionado.id === cliente.id) {
    fila.classList.add("seleccionado");
  }

  const nombre = `${cliente.nombre} ${cliente.apellido}`.trim() || "Sin nombre";

  const iniciales = obtenerInicialesCliente(cliente);

  const deuda = obtenerDeudaCliente(cliente);

  const ultimoMovimiento = obtenerFechaCliente(cliente.ultimoMovimiento);

  fila.innerHTML = `
    <div class="datos-listado-cliente">

      <div class="avatar-listado-cliente">
        ${escaparHTMLCliente(iniciales)}
      </div>

      <div class="nombre-listado-cliente">

        <strong>
          ${escaparHTMLCliente(nombre)}
        </strong>

        <span>
          ${escaparHTMLCliente(cliente.telefono || cliente.dni || "Sin datos")}
        </span>

      </div>

    </div>

    <div
      class="
        deuda-listado-cliente
        ${deuda > 0 ? "con-deuda" : ""}
      "
    >
      ${formatearPrecioCliente(deuda)}
    </div>

    <div class="ultimo-movimiento-cliente">

      ${
        ultimoMovimiento
          ? formatearFechaCortaCliente(ultimoMovimiento)
          : "Sin movimientos"
      }

    </div>

    <div
      class="
        hace-cliente
        ${deuda > 0 ? "deuda" : ""}
      "
    >

      ${
        ultimoMovimiento
          ? calcularHaceCliente(ultimoMovimiento)
          : "Sin movimientos"
      }

    </div>
  `;

  fila.addEventListener("click", () => {
    seleccionarCliente(cliente);
  });

  return fila;
}

/* ========================================
   SELECCIONAR CLIENTE
======================================== */

async function seleccionarCliente(cliente) {
  clienteSeleccionado = cliente;

  console.log("Cliente seleccionado:", cliente);

  /* ================================
       ACTUALIZAR FILA SELECCIONADA
  ================================ */

  renderizarClientes();

  /* ================================
       OCULTAR ESTADO VACÍO
  ================================ */

  const estadoVacio = document.getElementById("detalle-cliente-vacio");

  if (estadoVacio) {
    estadoVacio.style.display = "none";
  }

  /* ================================
       MOSTRAR DETALLE
  ================================ */

  const contenido = document.getElementById("detalle-cliente-contenido");

  if (contenido) {
    contenido.style.display = "block";
    contenido.hidden = false;
  } else {
    console.error("No se encontró #detalle-cliente-contenido");
  }

  /* ================================
       CARGAR DATOS
  ================================ */

  cargarDatosClienteDetalle(cliente);

  /* ================================
       CARGAR DEUDAS
  ================================ */

  await cargarProductosPendientesCliente(cliente);

  /* ================================
       MOSTRAR DEUDAS
  ================================ */

  renderizarProductosPendientes();

  /* ================================
       ACTUALIZAR RESUMEN
  ================================ */

  actualizarResumenPagoCliente();
}

/* ========================================
   DATOS DEL DETALLE
======================================== */

function cargarDatosClienteDetalle(cliente) {
  const nombre = `${cliente.nombre} ${cliente.apellido}`.trim() || "Sin nombre";

  document
    .getElementById("avatar-detalle-cliente")
    ?.replaceChildren(
      document.createTextNode(obtenerInicialesCliente(cliente)),
    );

  const nombreElemento = document.getElementById("detalle-nombre-cliente");

  if (nombreElemento) {
    nombreElemento.textContent = nombre;
  }

  const telefono = document.getElementById("detalle-telefono-cliente");

  if (telefono) {
    telefono.textContent = `☎ ${cliente.telefono || "—"}`;
  }

  const dni = document.getElementById("detalle-dni-cliente");

  if (dni) {
    dni.textContent = `DNI ${cliente.dni || "—"}`;
  }

  const deuda = obtenerDeudaCliente(cliente);

  document
    .getElementById("detalle-deuda-total")
    ?.replaceChildren(document.createTextNode(formatearPrecioCliente(deuda)));
}

/* ========================================
   CARGAR DEUDAS DEL CLIENTE
======================================== */

async function cargarProductosPendientesCliente(cliente) {
  productosPendientesCliente = [];
  deudaInicialPendienteCliente = 0;

  try {
    const movimientos = movimientosClientes[cliente.id] || [];
    deudaInicialPendienteCliente = obtenerDeudaInicialCliente(movimientos);
    /*
     * Obtener todas las ventas que ya cargamos
     * al iniciar Clientes.
     */
    const ventas = obtenerVentasCliente(cliente);

    ventas.forEach((venta) => {
      /*
       * La deuda pertenece a la venta completa.
       */
      const saldoPendiente = Number(venta.saldoAdeber) || 0;

      /*
       * Si la venta está completamente pagada,
       * no mostramos sus productos.
       */
      if (saldoPendiente <= 0) {
        return;
      }

      /*
       * Los productos están guardados directamente
       * dentro de venta.productos.
       */
      const productos = Array.isArray(venta.productos) ? venta.productos : [];

      /*
       * Cada producto será una fila independiente.
       */
      productos.forEach((producto, indice) => {
        productosPendientesCliente.push({
          /*
           * ID único de la fila.
           */
          id: `${venta.id}_${indice}`,

          /*
           * ID de la venta a la que pertenece.
           */
          ventaId: venta.id,

          /*
           * Número visible de venta.
           */
          numeroVenta: venta.numero || venta.id,

          /*
           * Datos EXACTOS guardados en la venta.
           */
          nombre: producto.nombre || "Producto",

          talle: producto.talle || "",

          cantidad: Number(producto.cantidad) || 0,

          precioUnitario: Number(producto.precioUnitario) || 0,

          subtotal: Number(producto.subtotal) || 0,

          /*
           * La deuda se mantiene a nivel de venta.
           *
           * No estamos diciendo que este producto
           * tenga específicamente este saldo.
           */
          saldoVenta: saldoPendiente,

          totalVenta: Number(venta.total) || 0,

          totalEntregado: Number(venta.totalEntregado) || 0,

          fecha: venta.fecha || null,
        });
      });
    });

    /*
     * Ordenar por fecha de venta.
     */
    productosPendientesCliente.sort(
      (a, b) => obtenerFechaCliente(b.fecha) - obtenerFechaCliente(a.fecha),
    );

    console.log(
      "Productos pendientes del cliente:",
      productosPendientesCliente,
    );
  } catch (error) {
    console.error("Error cargando productos pendientes:", error);

    productosPendientesCliente = [];
  }
}

/* ========================================
   VERIFICAR CLIENTE DE VENTA
======================================== */

function ventaCorrespondeCliente(venta, cliente) {
  if (venta.clienteId && venta.clienteId === cliente.id) {
    return true;
  }

  if (venta.cliente && typeof venta.cliente === "object") {
    if (venta.cliente.id && venta.cliente.id === cliente.id) {
      return true;
    }

    if (
      venta.cliente.dni &&
      cliente.dni &&
      String(venta.cliente.dni) === String(cliente.dni)
    ) {
      return true;
    }
  }

  return false;
}

/* ========================================
   RENDERIZAR DEUDAS
======================================== */

function renderizarProductosPendientes() {
  const contenedor = document.getElementById("lista-productos-deuda");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = "";

  /* ========================================
       DEUDA INICIAL DESGLOSADA POR PRODUCTO
  ======================================== */

  const detalleDeudaInicial = obtenerDetalleDeudasInicialesCliente(
    movimientosClientes[clienteSeleccionado?.id] || [],
  );

  if (deudaInicialPendienteCliente > 0) {
    const bloqueDeudaInicial = document.createElement("div");
    bloqueDeudaInicial.className = "bloque-venta-deuda bloque-deuda-inicial";

    bloqueDeudaInicial.innerHTML = `
      <div class="encabezado-venta-deuda">
        <div class="info-venta-deuda">
          <strong>Deuda inicial</strong>
          <span>Deuda registrada al ingresar el cliente al sistema</span>
        </div>
        <div class="resumen-venta-deuda">
          <div class="saldo-venta">
            <small>Saldo pendiente</small>
            <strong>${formatearPrecioCliente(deudaInicialPendienteCliente)}</strong>
          </div>
        </div>
      </div>
    `;

    const productosIniciales = detalleDeudaInicial.productos.filter(
      (producto) => producto.saldoPendiente > 0,
    );

    productosIniciales.forEach((producto) => {
      const fila = document.createElement("div");
      fila.className = "fila-producto-deuda deuda-inicial-fila";

      fila.innerHTML = `
        <div>
          <input
            type="checkbox"
            class="checkbox-producto-deuda-inicial"
            data-deuda-producto-id="${escaparHTMLCliente(producto.id)}"
            aria-label="Seleccionar deuda de ${escaparHTMLCliente(producto.nombre)}"
          >
        </div>
        <div class="producto-deuda-nombre">
          <strong>${escaparHTMLCliente(producto.nombre)}${producto.talle ? ` (Talle ${escaparHTMLCliente(producto.talle)})` : ""}</strong>
        </div>
        <div>${formatearFechaCortaCliente(obtenerFechaCliente(producto.fecha))}</div>
        <div>1</div>
        <div>${formatearPrecioCliente(producto.precioProducto)}</div>
        <div>${formatearPrecioCliente(producto.montoAdeudado)}</div>
        <div>${formatearPrecioCliente(producto.saldoPendiente)}</div>
      `;

      fila.querySelector(".checkbox-producto-deuda-inicial")?.addEventListener(
        "change",
        () => actualizarResumenPagoCliente(true),
      );

      bloqueDeudaInicial.appendChild(fila);
    });

    const saldoNoDesglosado =
      detalleDeudaInicial.deudaAgregada + detalleDeudaInicial.intereses;

    if (saldoNoDesglosado > 0) {
      const fila = document.createElement("div");
      fila.className = "fila-producto-deuda deuda-inicial-fila";

      const nombreFila =
        detalleDeudaInicial.deudaAgregada > 0
          ? "Deuda anterior al sistema"
          : "Intereses de deuda inicial";

      fila.innerHTML = `
        <div>
          <input
            type="checkbox"
            class="checkbox-deuda-inicial"
            aria-label="Seleccionar ${nombreFila}"
          >
        </div>
        <div class="producto-deuda-nombre"><strong>${nombreFila}</strong></div>
        <div>—</div>
        <div>—</div>
        <div>—</div>
        <div>—</div>
        <div>${formatearPrecioCliente(saldoNoDesglosado)}</div>
      `;

      fila.querySelector(".checkbox-deuda-inicial")?.addEventListener(
        "change",
        () => actualizarResumenPagoCliente(true),
      );

      bloqueDeudaInicial.appendChild(fila);
    }

    contenedor.appendChild(bloqueDeudaInicial);
  }

  /* ========================================
       SIN VENTAS NI DEUDA INICIAL
  ======================================== */

  if (
    productosPendientesCliente.length === 0 &&
    deudaInicialPendienteCliente <= 0
  ) {
    contenedor.innerHTML = `
      <div class="sin-productos-deuda">
        Este cliente no tiene productos pendientes.
      </div>
    `;

    return;
  }

  /* ========================================
       AGRUPAR PRODUCTOS POR VENTA
    ======================================== */

  const ventasAgrupadas = {};

  productosPendientesCliente.forEach((producto) => {
    if (!ventasAgrupadas[producto.ventaId]) {
      ventasAgrupadas[producto.ventaId] = {
        ventaId: producto.ventaId,

        numeroVenta: producto.numeroVenta,

        fecha: producto.fecha,

        saldoVenta: producto.saldoVenta,

        totalVenta: producto.totalVenta,

        totalEntregado: producto.totalEntregado,

        productos: [],
      };
    }

    ventasAgrupadas[producto.ventaId].productos.push(producto);
  });

  /* ========================================
       CREAR CADA VENTA
    ======================================== */

  Object.values(ventasAgrupadas).forEach((venta) => {
    const bloque = document.createElement("div");

    bloque.className = "bloque-venta-deuda";

    /* ========================================
           ENCABEZADO DE LA VENTA
        ======================================== */

    const encabezado = document.createElement("div");

    encabezado.className = "encabezado-venta-deuda";

    encabezado.innerHTML = `
            <div class="info-venta-deuda">

                <strong>
                    Venta #${escaparHTMLCliente(String(venta.numeroVenta))}
                </strong>

                <span>
                    ${formatearFechaCortaCliente(
                      obtenerFechaCliente(venta.fecha),
                    )}
                </span>

            </div>

            <div class="resumen-venta-deuda">

                <div>
                    <small>Total</small>
                    <span>
                        ${formatearPrecioCliente(venta.totalVenta)}
                    </span>
                </div>

                <div class="saldo-venta">
                    <small>Saldo pendiente</small>
                    <strong>
                        ${formatearPrecioCliente(venta.saldoVenta)}
                    </strong>
                </div>

            </div>
        `;

    bloque.appendChild(encabezado);

    /* ========================================
           CABECERA DE PRODUCTOS
        ======================================== */

    const cabecera = document.createElement("div");

    cabecera.className = "cabecera-productos-deuda";

    cabecera.innerHTML = `
            <div></div>

            <div>Producto</div>

            <div>Talle</div>

            <div>Fecha</div>

            <div>Cantidad</div>

            <div>Precio unit.</div>

            <div>Subtotal</div>
        `;

    bloque.appendChild(cabecera);

    /* ========================================
           PRODUCTOS
        ======================================== */

    venta.productos.forEach((producto) => {
      const fila = document.createElement("div");

      fila.className = "fila-producto-deuda";

      fila.innerHTML = `
                <div>
                    <input
                        type="checkbox"
                        class="checkbox-producto-deuda"
                        data-producto-id="${escaparHTMLCliente(producto.id)}"
                        data-venta-id="${escaparHTMLCliente(producto.ventaId)}"
                    >
                </div>

                <div class="producto-deuda-nombre">
                    <strong>
                        ${escaparHTMLCliente(producto.nombre)}
                    </strong>
                </div>

                <div>
                    ${producto.talle ? escaparHTMLCliente(producto.talle) : "—"}
                </div>

                <div>
                    ${formatearFechaCortaCliente(
                      obtenerFechaCliente(producto.fecha),
                    )}
                </div>

                <div>
                    ${producto.cantidad}
                </div>

                <div>
                    ${formatearPrecioCliente(producto.precioUnitario)}
                </div>

                <div>
                    ${formatearPrecioCliente(producto.subtotal)}
                </div>
            `;

      const checkbox = fila.querySelector(".checkbox-producto-deuda");

      checkbox?.addEventListener("change", () => {
        actualizarResumenPagoCliente(true);
      });

      bloque.appendChild(fila);
    });

    contenedor.appendChild(bloque);
  });
}

/* ========================================
   RESUMEN PAGO
======================================== */

function actualizarResumenPagoCliente(actualizarMontoDesdeCheckbox = false) {
  if (!clienteSeleccionado) {
    return;
  }

  const inputMonto = document.getElementById("monto-pago-cliente");

  /* ========================================
     SELECCIONES
  ======================================== */

  const checkboxesSeleccionados = document.querySelectorAll(
    ".checkbox-producto-deuda:checked",
  );

  const hayProductosSeleccionados = checkboxesSeleccionados.length > 0;

  const totalSeleccionado = obtenerTotalProductosSeleccionados();

  const deudaInicialSeleccionada = obtenerDeudaInicialSeleccionada();

  const hayDeudaInicialSeleccionada = deudaInicialSeleccionada > 0;

  /* ========================================
     ACTUALIZAR MONTO SEGÚN SELECCIÓN
  ======================================== */

  if (actualizarMontoDesdeCheckbox && inputMonto) {
    if (hayDeudaInicialSeleccionada) {
      inputMonto.value = Math.round(deudaInicialSeleccionada);
    } else if (hayProductosSeleccionados) {
      inputMonto.value = Math.round(totalSeleccionado);
    } else {
      inputMonto.value = "0";
    }
  }

  /* ========================================
     MONTO ENTREGADO
  ======================================== */

  let montoEntregado = convertirNumeroCliente(inputMonto?.value);

  if (
    actualizarMontoDesdeCheckbox &&
    !hayProductosSeleccionados &&
    !hayDeudaInicialSeleccionada
  ) {
    montoEntregado = 0;

    if (inputMonto) {
      inputMonto.value = "0";
    }
  }

  /* ========================================
     DEUDA TOTAL
  ======================================== */

  const deudaCliente = obtenerDeudaCliente(clienteSeleccionado);

  /* ========================================
     BASE DE LA OPERACIÓN
  ======================================== */

  let baseOperacion = deudaCliente;

  if (hayDeudaInicialSeleccionada) {
    baseOperacion = Math.min(deudaInicialSeleccionada, deudaCliente);
  } else if (hayProductosSeleccionados) {
    baseOperacion = Math.min(totalSeleccionado, deudaCliente);
  }

  /* ========================================
     INTERÉS
  ======================================== */

  const interes = obtenerMontoInteresCliente(baseOperacion);

  /* ========================================
     TOTAL
  ======================================== */

  const totalOperacion = baseOperacion + interes;

  const totalEntregado = montoEntregado;

  /* ========================================
     VUELTO
  ======================================== */

  const vuelto = Math.max(0, montoEntregado - totalOperacion);

  /* ========================================
     SALDO
  ======================================== */

  const saldo = Math.max(0, totalOperacion - totalEntregado);

  /* ========================================
     MOSTRAR TOTAL
  ======================================== */

  const totalElemento = document.getElementById("total-seleccionado-cliente");

  if (totalElemento) {
    totalElemento.textContent = formatearPrecioCliente(totalOperacion);
  }

  /* ========================================
     TOTAL ENTREGADO
  ======================================== */

  const entregadoElemento = document.getElementById("total-entregado-cliente");

  if (entregadoElemento) {
    entregadoElemento.textContent = formatearPrecioCliente(totalEntregado);
  }

  /* ========================================
     VUELTO
  ======================================== */

  const vueltoElemento = document.getElementById("vuelto-cliente");

  if (vueltoElemento) {
    vueltoElemento.textContent = formatearPrecioCliente(vuelto);
  }

  /* ========================================
     SALDO
  ======================================== */

  const saldoElemento = document.getElementById("saldo-deber-cliente");

  if (saldoElemento) {
    saldoElemento.textContent = formatearPrecioCliente(saldo);
  }

  /* ========================================
     BOTÓN
  ======================================== */

  const boton = document.getElementById("boton-registrar-pago");

  if (boton) {
    const hayInteres = interes > 0;

    boton.disabled = totalEntregado <= 0 && !hayInteres;
  }
}

/* ========================================
   PRODUCTOS / VENTAS SELECCIONADAS
======================================== */

function obtenerDeudaInicialSeleccionada() {
  if (!clienteSeleccionado) return 0;

  const detalle = obtenerDetalleDeudasInicialesCliente(
    movimientosClientes[clienteSeleccionado.id] || [],
  );

  const idsSeleccionados = new Set(
    [...document.querySelectorAll(".checkbox-producto-deuda-inicial:checked")]
      .map((checkbox) => checkbox.dataset.deudaProductoId)
      .filter(Boolean),
  );

  const totalProductos = detalle.productos
    .filter((producto) => idsSeleccionados.has(producto.id))
    .reduce((total, producto) => total + producto.saldoPendiente, 0);

  const checkboxGlobal = document.querySelector(".checkbox-deuda-inicial:checked");
  const totalNoDesglosado = checkboxGlobal
    ? detalle.deudaAgregada + detalle.intereses
    : 0;

  return totalProductos + totalNoDesglosado;
}

function obtenerProductosDeudaInicialSeleccionados() {
  if (!clienteSeleccionado) return [];

  const detalle = obtenerDetalleDeudasInicialesCliente(
    movimientosClientes[clienteSeleccionado.id] || [],
  );

  const idsSeleccionados = new Set(
    [...document.querySelectorAll(".checkbox-producto-deuda-inicial:checked")]
      .map((checkbox) => checkbox.dataset.deudaProductoId)
      .filter(Boolean),
  );

  return detalle.productos.filter(
    (producto) =>
      idsSeleccionados.has(producto.id) && producto.saldoPendiente > 0,
  );
}

function obtenerTotalProductosSeleccionados() {
  if (!clienteSeleccionado) {
    return 0;
  }

  /*
   * Agrupamos los productos seleccionados
   * por venta.
   *
   * Esto es importante porque la deuda pertenece
   * a la venta completa.
   */
  const productosPorVenta = {};

  document
    .querySelectorAll(".checkbox-producto-deuda:checked")
    .forEach((checkbox) => {
      const productoId = checkbox.dataset.productoId;

      const ventaId = checkbox.dataset.ventaId;

      const producto = productosPendientesCliente.find(
        (item) => item.id === productoId,
      );

      if (!producto) {
        return;
      }

      if (!productosPorVenta[ventaId]) {
        productosPorVenta[ventaId] = [];
      }

      productosPorVenta[ventaId].push(producto);
    });

  let total = 0;

  /*
   * Recorrer cada venta.
   */
  Object.entries(productosPorVenta).forEach(([ventaId, productos]) => {
    /*
     * Buscar la deuda real de esa venta.
     */
    const productoVenta = productosPendientesCliente.find(
      (item) => item.ventaId === ventaId,
    );

    if (!productoVenta) {
      return;
    }

    const saldoVenta = Number(productoVenta.saldoVenta) || 0;

    /*
     * Sumar el valor de los productos
     * seleccionados.
     */
    const subtotalSeleccionado = productos.reduce(
      (acumulado, producto) => acumulado + (Number(producto.subtotal) || 0),
      0,
    );

    /*
     * NUNCA superar la deuda real
     * de la venta.
     */
    const montoVenta = Math.min(subtotalSeleccionado, saldoVenta);

    total += montoVenta;
  });

  return total;
}

/* ========================================
   INTERÉS
======================================== */

function actualizarInteresCliente() {
  const tipo =
    document.getElementById("tipo-interes-cliente")?.value || "porcentaje";

  const label = document.getElementById("label-valor-interes");

  const simbolo = document.getElementById("simbolo-interes");

  /*
   * Actualizar texto según tipo.
   */
  if (tipo === "porcentaje") {
    if (label) {
      label.textContent = "Porcentaje";
    }

    if (simbolo) {
      simbolo.textContent = "%";
    }
  } else {
    if (label) {
      label.textContent = "Monto";
    }

    if (simbolo) {
      simbolo.textContent = "$";
    }
  }

  /*
   * Obtener la base actual.
   */
  const hayProductos =
    document.querySelectorAll(".checkbox-producto-deuda:checked").length > 0;

  const base = hayProductos
    ? obtenerTotalProductosSeleccionados()
    : obtenerDeudaCliente(clienteSeleccionado);

  /*
   * Calcular interés.
   */
  const monto = obtenerMontoInteresCliente(base);

  /*
   * Mostrar importe del recargo.
   */
  const resultado = document.getElementById("monto-interes-cliente");

  if (resultado) {
    resultado.textContent = formatearPrecioCliente(monto);
  }

  /*
   * Actualizar todo el resumen.
   */
  actualizarResumenPagoCliente();
}

/* ========================================
   OBTENER INTERÉS
======================================== */

function obtenerMontoInteresCliente(basePersonalizada = null) {
  const campos = document.getElementById("campos-interes");

  /*
   * Si el bloque de interés está oculto,
   * no hay interés.
   */
  if (!campos || campos.hasAttribute("hidden")) {
    return 0;
  }

  const valor = convertirNumeroCliente(
    document.getElementById("valor-interes-cliente")?.value,
  );

  if (valor <= 0) {
    return 0;
  }

  const tipo =
    document.getElementById("tipo-interes-cliente")?.value || "porcentaje";

  /*
   * Interés como monto fijo.
   */
  if (tipo === "monto") {
    return valor;
  }

  /*
   * Base sobre la que se calcula
   * el porcentaje.
   */
  let base = basePersonalizada;

  /*
   * Si no recibimos una base,
   * obtenerla automáticamente.
   */
  if (base === null || base === undefined) {
    const totalSeleccionado = obtenerTotalProductosSeleccionados();

    if (totalSeleccionado > 0) {
      base = totalSeleccionado;
    } else {
      base = obtenerDeudaCliente(clienteSeleccionado);
    }
  }

  /*
   * Calcular porcentaje.
   *
   * Ejemplo:
   *
   * 80.000 × 5 / 100 = 4.000
   */
  return (Number(base) * valor) / 100;
}

/* ========================================
   REGISTRAR PAGO
======================================== */

async function registrarPagoCliente() {
  if (!clienteSeleccionado) {
    return;
  }

  /* ========================================
       DATOS DEL FORMULARIO
  ======================================== */

  const inputMonto = document.getElementById("monto-pago-cliente");

  const montoEntregado = convertirNumeroCliente(inputMonto?.value);

  const interesInicial = obtenerMontoInteresCliente();

  if (montoEntregado <= 0 && interesInicial <= 0) {
    alert("Ingresá un monto de pago o un interés.");
    return;
  }

  const medioPago =
    document.getElementById("medio-pago-cliente")?.value || "efectivo";

  const fechaPago = document.getElementById("fecha-pago-cliente")?.value || "";

  const usuario =
    sessionStorage.getItem("usuarioOperativo") ||
    sessionStorage.getItem("usuarioActivo") ||
    "desconocido";

  /* ========================================
       INTERÉS
  ======================================== */

  const productosSeleccionados = document.querySelectorAll(
    ".checkbox-producto-deuda:checked",
  );

  const hayProductosSeleccionados = productosSeleccionados.length > 0;

  const totalSeleccionado = obtenerTotalProductosSeleccionados();

  const deudaInicialSeleccionada = obtenerDeudaInicialSeleccionada();

  const productosDeudaInicialSeleccionados = obtenerProductosDeudaInicialSeleccionados();

  const hayDeudaInicialSeleccionada = deudaInicialSeleccionada > 0;

  const deudaCliente = obtenerDeudaCliente(clienteSeleccionado);

  let baseOperacion = deudaCliente;

  if (hayDeudaInicialSeleccionada) {
    baseOperacion = Math.min(deudaInicialSeleccionada, deudaCliente);
  } else if (hayProductosSeleccionados) {
    baseOperacion = Math.min(totalSeleccionado, deudaCliente);
  }

  const interes = obtenerMontoInteresCliente(baseOperacion);

  /*
   * El total de la operación incluye
   * el interés.
   */
  const totalOperacion = baseOperacion + interes;

  if (totalOperacion <= 0) {
    alert("No hay deuda para registrar este pago.");
    return;
  }

  /*
   * No permitir pagar más de lo que
   * corresponde a la operación.
   */
  const montoRealPago = Math.min(montoEntregado, totalOperacion);

  if (montoRealPago <= 0 && interes <= 0) {
    return;
  }

  /* ========================================
       OBTENER VENTAS DEL CLIENTE
  ======================================== */

  const ventasCliente = obtenerVentasCliente(clienteSeleccionado);

  /*
   * Solamente consideramos ventas
   * que todavía tienen deuda.
   */
  let ventasConDeuda = ventasCliente
    .filter((venta) => (Number(venta.saldoAdeber) || 0) > 0)
    .map((venta) => ({
      ...venta,
      saldoActual: Number(venta.saldoAdeber) || 0,
    }));

  /* ========================================
       DETERMINAR VENTAS SELECCIONADAS
  ======================================== */

  const ventasSeleccionadas = new Set();

  productosSeleccionados.forEach((checkbox) => {
    const ventaId = checkbox.dataset.ventaId;

    if (ventaId) {
      ventasSeleccionadas.add(ventaId);
    }
  });

  /*
   * Si seleccionamos productos, solamente
   * pagar las ventas correspondientes.
   *
   * Si no seleccionamos nada, pagar las
   * deudas más antiguas primero.
   */
  if (ventasSeleccionadas.size > 0) {
    ventasConDeuda = ventasConDeuda.filter((venta) =>
      ventasSeleccionadas.has(venta.id),
    );
  }

  /* ========================================
       ORDEN FIFO
  ======================================== */

  ventasConDeuda.sort(
    (a, b) => obtenerFechaCliente(a.fecha) - obtenerFechaCliente(b.fecha),
  );

  /* ========================================
       DISTRIBUIR EL PAGO
  ======================================== */

  /*
   * Si hay interés, primero reservamos
   * esa parte del pago para el interés.
   *
   * El resto se aplica a las ventas.
   */
  const montoParaAplicar = Math.max(0, Math.min(montoRealPago, baseOperacion));

  let restante = montoParaAplicar;

  const aplicaciones = [];

  let totalAplicadoInicial = 0;

  /* ========================================
   APLICAR A DEUDA INICIAL
======================================== */

  if (hayDeudaInicialSeleccionada) {
    // Aplicar el pago primero a los productos iniciales seleccionados.
    for (const producto of productosDeudaInicialSeleccionados) {
      if (restante <= 0) break;

      const montoAplicado = Math.min(producto.saldoPendiente, restante);
      if (montoAplicado <= 0) continue;

      aplicaciones.push({
        tipo: "deuda_inicial",
        origen: "deuda_inicial",
        deudaProductoId: producto.id,
        productoId: producto.productoId || "",
        nombreProducto: producto.nombre,
        monto: montoAplicado,
        descripcion: `Pago aplicado a ${producto.nombre}`,
      });

      totalAplicadoInicial += montoAplicado;
      restante -= montoAplicado;
    }

    // Compatibilidad con deudas antiguas que todavía no tienen detalle por producto.
    const checkboxGlobal = document.querySelector(".checkbox-deuda-inicial:checked");
    if (checkboxGlobal && restante > 0) {
      const detalleInicial = obtenerDetalleDeudasInicialesCliente(
        movimientosClientes[clienteSeleccionado.id] || [],
      );
      const montoGlobalSeleccionado =
        detalleInicial.deudaAgregada + detalleInicial.intereses;
      const montoAplicadoGlobal = Math.min(montoGlobalSeleccionado, restante);

      if (montoAplicadoGlobal > 0) {
        aplicaciones.push({
          tipo: "deuda_inicial",
          origen: "deuda_inicial",
          monto: montoAplicadoGlobal,
          descripcion: "Pago aplicado a deuda inicial sin detalle por producto",
        });

        totalAplicadoInicial += montoAplicadoGlobal;
        restante -= montoAplicadoGlobal;
      }
    }
  }

  /* ========================================
   APLICAR A VENTAS
======================================== */

  if (!hayDeudaInicialSeleccionada) {
    const montoParaVentas = restante;

    for (const venta of ventasConDeuda) {
      if (restante <= 0) {
        break;
      }

      const saldoVenta = Number(venta.saldoActual) || 0;

      const montoAplicado = Math.min(saldoVenta, restante);

      if (montoAplicado <= 0) {
        continue;
      }

      aplicaciones.push({
        ventaId: venta.id,
        numero: venta.numero || venta.id,
        monto: montoAplicado,
      });

      restante -= montoAplicado;
    }
  }

  const totalAplicadoVentas = aplicaciones
    .filter((aplicacion) => !aplicacion.tipo)
    .reduce((total, aplicacion) => total + (Number(aplicacion.monto) || 0), 0);

  /* ========================================
   VALIDAR APLICACIÓN
======================================== */

  if (
    totalAplicadoVentas <= 0 &&
    totalAplicadoInicial <= 0 &&
    baseOperacion > 0 &&
    montoRealPago > 0
  ) {
    alert("No se pudo determinar a qué deuda aplicar el pago.");
    return;
  }

  /* ========================================
       BLOQUEAR BOTÓN
  ======================================== */

  const botonRegistrar = document.getElementById("boton-registrar-pago");

  if (!botonRegistrar || botonRegistrar.disabled) {
    return;
  }

  botonRegistrar.disabled = true;
  botonRegistrar.textContent = "Registrando...";

  /* ========================================
       FIREBASE
  ======================================== */

  try {
    const { doc, writeBatch, addDoc, collection, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    /*
     * Usamos un batch para que las modificaciones
     * de las ventas y del cliente se hagan juntas.
     */
    const batch = writeBatch(window.db);

    /* ========================================
           ACTUALIZAR VENTAS
    ======================================== */

    for (const aplicacion of aplicaciones) {
      const venta = ventasCliente.find(
        (item) => item.id === aplicacion.ventaId,
      );

      if (!venta) {
        continue;
      }

      const saldoAnterior = Number(venta.saldoAdeber) || 0;

      const entregadoAnterior = Number(venta.totalEntregado) || 0;

      const montoAplicado = Number(aplicacion.monto) || 0;

      const nuevoSaldo = Math.max(0, saldoAnterior - montoAplicado);

      const nuevoTotalEntregado = entregadoAnterior + montoAplicado;

      const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "con_deuda";

      const ventaRef = doc(window.db, "ventas", venta.id);

      batch.update(ventaRef, {
        saldoAdeber: nuevoSaldo,
        totalEntregado: nuevoTotalEntregado,
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp(),
      });
    }

    /* ========================================
           ACTUALIZAR CLIENTE
    ======================================== */

    const totalAplicadoDeuda = totalAplicadoVentas + totalAplicadoInicial;

    const nuevaDeuda = Math.max(
      0,
      deudaCliente -
        totalAplicadoDeuda +
        interes -
        Math.max(0, montoRealPago - totalAplicadoDeuda),
    );

    const clienteRef = doc(window.db, "clientes", clienteSeleccionado.id);

    batch.update(clienteRef, {
      deudaTotal: nuevaDeuda,
      actualizadoEn: serverTimestamp(),
      ultimoMovimiento: serverTimestamp(),
    });

    /* ========================================
           REGISTRAR MOVIMIENTO DE PAGO
    ======================================== */

    const movimientoRef = doc(
      collection(window.db, "clientes", clienteSeleccionado.id, "movimientos"),
    );

    batch.set(movimientoRef, {
      tipo: "pago",
      monto: montoRealPago,
      montoAplicado: totalAplicadoVentas + totalAplicadoInicial,
      medioPago: medioPago,
      fecha: serverTimestamp(),
      usuario: usuario,
      descripcion: "Pago de deuda",
      aplicaciones: aplicaciones,
      creadoEn: serverTimestamp(),
    });

    /* ========================================
           REGISTRAR INTERÉS
    ======================================== */

    if (interes > 0) {
      const tipoInteres =
        document.getElementById("tipo-interes-cliente")?.value || "porcentaje";

      const valorInteres = convertirNumeroCliente(
        document.getElementById("valor-interes-cliente")?.value,
      );

      /*
       * Si el interés corresponde a la deuda inicial,
       * no se modifica ninguna venta.
       *
       * El interés queda registrado como movimiento
       * con origen "deuda_inicial".
       */
      if (!hayDeudaInicialSeleccionada) {
        /*
         * Determinar a qué venta se aplica el interés.
         *
         * Si hay productos seleccionados, se aplica
         * a las ventas seleccionadas.
         *
         * Si no hay productos seleccionados, se aplica
         * a la primera venta con deuda.
         */
        let ventasParaInteres = [...ventasConDeuda];

        if (ventasSeleccionadas.size > 0) {
          ventasParaInteres = ventasParaInteres.filter((venta) =>
            ventasSeleccionadas.has(venta.id),
          );
        }

        if (ventasParaInteres.length > 0) {
          const ventaInteres = ventasParaInteres[0];

          const saldoAnteriorInteres = Number(ventaInteres.saldoAdeber) || 0;

          batch.update(doc(window.db, "ventas", ventaInteres.id), {
            saldoAdeber: saldoAnteriorInteres + interes,
            estado: "con_deuda",
            actualizadoEn: serverTimestamp(),
          });
        }
      }

      /*
       * Guardar el movimiento para conservar
       * el historial del interés.
       */
      const interesRef = doc(
        collection(
          window.db,
          "clientes",
          clienteSeleccionado.id,
          "movimientos",
        ),
      );

      batch.set(interesRef, {
        tipo: "interes",
        monto: interes,
        tipoInteres: tipoInteres,
        valor: valorInteres,

        // Indicar si el interés proviene
        // de la deuda inicial o de una venta.
        origen: hayDeudaInicialSeleccionada ? "deuda_inicial" : "venta",

        fecha: serverTimestamp(),
        usuario: usuario,
        descripcion: "Recargo de interés",
        creadoEn: serverTimestamp(),
      });
    }

    /* ========================================
           EJECUTAR TODO
    ======================================== */

    await batch.commit();

    console.log("Pago registrado correctamente.", {
      montoRealPago,
      totalAplicadoVentas,
      interes,
      aplicaciones,
    });

    alert("Pago registrado correctamente.");

    /* ========================================
           LIMPIAR FORMULARIO
    ======================================== */

    const monto = document.getElementById("monto-pago-cliente");

    if (monto) {
      monto.value = "0";
    }

    // Reiniciar interés
    const valorInteres = document.getElementById("valor-interes-cliente");

    const camposInteres = document.getElementById("campos-interes");

    const botonInteres = document.getElementById("activar-interes-cliente");

    if (valorInteres) {
      valorInteres.value = "";
    }

    if (camposInteres) {
      camposInteres.setAttribute("hidden", "");
    }

    if (botonInteres) {
      botonInteres.textContent = "+ Agregar interés";
    }

    document
      .querySelectorAll(".checkbox-producto-deuda")
      .forEach((checkbox) => {
        checkbox.checked = false;
      });

    /* ========================================
           RECARGAR TODO DESDE FIRESTORE
    ======================================== */

    await cargarClientes();

    const clienteActual = clientes.find(
      (cliente) => cliente.id === clienteSeleccionado.id,
    );

    if (clienteActual) {
      clienteSeleccionado = clienteActual;

      cargarDatosClienteDetalle(clienteActual);
    }

    renderizarClientes();

    actualizarEstadisticasClientes();

    await cargarProductosPendientesCliente(clienteSeleccionado);

    renderizarProductosPendientes();

    // Actualizar el resumen sin volver a cargar
    // el último interés guardado.
    actualizarInteresCliente();
  } catch (error) {
    console.error("Error registrando pago:", error);

    alert("No se pudo registrar el pago.");
  } finally {
    /* ========================================
           DESBLOQUEAR BOTÓN
    ======================================== */

    const botonRegistrar = document.getElementById("boton-registrar-pago");

    if (botonRegistrar) {
      botonRegistrar.disabled = false;
      botonRegistrar.textContent = "Registrar pago";
    }
  }
}

async function eliminarCliente() {
  if (!clienteSeleccionado) {
    return;
  }

  const nombre =
    `${clienteSeleccionado.nombre || ""} ${clienteSeleccionado.apellido || ""}`.trim() ||
    "este cliente";

  const deuda = obtenerDeudaCliente(clienteSeleccionado);

  let mensaje =
    `¿Estás seguro de que querés eliminar a ${nombre}?\n\n` +
    "Se eliminarán sus datos y movimientos de cuenta corriente.\n" +
    "Las ventas históricas NO se eliminarán.";

  if (deuda > 0) {
    mensaje += `\n\n⚠ ATENCIÓN: este cliente todavía tiene una deuda de ${formatearPrecioCliente(deuda)}.`;
  }

  mensaje += "\n\nEsta acción no se puede deshacer.";

  const confirmar = confirm(mensaje);

  if (!confirmar) {
    return;
  }

  const botonEliminar = document.getElementById("boton-eliminar-cliente");

  if (botonEliminar) {
    botonEliminar.disabled = true;
    botonEliminar.textContent = "Eliminando...";
  }

  try {
    const { collection, doc, getDocs, writeBatch } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const clienteId = clienteSeleccionado.id;

    /*
     * Obtener todos los movimientos
     * del cliente.
     */
    const movimientosRef = collection(
      window.db,
      "clientes",
      clienteId,
      "movimientos",
    );

    const movimientosSnapshot = await getDocs(movimientosRef);

    /*
     * Eliminar movimientos y cliente
     * utilizando batches.
     */
    let batch = writeBatch(window.db);
    let operaciones = 0;

    for (const movimiento of movimientosSnapshot.docs) {
      batch.delete(movimiento.ref);
      operaciones++;

      /*
       * Firestore permite como máximo
       * 500 operaciones por batch.
       */
      if (operaciones >= 450) {
        await batch.commit();

        batch = writeBatch(window.db);
        operaciones = 0;
      }
    }

    /*
     * Eliminar documento principal del cliente.
     */
    const clienteRef = doc(window.db, "clientes", clienteId);

    batch.delete(clienteRef);
    operaciones++;

    await batch.commit();

    console.log("Cliente eliminado correctamente:", clienteId);

    /*
     * Limpiar selección.
     */
    clienteSeleccionado = null;
    productosPendientesCliente = [];
    deudaInicialPendienteCliente = 0;

    /*
     * Volver al estado vacío del detalle.
     */
    const estadoVacio = document.getElementById("detalle-cliente-vacio");

    if (estadoVacio) {
      estadoVacio.style.display = "flex";
    }

    const contenido = document.getElementById("detalle-cliente-contenido");

    if (contenido) {
      contenido.style.display = "none";
      contenido.hidden = true;
    }

    /*
     * Recargar clientes.
     */
    await cargarClientes();

    renderizarClientes();
    actualizarEstadisticasClientes();

    alert("Cliente eliminado correctamente.");
  } catch (error) {
    console.error("Error eliminando cliente:", error);

    alert("No se pudo eliminar el cliente.");
  } finally {
    if (botonEliminar) {
      botonEliminar.disabled = false;
      botonEliminar.textContent = "🗑 Eliminar";
    }
  }
}

/* ========================================
   FECHA PAGO
======================================== */

function establecerFechaPago() {
  const input = document.getElementById("fecha-pago-cliente");

  if (!input) {
    return;
  }

  const ahora = new Date();

  const año = ahora.getFullYear();

  const mes = String(ahora.getMonth() + 1).padStart(2, "0");

  const dia = String(ahora.getDate()).padStart(2, "0");

  input.value = `${año}-${mes}-${dia}`;
}

/* ========================================
   PAGINACIÓN
======================================== */

function renderizarPaginacionClientes(totalClientes, totalPaginas) {
  const contenedor = document.getElementById("paginacion-clientes");

  const texto = document.getElementById("texto-paginacion-clientes");

  if (!contenedor) {
    return;
  }

  const inicio =
    totalClientes === 0 ? 0 : (paginaClientes - 1) * CLIENTES_POR_PAGINA + 1;

  const fin = Math.min(paginaClientes * CLIENTES_POR_PAGINA, totalClientes);

  if (texto) {
    texto.textContent = `Mostrando ${inicio}-${fin} de ${totalClientes} clientes`;
  }

  contenedor.innerHTML = "";

  const anterior = crearBotonPagina("‹", paginaClientes <= 1, () => {
    paginaClientes--;

    renderizarClientes();
  });

  contenedor.appendChild(anterior);

  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    const boton = crearBotonPagina(pagina, false, () => {
      paginaClientes = pagina;

      renderizarClientes();
    });

    if (pagina === paginaClientes) {
      boton.classList.add("activa");
    }

    contenedor.appendChild(boton);
  }

  const siguiente = crearBotonPagina(
    "›",
    paginaClientes >= totalPaginas,
    () => {
      paginaClientes++;

      renderizarClientes();
    },
  );

  contenedor.appendChild(siguiente);
}

function crearBotonPagina(texto, disabled, funcion) {
  const boton = document.createElement("button");

  boton.type = "button";

  boton.className = "boton-pagina-cliente";

  boton.textContent = texto;

  boton.disabled = disabled;

  boton.addEventListener("click", funcion);

  return boton;
}

/* ========================================
   OBTENER DEUDA
======================================== */

function obtenerDeudaCliente(cliente) {
  return Math.max(0, Number(cliente?.deudaTotal) || 0);
}

/* ========================================
   VENTAS DEL CLIENTE
======================================== */

function obtenerVentasCliente(cliente) {
  if (!cliente) {
    return [];
  }

  const usuarioActivo = sessionStorage.getItem("usuarioOperativo") || "Gon";

  return ventasClientes
    .filter(
      (venta) =>
        ventaCorrespondeCliente(venta, cliente) &&
        venta.usuario === usuarioActivo,
    )
    .sort(
      (a, b) => obtenerFechaCliente(a.fecha) - obtenerFechaCliente(b.fecha),
    );
}

function obtenerTodasVentasCliente(cliente) {
  if (!cliente) {
    return [];
  }

  return ventasClientes
    .filter((venta) => ventaCorrespondeCliente(venta, cliente))
    .sort(
      (a, b) => obtenerFechaCliente(a.fecha) - obtenerFechaCliente(b.fecha),
    );
}

function clienteEsVisibleParaUsuario(cliente) {
  if (!cliente) {
    return false;
  }

  const usuarioActivo = sessionStorage.getItem("usuarioOperativo") || "Gon";

  // Cliente sin usuarioCreador = compartido
  if (!cliente.usuarioCreador) {
    return true;
  }

  // Cliente creado por el usuario activo
  if (cliente.usuarioCreador === usuarioActivo) {
    return true;
  }

  // Cliente con deuda pendiente en una venta del usuario activo
  const ventas = obtenerTodasVentasCliente(cliente);

  const tieneDeudaDelUsuario = ventas.some(
    (venta) =>
      venta.usuario === usuarioActivo && (Number(venta.saldoAdeber) || 0) > 0,
  );

  return tieneDeudaDelUsuario;
}

/* ========================================
   DEUDA ACTUAL
======================================== */

function normalizarTipoMovimientoCliente(tipo) {
  const valor = String(tipo || "")
    .trim()
    .toLowerCase();

  if (valor === "pago" || valor === "pagodeuda") {
    return "pago";
  }

  if (valor === "interes" || valor === "interés") {
    return "interes";
  }

  if (valor === "deuda_inicial" || valor === "deudainicial") {
    return "deuda_inicial";
  }

  return valor;
}

function obtenerDetalleDeudasInicialesCliente(movimientos = []) {
  const movimientosOrdenados = [...movimientos].sort(
    (a, b) =>
      obtenerFechaCliente(a.fecha || a.creadoEn) -
      obtenerFechaCliente(b.fecha || b.creadoEn),
  );

  const movimientosDeudaInicial = movimientosOrdenados.filter(
    (movimiento) =>
      normalizarTipoMovimientoCliente(movimiento.tipo) === "deuda_inicial",
  );

  const productos = [];
  let deudaAgregadaOriginal = 0;

  movimientosDeudaInicial.forEach((movimiento) => {
    const listaProductos = Array.isArray(movimiento.productosAdeudados)
      ? movimiento.productosAdeudados
      : [];

    if (!listaProductos.length) {
      deudaAgregadaOriginal += Number(movimiento.monto) || 0;
      return;
    }

    listaProductos.forEach((producto, indice) => {
      const montoAdeudado =
        Number(producto.montoAdeudado ?? producto.saldoPendiente) || 0;

      productos.push({
        id: producto.id || `${movimiento.id}_${indice}`,
        movimientoId: movimiento.id,
        productoId: producto.productoId || "",
        nombre: producto.nombre || "Producto sin nombre",
        talle: producto.talle || "",
        fecha: movimiento.fecha || movimiento.creadoEn,
        precioProducto: Number(producto.precioProducto) || 0,
        montoAdeudado,
        saldoPendiente: montoAdeudado,
      });
    });
  });

  const interesesOriginales = movimientosOrdenados
    .filter(
      (movimiento) =>
        normalizarTipoMovimientoCliente(movimiento.tipo) === "interes" &&
        movimiento.origen === "deuda_inicial",
    )
    .reduce((total, movimiento) => total + (Number(movimiento.monto) || 0), 0);

  const pagos = movimientosOrdenados.filter(
    (movimiento) =>
      normalizarTipoMovimientoCliente(movimiento.tipo) === "pago",
  );

  // Los pagos identificados con un producto se descuentan de ese producto.
  pagos.forEach((movimiento) => {
    const aplicaciones = Array.isArray(movimiento.aplicaciones)
      ? movimiento.aplicaciones
      : [];

    aplicaciones.forEach((aplicacion) => {
      if (!aplicacion.deudaProductoId) return;

      const producto = productos.find(
        (item) => item.id === aplicacion.deudaProductoId,
      );

      if (producto) {
        producto.saldoPendiente = Math.max(
          0,
          producto.saldoPendiente - (Number(aplicacion.monto) || 0),
        );
      }
    });
  });

  // Compatibilidad con pagos antiguos que se aplicaban a la deuda inicial global.
  const pagosGlobales = pagos.reduce((total, movimiento) => {
    const aplicaciones = Array.isArray(movimiento.aplicaciones)
      ? movimiento.aplicaciones
      : [];

    return (
      total +
      aplicaciones
        .filter(
          (aplicacion) =>
            !aplicacion.deudaProductoId &&
            (aplicacion.tipo === "deuda_inicial" ||
              aplicacion.origen === "deuda_inicial"),
        )
        .reduce(
          (subtotal, aplicacion) =>
            subtotal + (Number(aplicacion.monto) || 0),
          0,
        )
    );
  }, 0);

  let deudaAgregada = deudaAgregadaOriginal;
  let intereses = interesesOriginales;
  let pagoGlobalRestante = pagosGlobales;

  const aplicadoADeudaAgregada = Math.min(
    deudaAgregada,
    pagoGlobalRestante,
  );
  deudaAgregada -= aplicadoADeudaAgregada;
  pagoGlobalRestante -= aplicadoADeudaAgregada;

  // Si un pago viejo se hizo cuando la deuda tenía productos pero no guardaba
  // el identificador de cada uno, se distribuye por antigüedad.
  for (const producto of productos) {
    if (pagoGlobalRestante <= 0) break;

    const aplicado = Math.min(producto.saldoPendiente, pagoGlobalRestante);
    producto.saldoPendiente -= aplicado;
    pagoGlobalRestante -= aplicado;
  }

  if (pagoGlobalRestante > 0) {
    intereses = Math.max(0, intereses - pagoGlobalRestante);
  }

  const totalProductos = productos.reduce(
    (total, producto) => total + producto.saldoPendiente,
    0,
  );

  return {
    productos,
    deudaAgregada: Math.max(0, deudaAgregada),
    intereses: Math.max(0, intereses),
    total:
      totalProductos +
      Math.max(0, deudaAgregada) +
      Math.max(0, intereses),
  };
}

function obtenerDeudaInicialCliente(movimientos = []) {
  return obtenerDetalleDeudasInicialesCliente(movimientos).total;
}

function calcularDeudaActualCliente(
  cliente,
  ventas = obtenerVentasCliente(cliente),
  movimientos = movimientosClientes[cliente?.id] || [],
) {
  const ventasConSaldo = calcularSaldosVentasCliente(ventas, movimientos);

  const deudaVentas = ventasConSaldo.reduce(
    (total, venta) => total + (Number(venta.saldoPendiente) || 0),
    0,
  );

  const deudaInicial = obtenerDeudaInicialCliente(movimientos);

  return Math.max(0, deudaVentas + deudaInicial);
}

/* ========================================
   SALDOS POR VENTA
======================================== */

function calcularSaldosVentasCliente(ventas, movimientos = []) {
  return [...ventas]
    .map((venta) => ({
      ...venta,
      saldoPendiente: Math.max(0, Number(venta.saldoAdeber) || 0),
    }))
    .filter((venta) => venta.saldoPendiente > 0)
    .sort(
      (a, b) => obtenerFechaCliente(a.fecha) - obtenerFechaCliente(b.fecha),
    );
}

/* ========================================
   ÚLTIMO MOVIMIENTO
======================================== */

function obtenerUltimoMovimientoCliente(ventas = [], movimientos = []) {
  let ultimaFecha = 0;

  let ultimoValor = null;

  ventas.forEach((venta) => {
    const fecha = obtenerFechaCliente(venta.fecha);

    if (fecha > ultimaFecha) {
      ultimaFecha = fecha;

      ultimoValor = venta.fecha;
    }
  });

  movimientos.forEach((movimiento) => {
    const fecha = movimiento.fecha || movimiento.creadoEn;

    const timestamp = obtenerFechaCliente(fecha);

    if (timestamp > ultimaFecha) {
      ultimaFecha = timestamp;

      ultimoValor = fecha;
    }
  });

  return ultimoValor;
}

/* ========================================
   OBTENER MOVIMIENTOS
======================================== */

function obtenerMovimientosCliente(cliente) {
  if (!cliente) {
    return [];
  }

  return [...(movimientosClientes[cliente.id] || [])].sort(
    (a, b) =>
      obtenerFechaCliente(b.fecha || b.creadoEn) -
      obtenerFechaCliente(a.fecha || a.creadoEn),
  );
}

/* ========================================
   UTILIDADES
======================================== */

function obtenerInicialesCliente(cliente) {
  const nombre = String(cliente?.nombre || "").trim();

  const apellido = String(cliente?.apellido || "").trim();

  const primera = nombre ? nombre.charAt(0) : "";

  const segunda = apellido ? apellido.charAt(0) : "";

  return `${primera}${segunda}`.toUpperCase() || "?";
}

function obtenerFechaCliente(fecha) {
  if (!fecha) {
    return 0;
  }

  if (typeof fecha.toDate === "function") {
    return fecha.toDate().getTime();
  }

  const resultado = new Date(fecha);

  return Number.isNaN(resultado.getTime()) ? 0 : resultado.getTime();
}

function formatearFechaCortaCliente(fecha) {
  if (!fecha) {
    return "—";
  }

  let fechaJS;

  if (fecha instanceof Date) {
    fechaJS = fecha;
  } else if (typeof fecha.toDate === "function") {
    fechaJS = fecha.toDate();
  } else {
    fechaJS = new Date(fecha);
  }

  if (Number.isNaN(fechaJS.getTime())) {
    return "—";
  }

  return fechaJS.toLocaleDateString("es-AR");
}

function calcularHaceCliente(fecha) {
  if (!fecha) {
    return "Sin movimientos";
  }

  const timestamp = obtenerFechaCliente(fecha);

  if (!timestamp) {
    return "Sin movimientos";
  }

  const diferencia = Date.now() - timestamp;

  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

  if (dias <= 0) {
    return "hoy";
  }

  if (dias === 1) {
    return "hace 1 día";
  }

  return `hace ${dias} días`;
}

function formatearPrecioCliente(valor) {
  return `$ ${(Number(valor) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,

    maximumFractionDigits: 2,
  })}`;
}

function convertirNumeroCliente(valor) {
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

function escaparHTMLCliente(texto) {
  const elemento = document.createElement("div");

  elemento.textContent = texto ?? "";

  return elemento.innerHTML;
}

/* ========================================
   COBRADO DEL MES
======================================== */

function calcularCobradoMes() {
  const ahora = new Date();

  const año = ahora.getFullYear();

  const mes = ahora.getMonth();

  let total = 0;

  Object.values(movimientosClientes).forEach((movimientos) => {
    movimientos.forEach((movimiento) => {
      if (movimiento.tipo !== "pago") {
        return;
      }

      const fecha = movimiento.fecha || movimiento.creadoEn;

      let fechaJS;

      if (fecha && typeof fecha.toDate === "function") {
        fechaJS = fecha.toDate();
      } else {
        fechaJS = new Date(fecha);
      }

      if (Number.isNaN(fechaJS.getTime())) {
        return;
      }

      if (fechaJS.getFullYear() !== año || fechaJS.getMonth() !== mes) {
        return;
      }

      total += Number(movimiento.montoAplicado ?? movimiento.monto ?? 0) || 0;
    });
  });

  return total;
}

async function cargarModalRegistrarCliente() {
  try {
    const respuesta = await fetch("html/clientes/registrar-cliente.html");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de registrar cliente.");
    }

    const html = await respuesta.text();

    const contenedor = document.getElementById("modales-clientes");

    if (!contenedor) {
      console.error("No existe #modales-clientes.");
      return;
    }

    if (document.getElementById("modal-registrar-cliente")) {
      return;
    }

    contenedor.insertAdjacentHTML("beforeend", html);

    if (!document.getElementById("css-registrar-cliente")) {
      const link = document.createElement("link");

      link.id = "css-registrar-cliente";
      link.rel = "stylesheet";
      link.href = "css/clientes/registrar-cliente.css";

      document.head.appendChild(link);
    }
  } catch (error) {
    console.error("Error cargando modal registrar cliente:", error);
  }
}

function cargarScriptRegistrarCliente() {
  const scriptExistente = document.getElementById("js-registrar-cliente");

  // Si el script y sus funciones siguen disponibles, no hace falta recargarlo.
  if (
    scriptExistente &&
    typeof window.abrirModalRegistrarCliente === "function" &&
    typeof window.cerrarModalRegistrarCliente === "function"
  ) {
    return Promise.resolve();
  }

  // Si quedó un script sin sus funciones, eliminarlo y cargarlo de nuevo.
  scriptExistente?.remove();

  delete window.abrirModalRegistrarCliente;
  delete window.cerrarModalRegistrarCliente;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.id = "js-registrar-cliente";
    script.src = `js/clientes/registrarcliente.js?t=${Date.now()}`;
    script.type = "module";

    script.onload = () => {
      if (typeof window.abrirModalRegistrarCliente !== "function") {
        reject(
          new Error(
            "El script se cargó, pero no inicializó abrirModalRegistrarCliente."
          )
        );
        return;
      }

      resolve();
    };

    script.onerror = () => {
      reject(new Error("No se pudo cargar registrarcliente.js."));
    };

    document.body.appendChild(script);
  });
}

async function cargarModalHistorialCliente() {
  try {
    const respuesta = await fetch("html/clientes/historial-modal.html");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de historial.");
    }

    const html = await respuesta.text();

    const contenedor = document.getElementById("modales-clientes");

    if (!contenedor) {
      console.error("No existe #modales-clientes.");
      return;
    }

    // Evitar cargar el mismo modal más de una vez
    if (document.getElementById("modal-historial-cliente")) {
      return;
    }

    contenedor.insertAdjacentHTML("beforeend", html);
  } catch (error) {
    console.error("Error cargando modal historial:", error);
  }
}

/* ========================================
   CARGAR JS HISTORIAL
======================================== */

function cargarScriptHistorialCliente() {
  return new Promise((resolve, reject) => {
    const scriptExistente = document.getElementById("js-historial-cliente");

    if (scriptExistente) {
      inicializarHistorialCliente();
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.id = "js-historial-cliente";
    script.src = `js/clientes/historial-modal.js?t=${Date.now()}`;

    script.onload = () => {
      inicializarHistorialCliente();
      resolve();
    };

    script.onerror = reject;

    document.body.appendChild(script);
  });
}

/* ========================================
   INICIAR
======================================== */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarClientes);
} else {
  inicializarClientes();
}

/* ========================================
   CARGAR MODAL EDITAR CLIENTE
======================================== */

async function cargarModalEditarCliente() {
  const respuesta = await fetch("html/clientes/editar-cliente.html");

  if (!respuesta.ok) {
    throw new Error("No se pudo cargar el modal de editar cliente.");
  }

  const html = await respuesta.text();

  const contenedor = document.getElementById("modales-clientes");

  if (!contenedor) {
    throw new Error("No existe #modales-clientes.");
  }

  const div = document.createElement("div");

  div.id = "modal-editar-cliente-wrapper";

  div.innerHTML = html;

  contenedor.appendChild(div);

  const linkExistente = document.getElementById("css-editar-cliente");

  if (!linkExistente) {
    const link = document.createElement("link");

    link.id = "css-editar-cliente";
    link.rel = "stylesheet";
    link.href = "css/clientes/editar-cliente.css";

    document.head.appendChild(link);
  }
}

/* ========================================
   CARGAR JS EDITAR CLIENTE
======================================== */

function cargarScriptEditarCliente() {
  if (document.getElementById("js-editar-cliente")) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.id = "js-editar-cliente";
    script.src = `js/clientes/editar-cliente.js?t=${Date.now()}`;
    script.type = "module";

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

window.limpiarClientes = function () {
  // Cerrar el modal de registrar cliente.
  const modalRegistrar = document.getElementById(
    "modal-registrar-cliente"
  );

  if (modalRegistrar) {
    modalRegistrar.classList.remove("visible");
    modalRegistrar.setAttribute("hidden", "");
  }

  // Eliminar el script auxiliar.
  document.getElementById("js-registrar-cliente")?.remove();

  delete window.abrirModalRegistrarCliente;
  delete window.cerrarModalRegistrarCliente;

  // Cerrar el historial.
  const modal = document.getElementById("modal-historial-cliente");

  if (modal) {
    modal.classList.remove("visible");
    modal.setAttribute("hidden", "");
  }

  // Cerrar el modal de edición.
  const modalEditar = document.getElementById("modal-editar-cliente");

  if (modalEditar) {
    modalEditar.classList.remove("visible");
    modalEditar.setAttribute("hidden", "");
  }

  // Restaurar el desplazamiento de la página.
  document.body.style.overflow = "";

  // Eliminar el script auxiliar de edición.
  document.getElementById("js-editar-cliente")?.remove();

  delete window.abrirModalEditarCliente;
};
