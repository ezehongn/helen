// ========================================
// INICIO
// ========================================

let ventasInicio = [];
let productosInicio = [];
let gastosInicio = [];
let pagosDeudasInicio = [];
let pagosAplicadosPorVentaInicio = new Map();
let ventasInicioCargadas = false;
let productosInicioCargados = false;

let cancelarEscuchaVentasInicio = null;
let cancelarEscuchaProductosInicio = null;
let cancelarEscuchaGastosInicio = null;
let cancelarEscuchaPagosInicio = null;

let mesSeleccionadoInicio = new Date();

// ========================================
// LIMPIAR INICIO ANTERIOR
// ========================================

if (window.limpiarInicio) {
  window.limpiarInicio();
}

// ========================================
// CARGAR CSS
// ========================================

function cargarCSSInicio() {
  if (document.getElementById("css-inicio")) return;

  const link = document.createElement("link");
  link.id = "css-inicio";
  link.rel = "stylesheet";
  link.href = "css/inicio/inicio.css";

  document.head.appendChild(link);
}

// ========================================
// INICIALIZAR
// ========================================

async function inicializarInicio() {
  cargarCSSInicio();
  configurarEventosInicio();
  crearSelectorMesesInicio();
  actualizarTextoPeriodoInicio();

  await iniciarEscuchasInicio();

  renderizarInicio();
}

// ========================================
// ESCUCHAS FIRESTORE
// ========================================

async function iniciarEscuchasInicio() {
  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (!usuarioOperativo) {
    console.warn("No hay usuario operativo seleccionado.");
    return;
  }

  const { collection, collectionGroup, query, where, onSnapshot } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

  if (cancelarEscuchaVentasInicio) {
    cancelarEscuchaVentasInicio();
    cancelarEscuchaVentasInicio = null;
  }

  if (cancelarEscuchaProductosInicio) {
    cancelarEscuchaProductosInicio();
    cancelarEscuchaProductosInicio = null;
  }

  if (cancelarEscuchaGastosInicio) {
    cancelarEscuchaGastosInicio();
    cancelarEscuchaGastosInicio = null;
  }

  if (cancelarEscuchaPagosInicio) {
    cancelarEscuchaPagosInicio();
    cancelarEscuchaPagosInicio = null;
  }

  ventasInicioCargadas = false;
  productosInicioCargados = false;

  // ========================================
  // VENTAS
  // ========================================

  try {
    const referenciaVentas = collection(window.db, "ventas");
    const ahora = new Date();

    const fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 12, 1);

    const fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);

    const consultaVentas = query(
      referenciaVentas,
      where("usuario", "==", usuarioOperativo),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<", fechaFin),
    );

    cancelarEscuchaVentasInicio = onSnapshot(
      consultaVentas,
      (snapshot) => {
        ventasInicio = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));
        ventasInicioCargadas = true;
        renderizarInicio();
      },
      (error) => {
        console.error("Error escuchando ventas en Inicio:", error);

        ventasInicio = [];
        renderizarInicio();
      },
    );
  } catch (error) {
    console.error("Error configurando ventas de Inicio:", error);
  }

  // ========================================
  // PRODUCTOS
  // ========================================

  try {
    const referenciaProductos = collection(window.db, "productos");
    const consultaProductos = query(referenciaProductos);

    cancelarEscuchaProductosInicio = onSnapshot(
      consultaProductos,
      (snapshot) => {
        productosInicio = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));
        productosInicioCargados = true;
        renderizarInicio();
      },
      (error) => {
        console.error("Error escuchando productos en Inicio:", error);

        productosInicio = [];
        renderizarInicio();
      },
    );
  } catch (error) {
    console.error("Error configurando productos de Inicio:", error);
  }

  // ========================================
  // GASTOS
  // ========================================

  try {
    const referenciaGastos = collection(window.db, "gastos");

    const ahora = new Date();

    const fechaInicioGastos = new Date(
      ahora.getFullYear(),
      ahora.getMonth() - 12,
      1,
    );

    const fechaFinGastos = new Date(
      ahora.getFullYear(),
      ahora.getMonth() + 1,
      1,
    );

    const formatearFechaConsulta = (fecha) => {
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");
      const dia = String(fecha.getDate()).padStart(2, "0");

      return `${año}-${mes}-${dia}`;
    };

    const consultaGastos = query(
      referenciaGastos,
      where("usuario", "==", usuarioOperativo),
      where("fecha", ">=", formatearFechaConsulta(fechaInicioGastos)),
      where("fecha", "<", formatearFechaConsulta(fechaFinGastos)),
    );

    cancelarEscuchaGastosInicio = onSnapshot(
      consultaGastos,
      (snapshot) => {
        gastosInicio = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        renderizarInicio();
      },
      (error) => {
        console.error("Error escuchando gastos en Inicio:", error);

        gastosInicio = [];
        renderizarInicio();
      },
    );
  } catch (error) {
    console.error("Error configurando gastos de Inicio:", error);
  }

  // ========================================
  // PAGOS DE DEUDAS
  // ========================================

  try {
    const referenciaPagos = collectionGroup(window.db, "movimientos");

    const consultaPagos = query(
      referenciaPagos,
      where("tipo", "==", "pago"),
      where("usuario", "==", usuarioOperativo),
    );

    cancelarEscuchaPagosInicio = onSnapshot(
      consultaPagos,
      (snapshot) => {
        pagosDeudasInicio = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        pagosAplicadosPorVentaInicio = new Map();

        pagosDeudasInicio.forEach((pago) => {
          const aplicaciones = Array.isArray(pago.aplicaciones)
            ? pago.aplicaciones
            : [];

          aplicaciones.forEach((aplicacion) => {
            if (aplicacion.ventaId == null) return;

            const ventaId = String(aplicacion.ventaId);
            const monto = Number(aplicacion.monto || 0);

            pagosAplicadosPorVentaInicio.set(
              ventaId,
              (pagosAplicadosPorVentaInicio.get(ventaId) || 0) + monto,
            );
          });
        });

        window.pagosDeudasInicio = pagosDeudasInicio;

        renderizarInicio();
      },
      (error) => {
        console.error("Error escuchando pagos de deudas en Inicio:", error);

        pagosDeudasInicio = [];
        renderizarInicio();
      },
    );
  } catch (error) {
    console.error("Error configurando pagos de deudas de Inicio:", error);

    pagosDeudasInicio = [];
  }
}

// ========================================
// EVENTOS
// ========================================

function configurarEventosInicio() {
  // Cambio de usuario operativo.

  window.manejadorUsuarioInicio = async () => {
    await iniciarEscuchasInicio();
    renderizarInicio();
  };

  window.addEventListener(
    "usuarioOperativoCambiado",
    window.manejadorUsuarioInicio,
  );

  // Ver todas las ventas.

  const botonTodasVentas = document.getElementById("ver-todas-ventas-inicio");

  if (botonTodasVentas) {
    botonTodasVentas.addEventListener("click", async () => {
      await window.cargarPantalla(
        "html/ventas/ventas.html",
        "js/ventas/ventas.js",
      );

      window.actualizarPantallaActiva("html/ventas/ventas.html");
    });
  }

  // Selector de período.

  const botonPeriodo = document.getElementById("periodo-actual-inicio");

  const menuPeriodo = document.getElementById("menu-periodo-inicio");

  if (botonPeriodo && menuPeriodo) {
    botonPeriodo.addEventListener("click", (evento) => {
      evento.stopPropagation();
      menuPeriodo.hidden = !menuPeriodo.hidden;
    });

    document.addEventListener("click", (evento) => {
      if (!evento.target.closest(".selector-periodo-inicio")) {
        menuPeriodo.hidden = true;
      }
    });
  }
}

// ========================================
// SELECTOR DE MESES
// ========================================

function crearSelectorMesesInicio() {
  const menu = document.getElementById("menu-periodo-inicio");

  if (!menu) return;

  menu.innerHTML = "";

  const ahora = new Date();

  for (let i = 0; i < 12; i++) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);

    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = "opcion-periodo-inicio";
    boton.textContent = obtenerNombreMesInicio(fecha);

    const seleccionado =
      fecha.getMonth() === mesSeleccionadoInicio.getMonth() &&
      fecha.getFullYear() === mesSeleccionadoInicio.getFullYear();

    if (seleccionado) {
      boton.classList.add("activo");
    }

    boton.addEventListener("click", () => {
      mesSeleccionadoInicio = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        1,
      );

      menu.hidden = true;

      actualizarTextoPeriodoInicio();
      crearSelectorMesesInicio();
      renderizarInicio();
    });

    menu.appendChild(boton);
  }
}

// ========================================
// NOMBRE DEL MES
// ========================================

function obtenerNombreMesInicio(fecha) {
  const texto = fecha.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ========================================
// TEXTO DEL PERÍODO
// ========================================

function actualizarTextoPeriodoInicio() {
  const elemento = document.getElementById("periodo-actual-inicio");

  if (!elemento) return;

  const ahora = new Date();

  const esMesActual =
    mesSeleccionadoInicio.getMonth() === ahora.getMonth() &&
    mesSeleccionadoInicio.getFullYear() === ahora.getFullYear();

  elemento.innerHTML = `
        ${
          esMesActual
            ? "Este mes"
            : obtenerNombreMesInicio(mesSeleccionadoInicio)
        }
        <span>▾</span>
    `;
}

// ========================================
// RENDERIZAR INICIO
// ========================================

function renderizarInicio() {
  renderizarResumenesInicio();
  renderizarVentasSemana();
  renderizarUltimasVentas();
  renderizarCostosReposicionInicio();
}

// ========================================
// OBTENER VENTAS DEL MES SELECCIONADO
// ========================================

function obtenerVentasMesSeleccionado() {
  return ventasInicio.filter((venta) =>
    perteneceAlMesInicio(venta.fecha, mesSeleccionadoInicio),
  );
}

// ========================================
// OBTENER GASTOS DEL MES SELECCIONADO
// ========================================

function obtenerGastosMesSeleccionado() {
  return gastosInicio.filter((gasto) =>
    perteneceAlMesInicio(gasto.fecha, mesSeleccionadoInicio),
  );
}

// ========================================
// OBTENER PAGOS DE DEUDAS DEL MES
// ========================================

function obtenerPagosDeudasMesSeleccionado() {
  return obtenerPagosDeudasMesInicio(mesSeleccionadoInicio);
}

function obtenerPagosDeudasMesInicio(mes) {
  return pagosDeudasInicio.filter((pago) =>
    perteneceAlMesInicio(pago.fecha, mes),
  );
}

// ========================================
// CALCULAR DINERO INGRESADO POR VENTAS
// ========================================

function obtenerDineroIngresadoVentasInicio(ventas) {
  return ventas.reduce((total, venta) => {
    // totalEntregado es lo cobrado al momento de vender.
    // En ventas antiguas puede faltar: recurrimos a mediosPago o importe.
    let cobrado = Number(venta.totalEntregado);

    if (!Number.isFinite(cobrado)) {
      if (Array.isArray(venta.mediosPago) && venta.mediosPago.length > 0) {
        cobrado = venta.mediosPago.reduce(
          (suma, medio) => suma + Number(medio.importe || 0),
          0,
        );
      } else {
        cobrado = Number(venta.importe ?? venta.total ?? 0);
      }
    }

    return total + Math.max(0, cobrado - Number(venta.vuelto || 0));
  }, 0);
}

// ========================================
// CALCULAR DINERO INGRESADO POR PAGOS DE DEUDAS
// ========================================

function obtenerDineroIngresadoPagosInicio(pagos) {
  return pagos.reduce((total, pago) => {
    return total + Number(pago.monto || 0);
  }, 0);
}

// ========================================
// ESTADÍSTICAS Y RESÚMENES
// ========================================

function actualizarEstadisticasInicio() {
  const ventasMes = obtenerVentasMesSeleccionado();
  const gastosMes = obtenerGastosMesSeleccionado();
  const pagosMes = obtenerPagosDeudasMesSeleccionado();

  const ahora = new Date();

  const ventasHoy = ventasInicio.filter((venta) =>
    esMismoDiaInicio(venta.fecha, ahora),
  );

  const pagosHoy = pagosDeudasInicio.filter((pago) =>
    esMismoDiaInicio(pago.fecha, ahora),
  );

  const gastosHoy = gastosInicio.filter((gasto) =>
    esMismoDiaInicio(gasto.fecha, ahora),
  );

  const ingresosVentasHoy = obtenerDineroIngresadoVentasInicio(ventasHoy);

  const ingresosPagosHoy = obtenerDineroIngresadoPagosInicio(pagosHoy);

  const totalGastosHoy = gastosHoy.reduce(
    (total, gasto) => total + Number(gasto.monto || 0),
    0,
  );

  const resultadoHoy = ingresosVentasHoy + ingresosPagosHoy - totalGastosHoy;

  const ingresosVentasMes = obtenerDineroIngresadoVentasInicio(ventasMes);

  const ingresosPagosMes = obtenerDineroIngresadoPagosInicio(pagosMes);

  const totalGastosMes = gastosMes.reduce(
    (total, gasto) => total + Number(gasto.monto || 0),
    0,
  );

  const resultadoMes = ingresosVentasMes + ingresosPagosMes - totalGastosMes;

  // Tarjetas superiores.

  establecerTextoInicio(
    "ventas-hoy-inicio",
    ingresosVentasHoy + ingresosPagosHoy,
  );

  establecerTextoInicio("ventas-mes-inicio", resultadoMes);

  establecerTextoInicio("cantidad-ventas-inicio", ventasMes.length, false);

  establecerTextoInicio("gastos-mes-inicio", totalGastosMes);

  // Resumen de hoy.

  establecerTextoInicio("resumen-ventas-hoy-inicio", ingresosVentasHoy);

  establecerTextoInicio("resumen-pagos-hoy-inicio", ingresosPagosHoy);

  establecerTextoInicio("resumen-gastos-hoy-inicio", totalGastosHoy);

  establecerTextoInicio("resumen-resultado-hoy-inicio", resultadoHoy);

  // Resumen del mes.

  establecerTextoInicio("resumen-ventas-mes-inicio", ingresosVentasMes);

  establecerTextoInicio("resumen-pagos-mes-inicio", ingresosPagosMes);

  establecerTextoInicio("resumen-gastos-mes-inicio", totalGastosMes);

  establecerTextoInicio("resumen-resultado-mes-inicio", resultadoMes);

  // Comparaciones con el período anterior.

  const mesAnterior = obtenerMesAnteriorInicio(mesSeleccionadoInicio);

  const ventasMesAnterior = ventasInicio.filter((venta) =>
    perteneceAlMesInicio(venta.fecha, mesAnterior),
  );

  const gastosMesAnterior = gastosInicio.filter((gasto) =>
    perteneceAlMesInicio(gasto.fecha, mesAnterior),
  );

  const pagosMesAnterior = obtenerPagosDeudasMesInicio(mesAnterior);

  const totalGastosMesAnterior = gastosMesAnterior.reduce(
    (total, gasto) => total + Number(gasto.monto || 0),
    0,
  );

  const totalIngresosMesAnterior =
    obtenerDineroIngresadoVentasInicio(ventasMesAnterior) +
    obtenerDineroIngresadoPagosInicio(pagosMesAnterior);

  const resultadoMesAnterior =
    totalIngresosMesAnterior - totalGastosMesAnterior;

  establecerComparacionInicio(
    "comparacion-ventas-hoy-inicio",
    ingresosVentasHoy + ingresosPagosHoy,
    obtenerVentasAyerInicio(),
  );

  establecerComparacionInicio(
    "comparacion-ventas-mes-inicio",
    resultadoMes,
    resultadoMesAnterior,
    "vs mes anterior",
  );

  establecerComparacionInicio(
    "comparacion-cantidad-ventas-inicio",
    ventasMes.length,
    ventasMesAnterior.length,
    "vs mes anterior",
  );

  establecerComparacionInicio(
    "comparacion-gastos-mes-inicio",
    totalGastosMes,
    totalGastosMesAnterior,
    "vs mes anterior",
  );

  // Fechas mostradas en los resúmenes.

  const fechaHoy = document.getElementById("fecha-resumen-hoy-inicio");

  if (fechaHoy) {
    fechaHoy.textContent = ahora.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const fechaMes = document.getElementById("fecha-resumen-mes-inicio");

  if (fechaMes) {
    const inicio = new Date(
      mesSeleccionadoInicio.getFullYear(),
      mesSeleccionadoInicio.getMonth(),
      1,
    );

    const fin = new Date(
      mesSeleccionadoInicio.getFullYear(),
      mesSeleccionadoInicio.getMonth() + 1,
      0,
    );

    fechaMes.textContent = `del 1 al ${fin.getDate()} de ${obtenerNombreMesInicio(inicio)}`;
  }

  actualizarColorResultadoInicio("resumen-resultado-hoy-inicio", resultadoHoy);

  actualizarColorResultadoInicio("resumen-resultado-mes-inicio", resultadoMes);
}

// ========================================
// COMPARAR RESULTADOS
// ========================================

function establecerComparacionInicio(
  id,
  valorActual,
  valorAnterior,
  textoExtra = "",
) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  const actual = Number(valorActual || 0);
  const anterior = Number(valorAnterior || 0);

  let porcentaje = 0;

  if (anterior !== 0) {
    porcentaje = ((actual - anterior) / Math.abs(anterior)) * 100;
  } else if (actual > 0) {
    porcentaje = 100;
  }

  const signo = porcentaje > 0 ? "+" : "";
  const detalle = textoExtra ? ` ${textoExtra}` : "";

  elemento.textContent = `${signo}${porcentaje.toFixed(1)}%${detalle}`;

  elemento.classList.remove("positivo", "negativo");

  elemento.classList.add(porcentaje < 0 ? "negativo" : "positivo");
}

// ========================================
// COLOR DEL RESULTADO
// ========================================

function actualizarColorResultadoInicio(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.classList.remove("positivo", "negativo");

  elemento.classList.add(Number(valor) < 0 ? "negativo" : "positivo");
}

// ========================================
// FORMATEAR IMPORTES
// ========================================

function establecerTextoInicio(id, valor, esPrecio = true) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.textContent = esPrecio
    ? formatearPrecioInicio(valor)
    : Number(valor || 0).toLocaleString("es-AR");
}

// ========================================
// VENTAS DE AYER
// ========================================

function obtenerVentasAyerInicio() {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);

  const ventasAyer = ventasInicio.filter((venta) =>
    esMismoDiaInicio(venta.fecha, ayer),
  );

  const pagosAyer = pagosDeudasInicio.filter((pago) =>
    esMismoDiaInicio(pago.fecha, ayer),
  );

  return (
    obtenerDineroIngresadoVentasInicio(ventasAyer) +
    obtenerDineroIngresadoPagosInicio(pagosAyer)
  );
}

// ========================================
// GRÁFICO DE VENTAS DE LOS ÚLTIMOS 7 DÍAS
// ========================================

function renderizarVentasSemana() {
  const contenedor = document.getElementById("grafico-ventas-semana");
  if (!contenedor) return;

  const hoy = new Date();
  const dias = [];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);

    const ventasDia = ventasInicio.filter((venta) =>
      esMismoDiaInicio(venta.fecha, fecha),
    );

    const pagosDia = pagosDeudasInicio.filter((pago) =>
      esMismoDiaInicio(pago.fecha, fecha),
    );

    const total =
      obtenerDineroIngresadoVentasInicio(ventasDia) +
      obtenerDineroIngresadoPagosInicio(pagosDia);

    dias.push({
      fecha,
      total,
      etiqueta: fecha.toLocaleDateString("es-AR", {
        weekday: "short",
      }),
    });
  }

  const maximo = Math.max(...dias.map((dia) => dia.total), 1);

  contenedor.innerHTML = `
        <div class="contenedor-barras-inicio">
            ${dias
              .map((dia) => {
                const altura =
                  dia.total > 0 ? Math.max((dia.total / maximo) * 175, 4) : 0;

                return `
                    <div class="columna-grafico-inicio">
                        <span class="valor-barra-inicio">
                            ${dia.total > 0 ? formatearPrecioInicio(dia.total) : ""}
                        </span>

                        <div
                            class="barra-grafico-inicio"
                            style="height:${altura}px"
                            title="${formatearPrecioInicio(dia.total)}"
                        ></div>

                        <span class="etiqueta-barra-inicio">
                            ${dia.etiqueta}
                        </span>
                    </div>
                `;
              })
              .join("")}
        </div>
    `;
}

// ========================================
// ÚLTIMAS VENTAS
// ========================================

function renderizarUltimasVentas() {
  const contenedor = document.getElementById("lista-ultimas-ventas-inicio");
  if (!contenedor) return;

  const ventasOrdenadas = [...ventasInicio]
    .sort(
      (a, b) =>
        (obtenerFechaInicio(b.fecha)?.getTime() || 0) -
        (obtenerFechaInicio(a.fecha)?.getTime() || 0),
    )
    .slice(0, 5);

  if (!ventasOrdenadas.length) {
    contenedor.innerHTML = `
            <div class="sin-datos-inicio">
                No hay ventas registradas.
            </div>
        `;
    return;
  }

  contenedor.innerHTML = ventasOrdenadas
    .map((venta) => {
      const fecha = obtenerFechaInicio(venta.fecha);

      const hora = fecha
        ? fecha.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--";

      const productos = Array.isArray(venta.productos)
        ? venta.productos
            .map((articulo) => {
              const productoId =
                articulo.productoId ?? articulo.idProducto ?? articulo.id;

              const producto = productosInicio.find(
                (p) => String(p.id) === String(productoId),
              );

              return (
                articulo.nombre ||
                articulo.nombreProducto ||
                articulo.productoNombre ||
                producto?.nombre ||
                "Producto sin nombre"
              );
            })
            .join("<br>")
        : "Sin productos";

      const cliente =
        venta.clienteNombre ||
        venta.nombreCliente ||
        venta.cliente?.nombre ||
        "Consumidor final";

      const total = Math.max(
        0,
        Number(venta.totalEntregado ?? venta.importe ?? venta.total ?? 0) -
          Number(venta.vuelto || 0),
      );

      return `
            <div class="fila-tabla-inicio">
                <span>${hora}</span>
                <span>${productos
                  .split("<br>")
                  .map((nombre) => escaparHTMLInicio(nombre))
                  .join("<br>")}</span>
                <span>${escaparHTMLInicio(cliente)}</span>
                <strong>${formatearPrecioInicio(total)}</strong>
            </div>
        `;
    })
    .join("");
}

// ========================================
// COSTO DE REPOSICIÓN POR CATEGORÍA
// ========================================

function renderizarCostosReposicionInicio() {
  const canvas = document.getElementById("grafico-costos-reposicion-inicio");
  const leyenda = document.getElementById("leyenda-costos-reposicion-inicio");

  if (!canvas) return;

  if (!ventasInicioCargadas || !productosInicioCargados) {
    return;
  }

  const costosPorCategoria = new Map();

  // Indexar productos por ID para encontrarlos rápidamente.
  const productosPorId = new Map(
    productosInicio.map((producto) => [String(producto.id), producto]),
  );

  // Obtener únicamente las ventas del período seleccionado.
  const ventasPeriodo = obtenerVentasMesSeleccionado();

  ventasPeriodo.forEach((venta) => {
    if (!Array.isArray(venta.productos)) return;

    venta.productos.forEach((articulo) => {
      const productoId =
        articulo.productoId ?? articulo.idProducto ?? articulo.id;

      if (productoId == null) {
        console.warn("Artículo de venta sin identificador:", articulo);
        return;
      }

      const producto = productosPorId.get(String(productoId));

      if (!producto) {
        console.warn("No se encontró el producto vendido:", productoId);
        return;
      }

      const cantidad = Number(articulo.cantidad ?? 0);
      const precioCompra = Number(producto.precioCompra);

      // Evitar cantidades o costos inválidos.
      if (
        !Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(precioCompra) ||
        precioCompra <= 0
      ) {
        return;
      }

      const categoria = producto.categoria || "Sin categoría";
      const costoReposicion = cantidad * precioCompra;

      costosPorCategoria.set(
        categoria,
        (costosPorCategoria.get(categoria) || 0) + costoReposicion,
      );
    });
  });

  const datos = [...costosPorCategoria.entries()].sort((a, b) => b[1] - a[1]);

  const colores = [
    "#1689f9",
    "#ffb52e",
    "#8b5cf6",
    "#16c79a",
    "#9aa8c2",
    "#f45b78",
    "#ff8b00",
    "#4755d8",
  ];

  const contexto = canvas.getContext("2d");
  if (!contexto) return;

  const rect = canvas.getBoundingClientRect();
  const ancho = rect.width || 230;
  const alto = rect.height || 225;
  const escala = window.devicePixelRatio || 1;

  canvas.width = Math.round(ancho * escala);
  canvas.height = Math.round(alto * escala);

  contexto.setTransform(escala, 0, 0, escala, 0, 0);
  contexto.clearRect(0, 0, ancho, alto);

  const total = datos.reduce((suma, [, valor]) => suma + valor, 0);

  if (!datos.length || total <= 0) {
    contexto.beginPath();
    contexto.arc(
      ancho / 2,
      alto / 2,
      Math.min(ancho, alto) * 0.29,
      0,
      Math.PI * 2,
    );

    contexto.strokeStyle = "#e5eaf1";
    contexto.lineWidth = Math.min(ancho, alto) * 0.14;
    contexto.stroke();

    contexto.fillStyle = "#7181a4";
    contexto.font = "12px Arial";
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.fillText("Sin datos", ancho / 2, alto / 2);

    if (leyenda) {
      leyenda.innerHTML = `
                <div class="sin-datos-inicio">
                    No hay ventas con productos y costos de compra válidos
                    en este período.
                </div>
            `;
    }

    return;
  }

  const centroX = ancho / 2;
  const centroY = alto / 2;
  const radio = Math.min(ancho, alto) * 0.36;

  let anguloInicio = -Math.PI / 2;

  datos.forEach(([categoria, valor], indice) => {
    const angulo = (valor / total) * Math.PI * 2;

    contexto.beginPath();
    contexto.moveTo(centroX, centroY);
    contexto.arc(centroX, centroY, radio, anguloInicio, anguloInicio + angulo);
    contexto.closePath();

    contexto.fillStyle = colores[indice % colores.length];
    contexto.fill();

    anguloInicio += angulo;
  });

  // Centro del gráfico.
  contexto.beginPath();
  contexto.arc(centroX, centroY, radio * 0.58, 0, Math.PI * 2);

  contexto.fillStyle = "#ffffff";
  contexto.fill();

  contexto.fillStyle = "#10234b";
  contexto.font = "bold 13px Arial";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(formatearPrecioInicio(total), centroX, centroY - 7);

  contexto.fillStyle = "#7181a4";
  contexto.font = "11px Arial";
  contexto.fillText("Reposición", centroX, centroY + 11);

  // Leyenda por categoría.
  if (leyenda) {
    leyenda.innerHTML = "";

    datos.forEach(([categoria, valor], indice) => {
      const elemento = document.createElement("div");
      elemento.className = "item-leyenda-categoria-inicio";

      const punto = document.createElement("span");
      punto.className = "punto-leyenda-categoria-inicio";
      punto.style.background = colores[indice % colores.length];

      const nombre = document.createElement("span");
      nombre.className = "nombre-leyenda-categoria-inicio";
      nombre.textContent = categoria;

      const importe = document.createElement("strong");
      importe.textContent = formatearPrecioInicio(valor);

      elemento.append(punto, nombre, importe);
      leyenda.appendChild(elemento);
    });
  }
}

// ========================================
// RESÚMENES DE HOY Y DEL MES
// ========================================

function renderizarResumenesInicio() {
  actualizarEstadisticasInicio();
}

// ========================================
// FUNCIONES DE FECHAS
// ========================================

function obtenerMesAnteriorInicio(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() - 1, 1);
}

function perteneceAlMesInicio(fechaValor, mes) {
  const fecha = obtenerFechaInicio(fechaValor);

  return Boolean(
    fecha &&
    fecha.getFullYear() === mes.getFullYear() &&
    fecha.getMonth() === mes.getMonth(),
  );
}

function esMismoDiaInicio(fechaValor, referencia) {
  const fecha = obtenerFechaInicio(fechaValor);

  return Boolean(
    fecha &&
    fecha.getFullYear() === referencia.getFullYear() &&
    fecha.getMonth() === referencia.getMonth() &&
    fecha.getDate() === referencia.getDate(),
  );
}

// ========================================
// OBTENER FECHA
// ========================================

function obtenerFechaInicio(valor) {
  if (valor == null || valor === "") return null;

  // Timestamp de Firestore.

  if (typeof valor.toDate === "function") {
    const fecha = valor.toDate();
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  // Timestamp convertido en objeto.

  if (typeof valor === "object" && valor.seconds !== undefined) {
    const fecha = new Date(Number(valor.seconds) * 1000);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  // Fecha de JavaScript.

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  if (typeof valor === "number") {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  // Fecha en formato de texto.

  if (typeof valor === "string") {
    // Interpretar AAAA-MM-DD como fecha local.
    const soloFecha = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (soloFecha) {
      return new Date(
        Number(soloFecha[1]),
        Number(soloFecha[2]) - 1,
        Number(soloFecha[3]),
      );
    }

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  return null;
}

// ========================================
// HORA DE VENTA
// ========================================

function obtenerHoraVentaInicio(valor) {
  const fecha = obtenerFechaInicio(valor);

  if (!fecha) return "—";

  return fecha.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ========================================
// FORMATEAR PRECIO
// ========================================

function formatearPrecioInicio(valor) {
  return `$ ${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ========================================
// ESCAPAR HTML
// ========================================

function escaparHTMLInicio(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

// ========================================
// LIMPIAR INICIO
// ========================================

window.limpiarInicio = function () {
  if (cancelarEscuchaVentasInicio) {
    cancelarEscuchaVentasInicio();
    cancelarEscuchaVentasInicio = null;
  }

  if (cancelarEscuchaProductosInicio) {
    cancelarEscuchaProductosInicio();
    cancelarEscuchaProductosInicio = null;
  }

  if (cancelarEscuchaGastosInicio) {
    cancelarEscuchaGastosInicio();
    cancelarEscuchaGastosInicio = null;
  }

  if (cancelarEscuchaPagosInicio) {
    cancelarEscuchaPagosInicio();
    cancelarEscuchaPagosInicio = null;
  }

  if (window.manejadorUsuarioInicio) {
    window.removeEventListener(
      "usuarioOperativoCambiado",
      window.manejadorUsuarioInicio,
    );

    window.manejadorUsuarioInicio = null;
  }

  ventasInicio = [];
  productosInicio = [];
  gastosInicio = [];
  pagosDeudasInicio = [];
  pagosAplicadosPorVentaInicio = new Map();
};

// ========================================
// INICIAR
// ========================================

inicializarInicio();
