/* ========================================
   HISTORIAL DE MOVIMIENTOS DEL CLIENTE
======================================== */

let clienteHistorialActual = null;

let movimientosHistorialCliente = [];

let movimientosHistorialFiltrados = [];


/* ========================================
   INICIALIZACIÓN
======================================== */

function inicializarHistorialCliente() {

    const modal = document.getElementById(
        "modal-historial-cliente"
    );

    if (!modal) {

        console.error(
            "No se encontró el modal de historial del cliente."
        );

        return;
    }


    /* ====================================
       CERRAR CON LA X
    ==================================== */

    const botonCerrar = document.getElementById(
        "cerrar-modal-historial-cliente"
    );


    if (botonCerrar) {

        botonCerrar.onclick = function (evento) {

            evento.preventDefault();

            evento.stopPropagation();

            cerrarHistorialCliente();

        };

    }


    /* ====================================
       CERRAR HACIENDO CLICK AFUERA
    ==================================== */

    modal.onclick = function (evento) {

        if (evento.target === modal) {

            cerrarHistorialCliente();

        }

    };


    /* ====================================
       BUSCADOR
    ==================================== */

    document
        .getElementById("busqueda-historial-cliente")
        ?.addEventListener(
            "input",
            aplicarFiltrosHistorialCliente
        );


    /* ====================================
       FILTRO
    ==================================== */

    document
        .getElementById("filtro-historial-cliente")
        ?.addEventListener(
            "change",
            aplicarFiltrosHistorialCliente
        );


    /* ====================================
       ORDEN
    ==================================== */

    document
        .getElementById("orden-historial-cliente")
        ?.addEventListener(
            "change",
            aplicarFiltrosHistorialCliente
        );


    /* ====================================
       TECLA ESC
    ==================================== */

    document.addEventListener(
        "keydown",
        manejarTeclaHistorialCliente
    );

}


/* ========================================
   ABRIR HISTORIAL
======================================== */

window.abrirHistorialCliente = async function (
    cliente
) {

    if (!cliente) {
        return;
    }


    const modal = document.getElementById(
        "modal-historial-cliente"
    );


    if (!modal) {

        console.error(
            "No se encontró el modal de historial."
        );

        return;
    }


    clienteHistorialActual = cliente;


    prepararEncabezadoHistorial(
        cliente
    );


    modal.classList.add("visible");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow = "hidden";


    mostrarEstadoHistorial(
        "Cargando movimientos..."
    );


    await cargarHistorialCliente(
        cliente
    );

};


/* ========================================
   CERRAR HISTORIAL
======================================== */

function cerrarHistorialCliente() {

    const modal = document.getElementById(
        "modal-historial-cliente"
    );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "visible"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow = "";


    clienteHistorialActual = null;

    movimientosHistorialCliente = [];

    movimientosHistorialFiltrados = [];

}


/* ========================================
   ESC
======================================== */

function manejarTeclaHistorialCliente(
    evento
) {

    const modal = document.getElementById(
        "modal-historial-cliente"
    );


    if (
        !modal ||
        !modal.classList.contains("visible")
    ) {

        return;

    }


    if (evento.key === "Escape") {

        cerrarHistorialCliente();

    }

}


/* ========================================
   ENCABEZADO
======================================== */

function prepararEncabezadoHistorial(
    cliente
) {

    const nombre =
        `${cliente.nombre || ""} ${
            cliente.apellido || ""
        }`
            .trim() ||
        "Sin nombre";


    const avatar =
        document.getElementById(
            "avatar-historial-cliente"
        );


    if (avatar) {

        avatar.textContent =
            obtenerInicialesHistorial(
                cliente
            );

    }


    const titulo =
        document.getElementById(
            "titulo-historial-cliente"
        );


    if (titulo) {

        titulo.textContent =
            `Historial de ${nombre}`;

    }


    const subtitulo =
        document.getElementById(
            "subtitulo-historial-cliente"
        );


    if (subtitulo) {

        const datos = [];


        if (cliente.dni) {

            datos.push(
                `DNI ${cliente.dni}`
            );

        }


        if (cliente.telefono) {

            datos.push(
                `☎ ${cliente.telefono}`
            );

        }


        subtitulo.textContent =
            datos.length > 0
                ? datos.join(" · ")
                : "Todos los movimientos registrados";

    }

}


/* ========================================
   CARGAR HISTORIAL
======================================== */

async function cargarHistorialCliente(
    cliente
) {

    try {

        const {
            collection,
            getDocs
        } = await import(
            "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
        );


        const movimientos = [];


        /* ====================================
           VENTAS
        ==================================== */

        const ventasSnapshot =
            await getDocs(
                collection(
                    window.db,
                    "ventas"
                )
            );


        ventasSnapshot.docs.forEach(
            (documento) => {

                const venta =
                    documento.data();


                if (
                    !ventaCorrespondeClienteHistorial(
                        venta,
                        cliente
                    )
                ) {

                    return;

                }


                movimientos.push(
                    crearMovimientoVenta(
                        documento.id,
                        venta
                    )
                );

            }
        );


        /* ====================================
           MOVIMIENTOS DEL CLIENTE
        ==================================== */

        const referenciaMovimientos =
            collection(
                window.db,
                "clientes",
                cliente.id,
                "movimientos"
            );


        const movimientosSnapshot =
            await getDocs(
                referenciaMovimientos
            );


        movimientosSnapshot.docs.forEach(
            (documento) => {

                const movimiento =
                    documento.data();


                const tipo =
                    normalizarTipoMovimiento(
                        movimiento.tipo
                    );


                if (
                    tipo !== "pago" &&
                    tipo !== "interes"
                ) {

                    return;

                }


                movimientos.push(
                    crearMovimientoCliente(
                        documento.id,
                        movimiento
                    )
                );

            }
        );


        movimientosHistorialCliente =
            movimientos
                .filter(Boolean)
                .sort(
                    (a, b) =>
                        obtenerFechaMovimiento(
                            b.fecha
                        ) -
                        obtenerFechaMovimiento(
                            a.fecha
                        )
                );


        actualizarResumenHistorial();

        aplicarFiltrosHistorialCliente();


    } catch (error) {

        console.error(
            "Error cargando historial del cliente:",
            error
        );


        movimientosHistorialCliente = [];

        movimientosHistorialFiltrados = [];


        mostrarEstadoHistorial(
            "No se pudieron cargar los movimientos.",
            true
        );

    }

}


/* ========================================
   CREAR MOVIMIENTO DE VENTA
======================================== */

function crearMovimientoVenta(
    ventaId,
    venta
) {

    const fecha =
        obtenerFechaMovimiento(
            venta.fecha
        );


    const productos =
        Array.isArray(
            venta.productos
        )
            ? venta.productos
            : [];


    const total =
        Number(
            venta.total
        ) || 0;


    const saldoAdeber =
        Number(
            venta.saldoAdeber
        ) || 0;


    const numero =
        venta.numero ||
        ventaId.slice(-6);


    const usuario =
        venta.usuario ||
        "Sin usuario";


    return {

        id:
            `venta_${ventaId}`,

        tipo:
            "venta",

        fecha:
            fecha,

        titulo:
            `Venta #${numero}`,

        descripcion:
            `${productos.length} ${
                productos.length === 1
                    ? "producto"
                    : "productos"
            } · ${
                venta.estado === "con_deuda"
                    ? "Con deuda"
                    : "Pagada"
            }`,

        monto:
            total,

        saldoAdeber:
            saldoAdeber,

        ventaId:
            ventaId,

        numero:
            numero,

        usuario:
            usuario,

        productos:
            productos,

        mediosPago:
            Array.isArray(
                venta.mediosPago
            )
                ? venta.mediosPago
                : [],

        totalEntregado:
            Number(
                venta.totalEntregado
            ) || 0,

        vuelto:
            Number(
                venta.vuelto
            ) || 0,

        estado:
            venta.estado ||
            (
                saldoAdeber > 0
                    ? "con_deuda"
                    : "pagada"
            ),

        observaciones:
            venta.observaciones ||
            "",

    };

}


/* ========================================
   CREAR MOVIMIENTO DE CLIENTE
======================================== */

function crearMovimientoCliente(
    movimientoId,
    movimiento
) {

    const tipo =
        normalizarTipoMovimiento(
            movimiento.tipo
        );


    const fecha =
        obtenerFechaMovimiento(
            movimiento.fecha
        );


    let monto = 0;


    if (tipo === "pago") {

        monto =
            Number(
                movimiento.monto
            ) || 0;

    }


    if (tipo === "interes") {

        monto =
            Number(
                movimiento.monto
            ) || 0;

    }


    let titulo =
        "Movimiento";


    let descripcion =
        "";


    if (tipo === "pago") {

        titulo =
            "Pago de deuda";


        descripcion =
            movimiento.descripcion ||
            (
                movimiento.medioPago
                    ? `Medio de pago: ${
                        movimiento.medioPago
                    }`
                    : "Pago registrado"
            );

    }


    if (tipo === "interes") {

        titulo =
            "Interés agregado";


        descripcion =
            movimiento.descripcion ||
            "Se agregó un interés a la deuda";

    }


    return {

        id:
            `${tipo}_${movimientoId}`,

        tipo:
            tipo,

        fecha:
            fecha,

        titulo:
            titulo,

        descripcion:
            descripcion,

        monto:
            monto,

        movimientoId:
            movimientoId,

        usuario:
            movimiento.usuario ||
            "Sin usuario",

        medioPago:
            movimiento.medioPago ||
            "",

        descripcionOriginal:
            movimiento.descripcion ||
            "",

        montoAplicado:
            Number(
                movimiento.montoAplicado
            ) || 0,

    };

}


/* ========================================
   VERIFICAR CLIENTE DE VENTA
======================================== */

function ventaCorrespondeClienteHistorial(
    venta,
    cliente
) {

    if (
        venta.clienteId &&
        venta.clienteId === cliente.id
    ) {

        return true;

    }


    if (
        venta.cliente &&
        typeof venta.cliente === "object"
    ) {

        if (
            venta.cliente.id &&
            venta.cliente.id === cliente.id
        ) {

            return true;

        }


        if (
            venta.cliente.dni &&
            cliente.dni &&
            String(
                venta.cliente.dni
            ) === String(
                cliente.dni
            )
        ) {

            return true;

        }


        const nombreVenta =
            `${venta.cliente.nombre || ""} ${
                venta.cliente.apellido || ""
            }`
                .trim()
                .toLowerCase();


        const nombreCliente =
            `${cliente.nombre || ""} ${
                cliente.apellido || ""
            }`
                .trim()
                .toLowerCase();


        if (
            nombreVenta &&
            nombreCliente &&
            nombreVenta === nombreCliente
        ) {

            return true;

        }

    }


    return false;

}


/* ========================================
   FILTROS
======================================== */

function aplicarFiltrosHistorialCliente() {

    let resultado =
        [
            ...movimientosHistorialCliente
        ];


    const busqueda =
        document
            .getElementById(
                "busqueda-historial-cliente"
            )
            ?.value
            .trim()
            .toLowerCase() || "";


    if (busqueda) {

        resultado =
            resultado.filter(
                (movimiento) => {

                    const texto = [

                        movimiento.titulo,

                        movimiento.descripcion,

                        movimiento.usuario,

                        movimiento.medioPago,

                        movimiento.numero,

                        ...(
                            Array.isArray(
                                movimiento.productos
                            )
                                ? movimiento.productos.map(
                                    (producto) =>
                                        producto.nombre
                                )
                                : []
                        ),

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return texto.includes(
                        busqueda
                    );

                }
            );

    }


    const filtro =
        document
            .getElementById(
                "filtro-historial-cliente"
            )
            ?.value ||
        "todos";


    if (
        filtro !== "todos"
    ) {

        resultado =
            resultado.filter(
                (movimiento) =>
                    movimiento.tipo ===
                    filtro
            );

    }


    const orden =
        document
            .getElementById(
                "orden-historial-cliente"
            )
            ?.value ||
        "reciente";


    resultado.sort(
        (a, b) => {

            const fechaA =
                obtenerFechaMovimiento(
                    a.fecha
                );


            const fechaB =
                obtenerFechaMovimiento(
                    b.fecha
                );


            if (
                orden === "antiguo"
            ) {

                return fechaA - fechaB;

            }


            return fechaB - fechaA;

        }
    );


    movimientosHistorialFiltrados =
        resultado;


    renderizarHistorialCliente();

}


/* ========================================
   RENDERIZAR HISTORIAL
======================================== */

function renderizarHistorialCliente() {

    const lista =
        document.getElementById(
            "lista-historial-cliente"
        );


    if (!lista) {
        return;
    }


    lista.innerHTML = "";


    if (
        movimientosHistorialFiltrados.length === 0
    ) {

        lista.innerHTML = `

            <div class="sin-resultados-historial">

                No se encontraron movimientos.

            </div>

        `;


        actualizarPieHistorial(0);

        return;

    }


    movimientosHistorialFiltrados.forEach(
        (movimiento) => {

            lista.appendChild(
                crearElementoMovimiento(
                    movimiento
                )
            );

        }
    );


    actualizarPieHistorial(
        movimientosHistorialFiltrados.length
    );

}


/* ========================================
   CREAR ELEMENTO MOVIMIENTO
======================================== */

function crearElementoMovimiento(
    movimiento
) {

    const contenedor =
        document.createElement(
            "div"
        );


    contenedor.className =
        "movimiento-historial";


    const cabecera =
        document.createElement(
            "button"
        );


    cabecera.type =
        "button";


    cabecera.className =
        "cabecera-movimiento-historial";


    cabecera.innerHTML = `

        <div
            class="
                icono-movimiento-historial
                ${movimiento.tipo}
            "
        >
            ${obtenerIconoMovimiento(
                movimiento.tipo
            )}
        </div>


        <div
            class="info-movimiento-historial"
        >

            <span
                class="titulo-movimiento-historial"
            >
                ${escaparHTMLHistorial(
                    movimiento.titulo
                )}
            </span>


            <span
                class="
                    descripcion-movimiento-historial
                "
            >
                ${escaparHTMLHistorial(
                    movimiento.descripcion
                )}
            </span>

        </div>


        <div
            class="fecha-movimiento-historial"
        >

            <strong>
                ${formatearFechaHistorial(
                    movimiento.fecha
                )}
            </strong>

            ${formatearHoraHistorial(
                movimiento.fecha
            )}

        </div>


        <div
            class="
                monto-movimiento-historial
                ${movimiento.tipo}
            "
        >

            <strong>

                ${
                    movimiento.tipo === "pago"
                        ? "-"
                        : ""
                }${
                    movimiento.tipo === "interes"
                        ? "+"
                        : ""
                }${formatearPrecioHistorial(
                    movimiento.monto
                )}

            </strong>


            <span>
                ${textoTipoMovimiento(
                    movimiento.tipo
                )}
            </span>

        </div>


        <span
            class="flecha-movimiento-historial"
        >
            ▾
        </span>

    `;


    const detalle =
        document.createElement(
            "div"
        );


    detalle.className =
        "detalle-movimiento-historial";


    detalle.innerHTML =
        construirDetalleMovimiento(
            movimiento
        );


    cabecera.addEventListener(
        "click",
        function () {

            contenedor.classList.toggle(
                "abierto"
            );

        }
    );


    contenedor.appendChild(
        cabecera
    );


    contenedor.appendChild(
        detalle
    );


    return contenedor;

}


/* ========================================
   DETALLE MOVIMIENTO
======================================== */

function construirDetalleMovimiento(
    movimiento
) {

    if (
        movimiento.tipo === "venta"
    ) {

        return construirDetalleVenta(
            movimiento
        );

    }


    if (
        movimiento.tipo === "pago"
    ) {

        return construirDetallePago(
            movimiento
        );

    }


    if (
        movimiento.tipo === "interes"
    ) {

        return construirDetalleInteres(
            movimiento
        );

    }


    return "";

}


/* ========================================
   DETALLE VENTA
======================================== */

function construirDetalleVenta(
    movimiento
) {

    let html = `

        <div class="detalle-grid-historial">

            <div class="dato-detalle-historial">

                <span>
                    Número de venta
                </span>

                <strong>
                    #${escaparHTMLHistorial(
                        movimiento.numero
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Total
                </span>

                <strong>
                    ${formatearPrecioHistorial(
                        movimiento.monto
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Estado
                </span>

                <strong>
                    ${
                        movimiento.estado ===
                        "con_deuda"
                            ? "Con deuda"
                            : "Pagada"
                    }
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Entregado
                </span>

                <strong>
                    ${formatearPrecioHistorial(
                        movimiento.totalEntregado
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Saldo registrado
                </span>

                <strong>
                    ${formatearPrecioHistorial(
                        movimiento.saldoAdeber
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Usuario
                </span>

                <strong>
                    ${escaparHTMLHistorial(
                        movimiento.usuario
                    )}
                </strong>

            </div>

        </div>

    `;


    /* ====================================
       PRODUCTOS
    ==================================== */

    if (
        Array.isArray(
            movimiento.productos
        ) &&
        movimiento.productos.length > 0
    ) {

        html += `

            <div
                class="
                    productos-detalle-historial
                "
            >

                <div
                    class="
                        titulo-productos-historial
                    "
                >
                    Productos de la venta
                </div>

        `;


        movimiento.productos.forEach(
            (producto) => {

                const cantidad =
                    Number(
                        producto.cantidad
                    ) || 0;


                const precio =
                    Number(
                        producto.precioUnitario ??
                        producto.precio
                    ) || 0;


                const subtotal =
                    Number(
                        producto.subtotal
                    ) ||
                    precio * cantidad;


                html += `

                    <div
                        class="
                            producto-detalle-historial
                        "
                    >

                        <div
                            class="
                                nombre-producto-historial
                            "
                        >
                            ${escaparHTMLHistorial(
                                producto.nombre ||
                                "Producto"
                            )}
                        </div>


                        <div
                            class="
                                talle-producto-historial
                            "
                        >
                            ${
                                producto.talle
                                    ? `Talle ${
                                        escaparHTMLHistorial(
                                            producto.talle
                                        )
                                    }`
                                    : "Sin talle"
                            }
                        </div>


                        <div
                            class="
                                cantidad-producto-historial
                            "
                        >
                            x${cantidad}
                        </div>


                        <div
                            class="
                                subtotal-producto-historial
                            "
                        >
                            ${formatearPrecioHistorial(
                                subtotal
                            )}
                        </div>

                    </div>

                `;

            }
        );


        html += `

            </div>

        `;

    }


    /* ====================================
       MEDIOS DE PAGO
    ==================================== */

    if (
        Array.isArray(
            movimiento.mediosPago
        ) &&
        movimiento.mediosPago.length > 0
    ) {

        const medios =
            movimiento.mediosPago
                .map(
                    (medio) => {

                        const nombre =
                            medio.tipo ||
                            "Medio de pago";


                        /*
                         * IMPORTANTE:
                         *
                         * En ventas el campo
                         * se guarda como:
                         *
                         * medio.importe
                         */

                        const importe =
                            Number(
                                medio.importe
                            ) || 0;


                        return `${nombre}: ${
                            formatearPrecioHistorial(
                                importe
                            )
                        }`;

                    }
                )
                .join(" · ");


        html += `

            <div
                class="texto-extra-historial"
            >

                <strong>
                    Medios de pago:
                </strong>

                ${escaparHTMLHistorial(
                    medios
                )}

            </div>

        `;

    }


    if (
        movimiento.observaciones
    ) {

        html += `

            <div
                class="texto-extra-historial"
            >

                <strong>
                    Observaciones:
                </strong>

                ${escaparHTMLHistorial(
                    movimiento.observaciones
                )}

            </div>

        `;

    }


    return html;

}


/* ========================================
   DETALLE PAGO
======================================== */

function construirDetallePago(
    movimiento
) {

    return `

        <div class="detalle-grid-historial">

            <div class="dato-detalle-historial">

                <span>
                    Monto
                </span>

                <strong>
                    ${formatearPrecioHistorial(
                        movimiento.monto
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Medio de pago
                </span>

                <strong>
                    ${
                        escaparHTMLHistorial(
                            movimiento.medioPago ||
                            "No especificado"
                        )
                    }
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Usuario
                </span>

                <strong>
                    ${escaparHTMLHistorial(
                        movimiento.usuario
                    )}
                </strong>

            </div>

        </div>


        ${
            movimiento.descripcionOriginal
                ? `
                    <div
                        class="texto-extra-historial"
                    >

                        <strong>
                            Descripción:
                        </strong>

                        ${escaparHTMLHistorial(
                            movimiento.descripcionOriginal
                        )}

                    </div>
                `
                : ""
        }

    `;

}


/* ========================================
   DETALLE INTERÉS
======================================== */

function construirDetalleInteres(
    movimiento
) {

    return `

        <div class="detalle-grid-historial">

            <div class="dato-detalle-historial">

                <span>
                    Interés agregado
                </span>

                <strong>
                    ${formatearPrecioHistorial(
                        movimiento.monto
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Usuario
                </span>

                <strong>
                    ${escaparHTMLHistorial(
                        movimiento.usuario
                    )}
                </strong>

            </div>


            <div class="dato-detalle-historial">

                <span>
                    Fecha
                </span>

                <strong>
                    ${formatearFechaHistorial(
                        movimiento.fecha
                    )}
                </strong>

            </div>

        </div>


        ${
            movimiento.descripcionOriginal
                ? `
                    <div
                        class="texto-extra-historial"
                    >

                        <strong>
                            Descripción:
                        </strong>

                        ${escaparHTMLHistorial(
                            movimiento.descripcionOriginal
                        )}

                    </div>
                `
                : ""
        }

    `;

}


/* ========================================
   RESUMEN
======================================== */

function actualizarResumenHistorial() {

    const total =
        movimientosHistorialCliente.length;


    const totalCompras =
        movimientosHistorialCliente
            .filter(
                (movimiento) =>
                    movimiento.tipo ===
                    "venta"
            )
            .reduce(
                (
                    acumulado,
                    movimiento
                ) =>
                    acumulado +
                    (
                        Number(
                            movimiento.monto
                        ) || 0
                    ),
                0
            );


    const totalPagos =
        movimientosHistorialCliente
            .filter(
                (movimiento) =>
                    movimiento.tipo ===
                    "pago"
            )
            .reduce(
                (
                    acumulado,
                    movimiento
                ) =>
                    acumulado +
                    (
                        Number(
                            movimiento.monto
                        ) || 0
                    ),
                0
            );


    const totalIntereses =
        movimientosHistorialCliente
            .filter(
                (movimiento) =>
                    movimiento.tipo ===
                    "interes"
            )
            .reduce(
                (
                    acumulado,
                    movimiento
                ) =>
                    acumulado +
                    (
                        Number(
                            movimiento.monto
                        ) || 0
                    ),
                0
            );


    const totalMovimientos =
        document.getElementById(
            "historial-total-movimientos"
        );


    const compras =
        document.getElementById(
            "historial-total-compras"
        );


    const pagos =
        document.getElementById(
            "historial-total-pagos"
        );


    const intereses =
        document.getElementById(
            "historial-total-intereses"
        );


    if (totalMovimientos) {

        totalMovimientos.textContent =
            String(total);

    }


    if (compras) {

        compras.textContent =
            formatearPrecioHistorial(
                totalCompras
            );

    }


    if (pagos) {

        pagos.textContent =
            formatearPrecioHistorial(
                totalPagos
            );

    }


    if (intereses) {

        intereses.textContent =
            formatearPrecioHistorial(
                totalIntereses
            );

    }

}


/* ========================================
   PIE
======================================== */

function actualizarPieHistorial(
    cantidad
) {

    const elemento =
        document.getElementById(
            "texto-paginacion-historial"
        );


    if (!elemento) {
        return;
    }


    if (cantidad === 0) {

        elemento.textContent =
            "0 movimientos";

        return;

    }


    elemento.textContent =
        cantidad === 1
            ? "1 movimiento"
            : `${cantidad} movimientos`;

}


/* ========================================
   ESTADO
======================================== */

function mostrarEstadoHistorial(
    mensaje,
    error = false
) {

    const lista =
        document.getElementById(
            "lista-historial-cliente"
        );


    if (!lista) {
        return;
    }


    lista.innerHTML = "";


    const estado =
        document.createElement(
            "div"
        );


    estado.className =
        "estado-historial-cliente";


    if (error) {

        estado.classList.add(
            "error"
        );

    }


    estado.textContent =
        mensaje;


    lista.appendChild(
        estado
    );

}


/* ========================================
   UTILIDADES
======================================== */

function obtenerFechaMovimiento(
    fecha
) {

    if (!fecha) {
        return 0;
    }


    if (
        typeof fecha.toDate ===
        "function"
    ) {

        return fecha
            .toDate()
            .getTime();

    }


    if (
        fecha instanceof Date
    ) {

        return fecha.getTime();

    }


    if (
        typeof fecha ===
        "number"
    ) {

        return fecha;

    }


    const fechaConvertida =
        new Date(fecha);


    if (
        !Number.isNaN(
            fechaConvertida.getTime()
        )
    ) {

        return fechaConvertida.getTime();

    }


    return 0;

}


function formatearFechaHistorial(
    fecha
) {

    const timestamp =
        obtenerFechaMovimiento(
            fecha
        );


    if (!timestamp) {

        return "Sin fecha";

    }


    return new Date(
        timestamp
    ).toLocaleDateString(
        "es-AR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );

}


function formatearHoraHistorial(
    fecha
) {

    const timestamp =
        obtenerFechaMovimiento(
            fecha
        );


    if (!timestamp) {

        return "";

    }


    return new Date(
        timestamp
    ).toLocaleTimeString(
        "es-AR",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );

}


function formatearPrecioHistorial(
    valor
) {

    const numero =
        Number(valor) || 0;


    return numero.toLocaleString(
        "es-AR",
        {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }
    );

}


function obtenerInicialesHistorial(
    cliente
) {

    const nombre =
        String(
            cliente?.nombre || ""
        ).trim();


    const apellido =
        String(
            cliente?.apellido || ""
        ).trim();


    if (
        !nombre &&
        !apellido
    ) {

        return "--";

    }


    return (
        `${nombre.charAt(0)}${
            apellido.charAt(0)
        }`
    )
        .toUpperCase();

}


function normalizarTipoMovimiento(
    tipo
) {

    const valor =
        String(
            tipo || ""
        )
            .trim()
            .toLowerCase();


    if (
        valor === "pago" ||
        valor === "pagodeuda"
    ) {

        return "pago";

    }


    if (
        valor === "interes" ||
        valor === "interés"
    ) {

        return "interes";

    }


    return valor;

}


function textoTipoMovimiento(
    tipo
) {

    if (tipo === "venta") {

        return "Venta";

    }


    if (tipo === "pago") {

        return "Pago";

    }


    if (tipo === "interes") {

        return "Interés";

    }


    return "Movimiento";

}


function obtenerIconoMovimiento(
    tipo
) {

    if (tipo === "venta") {

        return "🛒";

    }


    if (tipo === "pago") {

        return "$";

    }


    if (tipo === "interes") {

        return "%";

    }


    return "•";

}


function escaparHTMLHistorial(
    valor
) {

    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}