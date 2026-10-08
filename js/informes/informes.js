// ========================================
// INFORMES
// ========================================

let ventasInformes = [];
let gastosInformes = [];
let clientesInformes = [];
let productosInformes = [];
let movimientosInformes = {};

let cancelarVentasInformes = null;
let cancelarGastosInformes = null;
let cancelarClientesInformes = null;
let cancelarProductosInformes = null;

// ========================================
// FILTROS
// ========================================

let usuarioInformeSeleccionado = "general";

let fechaDesdeInforme = null;
let fechaHastaInforme = null;

// ========================================
// INICIALIZAR
// ========================================

async function inicializarInformes() {
  cargarCSSInformes();

  await cargarChartJSInformes();

  establecerFechasInicialesInformes();

  configurarEventosInformes();

  await iniciarEscuchasInformes();

  renderizarInformes();
}

// ========================================
// CSS
// ========================================

function cargarCSSInformes() {
  if (document.getElementById("css-informes")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-informes";

  link.rel = "stylesheet";

  link.href = "css/informes/informes.css";

  document.head.appendChild(link);
}

async function cargarLibreriaPDF(url, id) {
  const existente = document.getElementById(id);

  if (existente) {
    return;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.id = id;
    script.src = url;

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

async function cargarLibreriasPDF() {
  await cargarLibreriaPDF(
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    "libreria-html2canvas-informes",
  );

  await cargarLibreriaPDF(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    "libreria-jspdf-informes",
  );
}

async function exportarInformesPDF() {
  const pantalla = document.querySelector(".pantalla-informes");

  const boton = document.getElementById("exportar-informes");

  const botonesPDF = [
    document.getElementById("limpiar-filtros-informes"),
    document.getElementById("exportar-informes"),
  ].filter(Boolean);

  botonesPDF.forEach((boton) => {
    boton.style.display = "none";
  });

  if (!pantalla) {
    return;
  }

  try {
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Exportando...";
    }

    await cargarLibreriasPDF();

    // Esperamos a que Chart.js termine de dibujar
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const anchoPagina = pdf.internal.pageSize.getWidth();

    const altoPagina = pdf.internal.pageSize.getHeight();

    const margen = 7;

    const anchoUtil = anchoPagina - margen * 2;

    const altoUtil = altoPagina - margen * 2;

    // ========================================
    // CAPTURAR UN ELEMENTO REAL
    // ========================================

    async function capturarElemento(elemento) {
      return await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,

        // Importante:
        // usamos el tamaño REAL del elemento
        width: elemento.offsetWidth,
        height: elemento.offsetHeight,
      });
    }

    // ========================================
    // AGREGAR IMAGEN A PDF
    // ========================================

    function agregarImagen(canvas, x, y, ancho, alto) {
      const imagen = canvas.toDataURL("image/jpeg", 0.95);

      pdf.addImage(imagen, "JPEG", x, y, ancho, alto);
    }

    // ========================================
    // PÁGINA 1
    // ENCABEZADO + ESTADÍSTICAS
    // ========================================

    const encabezado = pantalla.querySelector(".encabezado-informes");

    const estadisticas = pantalla.querySelector(".estadisticas-informes");

    if (encabezado) {
      const canvasEncabezado = await capturarElemento(encabezado);

      const anchoEncabezado = anchoUtil;

      const altoEncabezado =
        (canvasEncabezado.height / canvasEncabezado.width) * anchoEncabezado;

      agregarImagen(
        canvasEncabezado,
        margen,
        margen,
        anchoEncabezado,
        altoEncabezado,
      );
    }

    if (estadisticas) {
      const canvasEstadisticas = await capturarElemento(estadisticas);

      const anchoEstadisticas = anchoUtil;

      const altoEstadisticas =
        (canvasEstadisticas.height / canvasEstadisticas.width) *
        anchoEstadisticas;

      agregarImagen(
        canvasEstadisticas,
        margen,
        35,
        anchoEstadisticas,
        altoEstadisticas,
      );
    }

    // ========================================
    // OBTENER TODOS LOS PANELES
    // ========================================

    const grid = pantalla.querySelector(".grid-informes");

    if (!grid) {
      return;
    }

    const paneles = Array.from(
      grid.querySelectorAll(":scope > .panel-informe"),
    );

    // ========================================
    // DISTRIBUCIÓN DE PANELES EN PDF
    // ========================================

    const anchoPanel = (anchoUtil - 6) / 2;

    let yPanel = margen;

    pdf.addPage();

    // ========================================
    // OBTENER TAMAÑO DE UN PANEL
    // ========================================

    async function obtenerCanvasPanel(panel) {
      return await capturarElemento(panel);
    }

    // ========================================
    // AGREGAR FILA DE DOS PANELES
    // ========================================

    async function agregarFilaDosPaneles(panelIzquierdo, panelDerecho) {
      const canvasIzquierdo = await obtenerCanvasPanel(panelIzquierdo);

      const canvasDerecho = await obtenerCanvasPanel(panelDerecho);

      const proporcionIzquierda =
        canvasIzquierdo.height / canvasIzquierdo.width;

      const proporcionDerecha = canvasDerecho.height / canvasDerecho.width;

      const anchoIzquierdo = anchoPanel;
      const anchoDerecho = anchoPanel;

      const altoIzquierdo = anchoIzquierdo * proporcionIzquierda;

      const altoDerecho = anchoDerecho * proporcionDerecha;

      const altoFila = Math.max(altoIzquierdo, altoDerecho);

      // Si la fila no entra, nueva página
      if (yPanel > margen && yPanel + altoFila > altoPagina - margen) {
        pdf.addPage();

        yPanel = margen;
      }

      const y = yPanel;

      agregarImagen(canvasIzquierdo, margen, y, anchoIzquierdo, altoIzquierdo);

      agregarImagen(
        canvasDerecho,
        margen + anchoPanel + 6,
        y,
        anchoDerecho,
        altoDerecho,
      );

      yPanel += altoFila + 6;
    }

    // ========================================
    // AGREGAR PANEL DE ANCHO COMPLETO
    // ========================================

    async function agregarPanelAnchoCompleto(panel) {
      const canvas = await obtenerCanvasPanel(panel);

      const proporcion = canvas.height / canvas.width;

      const ancho = anchoUtil;

      const alto = ancho * proporcion;

      // Si no entra, nueva página
      if (yPanel > margen && yPanel + alto > altoPagina - margen) {
        pdf.addPage();

        yPanel = margen;
      }

      agregarImagen(canvas, margen, yPanel, ancho, alto);

      yPanel += alto + 6;
    }

    // ========================================
    // RECORRER TODOS LOS PANELES
    // ========================================

    for (let i = 0; i < paneles.length; i++) {
      const panelActual = paneles[i];

      const esAnchoCompleto = panelActual.classList.contains(
        "panel-rentabilidad-informe",
      );

      // Panel especial de ancho completo
      if (esAnchoCompleto) {
        await agregarPanelAnchoCompleto(panelActual);

        continue;
      }

      // Buscar el siguiente panel
      const siguientePanel = paneles[i + 1];

      const siguienteEsAnchoCompleto =
        siguientePanel &&
        siguientePanel.classList.contains("panel-rentabilidad-informe");

      // Dos paneles normales juntos
      if (siguientePanel && !siguienteEsAnchoCompleto) {
        await agregarFilaDosPaneles(panelActual, siguientePanel);

        i++;

        continue;
      }

      // Panel normal que queda solo en la fila
      const canvas = await obtenerCanvasPanel(panelActual);

      const proporcion = canvas.height / canvas.width;

      const ancho = anchoPanel;

      const alto = ancho * proporcion;

      if (yPanel > margen && yPanel + alto > altoPagina - margen) {
        pdf.addPage();

        yPanel = margen;
      }

      agregarImagen(canvas, margen, yPanel, ancho, alto);

      yPanel += alto + 6;
    }

    // ========================================
    // RESUMEN FINAL
    // ========================================

    const resumen = pantalla.querySelector(".resumen-informe");

    if (resumen) {
      pdf.addPage();

      const canvasResumen = await capturarElemento(resumen);

      const proporcion = canvasResumen.height / canvasResumen.width;

      let ancho = anchoUtil;

      let alto = ancho * proporcion;

      if (alto > altoUtil) {
        alto = altoUtil;

        ancho = alto / proporcion;
      }

      const x = (anchoPagina - ancho) / 2;

      const y = margen;

      agregarImagen(canvasResumen, x, y, ancho, alto);
    }

    // ========================================
    // GUARDAR
    // ========================================

    const fecha = new Date();

    const año = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1).padStart(2, "0");

    const dia = String(fecha.getDate()).padStart(2, "0");

    pdf.save(`informe-helen-${año}-${mes}-${dia}.pdf`);
  } catch (error) {
    console.error("Error al exportar informes:", error);

    alert("No se pudo generar el PDF.");
  } finally {
    botonesPDF.forEach((boton) => {
      boton.style.display = "";
    });

    if (boton) {
      boton.disabled = false;
      boton.textContent = "Exportar";
    }
  }
}

// ========================================
// CHART.JS
// ========================================

let chartJSInformesCargado = null;

const graficosInformes = {};

async function cargarChartJSInformes() {
  if (window.Chart) {
    return window.Chart;
  }

  if (chartJSInformesCargado) {
    return chartJSInformesCargado;
  }

  chartJSInformesCargado = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js";

    script.onload = () => {
      if (window.Chart) {
        resolve(window.Chart);
      } else {
        reject(new Error("Chart.js no pudo cargarse."));
      }
    };

    script.onerror = () => {
      reject(new Error("No se pudo cargar Chart.js."));
    };

    document.head.appendChild(script);
  });

  return chartJSInformesCargado;
}

function destruirGraficoInforme(id) {
  if (graficosInformes[id]) {
    graficosInformes[id].destroy();

    delete graficosInformes[id];
  }
}

function crearCanvasInforme(id) {
  const contenedor = document.getElementById(id);

  if (!contenedor) {
    return null;
  }

  destruirGraficoInforme(id);

  contenedor.innerHTML = "";

  const canvas = document.createElement("canvas");

  contenedor.appendChild(canvas);

  return canvas;
}

function crearGraficoInforme(id, tipo, labels, datos, opciones = {}) {
  const canvas = crearCanvasInforme(id);

  if (!canvas) {
    return null;
  }

  const ctx = canvas.getContext("2d");

  const chart = new Chart(ctx, {
    type: tipo,

    data: {
      labels: labels,

      datasets: [
        {
          data: datos,
        },
      ],
    },

    options: opciones,
  });

  graficosInformes[id] = chart;

  return chart;
}

function mostrarSinDatosGraficoInforme(id) {
  const contenedor = document.getElementById(id);

  if (!contenedor) {
    return;
  }

  destruirGraficoInforme(id);

  contenedor.innerHTML = `
        <div class="sin-datos-grafico-informe">
            No hay datos para mostrar
        </div>
    `;
}

function obtenerColoresInforme(cantidad) {
  const colores = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#65a30d",
    "#ea580c",
    "#4f46e5",
    "#0f766e",
    "#9333ea",
  ];

  const resultado = [];

  for (let i = 0; i < cantidad; i++) {
    resultado.push(colores[i % colores.length]);
  }

  return resultado;
}

function opcionesGraficoInforme(tipo = "bar") {
  const opciones = {
    responsive: true,

    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },

      tooltip: {
        enabled: true,
      },
    },

    scales: {
      x: {
        grid: {
          display: false,
        },
      },

      y: {
        beginAtZero: true,
      },
    },
  };

  if (tipo === "pie" || tipo === "doughnut") {
    delete opciones.scales;

    opciones.plugins.legend = {
      display: true,
      position: "bottom",
    };
  }

  return opciones;
}

// ========================================
// FECHAS INICIALES
// ========================================

function establecerFechasInicialesInformes() {
  const ahora = new Date();

  const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  fechaDesdeInforme = inicioDelDiaInforme(primerDia);

  fechaHastaInforme = finDelDiaInforme(ahora);

  const inputDesde = document.getElementById("fecha-desde-informes");

  const inputHasta = document.getElementById("fecha-hasta-informes");

  if (inputDesde) {
    inputDesde.value = formatearFechaInputInforme(primerDia);
  }

  if (inputHasta) {
    inputHasta.value = formatearFechaInputInforme(ahora);
  }
}

// ========================================
// EVENTOS
// ========================================

function configurarEventosInformes() {
  const inputDesde = document.getElementById("fecha-desde-informes");

  const inputHasta = document.getElementById("fecha-hasta-informes");

  const filtroUsuario = document.getElementById("filtro-usuario-informes");

  const botonLimpiar = document.getElementById("limpiar-filtros-informes");

  const botonExportar = document.getElementById("exportar-informes");

  if (inputDesde) {
    inputDesde.addEventListener("change", () => {
      if (inputDesde.value) {
        fechaDesdeInforme = inicioDelDiaInforme(
          new Date(inputDesde.value + "T00:00:00"),
        );
      } else {
        fechaDesdeInforme = null;
      }

      renderizarInformes();
    });
  }

  if (inputHasta) {
    inputHasta.addEventListener("change", () => {
      if (inputHasta.value) {
        fechaHastaInforme = finDelDiaInforme(
          new Date(inputHasta.value + "T00:00:00"),
        );
      } else {
        fechaHastaInforme = null;
      }

      renderizarInformes();
    });
  }

  if (filtroUsuario) {
    filtroUsuario.addEventListener("change", () => {
      usuarioInformeSeleccionado = filtroUsuario.value;

      renderizarInformes();
    });
  }

  if (botonLimpiar) {
    botonLimpiar.addEventListener("click", () => {
      usuarioInformeSeleccionado = "general";

      if (filtroUsuario) {
        filtroUsuario.value = "general";
      }

      establecerFechasInicialesInformes();

      renderizarInformes();
    });
  }

  if (botonExportar) {
    botonExportar.addEventListener("click", exportarInformesPDF);
  }
}

// ========================================
// FIRESTORE
// ========================================

async function iniciarEscuchasInformes() {
  const { collection, onSnapshot } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

  if (cancelarVentasInformes) {
    cancelarVentasInformes();

    cancelarVentasInformes = null;
  }

  if (cancelarGastosInformes) {
    cancelarGastosInformes();

    cancelarGastosInformes = null;
  }

  if (cancelarClientesInformes) {
    cancelarClientesInformes();

    cancelarClientesInformes = null;
  }

  if (cancelarProductosInformes) {
    cancelarProductosInformes();

    cancelarProductosInformes = null;
  }

  // VENTAS

  try {
    cancelarVentasInformes = onSnapshot(
      collection(window.db, "ventas"),
      (snapshot) => {
        ventasInformes = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        renderizarInformes();
      },
      (error) => {
        console.error("Error cargando ventas en Informes:", error);
      },
    );
  } catch (error) {
    console.error("Error configurando escucha de ventas:", error);
  }

  // GASTOS

  try {
    cancelarGastosInformes = onSnapshot(
      collection(window.db, "gastos"),
      (snapshot) => {
        gastosInformes = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        renderizarInformes();
      },
      (error) => {
        console.error("Error cargando gastos en Informes:", error);
      },
    );
  } catch (error) {
    console.error("Error configurando escucha de gastos:", error);
  }

  // CLIENTES

  try {
    cancelarClientesInformes = onSnapshot(
      collection(window.db, "clientes"),
      async (snapshot) => {
        const clientes = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        clientesInformes = clientes;

        const { getDocs, collection: collectionFirestore } =
          await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

        movimientosInformes = {};

        await Promise.all(
          clientes.map(async (cliente) => {
            try {
              const movimientosSnapshot = await getDocs(
                collectionFirestore(
                  window.db,
                  "clientes",
                  cliente.id,
                  "movimientos",
                ),
              );

              movimientosInformes[cliente.id] = movimientosSnapshot.docs.map(
                (documento) => ({
                  id: documento.id,
                  ...documento.data(),
                }),
              );
            } catch (error) {
              console.warn(
                `No se pudieron cargar los movimientos del cliente ${cliente.id}:`,
                error,
              );

              movimientosInformes[cliente.id] = [];
            }
          }),
        );

        renderizarInformes();
      },
      (error) => {
        console.error("Error cargando clientes en Informes:", error);
      },
    );
  } catch (error) {
    console.error("Error configurando escucha de clientes:", error);
  }

  // PRODUCTOS

  try {
    cancelarProductosInformes = onSnapshot(
      collection(window.db, "productos"),
      (snapshot) => {
        productosInformes = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

        renderizarInformes();
      },
      (error) => {
        console.error("Error cargando productos en Informes:", error);
      },
    );
  } catch (error) {
    console.error("Error configurando escucha de productos:", error);
  }
}

// ========================================
// RENDER PRINCIPAL
// ========================================

function renderizarInformes() {
  const ventasFiltradas = obtenerVentasFiltradasInformes();

  const gastosFiltrados = obtenerGastosFiltradosInformes();

  renderizarEstadisticasInformes(ventasFiltradas, gastosFiltrados);

  renderizarVentasPorDia(ventasFiltradas);

  renderizarVentasPorCuenta(ventasFiltradas);

  renderizarMediosPago(ventasFiltradas);

  renderizarVentasCategoria(ventasFiltradas);

  renderizarCategoriasVendidas(ventasFiltradas);

  renderizarEstadoCobros(ventasFiltradas);

  renderizarComparativaVentas(ventasFiltradas);

  renderizarTicketPromedio(ventasFiltradas);

  renderizarNuevosClientes(ventasFiltradas);

  renderizarGastosPorDia(gastosFiltrados);

  renderizarGastosCategoria(gastosFiltrados);

  renderizarProductosMasVendidos(ventasFiltradas);

  renderizarRentabilidadProductos(ventasFiltradas);

  renderizarClientesConMayorDeuda();

  renderizarDeudasAntiguas();

  renderizarResumenInformes(ventasFiltradas, gastosFiltrados);
}

// ========================================
// FILTROS DE VENTAS
// ========================================

function obtenerVentasFiltradasInformes() {
  return ventasInformes.filter((venta) => {
    const fecha = obtenerFechaVentaInforme(venta);

    if (!fecha) {
      return false;
    }

    if (fechaDesdeInforme && fecha < fechaDesdeInforme) {
      return false;
    }

    if (fechaHastaInforme && fecha > fechaHastaInforme) {
      return false;
    }

    if (usuarioInformeSeleccionado !== "general") {
      if (venta.usuario !== usuarioInformeSeleccionado) {
        return false;
      }
    }

    return true;
  });
}

function obtenerGastosFiltradosInformes() {
  return gastosInformes.filter((gasto) => {
    const fecha = obtenerFechaGastoInforme(gasto);

    if (!fecha) {
      return false;
    }

    if (fechaDesdeInforme && fecha < fechaDesdeInforme) {
      return false;
    }

    if (fechaHastaInforme && fecha > fechaHastaInforme) {
      return false;
    }

    if (usuarioInformeSeleccionado !== "general") {
      if (gasto.usuario !== usuarioInformeSeleccionado) {
        return false;
      }
    }

    return true;
  });
}

// ========================================
// FECHAS
// ========================================

function obtenerFechaVentaInforme(venta) {
  if (!venta) {
    return null;
  }

  const fecha = venta.fecha;

  if (!fecha) {
    return null;
  }

  if (fecha.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (fecha.seconds !== undefined) {
    return new Date(fecha.seconds * 1000);
  }

  if (fecha instanceof Date) {
    return fecha;
  }

  if (typeof fecha === "string") {
    const resultado = new Date(fecha);

    if (!isNaN(resultado.getTime())) {
      return resultado;
    }
  }

  return null;
}

function obtenerFechaGastoInforme(gasto) {
  if (!gasto) {
    return null;
  }

  const fecha = gasto.fecha;

  if (!fecha) {
    return null;
  }

  if (fecha.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (fecha.seconds !== undefined) {
    return new Date(fecha.seconds * 1000);
  }

  if (fecha instanceof Date) {
    return fecha;
  }

  if (typeof fecha === "string") {
    const resultado = new Date(fecha);

    if (!isNaN(resultado.getTime())) {
      return resultado;
    }
  }

  return null;
}

function inicioDelDiaInforme(fecha) {
  const resultado = new Date(fecha);

  resultado.setHours(0, 0, 0, 0);

  return resultado;
}

function finDelDiaInforme(fecha) {
  const resultado = new Date(fecha);

  resultado.setHours(23, 59, 59, 999);

  return resultado;
}

function formatearFechaInputInforme(fecha) {
  const año = fecha.getFullYear();

  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}

function formatearFechaInforme(fecha) {
  if (!fecha) {
    return "-";
  }

  const dia = String(fecha.getDate()).padStart(2, "0");

  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  const año = fecha.getFullYear();

  return `${dia}/${mes}/${año}`;
}

function formatearHoraInforme(fecha) {
  if (!fecha) {
    return "-";
  }

  const horas = String(fecha.getHours()).padStart(2, "0");

  const minutos = String(fecha.getMinutes()).padStart(2, "0");

  return `${horas}:${minutos}`;
}

// ========================================
// NÚMEROS
// ========================================

function obtenerNumeroInforme(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  if (typeof valor === "number") {
    return isNaN(valor) ? 0 : valor;
  }

  const texto = String(valor).trim().replace(/\s/g, "");

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

function formatearPrecioInforme(valor) {
  const numero = obtenerNumeroInforme(valor);

  return `$ ${numero.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ========================================
// DATOS DE VENTAS
// ========================================

function obtenerTotalVentaInforme(venta) {
  if (!venta) {
    return 0;
  }

  if (venta.total !== undefined) {
    return obtenerNumeroInforme(venta.total);
  }

  const totalBase = obtenerNumeroInforme(venta.totalBase);

  const recargo = obtenerNumeroInforme(venta.recargoTotal);

  return totalBase + recargo;
}

function obtenerCantidadProductosVentaInforme(venta) {
  if (!venta || !Array.isArray(venta.productos)) {
    return 0;
  }

  return venta.productos.reduce((total, producto) => {
    return total + obtenerNumeroInforme(producto.cantidad);
  }, 0);
}

function obtenerNombreClienteInforme(venta) {
  if (!venta || !venta.cliente) {
    return "Consumidor final";
  }

  const cliente = venta.cliente;

  const nombre = [cliente.nombre, cliente.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();

  return nombre || "Consumidor final";
}

// ========================================
// ESTADÍSTICAS
// ========================================

function renderizarEstadisticasInformes(ventas, gastos) {
  const totalVentas = ventas.reduce((total, venta) => {
    return total + obtenerTotalVentaInforme(venta);
  }, 0);

  const cantidadVentas = ventas.length;

  const productosVendidos = ventas.reduce((total, venta) => {
    if (!Array.isArray(venta.productos)) {
      return total;
    }

    return (
      total +
      venta.productos.reduce(
        (suma, producto) => suma + obtenerNumeroInforme(producto.cantidad),
        0,
      )
    );
  }, 0);

  const clientes = new Set();

  ventas.forEach((venta) => {
    if (venta.cliente?.id) {
      clientes.add(venta.cliente.id);
    }
  });

  const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

  const totalGastos = gastos.reduce((total, gasto) => {
    return total + obtenerNumeroInforme(gasto.monto);
  }, 0);

  establecerTextoInforme(
    "total-ventas-informes",
    formatearPrecioInforme(totalVentas),
  );

  establecerTextoInforme("cantidad-ventas-informes", cantidadVentas);

  establecerTextoInforme("productos-vendidos-informes", productosVendidos);

  establecerTextoInforme("clientes-informes", clientes.size);

  establecerTextoInforme(
    "ticket-promedio-informes",
    formatearPrecioInforme(ticketPromedio),
  );

  establecerTextoInforme(
    "total-gastos-informes",
    formatearPrecioInforme(totalGastos),
  );

  const resultado = totalVentas - totalGastos;

  establecerTextoInforme(
    "resultado-informes",
    formatearPrecioInforme(resultado),
  );

  const ventasPeriodoAnterior = obtenerVentasPeriodoAnteriorInforme();

  const cantidadVentasAnterior = ventasPeriodoAnterior.length;

  const productosVendidosAnterior = ventasPeriodoAnterior.reduce(
    (total, venta) => {
      if (!Array.isArray(venta.productos)) {
        return total;
      }

      return (
        total +
        venta.productos.reduce(
          (suma, producto) => suma + obtenerNumeroInforme(producto.cantidad),
          0,
        )
      );
    },
    0,
  );

  const clientesAnterior = new Set();

  ventasPeriodoAnterior.forEach((venta) => {
    if (venta.cliente?.id) {
      clientesAnterior.add(venta.cliente.id);
    }
  });

  const totalVentasAnterior = ventasPeriodoAnterior.reduce(
    (total, venta) => total + obtenerTotalVentaInforme(venta),
    0,
  );

  establecerComparacionInforme(
    "comparacion-ventas-informes",
    totalVentas,
    totalVentasAnterior,
  );

  establecerComparacionInforme(
    "comparacion-cantidad-informes",
    cantidadVentas,
    cantidadVentasAnterior,
  );

  establecerComparacionInforme(
    "comparacion-productos-informes",
    productosVendidos,
    productosVendidosAnterior,
  );

  establecerComparacionInforme(
    "comparacion-clientes-informes",
    clientes.size,
    clientesAnterior.size,
  );
}

function establecerTextoInforme(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.textContent = valor;
}

function establecerComparacionInforme(id, actual, anterior) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  actual = Number(actual) || 0;
  anterior = Number(anterior) || 0;

  elemento.classList.remove("positivo", "negativo");

  if (anterior === 0) {
    if (actual === 0) {
      elemento.textContent = "Sin cambios";
    } else {
      elemento.textContent = "+100% vs. período anterior";
      elemento.classList.add("positivo");
    }

    return;
  }

  const porcentaje = ((actual - anterior) / anterior) * 100;

  const signo = porcentaje > 0 ? "+" : "";

  elemento.textContent = `${signo}${porcentaje.toFixed(1)}% vs. período anterior`;

  if (porcentaje > 0) {
    elemento.classList.add("positivo");
  } else if (porcentaje < 0) {
    elemento.classList.add("negativo");
  }
}

// ========================================
// VENTAS POR DÍA
// ========================================

function renderizarVentasPorDia(ventas) {
  if (!ventas.length) {
    mostrarSinDatosGraficoInforme("grafico-ventas-dia");

    return;
  }

  const agrupadas = {};

  ventas.forEach((venta) => {
    const fecha = obtenerFechaVentaInforme(venta);

    if (!fecha) {
      return;
    }

    const clave = formatearFechaInforme(fecha);

    if (!agrupadas[clave]) {
      agrupadas[clave] = 0;
    }

    agrupadas[clave] += obtenerTotalVentaInforme(venta);
  });

  const entradas = Object.entries(agrupadas).sort((a, b) => {
    const fechaA = convertirFechaInforme(a[0]);

    const fechaB = convertirFechaInforme(b[0]);

    return fechaA - fechaB;
  });

  const labels = entradas.map(([fecha]) => fecha);

  const datos = entradas.map(([, total]) => total);

  const canvas = crearCanvasInforme("grafico-ventas-dia");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-ventas-dia"] = new Chart(canvas.getContext("2d"), {
    type: "bar",

    data: {
      labels,

      datasets: [
        {
          label: "Ventas",

          data: datos,

          borderWidth: 1,

          backgroundColor: "#2563eb",
        },
      ],
    },

    options: opcionesGraficoInforme("bar"),
  });
}

// ========================================
// CONVERSIÓN DE FECHA
// ========================================

function convertirFechaInforme(texto) {
  const partes = texto.split("/");

  if (partes.length !== 3) {
    return new Date(texto);
  }

  return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
}

// ========================================
// VENTAS POR CUENTA
// ========================================

function renderizarVentasPorCuenta(ventas) {
  const agrupadas = {};

  ventas.forEach((venta) => {
    const usuario = venta.usuario || "Sin usuario";

    if (!agrupadas[usuario]) {
      agrupadas[usuario] = 0;
    }

    agrupadas[usuario] += obtenerTotalVentaInforme(venta);
  });

  const entradas = Object.entries(agrupadas);

  if (!entradas.length) {
    mostrarSinDatosGraficoInforme("grafico-ventas-cuenta");

    return;
  }

  const labels = entradas.map(([usuario]) => usuario);

  const datos = entradas.map(([, total]) => total);

  const canvas = crearCanvasInforme("grafico-ventas-cuenta");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-ventas-cuenta"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "bar",

      data: {
        labels,

        datasets: [
          {
            label: "Ventas",

            data: datos,

            backgroundColor: obtenerColoresInforme(datos.length),

            borderWidth: 1,
          },
        ],
      },

      options: opcionesGraficoInforme("bar"),
    },
  );
}

// ========================================
// MEDIOS DE PAGO
// ========================================

function renderizarMediosPago(ventas) {
  const agrupados = {};

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.mediosPago)) {
      return;
    }

    venta.mediosPago.forEach((medio) => {
      const tipo = medio.tipo || "Sin especificar";

      const importe = obtenerNumeroInforme(medio.importe);

      if (!agrupados[tipo]) {
        agrupados[tipo] = 0;
      }

      agrupados[tipo] += importe;
    });
  });

  const entradas = Object.entries(agrupados);

  if (!entradas.length) {
    mostrarSinDatosGraficoInforme("grafico-medios-pago");

    return;
  }

  const labels = entradas.map(([tipo]) => tipo);

  const datos = entradas.map(([, importe]) => importe);

  const canvas = crearCanvasInforme("grafico-medios-pago");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-medios-pago"] = new Chart(canvas.getContext("2d"), {
    type: "doughnut",

    data: {
      labels,

      datasets: [
        {
          data: datos,

          backgroundColor: obtenerColoresInforme(datos.length),

          borderWidth: 1,
        },
      ],
    },

    options: opcionesGraficoInforme("doughnut"),
  });
}

// ========================================
// VENTAS POR CATEGORÍA
// ========================================

function renderizarVentasCategoria(ventas) {
  const agrupadas = {};

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((productoVenta) => {
      const producto = productosInformes.find(
        (item) => item.id === productoVenta.productoId,
      );

      const categoria = producto?.categoria || "Sin categoría";

      const subtotal = obtenerNumeroInforme(productoVenta.subtotal);

      if (!agrupadas[categoria]) {
        agrupadas[categoria] = 0;
      }

      agrupadas[categoria] += subtotal;
    });
  });

  const entradas = Object.entries(agrupadas);

  if (!entradas.length) {
    mostrarSinDatosGraficoInforme("grafico-ventas-categoria");

    return;
  }

  const labels = entradas.map(([categoria]) => categoria);

  const datos = entradas.map(([, total]) => total);

  const canvas = crearCanvasInforme("grafico-ventas-categoria");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-ventas-categoria"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "doughnut",

      data: {
        labels,

        datasets: [
          {
            data: datos,

            backgroundColor: obtenerColoresInforme(datos.length),

            borderWidth: 1,
          },
        ],
      },

      options: opcionesGraficoInforme("doughnut"),
    },
  );
}

// ========================================
// CATEGORÍAS MÁS VENDIDAS
// ========================================

function renderizarCategoriasVendidas(ventas) {
  const agrupadas = {};

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((productoVenta) => {
      const producto = productosInformes.find(
        (item) => item.id === productoVenta.productoId,
      );

      const categoria = producto?.categoria || "Sin categoría";

      const cantidad = obtenerNumeroInforme(productoVenta.cantidad);

      if (!agrupadas[categoria]) {
        agrupadas[categoria] = 0;
      }

      agrupadas[categoria] += cantidad;
    });
  });

  const entradas = Object.entries(agrupadas)
    .filter(([, cantidad]) => cantidad > 0)
    .sort(([, a], [, b]) => b - a);

  if (!entradas.length) {
    mostrarSinDatosGraficoInforme("grafico-categorias-vendidas");

    return;
  }

  const labels = entradas.map(([categoria]) => categoria);

  const datos = entradas.map(([, cantidad]) => cantidad);

  const total = datos.reduce((suma, cantidad) => suma + cantidad, 0);

  const canvas = crearCanvasInforme("grafico-categorias-vendidas");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-categorias-vendidas"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "doughnut",

      data: {
        labels,

        datasets: [
          {
            data: datos,

            backgroundColor: obtenerColoresInforme(datos.length),

            borderWidth: 2,
          },
        ],
      },

      options: {
        ...opcionesGraficoInforme("doughnut"),

        cutout: "62%",

        plugins: {
          legend: {
            display: true,
            position: "right",
          },

          tooltip: {
            callbacks: {
              label: (contexto) => {
                const valor = Number(contexto.raw) || 0;

                const porcentaje = total > 0 ? (valor / total) * 100 : 0;

                return `${contexto.label}: ${valor} unidades (${porcentaje.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    },
  );
}

// ========================================
// ESTADO DE COBROS
// ========================================

function renderizarEstadoCobros(ventas) {
  let cobrado = 0;

  /* ========================================
     COBRADO DE VENTAS
  ======================================== */

  ventas.forEach((venta) => {
    const total = obtenerNumeroInforme(venta.total);

    const saldo = Math.max(obtenerNumeroInforme(venta.saldoAdeber), 0);

    cobrado += Math.max(total - saldo, 0);
  });

  /* ========================================
     DEUDA TOTAL
     
     Usamos exactamente la misma función
     que utilizan:
     - Clientes con mayor deuda
     - Deudas más antiguas
     
     Esto incluye:
     - Deudas de ventas
     - Deudas iniciales
     - Intereses de deuda inicial
     - Pagos aplicados a deuda inicial
  ======================================== */

  const deudasClientes = obtenerDeudasClientesInforme();

  const deuda = deudasClientes.reduce(
    (total, cliente) => total + cliente.deuda,
    0,
  );

  /* ========================================
     MOSTRAR GRÁFICO
  ======================================== */

  if (cobrado <= 0 && deuda <= 0) {
    mostrarSinDatosGraficoInforme("grafico-estado-cobros");

    return;
  }

  const canvas = crearCanvasInforme("grafico-estado-cobros");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-estado-cobros"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "doughnut",

      data: {
        labels: ["Cobrado", "Con deuda"],

        datasets: [
          {
            data: [cobrado, deuda],

            backgroundColor: obtenerColoresInforme(2),

            borderWidth: 2,
          },
        ],
      },

      options: {
        ...opcionesGraficoInforme("doughnut"),

        cutout: "62%",

        plugins: {
          legend: {
            display: true,
            position: "right",
          },

          tooltip: {
            callbacks: {
              label: (contexto) =>
                `${contexto.label}: ${formatearPrecioInforme(contexto.raw)}`,
            },
          },
        },
      },
    },
  );
}

// ========================================
// COMPARATIVA DE VENTAS
// ========================================

function renderizarComparativaVentas(ventas) {
  const ventasPeriodoAnterior = obtenerVentasPeriodoAnteriorInforme();

  const datosActual = obtenerDatosDiariosVentasInforme(ventas);

  const datosAnterior = obtenerDatosDiariosVentasInforme(ventasPeriodoAnterior);

  const cantidad = Math.max(datosActual.length, datosAnterior.length);

  if (!cantidad) {
    mostrarSinDatosGraficoInforme("grafico-comparativa-ventas");

    return;
  }

  const labels = Array.from(
    {
      length: cantidad,
    },
    (_, indice) => {
      if (datosActual[indice]) {
        return formatearFechaCortaInforme(datosActual[indice].fecha);
      }

      if (datosAnterior[indice]) {
        return formatearFechaCortaInforme(datosAnterior[indice].fecha);
      }

      return "";
    },
  );

  const datosActualGrafico = Array.from(
    {
      length: cantidad,
    },
    (_, indice) => datosActual[indice]?.valor || 0,
  );

  const datosAnteriorGrafico = Array.from(
    {
      length: cantidad,
    },
    (_, indice) => datosAnterior[indice]?.valor || 0,
  );

  const canvas = crearCanvasInforme("grafico-comparativa-ventas");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-comparativa-ventas"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "bar",

      data: {
        labels,

        datasets: [
          {
            label: "Período actual",

            data: datosActualGrafico,

            borderRadius: 4,
          },

          {
            label: "Período anterior",

            data: datosAnteriorGrafico,

            borderRadius: 4,
          },
        ],
      },

      options: {
        ...opcionesGraficoInforme("bar"),

        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },

          tooltip: {
            callbacks: {
              label: (contexto) =>
                `${contexto.dataset.label}: ${formatearPrecioInforme(
                  contexto.raw,
                )}`,
            },
          },
        },

        scales: {
          y: {
            beginAtZero: true,

            ticks: {
              callback: (valor) => formatearPrecioInforme(valor),
            },
          },
        },
      },
    },
  );
}

// ========================================
// TICKET PROMEDIO
// ========================================

function renderizarTicketPromedio(ventas) {
  const datos = obtenerDatosTicketPromedioInforme(ventas);

  if (!datos.length) {
    mostrarSinDatosGraficoInforme("grafico-ticket-promedio");

    return;
  }

  const labels = datos.map((dato) => formatearFechaCortaInforme(dato.fecha));

  const valores = datos.map((dato) => dato.valor);

  const canvas = crearCanvasInforme("grafico-ticket-promedio");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-ticket-promedio"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "line",

      data: {
        labels,

        datasets: [
          {
            label: "Ticket promedio",

            data: valores,

            tension: 0.3,

            fill: false,

            pointRadius: 3,
          },
        ],
      },

      options: {
        ...opcionesGraficoInforme("line"),

        scales: {
          y: {
            beginAtZero: true,

            ticks: {
              callback: (valor) => formatearPrecioInforme(valor),
            },
          },
        },

        plugins: {
          tooltip: {
            callbacks: {
              label: (contexto) =>
                `Ticket: ${formatearPrecioInforme(contexto.raw)}`,
            },
          },
        },
      },
    },
  );
}

// ========================================
// NUEVOS CLIENTES
// ========================================

function renderizarNuevosClientes() {
  const datos = obtenerDatosNuevosClientesInforme();

  if (!datos.length) {
    mostrarSinDatosGraficoInforme("grafico-nuevos-clientes");

    return;
  }

  const labels = datos.map((dato) => formatearFechaCortaInforme(dato.fecha));

  const valores = datos.map((dato) => obtenerNumeroInforme(dato.valor));

  const canvas = crearCanvasInforme("grafico-nuevos-clientes");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-nuevos-clientes"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "bar",

      data: {
        labels,

        datasets: [
          {
            label: "Nuevos clientes",

            data: valores,

            borderRadius: 6,
          },
        ],
      },

      options: {
        ...opcionesGraficoInforme("bar"),

        scales: {
          y: {
            beginAtZero: true,

            ticks: {
              precision: 0,
            },
          },
        },
      },
    },
  );
}

// ========================================
// GASTOS POR DÍA
// ========================================

function renderizarGastosPorDia(gastos) {
  if (!gastos.length) {
    mostrarSinDatosGraficoInforme("grafico-gastos-dia");

    return;
  }

  const agrupados = {};

  gastos.forEach((gasto) => {
    const fecha = obtenerFechaGastoInforme(gasto);

    if (!fecha) {
      return;
    }

    const clave = formatearFechaInforme(fecha);

    if (!agrupados[clave]) {
      agrupados[clave] = 0;
    }

    agrupados[clave] += obtenerNumeroInforme(gasto.monto);
  });

  const entradas = Object.entries(agrupados).sort(
    (a, b) => convertirFechaInforme(a[0]) - convertirFechaInforme(b[0]),
  );

  if (!entradas.length) {
    mostrarSinDatosGraficoInforme("grafico-gastos-dia");

    return;
  }

  const labels = entradas.map(([fecha]) => fecha);

  const datos = entradas.map(([, total]) => total);

  const canvas = crearCanvasInforme("grafico-gastos-dia");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-gastos-dia"] = new Chart(canvas.getContext("2d"), {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Gastos",

          data: datos,

          tension: 0.3,

          fill: false,

          pointRadius: 3,
        },
      ],
    },

    options: {
      ...opcionesGraficoInforme("line"),

      scales: {
        y: {
          beginAtZero: true,

          ticks: {
            callback: (valor) => formatearPrecioInforme(valor),
          },
        },
      },

      plugins: {
        tooltip: {
          callbacks: {
            label: (contexto) =>
              `Gastos: ${formatearPrecioInforme(contexto.raw)}`,
          },
        },
      },
    },
  });
}

// ========================================
// GASTOS POR CATEGORÍA
// ========================================

function renderizarGastosCategoria(gastos) {
  const agrupadas = {};

  gastos.forEach((gasto) => {
    const categoria = gasto.categoria || "Sin categoría";

    const monto = obtenerNumeroInforme(gasto.monto);

    if (!agrupadas[categoria]) {
      agrupadas[categoria] = 0;
    }

    agrupadas[categoria] += monto;
  });

  const entradas = Object.entries(agrupadas)
    .filter(([, monto]) => monto > 0)
    .sort(([, a], [, b]) => b - a);

  if (!entradas.length) {
    mostrarSinDatosGraficoInforme("grafico-gastos-categoria");

    return;
  }

  const labels = entradas.map(([categoria]) => categoria);

  const datos = entradas.map(([, monto]) => monto);

  const total = datos.reduce((suma, monto) => suma + monto, 0);

  const canvas = crearCanvasInforme("grafico-gastos-categoria");

  if (!canvas) {
    return;
  }

  graficosInformes["grafico-gastos-categoria"] = new Chart(
    canvas.getContext("2d"),
    {
      type: "doughnut",

      data: {
        labels,

        datasets: [
          {
            data: datos,

            backgroundColor: obtenerColoresInforme(datos.length),

            borderWidth: 2,
          },
        ],
      },

      options: {
        ...opcionesGraficoInforme("doughnut"),

        cutout: "62%",

        plugins: {
          legend: {
            display: true,
            position: "right",
          },

          tooltip: {
            callbacks: {
              label: (contexto) => {
                const valor = Number(contexto.raw) || 0;

                const porcentaje = total > 0 ? (valor / total) * 100 : 0;

                return `${contexto.label}: ${formatearPrecioInforme(
                  valor,
                )} (${porcentaje.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    },
  );
}

function calcularDiasDesdeFechaInforme(fecha) {
  if (!fecha) {
    return null;
  }

  const ahora = new Date();

  const fechaNormalizada = inicioDelDiaInforme(new Date(fecha));

  const hoy = inicioDelDiaInforme(ahora);

  const diferencia = hoy.getTime() - fechaNormalizada.getTime();

  return Math.max(0, Math.floor(diferencia / 86400000));
}

// ========================================
// PRODUCTOS MÁS VENDIDOS
// ========================================

function renderizarProductosMasVendidos(ventas) {
  const contenedor = document.getElementById("lista-productos-mas-vendidos");

  if (!contenedor) {
    return;
  }

  const productos = {};

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((producto) => {
      const id = producto.productoId || producto.nombre || "sin-id";

      const nombre = producto.nombre || "Producto sin nombre";

      const cantidad = obtenerNumeroInforme(producto.cantidad);

      if (!productos[id]) {
        productos[id] = {
          nombre,
          cantidad: 0,
        };
      }

      productos[id].cantidad += cantidad;
    });
  });

  const ranking = Object.values(productos)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10);

  contenedor.innerHTML = "";

  if (!ranking.length) {
    mostrarSinDatosGraficoInforme("lista-productos-mas-vendidos");

    return;
  }

  const maximo = Math.max(...ranking.map((producto) => producto.cantidad), 1);

  ranking.forEach((producto, indice) => {
    const elemento = document.createElement("div");

    elemento.className = "item-ranking-informe";

    const porcentaje = (producto.cantidad / maximo) * 100;

    elemento.innerHTML = `

                <span class="numero-ranking-informe">
                    ${indice + 1}
                </span>

                <span class="nombre-ranking-informe">

                    ${escapeHTMLInforme(producto.nombre)}

                    <span class="barra-ranking-informe">
                        <span
                            style="width:${porcentaje}%"
                        ></span>
                    </span>

                </span>

                <span class="valor-ranking-informe">
                    ${producto.cantidad}
                </span>

            `;

    contenedor.appendChild(elemento);
  });
}

// ========================================
// RENTABILIDAD DE PRODUCTOS
// ========================================

function renderizarRentabilidadProductos(ventas) {
  let costoReposicion = 0;

  /* ========================================
     COSTO DE REPOSICIÓN
  ======================================== */

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((productoVenta) => {
      const productoBD = buscarProductoInforme(productoVenta.productoId);

      const precioCompra = obtenerNumeroInforme(productoBD?.precioCompra);

      const cantidad = obtenerNumeroInforme(productoVenta.cantidad);

      costoReposicion += precioCompra * cantidad;
    });
  });

  /* ========================================
     TOTAL VENDIDO
  ======================================== */

  const totalVendido = ventas.reduce(
    (total, venta) => total + obtenerTotalVentaInforme(venta),
    0,
  );

  /* ========================================
     GANANCIA BRUTA
  ======================================== */

  const gananciaBruta = totalVendido - costoReposicion;

  /* ========================================
     MARGEN BRUTO
  ======================================== */

  const margenBruto =
    totalVendido > 0 ? (gananciaBruta / totalVendido) * 100 : 0;

  /* ========================================
     MOSTRAR RESULTADOS
  ======================================== */

  establecerTextoInforme(
    "costo-reposicion-informes",
    formatearPrecioInforme(costoReposicion),
  );

  establecerTextoInforme(
    "ganancia-bruta-informes",
    formatearPrecioInforme(gananciaBruta),
  );

  establecerTextoInforme(
    "margen-bruto-informes",
    `${margenBruto.toFixed(1).replace(".", ",")} %`,
  );
}

// ========================================
// DEUDAS DE CLIENTES
// ========================================

function obtenerDeudasClientesInforme() {
  const deudasPorCliente = {};

  clientesInformes.forEach((cliente) => {
    if (!cliente?.id) {
      return;
    }

    deudasPorCliente[cliente.id] = {
      id: cliente.id,

      nombre:
        [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
        "Cliente",

      deuda: 0,

      ultimoMovimiento: null,
    };
  });

  /* ========================================
     DEUDAS DE VENTAS
  ======================================== */

  ventasInformes.forEach((venta) => {
    const cliente = venta.cliente;

    if (!cliente?.id) {
      return;
    }

    const saldo = obtenerNumeroInforme(venta.saldoAdeber);

    if (saldo <= 0) {
      return;
    }

    if (
      usuarioInformeSeleccionado !== "general" &&
      venta.usuario !== usuarioInformeSeleccionado
    ) {
      return;
    }

    if (!deudasPorCliente[cliente.id]) {
      deudasPorCliente[cliente.id] = {
        id: cliente.id,

        nombre:
          [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
          "Cliente",

        deuda: 0,

        ultimoMovimiento: null,
      };
    }

    deudasPorCliente[cliente.id].deuda += saldo;

    const fecha = obtenerFechaVentaInforme(venta);

    if (
      fecha &&
      (!deudasPorCliente[cliente.id].ultimoMovimiento ||
        fecha > deudasPorCliente[cliente.id].ultimoMovimiento)
    ) {
      deudasPorCliente[cliente.id].ultimoMovimiento = fecha;
    }
  });

  /* ========================================
     DEUDAS INICIALES
  ======================================== */

  clientesInformes.forEach((cliente) => {
    const movimientos = movimientosInformes[cliente.id] || [];

    /* ================================
       DEUDA INICIAL
    ================================ */

    let deudaInicial = movimientos
      .filter((movimiento) => {
        const tipo = String(movimiento.tipo || "")
          .trim()
          .toLowerCase();

        if (tipo !== "deuda_inicial") {
          return false;
        }

        if (
          usuarioInformeSeleccionado !== "general" &&
          movimiento.usuario !== usuarioInformeSeleccionado
        ) {
          return false;
        }

        return true;
      })
      .reduce(
        (total, movimiento) => total + obtenerNumeroInforme(movimiento.monto),
        0,
      );

    /* ================================
       INTERESES DE DEUDA INICIAL
    ================================ */

    const interesesIniciales = movimientos
      .filter((movimiento) => {
        const tipo = String(movimiento.tipo || "")
          .trim()
          .toLowerCase();

        if (tipo !== "interes") {
          return false;
        }

        if (movimiento.origen !== "deuda_inicial") {
          return false;
        }

        if (
          usuarioInformeSeleccionado !== "general" &&
          movimiento.usuario !== usuarioInformeSeleccionado
        ) {
          return false;
        }

        return true;
      })
      .reduce(
        (total, movimiento) => total + obtenerNumeroInforme(movimiento.monto),
        0,
      );

    /* ================================
       PAGOS APLICADOS A DEUDA INICIAL
    ================================ */

    const pagosIniciales = movimientos
      .filter(
        (movimiento) =>
          String(movimiento.tipo || "")
            .trim()
            .toLowerCase() === "pago",
      )
      .reduce((total, movimiento) => {
        const aplicaciones = Array.isArray(movimiento.aplicaciones)
          ? movimiento.aplicaciones
          : [];

        return (
          total +
          aplicaciones
            .filter(
              (aplicacion) =>
                aplicacion.tipo === "deuda_inicial" ||
                aplicacion.origen === "deuda_inicial",
            )
            .reduce(
              (acumulado, aplicacion) =>
                acumulado + obtenerNumeroInforme(aplicacion.monto),
              0,
            )
        );
      }, 0);

    /*
     * La deuda inicial actual es:
     *
     * deuda inicial
     * + intereses
     * - pagos aplicados
     */

    deudaInicial = Math.max(
      0,
      deudaInicial + interesesIniciales - pagosIniciales,
    );

    if (deudaInicial <= 0) {
      return;
    }

    if (!deudasPorCliente[cliente.id]) {
      deudasPorCliente[cliente.id] = {
        id: cliente.id,

        nombre:
          [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
          "Cliente",

        deuda: 0,

        ultimoMovimiento: null,
      };
    }

    deudasPorCliente[cliente.id].deuda += deudaInicial;

    /* ================================
       FECHA DE LA DEUDA INICIAL
    ================================ */

    const fechasDeudaInicial = movimientos
      .filter((movimiento) => {
        const tipo = String(movimiento.tipo || "")
          .trim()
          .toLowerCase();

        if (tipo !== "deuda_inicial") {
          return false;
        }

        if (
          usuarioInformeSeleccionado !== "general" &&
          movimiento.usuario !== usuarioInformeSeleccionado
        ) {
          return false;
        }

        return true;
      })
      .map((movimiento) => obtenerFechaMovimientoInforme(movimiento))
      .filter(Boolean);

    if (fechasDeudaInicial.length > 0) {
      const fechaMasReciente = new Date(
        Math.max(...fechasDeudaInicial.map((fecha) => fecha.getTime())),
      );

      if (
        !deudasPorCliente[cliente.id].ultimoMovimiento ||
        fechaMasReciente > deudasPorCliente[cliente.id].ultimoMovimiento
      ) {
        deudasPorCliente[cliente.id].ultimoMovimiento = fechaMasReciente;
      }
    }
  });

  return Object.values(deudasPorCliente).filter((cliente) => cliente.deuda > 0);
}

function obtenerFechaMovimientoInforme(movimiento) {
  if (!movimiento) {
    return null;
  }

  const fecha = movimiento.fecha || movimiento.creadoEn;

  if (!fecha) {
    return null;
  }

  if (fecha.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (fecha.seconds !== undefined) {
    return new Date(fecha.seconds * 1000);
  }

  if (fecha instanceof Date) {
    return fecha;
  }

  if (typeof fecha === "string") {
    const resultado = new Date(fecha);

    if (!isNaN(resultado.getTime())) {
      return resultado;
    }
  }

  return null;
}

// ========================================
// CLIENTES CON MAYOR DEUDA
// ========================================

function renderizarClientesConMayorDeuda() {
  const contenedor = document.getElementById("tabla-clientes-mayor-deuda");

  if (!contenedor) {
    return;
  }

  const deudas = obtenerDeudasClientesInforme();

  const ranking = deudas.sort((a, b) => b.deuda - a.deuda).slice(0, 5);

  if (!ranking.length) {
    mostrarSinDatosGraficoInforme("tabla-clientes-mayor-deuda");
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cliente</th>
          <th>Deuda total</th>
          <th>Último movimiento</th>
          <th>Días</th>
        </tr>
      </thead>

      <tbody>
  `;

  ranking.forEach((cliente, indice) => {
    const dias = calcularDiasDesdeFechaInforme(cliente.ultimoMovimiento);

    html += `
      <tr>

        <td>
          ${indice + 1}
        </td>

        <td>
          ${escapeHTMLInforme(cliente.nombre)}
        </td>

        <td class="deuda">
          ${formatearPrecioInforme(cliente.deuda)}
        </td>

        <td>
          ${
            cliente.ultimoMovimiento
              ? formatearFechaInforme(cliente.ultimoMovimiento)
              : "—"
          }
        </td>

        <td class="dias">
          ${dias !== null ? dias : "—"}
        </td>

      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  contenedor.innerHTML = html;
}

// ========================================
// DEUDAS MÁS ANTIGUAS
// ========================================

function renderizarDeudasAntiguas() {
  const contenedor = document.getElementById("tabla-deudas-antiguas");

  if (!contenedor) {
    return;
  }

  const deudas = [];

  /* ========================================
     DEUDAS DE VENTAS
  ======================================== */

  ventasInformes.forEach((venta) => {
    const saldo = obtenerNumeroInforme(venta.saldoAdeber);

    if (saldo <= 0) {
      return;
    }

    const cliente = venta.cliente;

    if (!cliente?.id) {
      return;
    }

    if (
      usuarioInformeSeleccionado !== "general" &&
      venta.usuario !== usuarioInformeSeleccionado
    ) {
      return;
    }

    const fecha = obtenerFechaVentaInforme(venta);

    if (!fecha) {
      return;
    }

    deudas.push({
      cliente:
        [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
        "Cliente",

      monto: saldo,

      fecha,
    });
  });

  /* ========================================
     DEUDAS INICIALES
  ======================================== */

  clientesInformes.forEach((cliente) => {
    const movimientos = movimientosInformes[cliente.id] || [];

    let deudaInicial = movimientos
      .filter((movimiento) => {
        const tipo = String(movimiento.tipo || "")
          .trim()
          .toLowerCase();

        if (tipo !== "deuda_inicial") {
          return false;
        }

        if (
          usuarioInformeSeleccionado !== "general" &&
          movimiento.usuario !== usuarioInformeSeleccionado
        ) {
          return false;
        }

        return true;
      })
      .reduce(
        (total, movimiento) => total + obtenerNumeroInforme(movimiento.monto),
        0,
      );

    const interesesIniciales = movimientos
      .filter((movimiento) => {
        const tipo = String(movimiento.tipo || "")
          .trim()
          .toLowerCase();

        if (tipo !== "interes") {
          return false;
        }

        if (movimiento.origen !== "deuda_inicial") {
          return false;
        }

        if (
          usuarioInformeSeleccionado !== "general" &&
          movimiento.usuario !== usuarioInformeSeleccionado
        ) {
          return false;
        }

        return true;
      })
      .reduce(
        (total, movimiento) => total + obtenerNumeroInforme(movimiento.monto),
        0,
      );

    const pagosIniciales = movimientos
      .filter(
        (movimiento) =>
          String(movimiento.tipo || "")
            .trim()
            .toLowerCase() === "pago",
      )
      .reduce((total, movimiento) => {
        const aplicaciones = Array.isArray(movimiento.aplicaciones)
          ? movimiento.aplicaciones
          : [];

        return (
          total +
          aplicaciones
            .filter(
              (aplicacion) =>
                aplicacion.tipo === "deuda_inicial" ||
                aplicacion.origen === "deuda_inicial",
            )
            .reduce(
              (acumulado, aplicacion) =>
                acumulado + obtenerNumeroInforme(aplicacion.monto),
              0,
            )
        );
      }, 0);

    deudaInicial = Math.max(
      0,
      deudaInicial + interesesIniciales - pagosIniciales,
    );

    if (deudaInicial <= 0) {
      return;
    }

    const fechas = movimientos
      .filter((movimiento) => {
        const tipo = String(movimiento.tipo || "")
          .trim()
          .toLowerCase();

        if (tipo !== "deuda_inicial") {
          return false;
        }

        if (
          usuarioInformeSeleccionado !== "general" &&
          movimiento.usuario !== usuarioInformeSeleccionado
        ) {
          return false;
        }

        return true;
      })
      .map((movimiento) => obtenerFechaMovimientoInforme(movimiento))
      .filter(Boolean);

    if (!fechas.length) {
      return;
    }

    const fecha = new Date(Math.min(...fechas.map((fecha) => fecha.getTime())));

    deudas.push({
      cliente:
        [cliente.nombre, cliente.apellido].filter(Boolean).join(" ").trim() ||
        "Cliente",

      monto: deudaInicial,

      fecha,
    });
  });

  /* ========================================
     ORDENAR
  ======================================== */

  deudas.sort((a, b) => a.fecha - b.fecha);

  if (!deudas.length) {
    mostrarSinDatosGraficoInforme("tabla-deudas-antiguas");
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cliente</th>
          <th>Monto pendiente</th>
          <th>Fecha de deuda</th>
          <th>Días</th>
        </tr>
      </thead>

      <tbody>
  `;

  deudas.slice(0, 5).forEach((deuda, indice) => {
    const dias = calcularDiasDesdeFechaInforme(deuda.fecha);

    html += `
      <tr>
        <td>${indice + 1}</td>

        <td>
          ${escapeHTMLInforme(deuda.cliente)}
        </td>

        <td class="deuda">
          ${formatearPrecioInforme(deuda.monto)}
        </td>

        <td>
          ${formatearFechaInforme(deuda.fecha)}
        </td>

        <td class="dias">
          ${dias !== null ? dias : "—"}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  contenedor.innerHTML = html;
}

// ========================================
// RESUMEN DEL INFORME
// ========================================

function renderizarResumenInformes(ventas, gastos) {
  // ========================================
  // VENTAS
  // ========================================

  const totalVentas = ventas.reduce(
    (total, venta) => total + obtenerTotalVentaInforme(venta),
    0,
  );

  const cantidadVentas = ventas.length;

  const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

  // ========================================
  // GASTOS
  // ========================================

  const totalGastos = gastos.reduce(
    (total, gasto) => total + obtenerNumeroInforme(gasto.monto),
    0,
  );

  // ========================================
  // RESULTADO
  // ========================================

  const resultado = totalVentas - totalGastos;

  // ========================================
  // PRODUCTOS VENDIDOS
  // ========================================

  const productosVendidos = ventas.reduce((total, venta) => {
    if (!Array.isArray(venta.productos)) {
      return total;
    }

    return (
      total +
      venta.productos.reduce(
        (suma, producto) => suma + obtenerNumeroInforme(producto.cantidad),
        0,
      )
    );
  }, 0);

  // ========================================
  // CLIENTES QUE COMPRARON
  // ========================================

  const clientes = new Set();

  ventas.forEach((venta) => {
    if (venta.cliente?.id) {
      clientes.add(venta.cliente.id);
    }
  });

  // ========================================
  // NUEVOS CLIENTES
  // ========================================

  const datosNuevosClientes = obtenerDatosNuevosClientesInforme();

  const nuevosClientes = datosNuevosClientes.reduce(
    (total, dato) => total + obtenerNumeroInforme(dato.valor),
    0,
  );

  // ========================================
  // VENTAS CON DEUDA
  // ========================================

  const ventasConDeuda = ventas.filter(
    (venta) => obtenerNumeroInforme(venta.saldoAdeber) > 0,
  ).length;

  // ========================================
  // PROMEDIO DIARIO
  // ========================================

  const diasPeriodo =
    fechaDesdeInforme && fechaHastaInforme
      ? Math.floor(
          (fechaHastaInforme.getTime() - fechaDesdeInforme.getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 1;

  const promedioDiario = diasPeriodo > 0 ? totalVentas / diasPeriodo : 0;

  // ========================================
  // COSTO DE PRODUCTOS
  // ========================================

  let costoProductos = 0;

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((productoVenta) => {
      const productoBD = buscarProductoInforme(productoVenta.productoId);

      const costo = obtenerNumeroInforme(productoBD?.precioCompra);

      const cantidad = obtenerNumeroInforme(productoVenta.cantidad);

      costoProductos += costo * cantidad;
    });
  });

  // ========================================
  // GANANCIA ESTIMADA
  // ========================================

  const ganancia = totalVentas - costoProductos;

  // ========================================
  // PRODUCTO MÁS VENDIDO
  // ========================================

  const productos = {};

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((producto) => {
      const nombre = producto.nombre || "Producto sin nombre";

      productos[nombre] =
        (productos[nombre] || 0) + obtenerNumeroInforme(producto.cantidad);
    });
  });

  const rankingProductos = Object.entries(productos).sort(
    ([, a], [, b]) => b - a,
  );

  const productoMasVendido = rankingProductos.length
    ? rankingProductos[0][0]
    : "—";

  // ========================================
  // CATEGORÍA MÁS VENDIDA
  // ========================================

  const categorias = {};

  ventas.forEach((venta) => {
    if (!Array.isArray(venta.productos)) {
      return;
    }

    venta.productos.forEach((productoVenta) => {
      const productoBD = buscarProductoInforme(productoVenta.productoId);

      const categoria = productoBD?.categoria || "Sin categoría";

      categorias[categoria] =
        (categorias[categoria] || 0) +
        obtenerNumeroInforme(productoVenta.cantidad);
    });
  });

  const rankingCategorias = Object.entries(categorias).sort(
    ([, a], [, b]) => b - a,
  );

  const categoriaMasVendida = rankingCategorias.length
    ? rankingCategorias[0][0]
    : "—";

  // ========================================
  // MOSTRAR DATOS
  // ========================================

  establecerTextoInforme(
    "resumen-total-ventas",
    formatearPrecioInforme(totalVentas),
  );

  establecerTextoInforme(
    "resumen-costo-productos",
    formatearPrecioInforme(costoProductos),
  );

  establecerTextoInforme("resumen-resultado", formatearPrecioInforme(ganancia));

  establecerTextoInforme("resumen-cantidad-productos", productosVendidos);

  establecerTextoInforme("resumen-clientes", clientes.size);

  establecerTextoInforme("resumen-nuevos-clientes", nuevosClientes);

  establecerTextoInforme("resumen-ventas-deuda", ventasConDeuda);

  establecerTextoInforme(
    "resumen-ticket-promedio",
    formatearPrecioInforme(ticketPromedio),
  );

  establecerTextoInforme(
    "resumen-total-gastos",
    formatearPrecioInforme(totalGastos),
  );

  establecerTextoInforme(
    "resumen-promedio-diario",
    formatearPrecioInforme(promedioDiario),
  );

  establecerTextoInforme("resumen-producto-mas-vendido", productoMasVendido);

  establecerTextoInforme("resumen-categoria-mas-vendida", categoriaMasVendida);
}

// ========================================
// DATOS PARA COMPARATIVA
// ========================================

function obtenerVentasPeriodoAnteriorInforme() {
  if (!fechaDesdeInforme || !fechaHastaInforme) {
    return [];
  }

  const diferencia = fechaHastaInforme.getTime() - fechaDesdeInforme.getTime();

  const fechaHastaAnterior = new Date(fechaDesdeInforme.getTime() - 1);

  const fechaDesdeAnterior = new Date(
    fechaHastaAnterior.getTime() - diferencia,
  );

  return ventasInformes.filter((venta) => {
    const fecha = obtenerFechaVentaInforme(venta);

    if (!fecha) {
      return false;
    }

    if (fecha < fechaDesdeAnterior) {
      return false;
    }

    if (fecha > fechaHastaAnterior) {
      return false;
    }

    if (
      usuarioInformeSeleccionado !== "general" &&
      venta.usuario !== usuarioInformeSeleccionado
    ) {
      return false;
    }

    return true;
  });
}

function obtenerDatosDiariosVentasInforme(ventas) {
  const agrupados = {};

  ventas.forEach((venta) => {
    const fecha = obtenerFechaVentaInforme(venta);

    if (!fecha) {
      return;
    }

    const clave = formatearFechaInforme(fecha);

    if (!agrupados[clave]) {
      agrupados[clave] = {
        fecha,
        valor: 0,
      };
    }

    agrupados[clave].valor += obtenerTotalVentaInforme(venta);
  });

  return Object.values(agrupados).sort((a, b) => a.fecha - b.fecha);
}

// ========================================
// DATOS DE TICKET PROMEDIO
// ========================================

function obtenerDatosTicketPromedioInforme(ventas) {
  const agrupados = {};

  ventas.forEach((venta) => {
    const fecha = obtenerFechaVentaInforme(venta);

    if (!fecha) {
      return;
    }

    const clave = formatearFechaInforme(fecha);

    if (!agrupados[clave]) {
      agrupados[clave] = {
        fecha,
        total: 0,
        cantidad: 0,
      };
    }

    agrupados[clave].total += obtenerTotalVentaInforme(venta);

    agrupados[clave].cantidad++;
  });

  return Object.values(agrupados)
    .map((dato) => ({
      fecha: dato.fecha,

      valor: dato.cantidad > 0 ? dato.total / dato.cantidad : 0,
    }))
    .sort((a, b) => a.fecha - b.fecha);
}

// ========================================
// NUEVOS CLIENTES
// ========================================

function obtenerDatosNuevosClientesInforme() {
  const agrupados = {};

  clientesInformes.forEach((cliente) => {
    const fecha = obtenerFechaClienteInforme(cliente);

    if (!fecha) {
      return;
    }

    if (fechaDesdeInforme && fecha < fechaDesdeInforme) {
      return;
    }

    if (fechaHastaInforme && fecha > fechaHastaInforme) {
      return;
    }

    const clave = formatearFechaInforme(fecha);

    if (!agrupados[clave]) {
      agrupados[clave] = {
        fecha,
        valor: 0,
      };
    }

    agrupados[clave].valor++;
  });

  return Object.values(agrupados).sort((a, b) => a.fecha - b.fecha);
}

// ========================================
// BUSCAR PRODUCTO
// ========================================

function buscarProductoInforme(productoId) {
  if (!productoId) {
    return null;
  }

  return (
    productosInformes.find((producto) => producto.id === productoId) || null
  );
}

function obtenerFechaClienteInforme(cliente) {
  if (!cliente) {
    return null;
  }

  const posiblesFechas = [
    cliente.creadoEn,
    cliente.fechaCreacion,
    cliente.fecha,
    cliente.creado,
  ];

  for (const valor of posiblesFechas) {
    if (!valor) {
      continue;
    }

    if (valor.toDate && typeof valor.toDate === "function") {
      return valor.toDate();
    }

    if (valor.seconds !== undefined) {
      return new Date(valor.seconds * 1000);
    }

    if (valor instanceof Date) {
      return valor;
    }

    if (typeof valor === "string") {
      const fecha = new Date(valor);

      if (!isNaN(fecha.getTime())) {
        return fecha;
      }
    }
  }

  return null;
}

// ========================================
// FECHA CORTA
// ========================================

function formatearFechaCortaInforme(fecha) {
  if (!fecha) {
    return "";
  }

  const dia = String(fecha.getDate()).padStart(2, "0");

  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  return `${dia}/${mes}`;
}

// ========================================
// ESCAPE HTML
// ========================================

function escapeHTMLInforme(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================================
// LIMPIEZA
// ========================================

window.limpiarInformes = function () {
  if (cancelarVentasInformes) {
    cancelarVentasInformes();

    cancelarVentasInformes = null;
  }

  if (cancelarGastosInformes) {
    cancelarGastosInformes();

    cancelarGastosInformes = null;
  }

  if (cancelarClientesInformes) {
    cancelarClientesInformes();

    cancelarClientesInformes = null;
  }

  if (cancelarProductosInformes) {
    cancelarProductosInformes();

    cancelarProductosInformes = null;
  }

  Object.keys(graficosInformes).forEach((id) => {
    destruirGraficoInforme(id);
  });

  ventasInformes = [];
  gastosInformes = [];
  clientesInformes = [];
  productosInformes = [];
};

// ========================================
// INICIO
// ========================================

inicializarInformes();
