let ventasHistorialCompleto = [];

/* ========================================
   INICIALIZAR
======================================== */

function inicializarHistorialVentas() {
  const modal = document.getElementById("modal-historial-ventas");

  if (!modal) {
    console.error("No se encontró el modal de historial.");

    return;
  }

  document
    .getElementById("cerrar-modal-historial")
    ?.addEventListener("click", cerrarModalHistorialVentas);

  document
    .getElementById("boton-cerrar-historial")
    ?.addEventListener("click", cerrarModalHistorialVentas);

  document
    .getElementById("busqueda-historial-ventas")
    ?.addEventListener("input", renderizarHistorialVentas);

  document
    .getElementById("filtro-estado-historial")
    ?.addEventListener("change", renderizarHistorialVentas);

  document
    .getElementById("fecha-desde-historial")
    ?.addEventListener("change", renderizarHistorialVentas);

  document
    .getElementById("fecha-hasta-historial")
    ?.addEventListener("change", renderizarHistorialVentas);

  modal.addEventListener("click", (evento) => {
    if (evento.target === modal) {
      cerrarModalHistorialVentas();
    }
  });
}

/* ========================================
   ABRIR MODAL
======================================== */

window.abrirModalHistorialVentas = async function () {
  const modal = document.getElementById("modal-historial-ventas");

  if (!modal) {
    console.error("No existe el modal de historial.");

    return;
  }

  modal.classList.add("visible");

  const busqueda = document.getElementById("busqueda-historial-ventas");

  const filtro = document.getElementById("filtro-estado-historial");

  if (busqueda) {
    busqueda.value = "";
  }

  if (filtro) {
    filtro.value = "";
  }

  const fechaDesde = document.getElementById("fecha-desde-historial");

  const fechaHasta = document.getElementById("fecha-hasta-historial");

  if (fechaDesde) {
    fechaDesde.value = "";
  }

  if (fechaHasta) {
    fechaHasta.value = "";
  }

  const contenedor = document.getElementById("lista-historial-completo");

  if (contenedor) {
    contenedor.innerHTML = `
                <div class="historial-cargando">
                    Cargando ventas...
                </div>
            `;
  }

  await cargarVentasHistorial();

  renderizarHistorialVentas();
};

/* ========================================
   CERRAR
======================================== */

function cerrarModalHistorialVentas() {
  document
    .getElementById("modal-historial-ventas")
    ?.classList.remove("visible");
}

/* ========================================
   CARGAR VENTAS
======================================== */

async function cargarVentasHistorial() {
  try {
    const { collection, getDocs } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const usuarioActivo = sessionStorage.getItem("usuarioOperativo");

    if (!usuarioActivo) {
      ventasHistorialCompleto = [];

      return;
    }

    const snapshot = await getDocs(collection(window.db, "ventas"));

    ventasHistorialCompleto = snapshot.docs

      .map((documento) => ({
        id: documento.id,

        ...documento.data(),
      }))

      .filter((venta) => venta.usuario === usuarioActivo)

      .sort((a, b) => {
        const fechaA = obtenerFechaHistorial(a.fecha)?.getTime() || 0;

        const fechaB = obtenerFechaHistorial(b.fecha)?.getTime() || 0;

        return fechaB - fechaA;
      });
  } catch (error) {
    console.error("Error cargando historial de ventas:", error);

    ventasHistorialCompleto = [];

    const contenedor = document.getElementById("lista-historial-completo");

    if (contenedor) {
      contenedor.innerHTML = `
                <div class="historial-vacio-completo">
                    No se pudieron cargar las ventas.
                </div>
            `;
    }
  }
}

/* ========================================
   RENDERIZAR HISTORIAL
======================================== */

function renderizarHistorialVentas() {
  const contenedor = document.getElementById("lista-historial-completo");

  if (!contenedor) {
    return;
  }

  const busqueda =
    document
      .getElementById("busqueda-historial-ventas")
      ?.value.trim()
      .toLowerCase() || "";

  const filtro =
    document.getElementById("filtro-estado-historial")?.value || "";

  const fechaDesde =
    document.getElementById("fecha-desde-historial")?.value || "";

  const fechaHasta =
    document.getElementById("fecha-hasta-historial")?.value || "";

  const ventasFiltradas = ventasHistorialCompleto.filter((venta) => {
    /* ==========================
                   BUSQUEDA
                ========================== */

    const cliente = venta.cliente
      ? `${venta.cliente.nombre || ""} ${venta.cliente.apellido || ""}`
      : "cliente general";

    const numero = String(venta.numero || "").toLowerCase();

    const coincideBusqueda =
      !busqueda ||
      numero.includes(busqueda) ||
      cliente.toLowerCase().includes(busqueda);

    /* ==========================
                   ESTADO
                ========================== */

    const estado = Number(venta.saldoAdeber) > 0 ? "con_deuda" : "pagada";

    const coincideEstado = !filtro || estado === filtro;

    /* ==========================
                   FECHA
                ========================== */

    const fechaVenta = obtenerFechaHistorial(venta.fecha);

    let coincideFecha = true;

    if (fechaVenta) {
      const fechaVentaDia = new Date(fechaVenta);

      fechaVentaDia.setHours(0, 0, 0, 0);

      if (fechaDesde) {
        const desde = new Date(`${fechaDesde}T00:00:00`);

        if (fechaVentaDia < desde) {
          coincideFecha = false;
        }
      }

      if (fechaHasta && coincideFecha) {
        const hasta = new Date(`${fechaHasta}T00:00:00`);

        hasta.setHours(23, 59, 59, 999);

        if (fechaVentaDia > hasta) {
          coincideFecha = false;
        }
      }
    }

    return coincideBusqueda && coincideEstado && coincideFecha;
  });

  /* ==========================
       CANTIDAD
    ========================== */

  const cantidad = document.getElementById("cantidad-historial-ventas");

  if (cantidad) {
    cantidad.textContent = `${ventasFiltradas.length} ${
      ventasFiltradas.length === 1 ? "venta" : "ventas"
    }`;
  }

  contenedor.innerHTML = "";

  /* ==========================
       SIN RESULTADOS
    ========================== */

  if (!ventasFiltradas.length) {
    contenedor.innerHTML = `
            <div class="historial-vacio-completo">

                <strong>
                    No hay ventas para mostrar
                </strong>

                <span>
                    Probá cambiando los filtros.
                </span>

            </div>
        `;

    return;
  }

  /* ==========================
       MOSTRAR VENTAS
    ========================== */

  ventasFiltradas.forEach((venta) => {
    contenedor.appendChild(crearVentaHistorial(venta));
  });
}

/* ========================================
   CREAR VENTA
======================================== */

function crearVentaHistorial(venta) {
  const elemento = document.createElement("div");

  elemento.className = "item-historial-completo";

  const cliente = venta.cliente
    ? `${venta.cliente.nombre || ""} ${venta.cliente.apellido || ""}`.trim()
    : "Cliente general";

  const conDeuda = Number(venta.saldoAdeber) > 0;

  const productos = Array.isArray(venta.productos) ? venta.productos : [];

  elemento.innerHTML = `

        <div
            class="encabezado-item-historial"
        >

            <div class="numero-venta-historial">

                <strong>
                    #${escaparHistorial(venta.numero || venta.id)}
                </strong>

                <span>
                    ${formatearFechaHistorial(venta.fecha)}
                </span>

            </div>


            <div class="cliente-venta-historial">

                <strong>
                    ${escaparHistorial(cliente)}
                </strong>

                <span>
                    ${
                      venta.cliente
                        ? `DNI: ${escaparHistorial(venta.cliente.dni || "")}`
                        : "Sin cliente"
                    }
                </span>

            </div>


            <div class="total-historial">

                ${formatearPrecioHistorial(venta.total)}

            </div>


            <div
                class="estado-historial ${conDeuda ? "deuda" : "pagada"}"
            >

                ${conDeuda ? "● Con deuda" : "● Pagada"}

            </div>


            <div class="flecha-historial">
                ▾
            </div>

        </div>


        <div class="detalle-item-historial">

            <div class="tabla-detalle-venta">

                <div class="cabecera-detalle-venta">

                    <span>Producto</span>
                    <span>Talle</span>
                    <span>Cantidad</span>
                    <span>Precio unitario</span>
                    <span>Subtotal</span>

                </div>


                ${productos
                  .map(
                    (producto) => `

                            <div
                                class="fila-detalle-venta"
                            >

                                <div
                                    class="producto-detalle"
                                >

                                    <strong>
                                        ${escaparHistorial(
                                          producto.nombre || "",
                                        )}
                                    </strong>

                                </div>


                                <span>
                                    ${escaparHistorial(
                                      producto.talle || "Sin talle",
                                    )}
                                </span>


                                <span>
                                    ${Number(producto.cantidad) || 0}
                                </span>


                                <span>
                                    ${formatearPrecioHistorial(
                                      producto.precioUnitario,
                                    )}
                                </span>


                                <span>
                                    ${formatearPrecioHistorial(
                                      producto.subtotal,
                                    )}
                                </span>

                            </div>

                        `,
                  )
                  .join("")}

            </div>


            <div class="informacion-detalle-venta">

                <div class="bloque-detalle-venta">

                    <h4>Cliente</h4>

                    ${
                      venta.cliente
                        ? `
                                <p>
                                    <strong>
                                        ${escaparHistorial(
                                          `${venta.cliente.nombre || ""} ${venta.cliente.apellido || ""}`.trim(),
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    DNI:
                                    ${escaparHistorial(venta.cliente.dni || "")}
                                </p>

                                <p>
                                    Teléfono:
                                    ${escaparHistorial(
                                      venta.cliente.telefono || "",
                                    )}
                                </p>
                            `
                        : `
                                <p>
                                    Cliente general
                                </p>
                            `
                    }

                </div>


                <div class="bloque-detalle-venta">

                    <h4>Medios de pago</h4>

                    ${
                      Array.isArray(venta.mediosPago) && venta.mediosPago.length
                        ? venta.mediosPago
                            .map(
                              (medio) => `
                                        <p>
                                            ${formatearTipoPagoHistorial(
                                              medio.tipo,
                                            )}
                                            :
                                            <strong>
                                                ${formatearPrecioHistorial(
                                                  medio.importe,
                                                )}
                                            </strong>
                                        </p>
                                      `,
                            )
                            .join("")
                        : `
                                <p>
                                    Sin medios de pago
                                </p>
                            `
                    }

                </div>


                <div class="bloque-detalle-venta">

                    <h4>Resumen</h4>

                    <p>
                        Total:
                        <strong>
                            ${formatearPrecioHistorial(venta.total)}
                        </strong>
                    </p>

                    <p>
                        Entregado:
                        <strong>
                            ${formatearPrecioHistorial(venta.totalEntregado)}
                        </strong>
                    </p>

                </div>

            </div>


            <div class="resumen-detalle-venta">

                <div class="resumen-venta-item">

                    <span>Total a pagar</span>

                    <strong>
                        ${formatearPrecioHistorial(venta.total)}
                    </strong>

                </div>


                <div class="resumen-venta-item">

                    <span>Total entregado</span>

                    <strong>
                        ${formatearPrecioHistorial(venta.totalEntregado)}
                    </strong>

                </div>


                <div class="resumen-venta-item vuelto">

                    <span>Vuelto</span>

                    <strong>
                        ${formatearPrecioHistorial(venta.vuelto)}
                    </strong>

                </div>


                <div class="resumen-venta-item deuda">

                    <span>Saldo a deber</span>

                    <strong>
                        ${formatearPrecioHistorial(venta.saldoAdeber)}
                    </strong>

                </div>

            </div>


            ${
              venta.observaciones
                ? `
                        <div class="observaciones-historial">

                            <strong>
                                Observaciones:
                            </strong>

                            ${escaparHistorial(venta.observaciones)}

                        </div>
                    `
                : ""
            }

        </div>

    `;

  elemento
    .querySelector(".encabezado-item-historial")
    .addEventListener("click", () => {
      elemento.classList.toggle("abierto");
    });

  return elemento;
}

/* ========================================
   UTILIDADES
======================================== */

function formatearPrecioHistorial(valor) {
  return `$ ${(Number(valor) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatearFechaHistorial(fecha) {
  const fechaJS = obtenerFechaHistorial(fecha);

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

function obtenerFechaHistorial(fecha) {
  if (!fecha) {
    return null;
  }

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  const resultado = new Date(fecha);

  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function formatearTipoPagoHistorial(tipo) {
  const tipos = {
    efectivo: "Efectivo",

    transferencia: "Transferencia",

    debito: "Tarjeta de débito",

    credito: "Tarjeta de crédito",
  };

  return tipos[tipo] || tipo || "Otro";
}

function escaparHistorial(texto) {
  const div = document.createElement("div");

  div.textContent = texto ?? "";

  return div.innerHTML;
}

/* ========================================
   INICIALIZAR SCRIPT
======================================== */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarHistorialVentas);
} else {
  inicializarHistorialVentas();
}
