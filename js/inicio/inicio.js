// ========================================
// INICIO
// ========================================

let ventasInicio = [];
let productosInicio = [];
let gastosInicio = [];
let pagosDeudasInicio = [];
let pagosAplicadosPorVentaInicio = new Map();

let cancelarEscuchaVentasInicio = null;
let cancelarEscuchaProductosInicio = null;
let cancelarEscuchaGastosInicio = null;
let cancelarEscuchaPagosInicio = null;

const STOCK_BAJO = 3;

// Mes que se está mostrando en Inicio
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
  if (document.getElementById("css-inicio")) {
    return;
  }

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

  // ----------------------------------------
  // FIREBASE
  // ----------------------------------------

  const { collection, collectionGroup, query, where, onSnapshot } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

  // ----------------------------------------
  // CANCELAR ESCUCHAS ANTERIORES
  // ----------------------------------------

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

    const consultaProductos = query(
      referenciaProductos,
      where("creadoPor", "==", usuarioOperativo),
    );

    cancelarEscuchaProductosInicio = onSnapshot(
      consultaProductos,
      (snapshot) => {
        productosInicio = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

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

        // Crear un índice de los importes aplicados a cada venta.
        pagosAplicadosPorVentaInicio = new Map();

        pagosDeudasInicio.forEach((pago) => {
          const aplicaciones = Array.isArray(pago.aplicaciones)
            ? pago.aplicaciones
            : [];

          aplicaciones.forEach((aplicacion) => {
            if (aplicacion.ventaId == null) {
              return;
            }

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
  // ========================================
  // CAMBIO DE USUARIO
  // ========================================

  window.manejadorUsuarioInicio = async () => {
    await iniciarEscuchasInicio();

    renderizarInicio();
  };

  window.addEventListener(
    "usuarioOperativoCambiado",
    window.manejadorUsuarioInicio,
  );

  // ========================================
  // VER PRODUCTOS
  // ========================================

  const botonBajoStock = document.getElementById("ver-productos-bajo-stock");

  if (botonBajoStock) {
    botonBajoStock.addEventListener("click", async () => {
      await window.cargarPantalla(
        "html/productos/productos.html",
        "js/productos/productos.js",
      );

      if (window.productosListos) {
        await window.productosListos;
      }

      window.actualizarPantallaActiva("html/productos/productos.html");
    });
  }

  // ========================================
  // VER TODAS LAS VENTAS
  // ========================================

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

  // ========================================
  // SELECTOR DE PERÍODO
  // ========================================

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

  if (!menu) {
    return;
  }

  menu.innerHTML = "";

  const ahora = new Date();

  // Mostrar los últimos 12 meses
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

  if (!elemento) {
    return;
  }

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
// RENDERIZAR TODO
// ========================================

function renderizarInicio() {
  actualizarEstadisticasInicio();

  renderizarVentasSemana();

  renderizarVentasPorCategoria();

  renderizarProductosBajoStock();

  renderizarUltimasVentas();

  renderizarResultadoMes();
}

// ========================================
// OBTENER VENTAS DEL MES SELECCIONADO
// ========================================

function obtenerVentasMesSeleccionado() {
  return ventasInicio.filter((venta) => {
    const fecha = obtenerFechaInicio(venta.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getMonth() === mesSeleccionadoInicio.getMonth() &&
      fecha.getFullYear() === mesSeleccionadoInicio.getFullYear()
    );
  });
}

// ========================================
// OBTENER GASTOS DEL MES SELECCIONADO
// ========================================

function obtenerGastosMesSeleccionado() {
  return gastosInicio.filter((gasto) => {
    const fecha = obtenerFechaInicio(gasto.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getMonth() === mesSeleccionadoInicio.getMonth() &&
      fecha.getFullYear() === mesSeleccionadoInicio.getFullYear()
    );
  });
}

// ========================================
// ESTADÍSTICAS
// ========================================

// ========================================
// OBTENER PAGOS DE DEUDAS DEL MES
// ========================================

function obtenerPagosDeudasMesSeleccionado() {
  return pagosDeudasInicio.filter((pago) => {
    const fecha = obtenerFechaInicio(pago.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getMonth() === mesSeleccionadoInicio.getMonth() &&
      fecha.getFullYear() === mesSeleccionadoInicio.getFullYear()
    );
  });
}

// ========================================
// OBTENER PAGOS DE DEUDAS DE UN MES
// ========================================

function obtenerPagosDeudasMesInicio(mes) {
  return pagosDeudasInicio.filter((pago) =>
    perteneceAlMesInicio(pago.fecha, mes),
  );
}

// ========================================
// DINERO INGRESADO POR VENTAS
// ========================================

function obtenerDineroIngresadoVentasInicio(ventas) {
  return ventas.reduce((total, venta) => {
    // Consultar directamente los pagos aplicados a esta venta.
    const pagosPosteriores =
      pagosAplicadosPorVentaInicio.get(String(venta.id)) || 0;

    // Recuperar lo cobrado originalmente al realizar la venta.
    const totalEntregado = Number(venta.totalEntregado ?? 0);
    const vuelto = Number(venta.vuelto ?? 0);

    const cobradoOriginal = totalEntregado - pagosPosteriores - vuelto;

    return total + Math.max(0, cobradoOriginal);
  }, 0);
}

function obtenerDineroIngresadoPagosInicio(pagos) {
  return pagos.reduce((total, pago) => {
    // Se cuenta el importe realmente recibido en el pago.
    return total + Number(pago.monto ?? 0);
  }, 0);
}

function actualizarEstadisticasInicio() {
  const ventasMes = obtenerVentasMesSeleccionado();

  const gastosMes = obtenerGastosMesSeleccionado();

  const ahora = new Date();

  // ----------------------------------------
  // VENTAS HOY
  // ----------------------------------------

  const ventasHoy = ventasInicio.filter((venta) => {
    const fecha = obtenerFechaInicio(venta.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getDate() === ahora.getDate() &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getFullYear() === ahora.getFullYear()
    );
  });

  const pagosHoy = pagosDeudasInicio.filter((pago) => {
    const fecha = obtenerFechaInicio(pago.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getDate() === ahora.getDate() &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getFullYear() === ahora.getFullYear()
    );
  });

  const totalVentasHoy =
    obtenerDineroIngresadoVentasInicio(ventasHoy) +
    obtenerDineroIngresadoPagosInicio(pagosHoy);

  // ----------------------------------------
  // TOTAL MES
  // ----------------------------------------

  const pagosMes = obtenerPagosDeudasMesSeleccionado();

  const totalIngresosMes =
    obtenerDineroIngresadoVentasInicio(ventasMes) +
    obtenerDineroIngresadoPagosInicio(pagosMes);

  // ----------------------------------------
  // GASTOS MES
  // ----------------------------------------

  const totalGastosMes = gastosMes.reduce(
    (total, gasto) => total + Number(gasto.monto || 0),
    0,
  );

  const totalVentasMes = totalIngresosMes - totalGastosMes;

  // ----------------------------------------
  // ELEMENTOS
  // ----------------------------------------

  const elementoVentasHoy = document.getElementById("ventas-hoy-inicio");

  const elementoVentasMes = document.getElementById("ventas-mes-inicio");

  const elementoCantidadVentas = document.getElementById(
    "cantidad-ventas-inicio",
  );

  const elementoGastosMes = document.getElementById("gastos-mes-inicio");

  if (elementoVentasHoy) {
    elementoVentasHoy.textContent = formatearPrecioInicio(totalVentasHoy);
  }

  if (elementoVentasMes) {
    elementoVentasMes.textContent = formatearPrecioInicio(totalVentasMes);
  }

  if (elementoCantidadVentas) {
    elementoCantidadVentas.textContent = ventasMes.length;
  }

  if (elementoGastosMes) {
    elementoGastosMes.textContent = formatearPrecioInicio(totalGastosMes);
  }

  // ========================================
  // COMPARACIONES
  // ========================================

  const mesAnterior = obtenerMesAnteriorInicio(mesSeleccionadoInicio);

  const ventasMesAnterior = ventasInicio.filter((venta) =>
    perteneceAlMesInicio(venta.fecha, mesAnterior),
  );

  const gastosMesAnterior = gastosInicio.filter((gasto) =>
    perteneceAlMesInicio(gasto.fecha, mesAnterior),
  );

  const pagosMesAnterior = obtenerPagosDeudasMesInicio(mesAnterior);

  // ----------------------------------------
  // GASTOS MES ANTERIOR
  // ----------------------------------------

  const totalGastosMesAnterior = gastosMesAnterior.reduce(
    (total, gasto) => total + Number(gasto.monto || 0),
    0,
  );

  // ----------------------------------------
  // INGRESOS MES ANTERIOR
  // ----------------------------------------

  const totalIngresosMesAnterior =
    obtenerDineroIngresadoVentasInicio(ventasMesAnterior) +
    obtenerDineroIngresadoPagosInicio(pagosMesAnterior);

  // ----------------------------------------
  // TOTAL PARA LA TARJETA "VENTAS DEL MES"
  // ----------------------------------------

  const totalVentasMesAnterior =
    totalIngresosMesAnterior - totalGastosMesAnterior;

  // ----------------------------------------
  // CANTIDAD DE VENTAS
  // ----------------------------------------

  const cantidadVentasMesAnterior = ventasMesAnterior.length;

  // ----------------------------------------
  // COMPARACIONES
  // ----------------------------------------

  establecerComparacionInicio(
    "comparacion-ventas-hoy-inicio",
    totalVentasHoy,
    obtenerVentasAyerInicio(),
  );

  establecerComparacionInicio(
    "comparacion-ventas-mes-inicio",
    totalVentasMes,
    totalVentasMesAnterior,
    "vs mes anterior",
  );

  establecerComparacionInicio(
    "comparacion-cantidad-ventas-inicio",
    ventasMes.length,
    cantidadVentasMesAnterior,
    "vs mes anterior",
  );

  establecerComparacionInicio(
    "comparacion-gastos-mes-inicio",
    totalGastosMes,
    totalGastosMesAnterior,
    "vs mes anterior",
  );
}

// ========================================
// VENTAS DE AYER
// ========================================

function obtenerVentasAyerInicio() {
  const ahora = new Date();

  const ayer = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() - 1,
  );

  const ventasAyer = ventasInicio.filter((venta) => {
    const fecha = obtenerFechaInicio(venta.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getDate() === ayer.getDate() &&
      fecha.getMonth() === ayer.getMonth() &&
      fecha.getFullYear() === ayer.getFullYear()
    );
  });

  const pagosAyer = pagosDeudasInicio.filter((pago) => {
    const fecha = obtenerFechaInicio(pago.fecha);

    if (!fecha) {
      return false;
    }

    return (
      fecha.getDate() === ayer.getDate() &&
      fecha.getMonth() === ayer.getMonth() &&
      fecha.getFullYear() === ayer.getFullYear()
    );
  });

  return (
    obtenerDineroIngresadoVentasInicio(ventasAyer) +
    obtenerDineroIngresadoPagosInicio(pagosAyer)
  );
}

// ========================================
// COMPARACIÓN
// ========================================

function establecerComparacionInicio(
  id,
  actual,
  anterior,
  textoExtra = "vs período anterior",
) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  actual = Number(actual || 0);

  anterior = Number(anterior || 0);

  elemento.classList.remove("positivo", "negativo");

  if (anterior === 0) {
    if (actual === 0) {
      elemento.textContent = "Sin cambios";
    } else {
      elemento.textContent = "+100% " + textoExtra;

      elemento.classList.add("positivo");
    }

    return;
  }

  const porcentaje = ((actual - anterior) / anterior) * 100;

  const signo = porcentaje > 0 ? "+" : "";

  elemento.textContent = `${signo}${porcentaje.toFixed(1)}% ${textoExtra}`;

  if (porcentaje > 0) {
    elemento.classList.add("positivo");
  } else if (porcentaje < 0) {
    elemento.classList.add("negativo");
  }
}

// ========================================
// MES ANTERIOR
// ========================================

function obtenerMesAnteriorInicio(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() - 1, 1);
}

// ========================================
// PERTENECE AL MES
// ========================================

function perteneceAlMesInicio(fechaValor, mes) {
  const fecha = obtenerFechaInicio(fechaValor);

  if (!fecha) {
    return false;
  }

  return (
    fecha.getMonth() === mes.getMonth() &&
    fecha.getFullYear() === mes.getFullYear()
  );
}

// ========================================
// GRÁFICO DE VENTAS - 7 DÍAS
// ========================================

function renderizarVentasSemana() {
  const contenedor = document.getElementById("grafico-ventas-semana");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = "";

  const datos = [];

  const hoy = new Date();

  // Si estamos viendo el mes actual,
  // usamos hoy como último día.
  // Si estamos viendo otro mes,
  // usamos el último día de ese mes.
  const esMesActual =
    mesSeleccionadoInicio.getMonth() === hoy.getMonth() &&
    mesSeleccionadoInicio.getFullYear() === hoy.getFullYear();

  const fechaFinal = esMesActual
    ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    : new Date(
        mesSeleccionadoInicio.getFullYear(),
        mesSeleccionadoInicio.getMonth() + 1,
        0,
      );

  // ========================================
  // OBTENER LOS ÚLTIMOS 7 DÍAS
  // ========================================

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(
      fechaFinal.getFullYear(),
      fechaFinal.getMonth(),
      fechaFinal.getDate() - i,
    );

    const ventasDelDia = ventasInicio.filter((venta) => {
      const fechaVenta = obtenerFechaInicio(venta.fecha);

      if (!fechaVenta) {
        return false;
      }

      return (
        fechaVenta.getDate() === fecha.getDate() &&
        fechaVenta.getMonth() === fecha.getMonth() &&
        fechaVenta.getFullYear() === fecha.getFullYear()
      );
    });

    const pagosDelDia = pagosDeudasInicio.filter((pago) => {
      const fechaPago = obtenerFechaInicio(pago.fecha);

      if (!fechaPago) {
        return false;
      }

      return (
        fechaPago.getDate() === fecha.getDate() &&
        fechaPago.getMonth() === fecha.getMonth() &&
        fechaPago.getFullYear() === fecha.getFullYear()
      );
    });

    const totalVentas = obtenerDineroIngresadoVentasInicio(ventasDelDia);

    const totalPagos = pagosDelDia.reduce(
      (suma, pago) => suma + Number(pago.monto ?? 0),
      0,
    );

    const total = totalVentas + totalPagos;

    datos.push({
      fecha,
      total,
    });
  }

  // ========================================
  // MÁXIMO
  // ========================================

  const maximo = Math.max(...datos.map((dato) => dato.total), 1);

  // ========================================
  // CONTENEDOR
  // ========================================

  const grafico = document.createElement("div");

  grafico.className = "contenedor-barras-inicio";

  // ========================================
  // COLUMNAS
  // ========================================

  datos.forEach((dato) => {
    const columna = document.createElement("div");

    columna.className = "columna-grafico-inicio";

    const altura =
      dato.total > 0 ? Math.max((dato.total / maximo) * 170, 5) : 0;

    columna.innerHTML = `

                <div class="valor-barra-inicio">
                    ${dato.total > 0 ? formatearPrecioInicio(dato.total) : ""}
                </div>

                <div
                    class="barra-grafico-inicio"
                    style="height: ${altura}px"
                ></div>

                <div class="etiqueta-barra-inicio">
                    ${dato.fecha.toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                    })}
                </div>

            `;

    grafico.appendChild(columna);
  });

  contenedor.appendChild(grafico);
}

// ========================================
// VENTAS POR CATEGORÍA
// ========================================

function renderizarVentasPorCategoria() {
  const canvas = document.getElementById("grafico-ventas-categorias-inicio");

  const leyenda = document.getElementById("leyenda-ventas-categorias-inicio");

  if (!canvas) {
    return;
  }

  const ventasMes = obtenerVentasMesSeleccionado();

  const categorias = {};

  ventasMes.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((producto) => {
      const productoActual = productosInicio.find(
        (item) => item.id === producto.productoId,
      );

      const categoria = productoActual?.categoria || "Sin categoría";

      const subtotal = Number(
        producto.subtotal ||
          Number(producto.precioUnitario) * Number(producto.cantidad) ||
          0,
      );

      categorias[categoria] = (categorias[categoria] || 0) + subtotal;
    });
  });

  const datos = Object.entries(categorias);

  const contexto = canvas.getContext("2d");

  if (!contexto) {
    return;
  }

  const rect = canvas.getBoundingClientRect();

  const ancho = rect.width || 250;

  const alto = rect.height || 250;

  const escala = window.devicePixelRatio || 1;

  canvas.width = ancho * escala;

  canvas.height = alto * escala;

  contexto.setTransform(escala, 0, 0, escala, 0, 0);

  contexto.clearRect(0, 0, ancho, alto);

  if (datos.length === 0) {
    contexto.beginPath();

    contexto.arc(ancho / 2, alto / 2, 75, 0, Math.PI * 2);

    contexto.strokeStyle = "#e5e7eb";

    contexto.lineWidth = 35;

    contexto.stroke();

    contexto.fillStyle = "#64748b";

    contexto.font = "13px Arial";

    contexto.textAlign = "center";

    contexto.textBaseline = "middle";

    contexto.fillText("Sin ventas", ancho / 2, alto / 2);

    if (leyenda) {
      leyenda.innerHTML = "";
    }

    return;
  }

  const colores = [
    "#2587e8",
    "#ffbd20",
    "#8a3ffc",
    "#f45b78",
    "#16a56c",
    "#55a8e8",
    "#ff8b00",
    "#4737dd",
  ];

  const total = datos.reduce((suma, [, valor]) => suma + valor, 0);

  const centroX = ancho / 2;

  const centroY = alto / 2;

  const radio = Math.min(ancho, alto) * 0.32;

  let anguloInicio = -Math.PI / 2;

  datos.forEach(([categoria, valor], indice) => {
    const porcentaje = valor / total;

    const angulo = porcentaje * Math.PI * 2;

    contexto.beginPath();

    contexto.moveTo(centroX, centroY);

    contexto.arc(centroX, centroY, radio, anguloInicio, anguloInicio + angulo);

    contexto.closePath();

    contexto.fillStyle = colores[indice % colores.length];

    contexto.fill();

    anguloInicio += angulo;
  });

  // Centro blanco para efecto donut

  contexto.beginPath();

  contexto.arc(centroX, centroY, radio * 0.58, 0, Math.PI * 2);

  contexto.fillStyle = "#ffffff";

  contexto.fill();

  contexto.fillStyle = "#24344d";

  contexto.font = "bold 15px Arial";

  contexto.textAlign = "center";

  contexto.textBaseline = "middle";

  contexto.fillText(formatearPrecioInicio(total), centroX, centroY);

  // ========================================
  // LEYENDA
  // ========================================

  if (leyenda) {
    leyenda.innerHTML = "";

    datos.forEach(([categoria, valor], indice) => {
      const porcentaje = (valor / total) * 100;

      const elemento = document.createElement("div");

      elemento.className = "item-leyenda-categoria-inicio";

      elemento.innerHTML = `

                    <span
                        class="punto-leyenda-categoria-inicio"
                        style="
                            background:${colores[indice % colores.length]};
                        "
                    ></span>

                    <span class="nombre-leyenda-categoria-inicio">
                        ${escaparHTMLInicio(categoria)}
                    </span>

                    <span>
                        ${porcentaje.toFixed(1)}%
                    </span>

                `;

      leyenda.appendChild(elemento);
    });
  }
}

// ========================================
// PRODUCTOS CON BAJO STOCK
// ========================================

function renderizarProductosBajoStock() {
  const contenedor = document.getElementById("lista-productos-bajo-stock");

  if (!contenedor) {
    return;
  }

  const productosBajoStock = productosInicio
    .filter((producto) => Number(producto.stock || 0) <= STOCK_BAJO)
    .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
    .slice(0, 6);

  contenedor.innerHTML = "";

  if (productosBajoStock.length === 0) {
    contenedor.innerHTML = `
            <div class="estado-vacio-inicio">
                No hay productos con bajo stock.
            </div>
        `;

    return;
  }

  productosBajoStock.forEach((producto) => {
    const elemento = document.createElement("div");

    elemento.className = "fila-tabla-inicio";

    const stock = Number(producto.stock || 0);

    let estado = "Disponible";

    if (stock === 0) {
      estado = "Agotado";
    } else if (stock <= STOCK_BAJO) {
      estado = "Bajo stock";
    }

    elemento.innerHTML = `

                <span>
                    ${escaparHTMLInicio(producto.nombre || "Sin nombre")}
                </span>

                <span>
                    ${escaparHTMLInicio(producto.categoria || "Sin categoría")}
                </span>

                <span>
                    ${stock}
                </span>

                <span
                    class="
                        estado-stock-inicio
                        ${stock === 0 ? "agotado" : "bajo"}
                    "
                >
                    ${estado}
                </span>

            `;

    contenedor.appendChild(elemento);
  });
}

// ========================================
// ÚLTIMAS VENTAS
// ========================================

function renderizarUltimasVentas() {
  const contenedor = document.getElementById("lista-ultimas-ventas-inicio");

  if (!contenedor) {
    return;
  }

  const ventasMes = obtenerVentasMesSeleccionado();

  const ventasOrdenadas = [...ventasMes]
    .sort((a, b) => obtenerFechaInicio(b.fecha) - obtenerFechaInicio(a.fecha))
    .slice(0, 6);

  contenedor.innerHTML = "";

  if (ventasOrdenadas.length === 0) {
    contenedor.innerHTML = `
            <div class="estado-vacio-inicio">
                No hay ventas en este período.
            </div>
        `;

    return;
  }

  ventasOrdenadas.forEach((venta) => {
    const elemento = document.createElement("div");

    elemento.className = "fila-tabla-inicio";

    const cliente = venta.cliente
      ? `${venta.cliente.nombre || ""} ${venta.cliente.apellido || ""}`.trim()
      : "Cliente general";

    const cantidadProductos = Array.isArray(venta.productos)
      ? venta.productos.length
      : 0;

    elemento.innerHTML = `

                <span>
                    ${obtenerHoraVentaInicio(venta.fecha)}
                </span>

                <span>
                    ${cantidadProductos}
                    ${cantidadProductos === 1 ? "producto" : "productos"}
                </span>

                <span>
                    ${escaparHTMLInicio(cliente)}
                </span>

                <span>
                    ${formatearPrecioInicio(Number(venta.total || 0))}
                </span>

            `;

    contenedor.appendChild(elemento);
  });
}

// ========================================
// RESULTADO DEL MES
// ========================================

function renderizarResultadoMes() {
  const ventas = obtenerVentasMesSeleccionado();

  const gastos = obtenerGastosMesSeleccionado();

  const pagos = obtenerPagosDeudasMesSeleccionado();

  const totalVentas =
    obtenerDineroIngresadoVentasInicio(ventas) +
    obtenerDineroIngresadoPagosInicio(pagos);

  const totalGastos = gastos.reduce(
    (total, gasto) => total + Number(gasto.monto || 0),
    0,
  );

  const resultado = totalVentas - totalGastos;

  const elementoVentas = document.getElementById("resultado-ventas-inicio");

  const elementoGastos = document.getElementById("resultado-gastos-inicio");

  const elementoResultado = document.getElementById("resultado-final-inicio");

  if (elementoVentas) {
    elementoVentas.textContent = formatearPrecioInicio(totalVentas);
  }

  if (elementoGastos) {
    elementoGastos.textContent = formatearPrecioInicio(totalGastos);
  }

  if (elementoResultado) {
    elementoResultado.textContent = formatearPrecioInicio(resultado);

    elementoResultado.classList.remove("positivo", "negativo");

    if (resultado > 0) {
      elementoResultado.classList.add("positivo");
    } else if (resultado < 0) {
      elementoResultado.classList.add("negativo");
    }
  }
}

// ========================================
// OBTENER FECHA
// ========================================

function obtenerFechaInicio(valor) {
  if (!valor) {
    return null;
  }

  // Firestore Timestamp
  if (typeof valor.toDate === "function") {
    return valor.toDate();
  }

  // Timestamp convertido como objeto
  if (valor.seconds !== undefined) {
    return new Date(valor.seconds * 1000);
  }

  // Fecha JS
  if (valor instanceof Date) {
    return valor;
  }

  // String
  if (typeof valor === "string") {
    const fecha = new Date(valor);

    if (!isNaN(fecha.getTime())) {
      return fecha;
    }
  }

  return null;
}

// ========================================
// HORA DE VENTA
// ========================================

function obtenerHoraVentaInicio(valor) {
  const fecha = obtenerFechaInicio(valor);

  if (!fecha) {
    return "—";
  }

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
