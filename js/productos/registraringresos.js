let productosDisponiblesIngreso = [];

let productosSeleccionadosIngreso = [];

let productosListenerConfigurado = false;


/* ========================================
   ABRIR MODAL
======================================== */

window.abrirModalRegistrarIngresos = function () {

    const modal =
        document.getElementById(
            "modal-registrar-ingresos"
        );

    if (!modal) {

        console.error(
            "No se encontró el modal de registrar ingresos."
        );

        return;

    }


    productosSeleccionadosIngreso = [];


    const busqueda =
        document.getElementById(
            "busqueda-ingresos"
        );

    if (busqueda) {
        busqueda.value = "";
    }


    /*
     * Obtener los productos que ya están
     * cargados en la pantalla.
     */

    if (
        Array.isArray(window.productosDisponibles)
    ) {

        productosDisponiblesIngreso =
            window.productosDisponibles;

    }


    modal.classList.add("visible");


    renderizarProductosDisponiblesIngreso();

    renderizarProductosSeleccionadosIngreso();

};


/* ========================================
   CERRAR
======================================== */

function cerrarModalRegistrarIngresos() {

    const modal =
        document.getElementById(
            "modal-registrar-ingresos"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("visible");

}


/* ========================================
   PRODUCTOS DISPONIBLES
======================================== */

function renderizarProductosDisponiblesIngreso() {

    const contenedor =
        document.getElementById(
            "lista-productos-ingresos"
        );

    if (!contenedor) {
        return;
    }


    const texto =
        document
            .getElementById("busqueda-ingresos")
            ?.value
            .trim()
            .toLowerCase() || "";


    const productosFiltrados =
        productosDisponiblesIngreso.filter(
            (producto) => {

                if (!texto) {
                    return true;
                }


                return (
                    producto.nombre
                        .toLowerCase()
                        .includes(texto) ||

                    producto.categoria
                        .toLowerCase()
                        .includes(texto)
                );

            }
        );


    contenedor.innerHTML = "";


    productosFiltrados.forEach(
        (producto) => {

            const yaAgregado =
                productosSeleccionadosIngreso.some(
                    (seleccionado) =>
                        seleccionado.id === producto.id
                );


            const elemento =
                document.createElement("div");


            elemento.className =
                "producto-disponible-ingreso";


            const imagen =
                producto.imagen
                    ? `
                        <img
                            src="${producto.imagen}"
                            alt="${producto.nombre}"
                        >
                    `
                    : "";


            elemento.innerHTML = `

                <div class="imagen-producto-ingreso">

                    ${imagen}

                </div>


                <div class="info-producto-ingreso">

                    <strong>
                        ${escaparHTMLIngreso(
                            producto.nombre
                        )}
                    </strong>

                    <span>
                        ${escaparHTMLIngreso(
                            producto.categoria
                        )}
                    </span>

                </div>


                <button
                    type="button"
                    class="boton-agregar-ingreso"
                    ${yaAgregado ? "disabled" : ""}
                >
                    ${yaAgregado
                        ? "Agregado"
                        : "Agregar"}
                </button>

            `;


            const boton =
                elemento.querySelector(
                    ".boton-agregar-ingreso"
                );


            boton.addEventListener(
                "click",
                () => {

                    agregarProductoIngreso(
                        producto
                    );

                }
            );


            contenedor.appendChild(
                elemento
            );

        }
    );


    if (productosFiltrados.length === 0) {

        contenedor.innerHTML = `
            <div class="sin-productos-ingresos">
                <span>
                    No se encontraron productos.
                </span>
            </div>
        `;

    }

}


/* ========================================
   AGREGAR PRODUCTO
======================================== */

function agregarProductoIngreso(producto) {

    const existe =
        productosSeleccionadosIngreso.some(
            (seleccionado) =>
                seleccionado.id === producto.id
        );


    if (existe) {
        return;
    }


    /*
     * Crear una copia para que la carga
     * de ingreso no modifique el producto
     * original hasta guardar.
     */

    productosSeleccionadosIngreso.push({

        producto: producto,

        talles: []

    });


    renderizarProductosDisponiblesIngreso();

    renderizarProductosSeleccionadosIngreso();

}


/* ========================================
   RENDERIZAR SELECCIONADOS
======================================== */

function renderizarProductosSeleccionadosIngreso() {

    const contenedor =
        document.getElementById(
            "lista-ingresos-seleccionados"
        );

    const vacio =
        document.getElementById(
            "sin-productos-ingresos"
        );

    const contador =
        document.getElementById(
            "cantidad-productos-ingresos"
        );


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML = "";


    if (contador) {

        contador.textContent =
            `(${productosSeleccionadosIngreso.length})`;

    }


    if (vacio) {

        vacio.style.display =
            productosSeleccionadosIngreso.length === 0
                ? "flex"
                : "none";

    }


    productosSeleccionadosIngreso.forEach(
        (seleccionado) => {

            const producto =
                seleccionado.producto;


            const fila =
                document.createElement("div");


            fila.className =
                "fila-ingreso";


            const imagen =
                producto.imagen
                    ? `
                        <img
                            src="${producto.imagen}"
                            alt="${escaparHTMLIngreso(producto.nombre)}"
                        >
                    `
                    : `
                        <div class="sin-imagen-ingreso">
                            □
                        </div>
                    `;


            fila.innerHTML = `

                <!-- PRODUCTO -->

                <div class="producto-ingreso-seleccionado">

                    ${imagen}

                    <strong>
                        ${escaparHTMLIngreso(
                            producto.nombre
                        )}
                    </strong>

                </div>


                <!-- TALLES -->

                <div class="talles-ingreso"></div>


                <!-- CANTIDADES -->

                <div class="cantidades-ingreso"></div>


                <!-- ACCIONES -->

                <div class="acciones-ingreso">

                    <button
                        type="button"
                        class="boton-eliminar-ingreso"
                        title="Quitar producto"
                    >
                        🗑
                    </button>

                </div>

            `;


            const contenedorTalles =
                fila.querySelector(
                    ".talles-ingreso"
                );


            const contenedorCantidades =
                fila.querySelector(
                    ".cantidades-ingreso"
                );


            renderizarTallesIngreso(
                seleccionado,
                contenedorTalles,
                contenedorCantidades
            );


            /* ========================================
               ELIMINAR TODO EL PRODUCTO
            ======================================== */

            const botonEliminar =
                fila.querySelector(
                    ".boton-eliminar-ingreso"
                );


            botonEliminar.addEventListener(
                "click",
                () => {

                    productosSeleccionadosIngreso =
                        productosSeleccionadosIngreso.filter(
                            (item) =>
                                item.producto.id !==
                                producto.id
                        );


                    renderizarProductosDisponiblesIngreso();

                    renderizarProductosSeleccionadosIngreso();

                }
            );


            contenedor.appendChild(
                fila
            );

        }
    );

}


/* ========================================
   TALLES
======================================== */

function renderizarTallesIngreso(
    seleccionado,
    contenedorTalles,
    contenedorCantidades
) {

    contenedorTalles.innerHTML = "";

    contenedorCantidades.innerHTML = "";


    /*
     * Si todavía no hay ningún talle,
     * creamos uno automáticamente.
     */

    if (
        seleccionado.talles.length === 0
    ) {

        agregarTalleIngreso(
            seleccionado
        );

    }


    seleccionado.talles.forEach(
        (talle, indice) => {

            /* ========================================
               COLUMNA TALLE
            ======================================== */

            const filaTalle =
                document.createElement("div");


            filaTalle.className =
                "fila-talle-ingreso";


            const opciones =
                Array.isArray(
                    seleccionado.producto.talles
                )
                    ? seleccionado.producto.talles
                    : [];


            const opcionesHTML =
                opciones
                    .map(
                        (existente) => {

                            return `
                                <option
                                    value="${escaparHTMLIngreso(
                                        existente.talle
                                    )}"
                                    ${
                                        existente.talle ===
                                        talle.talle
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escaparHTMLIngreso(
                                        existente.talle
                                    )}
                                </option>
                            `;

                        }
                    )
                    .join("");


            filaTalle.innerHTML = `

                <select>

                    <option value="">
                        Talle
                    </option>

                    ${opcionesHTML}

                </select>


                <button
                    type="button"
                    class="boton-eliminar-talle-ingreso"
                    title="Eliminar talle"
                >
                    ×
                </button>

            `;


            const select =
                filaTalle.querySelector(
                    "select"
                );


            select.addEventListener(
                "change",
                () => {

                    talle.talle =
                        select.value;

                }
            );


            const botonEliminarTalle =
                filaTalle.querySelector(
                    ".boton-eliminar-talle-ingreso"
                );


            botonEliminarTalle.addEventListener(
                "click",
                () => {

                    seleccionado.talles.splice(
                        indice,
                        1
                    );


                    renderizarTallesIngreso(
                        seleccionado,
                        contenedorTalles,
                        contenedorCantidades
                    );

                }
            );


            contenedorTalles.appendChild(
                filaTalle
            );


            /* ========================================
               COLUMNA CANTIDAD
            ======================================== */

            const inputCantidad =
                document.createElement(
                    "input"
                );


            inputCantidad.type =
                "text";


            inputCantidad.inputMode =
                "numeric";


            inputCantidad.className =
                "cantidad-ingreso";


            inputCantidad.placeholder =
                "Cantidad";


            inputCantidad.value =
                talle.cantidad > 0
                    ? talle.cantidad
                    : "";


            inputCantidad.addEventListener(
                "input",
                () => {

                    inputCantidad.value =
                        inputCantidad.value.replace(
                            /\D/g,
                            ""
                        );


                    talle.cantidad =
                        Number(
                            inputCantidad.value
                        ) || 0;

                }
            );


            contenedorCantidades.appendChild(
                inputCantidad
            );

        }
    );


    /* ========================================
       BOTÓN AGREGAR TALLE
    ======================================== */

    const botonAgregar =
        document.createElement("button");


    botonAgregar.type =
        "button";


    botonAgregar.className =
        "boton-agregar-talle-ingreso";


    botonAgregar.textContent =
        "+ Agregar talle";


    botonAgregar.addEventListener(
        "click",
        () => {

            agregarTalleIngreso(
                seleccionado
            );


            renderizarTallesIngreso(
                seleccionado,
                contenedorTalles,
                contenedorCantidades
            );

        }
    );


    contenedorTalles.appendChild(
        botonAgregar
    );

}


/* ========================================
   AGREGAR FILA DE TALLE
======================================== */

function agregarTalleIngreso(
    seleccionado
) {

    seleccionado.talles.push({

        talle: "",

        cantidad: 0

    });

}


/* ========================================
   REGISTRAR INGRESO
======================================== */

async function registrarIngreso() {

    if (
        productosSeleccionadosIngreso.length === 0
    ) {

        alert(
            "Agregá al menos un producto."
        );

        return;

    }


    /*
     * Validar antes de tocar Firestore.
     */

    for (
        const seleccionado
        of productosSeleccionadosIngreso
    ) {

        const producto =
            seleccionado.producto;


        if (
            !Array.isArray(
                seleccionado.talles
            ) ||
            seleccionado.talles.length === 0
        ) {

            alert(
                `Agregá al menos un talle para "${producto.nombre}".`
            );

            return;

        }


        for (
            const talle
            of seleccionado.talles
        ) {

            if (!talle.talle) {

                alert(
                    `Seleccioná el talle de "${producto.nombre}".`
                );

                return;

            }


            if (
                !Number.isInteger(
                    Number(talle.cantidad)
                ) ||
                Number(talle.cantidad) <= 0
            ) {

                alert(
                    `Ingresá una cantidad válida para "${producto.nombre}".`
                );

                return;

            }

        }

    }


    const boton =
        document.getElementById(
            "registrar-ingreso"
        );


    try {

        boton.disabled = true;

        boton.textContent =
            "Registrando...";


        const {
            doc,
            runTransaction
        } = await import(
            "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js"
        );


        /*
         * Cada producto se actualiza dentro
         * de una transacción para evitar perder
         * cambios si Firestore recibe otra
         * modificación al mismo tiempo.
         */

        for (
            const seleccionado
            of productosSeleccionadosIngreso
        ) {

            const producto =
                seleccionado.producto;


            const referencia =
                doc(
                    window.db,
                    "productos",
                    producto.id
                );


            await runTransaction(
                window.db,
                async (transaction) => {

                    const documento =
                        await transaction.get(
                            referencia
                        );


                    if (!documento.exists()) {

                        throw new Error(
                            `El producto "${producto.nombre}" ya no existe.`
                        );

                    }


                    const datos =
                        documento.data();


                    const tallesActuales =
                        Array.isArray(
                            datos.talles
                        )
                            ? [...datos.talles]
                            : [];


                    seleccionado.talles.forEach(
                        (ingreso) => {

                            const indice =
                                tallesActuales.findIndex(
                                    (talle) =>
                                        String(
                                            talle.talle
                                        ) ===
                                        String(
                                            ingreso.talle
                                        )
                                );


                            const cantidad =
                                Number(
                                    ingreso.cantidad
                                ) || 0;


                            if (
                                indice >= 0
                            ) {

                                tallesActuales[
                                    indice
                                ] = {

                                    ...tallesActuales[
                                        indice
                                    ],

                                    stock:
                                        (
                                            Number(
                                                tallesActuales[
                                                    indice
                                                ].stock
                                            ) || 0
                                        ) +
                                        cantidad

                                };

                            } else {

                                tallesActuales.push({

                                    talle:
                                        ingreso.talle,

                                    stock:
                                        cantidad

                                });

                            }

                        }
                    );


                    const stockTotal =
                        tallesActuales.reduce(
                            (
                                total,
                                talle
                            ) => {

                                return (
                                    total +
                                    (
                                        Number(
                                            talle.stock
                                        ) || 0
                                    )
                                );

                            },
                            0
                        );


                    transaction.update(
                        referencia,
                        {
                            talles:
                                tallesActuales,

                            stock:
                                stockTotal
                        }
                    );

                }
            );

        }


        cerrarModalRegistrarIngresos();


        productosSeleccionadosIngreso =
            [];


    } catch (error) {

        console.error(
            "Error registrando ingresos:",
            error
        );


        alert(
            "No se pudieron registrar los ingresos."
        );

    } finally {

        boton.disabled = false;

        boton.textContent =
            "Registrar ingreso";

    }

}


/* ========================================
   ESCAPAR HTML
======================================== */

function escaparHTMLIngreso(
    texto
) {

    const div =
        document.createElement("div");

    div.textContent =
        texto ?? "";

    return div.innerHTML;

}


/* ========================================
   INICIALIZAR
======================================== */

function inicializarRegistrarIngresos() {

    const cerrar =
        document.getElementById(
            "cerrar-modal-ingresos"
        );


    const cancelar =
        document.getElementById(
            "cancelar-ingresos"
        );


    const vaciar =
        document.getElementById(
            "vaciar-lista-ingresos"
        );


    const registrar =
        document.getElementById(
            "registrar-ingreso"
        );


    const busqueda =
        document.getElementById(
            "busqueda-ingresos"
        );


    const modal =
        document.getElementById(
            "modal-registrar-ingresos"
        );


    cerrar?.addEventListener(
        "click",
        cerrarModalRegistrarIngresos
    );


    cancelar?.addEventListener(
        "click",
        cerrarModalRegistrarIngresos
    );


    vaciar?.addEventListener(
        "click",
        () => {

            productosSeleccionadosIngreso =
                [];


            renderizarProductosDisponiblesIngreso();

            renderizarProductosSeleccionadosIngreso();

        }
    );


    registrar?.addEventListener(
        "click",
        registrarIngreso
    );


    busqueda?.addEventListener(
        "input",
        renderizarProductosDisponiblesIngreso
    );


    modal?.addEventListener(
        "click",
        (evento) => {

            if (
                evento.target === modal
            ) {

                cerrarModalRegistrarIngresos();

            }

        }
    );

}


/*
 * El modal se carga dinámicamente,
 * por lo que no usamos DOMContentLoaded.
 */

inicializarRegistrarIngresos();