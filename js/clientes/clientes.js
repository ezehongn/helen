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

function cargarCSSRedistribuirDeuda() {
  if (document.getElementById("css-redistribuir-deuda")) return;
  const link = document.createElement("link");
  link.id = "css-redistribuir-deuda";
  link.rel = "stylesheet";
  link.href = "css/clientes/redistribuirdeudacliente.css";
  document.head.appendChild(link);
}

async function cargarScriptRedistribuirDeuda() {
  const modalActual = document.getElementById("redistribuirDeudaModal");

  if (!modalActual) {
    throw new Error(
      "No se encontró #redistribuirDeudaModal en el DOM al cargar el script.",
    );
  }

  // Si el script ya estaba cargado, eliminarlo para que tome
  // la instancia actual del modal y no una referencia antigua.
  document.getElementById("js-redistribuir-deuda")?.remove();

  delete window.abrirRedistribucionDeuda;
  delete window.cerrarRedistribucionDeuda;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.id = "js-redistribuir-deuda";
    script.src = `js/clientes/redistribuirdeudacliente.js?t=${Date.now()}`;

    script.onload = () => {
      // Verificar que el script haya inicializado el modal actual.
      const modalDespuesDeCargar = document.getElementById(
        "redistribuirDeudaModal",
      );

      if (
        !modalDespuesDeCargar ||
        typeof window.abrirRedistribucionDeuda !== "function"
      ) {
        reject(
          new Error(
            "El script cargó, pero el modal o su función de apertura no están disponibles.",
          ),
        );
        return;
      }

      resolve();
    };

    script.onerror = () => {
      reject(new Error("No se pudo cargar redistribuirdeudacliente.js."));
    };

    document.body.appendChild(script);
  });
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

window.obtenerImagenProducto = async function (productoId) {
  if (!productoId) return "";

  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = doc(window.db, "productos", productoId);
    const snapshot = await getDoc(referencia);

    if (!snapshot.exists()) {
      console.warn("No existe el producto en Firestore:", productoId);
      return "";
    }

    return snapshot.data().imagen || "";
  } catch (error) {
    console.warn(
      `No se pudo obtener la imagen del producto ${productoId}:`,
      error,
    );

    return "";
  }
};
/* ========================================
   INICIALIZACIÓN
======================================== */

async function inicializarClientes() {
  console.log("Inicializando pantalla Clientes...");

  cargarCSSClientes();

  cargarCSSHistorialCliente();

  cargarCSSRedistribuirDeuda();

  await cargarScriptRedistribuirDeuda();

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

  if (!window.eventoRedistribuirDeudaRegistrado) {
    document.addEventListener("click", (event) => {
      const boton = event.target.closest("#boton-redistribuir-deuda");

      if (!boton) return;

      event.preventDefault();
      abrirModalRedistribucionCliente();
    });

    window.eventoRedistribuirDeudaRegistrado = true;
  }

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
       CLIENTES Y VENTAS

       Ambas consultas son independientes. Ejecutarlas en paralelo reduce
       la espera inicial sin cambiar los documentos ni los cálculos.
    ================================ */

    const [clientesSnapshot, ventasSnapshot] = await Promise.all([
      getDocs(collection(window.db, "clientes")),
      getDocs(collection(window.db, "ventas")),
    ]);

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
       PREPARAR VENTAS
    ================================ */

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

function distribuirSaldoEquitativamenteCliente(saldo, productos, maximos = []) {
  const resultado = productos.map(() => 0);
  let restante = Math.max(0, Math.round(Number(saldo) || 0));
  const limites = productos.map((producto, i) =>
    Math.max(0, Math.round(Number(maximos[i] ?? producto.subtotal) || 0)),
  );
  let activos = limites.map((_, i) => i).filter((i) => limites[i] > 0);

  while (restante > 0 && activos.length) {
    const cuota = Math.max(1, Math.floor(restante / activos.length));
    let progreso = false;
    for (const i of [...activos]) {
      const asignado = Math.min(limites[i] - resultado[i], cuota, restante);
      if (asignado > 0) {
        resultado[i] += asignado;
        restante -= asignado;
        progreso = true;
      }
      if (resultado[i] >= limites[i]) activos = activos.filter((x) => x !== i);
      if (restante <= 0) break;
    }
    if (!progreso) break;
  }
  return { montos: resultado, restante };
}

function obtenerDistribucionProductosVenta(venta) {
  const productos = Array.isArray(venta.productos) ? venta.productos : [];
  const saldoVenta = Math.max(0, Math.round(Number(venta.saldoAdeber) || 0));
  const guardada = Array.isArray(venta.distribucionDeudaProductos)
    ? venta.distribucionDeudaProductos
    : [];

  if (guardada.length) {
    const porIndice = new Map(
      guardada.map((item) => [Number(item.productoIndice), item]),
    );
    const montos = productos.map((_, indice) => {
      const item = porIndice.get(indice);
      return Math.max(
        0,
        Math.round(Number(item?.saldoPendiente ?? item?.montoAsignado) || 0),
      );
    });
    const suma = montos.reduce((a, b) => a + b, 0);
    const restanteGuardado = Math.max(
      0,
      Number(venta.distribucionDeudaSinAsignar) || 0,
    );
    return {
      montos,
      restante: restanteGuardado || Math.max(0, saldoVenta - suma),
    };
  }

  const maximos = productos.map((producto) => {
    const subtotal =
      Number(producto.subtotal) ||
      (Number(producto.precioUnitario) || 0) * (Number(producto.cantidad) || 1);
    return Math.max(0, Math.round(subtotal));
  });
  return distribuirSaldoEquitativamenteCliente(saldoVenta, productos, maximos);
}

async function cargarProductosPendientesCliente(cliente) {
  productosPendientesCliente = [];
  deudaInicialPendienteCliente = 0;

  try {
    const movimientos = movimientosClientes[cliente.id] || [];
    deudaInicialPendienteCliente = obtenerDeudaInicialCliente(movimientos);
    const ventas = obtenerVentasCliente(cliente);

    ventas.forEach((venta) => {
      const saldoPendiente = Math.max(0, Number(venta.saldoAdeber) || 0);
      if (saldoPendiente <= 0) return;

      const productos = Array.isArray(venta.productos) ? venta.productos : [];
      const distribucion = obtenerDistribucionProductosVenta(venta);

      productos.forEach((producto, indice) => {
        const saldoProducto = Math.max(
          0,
          Number(distribucion.montos[indice]) || 0,
        );

        productosPendientesCliente.push({
          id: `${venta.id}_${indice}`,
          ventaId: venta.id,
          productoIndice: indice,
          numeroVenta: venta.numero || venta.id,
          productoId: producto.productoId || producto.id || "",
          nombre: producto.nombre || "Producto",
          talle: producto.talle || "",
          cantidad: Number(producto.cantidad) || 0,
          precioUnitario: Number(producto.precioUnitario) || 0,
          subtotal:
            Number(producto.subtotal) ||
            (Number(producto.precioUnitario) || 0) *
              (Number(producto.cantidad) || 1),
          saldoProducto,
          saldoVenta: saldoPendiente,
          totalVenta: Number(venta.total) || 0,
          totalEntregado: Number(venta.totalEntregado) || 0,
          fecha: venta.fecha || null,
        });
      });

      if (distribucion.restante > 0) {
        productosPendientesCliente.push({
          id: `${venta.id}_saldo_sin_asignar`,
          ventaId: venta.id,
          productoIndice: -1,
          numeroVenta: venta.numero || venta.id,
          productoId: "",
          nombre: "Saldo de venta sin asignar",
          talle: "",
          cantidad: 1,
          precioUnitario: 0,
          subtotal: 0,
          saldoProducto: distribucion.restante,
          saldoVenta: saldoPendiente,
          totalVenta: Number(venta.total) || 0,
          totalEntregado: Number(venta.totalEntregado) || 0,
          fecha: venta.fecha || null,
          saldoSinAsignar: true,
        });
      }
    });

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
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const detalleDeudaInicial = obtenerDetalleDeudasInicialesCliente(
    movimientosClientes[clienteSeleccionado?.id] || [],
  );

  if (deudaInicialPendienteCliente > 0) {
    const bloque = document.createElement("div");
    bloque.className = "bloque-venta-deuda bloque-deuda-inicial";
    bloque.innerHTML = `
      <div class="encabezado-venta-deuda">
        <div class="info-venta-deuda">
          <strong>Deuda inicial</strong>
          <span>Deuda registrada al ingresar el cliente al sistema</span>
        </div>
        <div class="resumen-venta-deuda">
          <div class="saldo-venta"><small>Saldo pendiente</small><strong>${formatearPrecioCliente(deudaInicialPendienteCliente)}</strong></div>
        </div>
      </div>
      <div class="cabecera-productos-deuda">
        <div></div><div>Producto</div><div>Talle</div><div>Precio unit.</div>
        <div>Deuda actual</div><div>Monto a pagar</div><div>Saldo luego del pago</div>
      </div>
    `;

    detalleDeudaInicial.productos
      .filter((producto) => producto.saldoPendiente > 0)
      .forEach((producto) => {
        const fila = document.createElement("div");
        fila.className = "fila-producto-deuda deuda-inicial-fila";
        fila.dataset.tipoDeuda = "inicial";
        fila.innerHTML = `
          <div><input type="checkbox" class="checkbox-producto-deuda-inicial"
            data-deuda-producto-id="${escaparHTMLCliente(producto.id)}"
            aria-label="Seleccionar deuda de ${escaparHTMLCliente(producto.nombre)}"></div>
          <div class="producto-deuda-nombre"><strong>${escaparHTMLCliente(producto.nombre)}</strong></div>
          <div>${producto.talle ? escaparHTMLCliente(producto.talle) : "—"}</div>
          <div>${formatearPrecioCliente(producto.precioProducto)}</div>
          <div class="saldo-producto-deuda">${formatearPrecioCliente(producto.saldoPendiente)}</div>
          <div><input class="input-monto-producto" type="number" min="0" max="${producto.saldoPendiente}" step="1" value="0" aria-label="Monto a pagar de ${escaparHTMLCliente(producto.nombre)}"></div>
          <div class="saldo-despues-producto">${formatearPrecioCliente(producto.saldoPendiente)}</div>
        `;
        const checkbox = fila.querySelector(".checkbox-producto-deuda-inicial");
        const input = fila.querySelector(".input-monto-producto");
        checkbox.addEventListener("change", () => {
          input.value = checkbox.checked
            ? String(producto.saldoPendiente)
            : "0";
          actualizarResumenPagoCliente(true);
        });
        input.addEventListener("input", () => {
          let valor = Math.max(
            0,
            Math.min(producto.saldoPendiente, Number(input.value) || 0),
          );
          input.value = String(Math.round(valor));
          if (valor > 0) checkbox.checked = true;
          if (!checkbox.checked) input.value = "0";
          fila.querySelector(".saldo-despues-producto").textContent =
            formatearPrecioCliente(
              producto.saldoPendiente - (Number(input.value) || 0),
            );
          actualizarResumenPagoCliente(false);
        });
        bloque.appendChild(fila);
      });

    const saldoNoDesglosado =
      detalleDeudaInicial.deudaAgregada + detalleDeudaInicial.intereses;
    if (saldoNoDesglosado > 0) {
      const nombreFila =
        detalleDeudaInicial.deudaAgregada > 0
          ? "Deuda anterior al sistema"
          : "Intereses de deuda inicial";
      const fila = document.createElement("div");
      fila.className = "fila-producto-deuda deuda-inicial-fila";
      fila.dataset.tipoDeuda = "inicial-global";
      fila.innerHTML = `
        <div><input type="checkbox" class="checkbox-deuda-inicial" aria-label="Seleccionar ${nombreFila}"></div>
        <div class="producto-deuda-nombre"><strong>${nombreFila}</strong></div>
        <div>—</div><div>—</div>
        <div class="saldo-producto-deuda">${formatearPrecioCliente(saldoNoDesglosado)}</div>
        <div><input class="input-monto-producto" type="number" min="0" max="${saldoNoDesglosado}" step="1" value="0" aria-label="Monto a pagar de deuda sin detalle"></div>
        <div class="saldo-despues-producto">${formatearPrecioCliente(saldoNoDesglosado)}</div>
      `;
      const checkbox = fila.querySelector(".checkbox-deuda-inicial");
      const input = fila.querySelector(".input-monto-producto");
      checkbox.addEventListener("change", () => {
        input.value = checkbox.checked ? String(saldoNoDesglosado) : "0";
        actualizarResumenPagoCliente(true);
      });
      input.addEventListener("input", () => {
        input.value = String(
          Math.round(
            Math.max(0, Math.min(saldoNoDesglosado, Number(input.value) || 0)),
          ),
        );
        if (Number(input.value) > 0) checkbox.checked = true;
        if (!checkbox.checked) input.value = "0";
        fila.querySelector(".saldo-despues-producto").textContent =
          formatearPrecioCliente(
            saldoNoDesglosado - (Number(input.value) || 0),
          );
        actualizarResumenPagoCliente(false);
      });
      bloque.appendChild(fila);
    }
    contenedor.appendChild(bloque);
  }

  if (
    productosPendientesCliente.length === 0 &&
    deudaInicialPendienteCliente <= 0
  ) {
    contenedor.innerHTML = `<div class="sin-productos-deuda">Este cliente no tiene productos pendientes.</div>`;
    return;
  }

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

  Object.values(ventasAgrupadas).forEach((venta) => {
    const bloque = document.createElement("div");
    bloque.className = "bloque-venta-deuda";
    const encabezado = document.createElement("div");
    encabezado.className = "encabezado-venta-deuda";
    encabezado.innerHTML = `
      <div class="info-venta-deuda">
        <strong>Venta #${escaparHTMLCliente(String(venta.numeroVenta))}</strong>
        <span>${formatearFechaCortaCliente(obtenerFechaCliente(venta.fecha))}</span>
      </div>
      <div class="resumen-venta-deuda">
        <div><small>Total venta</small><span>${formatearPrecioCliente(venta.totalVenta)}</span></div>
        <div class="saldo-venta"><small>Saldo de venta</small><strong>${formatearPrecioCliente(venta.saldoVenta)}</strong></div>
      </div>
    `;
    bloque.appendChild(encabezado);

    const cabecera = document.createElement("div");
    cabecera.className = "cabecera-productos-deuda";
    cabecera.innerHTML = `
      <div></div><div>Producto</div><div>Talle</div><div>Precio unit.</div>
      <div>Deuda actual</div><div>Monto a pagar</div><div>Saldo luego del pago</div>
    `;
    bloque.appendChild(cabecera);

    venta.productos.forEach((producto) => {
      const fila = document.createElement("div");
      fila.className = "fila-producto-deuda";
      fila.dataset.tipoDeuda = "venta";
      fila.innerHTML = `
        <div><input type="checkbox" class="checkbox-producto-deuda"
          data-producto-id="${escaparHTMLCliente(producto.id)}"
          data-venta-id="${escaparHTMLCliente(producto.ventaId)}"
          aria-label="Seleccionar ${escaparHTMLCliente(producto.nombre)}"></div>
        <div class="producto-deuda-nombre"><strong>${escaparHTMLCliente(producto.nombre)}</strong></div>
        <div>${producto.talle ? escaparHTMLCliente(producto.talle) : "—"}</div>
        <div>${formatearPrecioCliente(producto.precioUnitario)}</div>
        <div class="saldo-producto-deuda">${formatearPrecioCliente(producto.saldoProducto)}</div>
        <div><input class="input-monto-producto" type="number" min="0" max="${producto.saldoProducto}" step="1" value="0" aria-label="Monto a pagar de ${escaparHTMLCliente(producto.nombre)}"></div>
        <div class="saldo-despues-producto">${formatearPrecioCliente(producto.saldoProducto)}</div>
      `;
      const checkbox = fila.querySelector(".checkbox-producto-deuda");
      const input = fila.querySelector(".input-monto-producto");
      checkbox.addEventListener("change", () => {
        input.value = checkbox.checked ? String(producto.saldoProducto) : "0";
        actualizarResumenPagoCliente(true);
      });
      input.addEventListener("input", () => {
        input.value = String(
          Math.round(
            Math.max(
              0,
              Math.min(producto.saldoProducto, Number(input.value) || 0),
            ),
          ),
        );
        if (Number(input.value) > 0) checkbox.checked = true;
        if (!checkbox.checked) input.value = "0";
        fila.querySelector(".saldo-despues-producto").textContent =
          formatearPrecioCliente(
            producto.saldoProducto - (Number(input.value) || 0),
          );
        actualizarResumenPagoCliente(false);
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
  if (!clienteSeleccionado) return;

  const inputMonto = document.getElementById("monto-pago-cliente");
  const totalVentasSeleccionadas = obtenerTotalProductosSeleccionados();
  const totalInicialSeleccionada = obtenerDeudaInicialSeleccionada();
  const baseOperacion = totalVentasSeleccionadas + totalInicialSeleccionada;
  const interes = obtenerMontoInteresCliente(baseOperacion);
  const totalOperacion = baseOperacion + interes;

  if (inputMonto) inputMonto.value = String(Math.round(baseOperacion));

  const totalEntregado = baseOperacion;
  const vuelto = 0;
  const saldo = Math.max(
    0,
    obtenerDeudaCliente(clienteSeleccionado) - baseOperacion + interes,
  );

  const totalElemento = document.getElementById("total-seleccionado-cliente");
  if (totalElemento)
    totalElemento.textContent = formatearPrecioCliente(totalOperacion);

  const entregadoElemento = document.getElementById("total-entregado-cliente");
  if (entregadoElemento)
    entregadoElemento.textContent = formatearPrecioCliente(totalEntregado);

  const vueltoElemento = document.getElementById("vuelto-cliente");
  if (vueltoElemento)
    vueltoElemento.textContent = formatearPrecioCliente(vuelto);

  const saldoElemento = document.getElementById("saldo-deber-cliente");
  if (saldoElemento) saldoElemento.textContent = formatearPrecioCliente(saldo);

  const boton = document.getElementById("boton-registrar-pago");
  if (boton) boton.disabled = baseOperacion <= 0 && interes <= 0;
}

/* ========================================
   PRODUCTOS / VENTAS SELECCIONADAS
======================================== */

function obtenerDeudaInicialSeleccionada() {
  return [
    ...document.querySelectorAll(
      ".checkbox-producto-deuda-inicial:checked, .checkbox-deuda-inicial:checked",
    ),
  ].reduce((total, checkbox) => {
    const fila = checkbox.closest(".fila-producto-deuda");
    return (
      total +
      Math.max(
        0,
        Number(fila?.querySelector(".input-monto-producto")?.value) || 0,
      )
    );
  }, 0);
}

function obtenerProductosDeudaInicialSeleccionados() {
  if (!clienteSeleccionado) return [];
  const detalle = obtenerDetalleDeudasInicialesCliente(
    movimientosClientes[clienteSeleccionado.id] || [],
  );
  const seleccionados = new Map(
    [
      ...document.querySelectorAll(".checkbox-producto-deuda-inicial:checked"),
    ].map((checkbox) => {
      const fila = checkbox.closest(".fila-producto-deuda");
      return [
        checkbox.dataset.deudaProductoId,
        Math.max(
          0,
          Number(fila?.querySelector(".input-monto-producto")?.value) || 0,
        ),
      ];
    }),
  );
  return detalle.productos
    .filter(
      (producto) =>
        seleccionados.has(producto.id) && seleccionados.get(producto.id) > 0,
    )
    .map((producto) => ({
      ...producto,
      montoAPagar: seleccionados.get(producto.id),
    }));
}

function obtenerTotalProductosSeleccionados() {
  return [
    ...document.querySelectorAll(".checkbox-producto-deuda:checked"),
  ].reduce((total, checkbox) => {
    const fila = checkbox.closest(".fila-producto-deuda");
    return (
      total +
      Math.max(
        0,
        Number(fila?.querySelector(".input-monto-producto")?.value) || 0,
      )
    );
  }, 0);
}

function obtenerSeleccionGlobalDeudaInicial() {
  const checkbox = document.querySelector(".checkbox-deuda-inicial:checked");
  if (!checkbox) return null;
  const fila = checkbox.closest(".fila-producto-deuda");
  return {
    monto: Math.max(
      0,
      Number(fila?.querySelector(".input-monto-producto")?.value) || 0,
    ),
    saldo: Math.max(
      0,
      Number(
        fila
          ?.querySelector(".saldo-producto-deuda")
          ?.textContent?.replace(/[^\d]/g, ""),
      ) || 0,
    ),
  };
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
  const base =
    obtenerTotalProductosSeleccionados() + obtenerDeudaInicialSeleccionada();

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
    base =
      obtenerTotalProductosSeleccionados() + obtenerDeudaInicialSeleccionada();
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
  if (!clienteSeleccionado) return;

  const seleccionVentas = [
    ...document.querySelectorAll(".checkbox-producto-deuda:checked"),
  ]
    .map((checkbox) => {
      const fila = checkbox.closest(".fila-producto-deuda");
      const producto = productosPendientesCliente.find(
        (item) => item.id === checkbox.dataset.productoId,
      );
      return producto
        ? {
            tipo: "venta",
            producto,
            monto: Math.max(
              0,
              Math.round(
                Number(fila?.querySelector(".input-monto-producto")?.value) ||
                  0,
              ),
            ),
          }
        : null;
    })
    .filter((item) => item && item.monto > 0);

  const seleccionInicial = obtenerProductosDeudaInicialSeleccionados().map(
    (producto) => ({
      tipo: "deuda_inicial_producto",
      producto,
      monto: producto.montoAPagar,
    }),
  );

  const checkboxGlobal = document.querySelector(
    ".checkbox-deuda-inicial:checked",
  );
  let seleccionInicialGlobal = null;
  if (checkboxGlobal) {
    const fila = checkboxGlobal.closest(".fila-producto-deuda");
    const monto = Math.max(
      0,
      Math.round(
        Number(fila?.querySelector(".input-monto-producto")?.value) || 0,
      ),
    );
    if (monto > 0)
      seleccionInicialGlobal = { tipo: "deuda_inicial_global", monto };
  }

  const selecciones = [...seleccionVentas, ...seleccionInicial];
  if (seleccionInicialGlobal) selecciones.push(seleccionInicialGlobal);

  const totalAplicar = selecciones.reduce(
    (total, item) => total + item.monto,
    0,
  );
  if (totalAplicar <= 0) {
    alert("Seleccioná al menos un producto e indicá cuánto querés pagar.");
    return;
  }

  const medioPago =
    document.getElementById("medio-pago-cliente")?.value || "efectivo";
  const fechaPagoInput =
    document.getElementById("fecha-pago-cliente")?.value || "";
  const fechaPago = fechaPagoInput
    ? new Date(`${fechaPagoInput}T12:00:00`)
    : new Date();
  const usuario =
    sessionStorage.getItem("usuarioOperativo") ||
    sessionStorage.getItem("usuarioActivo") ||
    "desconocido";

  const interes = obtenerMontoInteresCliente(totalAplicar);
  const deudaCliente = obtenerDeudaCliente(clienteSeleccionado);
  if (totalAplicar > deudaCliente) {
    alert("El monto seleccionado supera la deuda total actual del cliente.");
    return;
  }

  const botonRegistrar = document.getElementById("boton-registrar-pago");
  if (!botonRegistrar || botonRegistrar.disabled) return;
  botonRegistrar.disabled = true;
  botonRegistrar.textContent = "Registrando...";

  try {
    const { doc, writeBatch, addDoc, collection, serverTimestamp, Timestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const batch = writeBatch(window.db);
    const ventasCliente = obtenerVentasCliente(clienteSeleccionado);
    const movimientos = movimientosClientes[clienteSeleccionado.id] || [];
    const ventasAfectadas = new Map();
    const aplicaciones = [];
    const actualizacionesIniciales = new Map();
    let totalAplicadoVentas = 0;
    let totalAplicadoInicial = 0;

    for (const seleccion of selecciones) {
      if (seleccion.tipo === "venta") {
        const producto = seleccion.producto;
        const venta = ventasCliente.find(
          (item) => item.id === producto.ventaId,
        );
        if (!venta) continue;

        const saldoActualProducto = Math.max(
          0,
          Number(producto.saldoProducto) || 0,
        );
        const monto = Math.min(seleccion.monto, saldoActualProducto);
        if (monto <= 0) continue;

        let estadoVenta = ventasAfectadas.get(venta.id);
        if (!estadoVenta) {
          const distribucion = obtenerDistribucionProductosVenta(venta);
          estadoVenta = {
            venta,
            montos: [...distribucion.montos],
            restanteSinAsignar: distribucion.restante,
            montoAplicado: 0,
          };
          ventasAfectadas.set(venta.id, estadoVenta);
        }

        if (producto.productoIndice >= 0) {
          estadoVenta.montos[producto.productoIndice] = Math.max(
            0,
            (Number(estadoVenta.montos[producto.productoIndice]) || 0) - monto,
          );
        } else {
          estadoVenta.restanteSinAsignar = Math.max(
            0,
            estadoVenta.restanteSinAsignar - monto,
          );
        }
        estadoVenta.montoAplicado += monto;
        totalAplicadoVentas += monto;
        aplicaciones.push({
          ventaId: venta.id,
          numero: venta.numero || venta.id,
          productoIndice: producto.productoIndice,
          productoId: producto.productoId || "",
          nombreProducto: producto.nombre,
          monto,
        });
      } else if (seleccion.tipo === "deuda_inicial_producto") {
        const producto = seleccion.producto;
        const monto = Math.min(
          seleccion.monto,
          Math.max(0, Number(producto.saldoPendiente) || 0),
        );
        if (monto <= 0) continue;

        const movimiento = movimientos.find(
          (item) => item.id === producto.movimientoId,
        );
        if (!movimiento) continue;
        const lista =
          actualizacionesIniciales.get(producto.movimientoId) ||
          (Array.isArray(movimiento.productosAdeudados)
            ? movimiento.productosAdeudados.map((p) => ({ ...p }))
            : []);
        const indice = Number(producto.indiceProducto);
        if (!lista[indice]) continue;

        const saldoActual = Math.max(0, Number(producto.saldoPendiente) || 0);
        const aplicado = Math.min(monto, saldoActual);
        lista[indice].montoDistribuido = saldoActual;
        lista[indice].saldoPendiente = Math.max(0, saldoActual - aplicado);
        lista[indice].saldoIndividualActualizado = true;
        actualizacionesIniciales.set(producto.movimientoId, lista);
        totalAplicadoInicial += aplicado;
        aplicaciones.push({
          tipo: "deuda_inicial",
          origen: "deuda_inicial",
          deudaProductoId: producto.id,
          movimientoId: producto.movimientoId,
          productoId: producto.productoId || "",
          nombreProducto: producto.nombre,
          monto: aplicado,
          descripcion: `Pago aplicado a ${producto.nombre}`,
        });
      } else if (seleccion.tipo === "deuda_inicial_global") {
        const detalle = obtenerDetalleDeudasInicialesCliente(movimientos);
        const monto = Math.min(
          seleccion.monto,
          detalle.deudaAgregada + detalle.intereses,
        );
        if (monto <= 0) continue;
        totalAplicadoInicial += monto;
        aplicaciones.push({
          tipo: "deuda_inicial",
          origen: "deuda_inicial",
          monto,
          descripcion: "Pago aplicado a deuda inicial sin detalle por producto",
        });
      }
    }

    if (totalAplicadoVentas + totalAplicadoInicial <= 0) {
      alert("No se pudo determinar a qué saldo aplicar el pago.");
      return;
    }

    // Si el recargo corresponde a ventas, se agrega al saldo de la primera
    // venta afectada y a su distribución para que no desaparezca al recargar.
    if (interes > 0 && totalAplicadoVentas > 0) {
      const primera = ventasAfectadas.values().next().value;
      if (primera) {
        if (primera.montos.length > 0) {
          primera.montos[0] =
            Math.max(0, Number(primera.montos[0]) || 0) + interes;
        } else {
          primera.restanteSinAsignar += interes;
        }
        primera.interesAgregado = interes;
      }
    }

    for (const [ventaId, estado] of ventasAfectadas) {
      const venta = estado.venta;
      const saldoAnterior = Math.max(0, Number(venta.saldoAdeber) || 0);
      const nuevoSaldo = Math.max(
        0,
        saldoAnterior -
          estado.montoAplicado +
          (Number(estado.interesAgregado) || 0),
      );
      const distribucionDeudaProductos = (
        Array.isArray(venta.productos) ? venta.productos : []
      ).map((producto, indice) => ({
        productoIndice: indice,
        productoId: producto.productoId || producto.id || "",
        nombre: producto.nombre || "Producto",
        talle: producto.talle || "",
        subtotal:
          Number(producto.subtotal) ||
          (Number(producto.precioUnitario) || 0) *
            (Number(producto.cantidad) || 1),
        saldoPendiente: Math.max(0, Number(estado.montos[indice]) || 0),
      }));

      batch.update(doc(window.db, "ventas", ventaId), {
        saldoAdeber: nuevoSaldo,
        totalEntregado:
          (Number(venta.totalEntregado) || 0) + estado.montoAplicado,
        estado: nuevoSaldo <= 0 ? "pagada" : "con_deuda",
        distribucionDeudaProductos,
        distribucionDeudaSinAsignar: Math.max(0, estado.restanteSinAsignar),
        actualizadoEn: serverTimestamp(),
      });
    }

    for (const [movimientoId, productosAdeudados] of actualizacionesIniciales) {
      batch.update(
        doc(
          window.db,
          "clientes",
          clienteSeleccionado.id,
          "movimientos",
          movimientoId,
        ),
        { productosAdeudados, actualizadoEn: serverTimestamp() },
      );
    }

    const totalAplicadoDeuda = totalAplicadoVentas + totalAplicadoInicial;
    const nuevaDeuda = Math.max(0, deudaCliente - totalAplicadoDeuda + interes);
    batch.update(doc(window.db, "clientes", clienteSeleccionado.id), {
      deudaTotal: nuevaDeuda,
      actualizadoEn: serverTimestamp(),
      ultimoMovimiento: serverTimestamp(),
    });

    const movimientoRef = doc(
      collection(window.db, "clientes", clienteSeleccionado.id, "movimientos"),
    );
    batch.set(movimientoRef, {
      tipo: "pago",
      monto: totalAplicadoDeuda,
      montoAplicado: totalAplicadoDeuda,
      medioPago,
      fecha: Timestamp.fromDate(fechaPago),
      usuario,
      descripcion: "Pago de deuda por producto",
      aplicaciones,
      creadoEn: serverTimestamp(),
    });

    if (interes > 0) {
      const tipoInteres =
        document.getElementById("tipo-interes-cliente")?.value || "porcentaje";
      const valorInteres = convertirNumeroCliente(
        document.getElementById("valor-interes-cliente")?.value,
      );
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
        tipoInteres,
        valor: valorInteres,
        origen:
          totalAplicadoInicial > 0 && totalAplicadoVentas === 0
            ? "deuda_inicial"
            : "venta",
        fecha: Timestamp.fromDate(fechaPago),
        usuario,
        descripcion: "Recargo de interés",
        creadoEn: serverTimestamp(),
      });
    }

    await batch.commit();
    alert("Pago registrado correctamente.");

    const valorInteres = document.getElementById("valor-interes-cliente");
    const camposInteres = document.getElementById("campos-interes");
    const botonInteres = document.getElementById("activar-interes-cliente");
    if (valorInteres) valorInteres.value = "";
    if (camposInteres) camposInteres.setAttribute("hidden", "");
    if (botonInteres) botonInteres.textContent = "+ Agregar interés";

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
    actualizarResumenPagoCliente();
  } catch (error) {
    console.error("Error registrando pago:", error);
    alert(
      "No se pudo registrar el pago. Revisá la consola para ver el detalle.",
    );
  } finally {
    const boton = document.getElementById("boton-registrar-pago");
    if (boton) {
      boton.disabled = false;
      boton.textContent = "✓ Registrar pago";
    }
  }
}

async function abrirModalRedistribucionCliente() {
  if (!clienteSeleccionado) return;

  try {
    await cargarScriptRedistribuirDeuda();
    const movimientos = movimientosClientes[clienteSeleccionado.id] || [];
    const detalleInicial = obtenerDetalleDeudasInicialesCliente(movimientos);
    const items = [];

    productosPendientesCliente.forEach((producto) => {
      const venta = ventasClientes.find((item) => item.id === producto.ventaId);
      const original = venta?.productos?.[producto.productoIndice] || {};
      items.push({
        id: producto.id,
        origen: "venta",
        ventaId: producto.ventaId,
        productoIndice: producto.productoIndice,
        productoId: producto.productoId,
        nombre: producto.nombre,
        talle: producto.talle,
        montoActual: producto.saldoProducto,
        maximo: producto.saldoSinAsignar
          ? producto.saldoProducto
          : Math.max(producto.saldoProducto, Number(producto.subtotal) || 0),
        imagenUrl:
          original.imagen || original.imagenUrl || original.imageUrl || "",
      });
    });

    detalleInicial.productos.forEach((producto) => {
      items.push({
        id: producto.id,
        origen: "deuda_inicial_producto",
        movimientoId: producto.movimientoId,
        indiceProducto: producto.indiceProducto,
        productoId: producto.productoId,
        nombre: producto.nombre,
        talle: producto.talle,
        montoActual: producto.saldoPendiente,
        maximo: Math.max(
          producto.saldoPendiente,
          Number(producto.precioProducto) || 0,
        ),
        imagenUrl: "",
      });
    });

    const saldoInicialSinDetalle =
      detalleInicial.deudaAgregada + detalleInicial.intereses;
    if (saldoInicialSinDetalle > 0) {
      items.push({
        id: "__deuda_inicial_sin_detalle__",
        origen: "deuda_inicial_global",
        nombre: "Deuda anterior al sistema (sin detalle)",
        talle: "",
        montoActual: saldoInicialSinDetalle,
        maximo: saldoInicialSinDetalle,
        bloqueado: true,
        imagenUrl: "",
      });
    }
    await Promise.all(
      items.map(async (item) => {
        if (!item.imagenUrl && item.productoId) {
          item.imagenUrl = await window.obtenerImagenProducto(item.productoId);
        }
      }),
    );
    const deudaTotal = obtenerDeudaCliente(clienteSeleccionado);
    const sumaItems = items.reduce(
      (total, item) => total + Math.max(0, Number(item.montoActual) || 0),
      0,
    );
    if (!items.length || Math.abs(sumaItems - deudaTotal) > 1) {
      alert(
        "No se puede abrir la redistribución porque el detalle de productos no coincide con la deuda total. Revisá los movimientos del cliente antes de continuar.",
      );
      return;
    }

    window.abrirRedistribucionDeuda(
      {
        cliente: {
          id: clienteSeleccionado.id,
          nombre: clienteSeleccionado.nombre,
          apellido: clienteSeleccionado.apellido,
        },
        deudaTotal,
        productos: items,
      },
      async (resultado) => {
        const { doc, writeBatch, serverTimestamp } =
          await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");
        const batch = writeBatch(window.db);
        const porVenta = new Map();
        const porMovimiento = new Map();

        resultado.productos.forEach((item) => {
          const original = items.find((x) => x.id === item.id);
          if (!original || original.bloqueado) return;

          if (original.origen === "venta") {
            if (!porVenta.has(original.ventaId))
              porVenta.set(original.ventaId, new Map());
            porVenta
              .get(original.ventaId)
              .set(original.productoIndice, item.nuevoMonto);
          } else if (original.origen === "deuda_inicial_producto") {
            if (!porMovimiento.has(original.movimientoId)) {
              const movimiento = movimientos.find(
                (x) => x.id === original.movimientoId,
              );
              porMovimiento.set(
                original.movimientoId,
                (movimiento?.productosAdeudados || []).map((producto) => ({
                  ...producto,
                })),
              );
            }
            const lista = porMovimiento.get(original.movimientoId);
            const p = lista[original.indiceProducto];
            if (p) {
              p.montoDistribuido = item.nuevoMonto;
              p.saldoPendiente = item.nuevoMonto;
              p.saldoIndividualActualizado = true;
            }
          }
        });

        for (const [ventaId, montosPorIndice] of porVenta) {
          const venta = ventasClientes.find((x) => x.id === ventaId);
          if (!venta) continue;
          const productos = Array.isArray(venta.productos)
            ? venta.productos
            : [];
          const distribucionDeudaProductos = productos.map(
            (producto, indice) => ({
              productoIndice: indice,
              productoId: producto.productoId || producto.id || "",
              nombre: producto.nombre || "Producto",
              talle: producto.talle || "",
              subtotal:
                Number(producto.subtotal) ||
                (Number(producto.precioUnitario) || 0) *
                  (Number(producto.cantidad) || 1),
              saldoPendiente: Math.max(
                0,
                Number(
                  montosPorIndice.get(indice) ??
                    obtenerDistribucionProductosVenta(venta).montos[indice],
                ) || 0,
              ),
            }),
          );
          const itemSinAsignar = resultado.productos.find((item) => {
            const original = items.find((x) => x.id === item.id);
            return (
              original?.origen === "venta" &&
              original.ventaId === ventaId &&
              original.productoIndice === -1
            );
          });
          const saldoSinAsignar = itemSinAsignar
            ? Math.max(0, Number(itemSinAsignar.nuevoMonto) || 0)
            : 0;
          const nuevoSaldoVenta =
            distribucionDeudaProductos.reduce(
              (total, producto) => total + producto.saldoPendiente,
              0,
            ) + saldoSinAsignar;

          batch.update(doc(window.db, "ventas", ventaId), {
            saldoAdeber: nuevoSaldoVenta,
            estado: nuevoSaldoVenta <= 0 ? "pagada" : "con_deuda",
            distribucionDeudaProductos,
            distribucionDeudaSinAsignar: saldoSinAsignar,
            actualizadoEn: serverTimestamp(),
          });
        }

        for (const [movimientoId, productosAdeudados] of porMovimiento) {
          batch.update(
            doc(
              window.db,
              "clientes",
              clienteSeleccionado.id,
              "movimientos",
              movimientoId,
            ),
            { productosAdeudados, actualizadoEn: serverTimestamp() },
          );
        }

        await batch.commit();
        await cargarClientes();
        const clienteActual = clientes.find(
          (x) => x.id === clienteSeleccionado.id,
        );
        if (clienteActual) {
          clienteSeleccionado = clienteActual;
          cargarDatosClienteDetalle(clienteActual);
        }
        renderizarClientes();
        actualizarEstadisticasClientes();
        await cargarProductosPendientesCliente(clienteSeleccionado);
        renderizarProductosPendientes();
        actualizarResumenPagoCliente();
      },
    );
  } catch (error) {
    console.error("No se pudo abrir o guardar la redistribución:", error);
    alert("No se pudo abrir la redistribución de deuda. Revisá la consola.");
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
        Number(
          producto.montoDistribuido ??
            producto.montoAdeudado ??
            producto.saldoPendiente,
        ) || 0;

      productos.push({
        id: producto.id || `${movimiento.id}_${indice}`,
        movimientoId: movimiento.id,
        indiceProducto: indice,
        productoId: producto.productoId || "",
        tipoProducto: producto.tipoProducto || "inventario",
        identificadorEspecial: producto.identificadorEspecial || "",
        nombre: producto.nombre || "Producto sin nombre",
        talle: producto.talle || "",
        fecha: movimiento.fecha || movimiento.creadoEn,
        precioProducto: Number(producto.precioProducto) || 0,
        montoAdeudado,
        saldoPendiente: producto.saldoIndividualActualizado
          ? Math.max(0, Number(producto.saldoPendiente) || 0)
          : montoAdeudado,
        saldoIndividualActualizado: Boolean(
          producto.saldoIndividualActualizado,
        ),
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
    (movimiento) => normalizarTipoMovimientoCliente(movimiento.tipo) === "pago",
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

      if (producto && !producto.saldoIndividualActualizado) {
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
          (subtotal, aplicacion) => subtotal + (Number(aplicacion.monto) || 0),
          0,
        )
    );
  }, 0);

  let deudaAgregada = deudaAgregadaOriginal;
  let intereses = interesesOriginales;
  let pagoGlobalRestante = pagosGlobales;

  const aplicadoADeudaAgregada = Math.min(deudaAgregada, pagoGlobalRestante);
  deudaAgregada -= aplicadoADeudaAgregada;
  pagoGlobalRestante -= aplicadoADeudaAgregada;

  // Si un pago viejo se hizo cuando la deuda tenía productos pero no guardaba
  // el identificador de cada uno, se distribuye por antigüedad.
  for (const producto of productos) {
    if (pagoGlobalRestante <= 0) break;
    // Si la distribución individual ya quedó persistida, su saldo es la fuente
    // de verdad e incluye los pagos anteriores; no volver a descontarlos.
    if (producto.saldoIndividualActualizado) continue;

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
    total: totalProductos + Math.max(0, deudaAgregada) + Math.max(0, intereses),
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
            "El script se cargó, pero no inicializó abrirModalRegistrarCliente.",
          ),
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
  const modalRegistrar = document.getElementById("modal-registrar-cliente");

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
