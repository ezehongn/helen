// ========================================
// FIREBASE FIRESTORE
// ========================================

import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// ========================================
// PRODUCTOS
// ========================================

// ========================================
// DATOS
// ========================================

let productos = [];

let paginaActual = 1;

let categoriasDisponibles = [];

let limitesStockProductos = {};

const productosPorPagina = 12;

// ========================================
// ELEMENTOS
// ========================================

const contenedorProductos = document.getElementById("contenedor-productos");

const cantidadProductos = document.getElementById("cantidad-productos");

const textoPaginacion = document.getElementById("texto-paginacion");

const numerosPagina = document.getElementById("numeros-pagina");

const busqueda = document.getElementById("busqueda-productos");

const filtroCategoria = document.getElementById("filtro-categoria");

const filtroEstado = document.getElementById("filtro-estado");

const orden = document.getElementById("orden-productos");

const botonLimpiarFiltros = document.getElementById("boton-limpiar-filtros");

const botonAnterior = document.getElementById("pagina-anterior");

const botonSiguiente = document.getElementById("pagina-siguiente");

const vistaGrilla = document.getElementById("vista-grilla");

const vistaLista = document.getElementById("vista-lista");

const botonAgregarProducto = document.getElementById("boton-agregar-producto");

const botonRegistrarIngresos = document.getElementById(
  "boton-registrar-ingresos",
);

// ========================================
// INICIALIZAR
// ========================================

window.productosListos = inicializarProductos();

async function inicializarProductos() {
  cargarCSSModal();

  await cargarModalRegistrarProducto();

  await cargarScriptModalRegistrarProducto();

  await cargarModalConsultarProducto();

  cargarCSSConsultarProducto();

  await cargarScriptModalConsultarProducto();

  await cargarModalNuevaCategoria();
  cargarCSSNuevaCategoria();
  await cargarScriptNuevaCategoria();

  await cargarModalRegistrarIngresos();
  cargarCSSRegistrarIngresos();
  await cargarScriptRegistrarIngresos();

  configurarEventos();

  iniciarEscuchaProductos();
}

// ========================================
// CARGAR PRODUCTOS DESDE FIRESTORE
// ========================================

let cancelarEscuchaProductos = null;

async function iniciarEscuchaProductos() {
  // ----------------------------------------
  // CANCELAR LISTENER ANTERIOR
  // ----------------------------------------

  if (cancelarEscuchaProductos) {
    cancelarEscuchaProductos();

    cancelarEscuchaProductos = null;
  }

  // ----------------------------------------
  // OBTENER USUARIO
  // ----------------------------------------

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (usuarioOperativo !== "Gon" && usuarioOperativo !== "Helen") {
    mostrarMensajeSinUsuario();

    return;
  }

  await cargarLimitesStockProductos();

  try {
    const { collection, query, where, onSnapshot } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referenciaProductos = collection(window.db, "productos");

    const consulta = query(
      referenciaProductos,
      where("creadoPor", "==", usuarioOperativo),
    );

    // ----------------------------------------
    // ESCUCHAR CAMBIOS
    // ----------------------------------------

    cancelarEscuchaProductos = onSnapshot(
      consulta,
      (snapshot) => {
        productos = snapshot.docs.map((documento) => {
          const datos = documento.data();

          const talles = Array.isArray(datos.talles) ? datos.talles : [];

          return {
            id: documento.id,

            nombre: datos.nombre || "Sin nombre",

            precioCompra: Number(datos.precioCompra) || 0,

            precio: Number(datos.precio) || 0,

            categoria: datos.categoria || "Sin categoría",

            estado: datos.estado || "activo",

            descripcion: datos.descripcion || "",

            talles,

            stock: Number(datos.stock) || 0,

            creadoPor: datos.creadoPor || "",

            creadoEn: datos.creadoEn || null,

            imagen: datos.imagen || "",
          };
        });

        window.productosDisponibles = productos;

        paginaActual = 1;

        renderizarCategorias();

        renderizarProductos();
      },
      (error) => {
        console.error("Error escuchando productos:", error);

        mostrarErrorProductos();
      },
    );
  } catch (error) {
    console.error("Error iniciando productos:", error);

    mostrarErrorProductos();
  }
}

async function cargarLimitesStockProductos() {
  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (usuarioOperativo !== "Gon" && usuarioOperativo !== "Helen") {
    limitesStockProductos = {};
    return;
  }

  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = doc(window.db, "configuracion", "general");

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      limitesStockProductos = {};

      return;
    }

    const datos = resultado.data();

    const limitesPorUsuario = datos.limitesStock || {};

    limitesStockProductos = limitesPorUsuario[usuarioOperativo] || {};

    console.log(
      "Límites de stock cargados:",
      usuarioOperativo,
      limitesStockProductos,
    );
  } catch (error) {
    console.error("Error cargando límites de stock:", error);

    limitesStockProductos = {};
  }
}

// ========================================
// CAMBIO DE USUARIO OPERATIVO
// ========================================

function manejarCambioUsuarioProductos() {
  iniciarEscuchaProductos();
}

window.addEventListener(
  "usuarioOperativoCambiado",
  manejarCambioUsuarioProductos,
);

// ========================================
// MENSAJE SIN USUARIO
// ========================================

function mostrarMensajeSinUsuario() {
  cantidadProductos.textContent = "0 productos";

  textoPaginacion.textContent = "No hay un usuario operativo seleccionado";

  contenedorProductos.innerHTML = `

        <div class="sin-productos">

            Seleccioná un usuario operativo
            para ver sus productos.

        </div>

    `;
}

// ========================================
// ERROR
// ========================================

function mostrarErrorProductos() {
  cantidadProductos.textContent = "0 productos";

  textoPaginacion.textContent = "No se pudieron cargar los productos";

  contenedorProductos.innerHTML = `

        <div class="sin-productos">

            No se pudieron cargar los productos.

        </div>

    `;
}

// ========================================
// CARGAR CSS DEL MODAL
// ========================================

function cargarCSSModal() {
  if (document.getElementById("css-registrar-producto")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-registrar-producto";

  link.rel = "stylesheet";

  link.href = "css/productos/registrarproducto.css";

  document.head.appendChild(link);
}

// ========================================
// CARGAR MODAL
// ========================================

async function cargarModalRegistrarProducto() {
  try {
    const respuesta = await fetch(
      "html/productos/registrarproducto-modal.html",
    );

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal.");
    }

    const html = await respuesta.text();

    document.getElementById("modales-productos").innerHTML = html;
  } catch (error) {
    console.error("Error cargando modal:", error);
  }
}

// ========================================
// CARGAR JS DEL MODAL
// ========================================

function cargarScriptModalRegistrarProducto() {
  return new Promise((resolve, reject) => {
    const scriptAnterior = document.getElementById("js-registrar-producto");
    if (scriptAnterior) {
      scriptAnterior.remove();
    }

    const script = document.createElement("script");

    script.id = "js-registrar-producto";
    script.type = "module";
    script.src = `js/productos/registrarproducto.js?t=${Date.now()}`;

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

// ========================================
// EVENTOS
// ========================================

function configurarEventos() {
  busqueda.addEventListener("input", () => {
    paginaActual = 1;

    renderizarProductos();
  });

  filtroCategoria.addEventListener("change", () => {
    paginaActual = 1;

    renderizarProductos();
  });

  filtroEstado.addEventListener("change", () => {
    paginaActual = 1;

    renderizarProductos();
  });

  orden.addEventListener("change", () => {
    paginaActual = 1;

    renderizarProductos();
  });

  botonLimpiarFiltros.addEventListener("click", limpiarFiltros);

  botonAnterior.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;

      renderizarProductos();
    }
  });

  botonSiguiente.addEventListener("click", () => {
    const productosFiltrados = obtenerProductosFiltrados();

    const totalPaginas = Math.ceil(
      productosFiltrados.length / productosPorPagina,
    );

    if (paginaActual < totalPaginas) {
      paginaActual++;

      renderizarProductos();
    }
  });

  vistaGrilla.addEventListener("click", () => {
    activarVista("grilla");
  });

  vistaLista.addEventListener("click", () => {
    activarVista("lista");
  });

  botonAgregarProducto.addEventListener("click", () => {
    if (window.abrirModalRegistrarProducto) {
      window.abrirModalRegistrarProducto();
    }
  });

  botonRegistrarIngresos?.addEventListener("click", () => {
    if (window.abrirModalRegistrarIngresos) {
      window.abrirModalRegistrarIngresos();
    }
  });
}

// ========================================
// LIMPIAR FILTROS
// ========================================

function limpiarFiltros() {
  busqueda.value = "";

  filtroCategoria.value = "";

  filtroEstado.value = "";

  orden.value = "nombre";

  paginaActual = 1;

  renderizarProductos();
}

// ========================================
// FILTRAR PRODUCTOS
// ========================================

function obtenerProductosFiltrados() {
  let resultado = [...productos];

  const texto = busqueda.value.trim().toLowerCase();

  if (texto) {
    resultado = resultado.filter((producto) => {
      return (
        producto.nombre.toLowerCase().includes(texto) ||
        producto.categoria.toLowerCase().includes(texto)
      );
    });
  }

  if (filtroCategoria.value) {
    resultado = resultado.filter(
      (producto) => producto.categoria === filtroCategoria.value,
    );
  }

  if (filtroEstado.value) {
    resultado = resultado.filter(
      (producto) => producto.estado === filtroEstado.value,
    );
  }

  switch (orden.value) {
    case "nombre":
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));

      break;

    case "precio-menor":
      resultado.sort((a, b) => a.precio - b.precio);

      break;

    case "precio-mayor":
      resultado.sort((a, b) => b.precio - a.precio);

      break;

    case "stock-menor":
      resultado.sort((a, b) => a.stock - b.stock);

      break;

    case "stock-mayor":
      resultado.sort((a, b) => b.stock - a.stock);

      break;
  }

  return resultado;
}

// ========================================
// RENDERIZAR PRODUCTOS
// ========================================

function renderizarProductos() {
  const filtrados = obtenerProductosFiltrados();

  const total = filtrados.length;

  cantidadProductos.textContent = `${total} ${
    total === 1 ? "producto" : "productos"
  }`;

  const totalPaginas = Math.max(1, Math.ceil(total / productosPorPagina));

  if (paginaActual > totalPaginas) {
    paginaActual = totalPaginas;
  }

  const inicio = (paginaActual - 1) * productosPorPagina;

  const productosPagina = filtrados.slice(inicio, inicio + productosPorPagina);

  contenedorProductos.innerHTML = "";

  productosPagina.forEach((producto) => {
    contenedorProductos.appendChild(crearTarjetaProducto(producto));
  });

  if (productosPagina.length === 0) {
    contenedorProductos.innerHTML = `

            <div class="sin-productos">

                No se encontraron productos.

            </div>

        `;
  }

  const desde = total === 0 ? 0 : inicio + 1;

  const hasta = Math.min(inicio + productosPorPagina, total);

  textoPaginacion.textContent = `Mostrando ${desde}–${hasta} de ${total} productos`;

  renderizarPaginacion(total);
}

// ========================================
// CREAR TARJETA
// ========================================

function crearTarjetaProducto(producto) {
  const tarjeta = document.createElement("article");

  tarjeta.className = "tarjeta-producto";

  const estado = obtenerEstadoStock(producto.stock, producto.categoria);

  const imagenHTML = producto.imagen
    ? `
                <img
                    src="${producto.imagen}"
                    alt="${producto.nombre}"
                >
            `
    : `
                <div class="producto-sin-imagen">
                    □
                </div>
            `;

  tarjeta.innerHTML = `

        <!-- ========================================
             MENÚ DE OPCIONES
             ======================================== -->

        <div class="menu-producto-contenedor">

            <button
                type="button"
                class="menu-producto"
                title="Opciones"
            >
                ⋮
            </button>


            <div class="opciones-producto">

    <button
        type="button"
        class="opcion-mover-producto"
    >
        <span>↔</span>
        Mover a ${producto.creadoPor === "Gon" ? "Helen" : "Gon"}
    </button>

    <button
        type="button"
        class="opcion-borrar-producto"
    >
        <span>🗑</span>
        Borrar producto
    </button>

</div>

        </div>


        <!-- ========================================
             IMAGEN
             ======================================== -->

        <div class="imagen-producto">

            ${imagenHTML}

        </div>


        <!-- ========================================
             NOMBRE
             ======================================== -->

        <div class="nombre-producto">

            ${producto.nombre}

        </div>


        <!-- ========================================
             PRECIO
             ======================================== -->

        <div class="precio-producto">

            ${formatearPrecio(producto.precio)}

        </div>


        <!-- ========================================
             STOCK
             ======================================== -->

        <div class="estado-stock ${estado.clase}">

            ${estado.texto}

        </div>

    `;

  // ========================================
  // ABRIR PRODUCTO
  // ========================================

  tarjeta.addEventListener("click", (evento) => {
    /*
     * Si se hizo click en cualquier
     * parte del menú, no abrir el
     * modal de edición.
     */

    if (evento.target.closest(".menu-producto-contenedor")) {
      return;
    }

    if (window.abrirModalConsultarProducto) {
      window.abrirModalConsultarProducto(producto);
    } else {
      console.error("ERROR: abrirModalConsultarProducto no está cargado");
    }
  });

  // ========================================
  // BOTÓN DE 3 PUNTOS
  // ========================================

  const botonMenu = tarjeta.querySelector(".menu-producto");

  const opcionesMenu = tarjeta.querySelector(".opciones-producto");

  botonMenu.addEventListener("click", (evento) => {
    evento.stopPropagation();

    /*
     * Cerrar otros menús abiertos.
     */

    document.querySelectorAll(".opciones-producto.visible").forEach((menu) => {
      if (menu !== opcionesMenu) {
        menu.classList.remove("visible");
      }
    });

    opcionesMenu.classList.toggle("visible");
  });

  // ========================================
  // BORRAR PRODUCTO
  // ========================================

  const botonMover = tarjeta.querySelector(".opcion-mover-producto");

  botonMover.addEventListener("click", async (evento) => {
    evento.stopPropagation();

    opcionesMenu.classList.remove("visible");

    const usuarioActual = producto.creadoPor;
    const usuarioDestino = usuarioActual === "Gon" ? "Helen" : "Gon";

    await moverProducto(producto, usuarioDestino);
  });

  const botonBorrar = tarjeta.querySelector(".opcion-borrar-producto");

  botonBorrar.addEventListener("click", async (evento) => {
    evento.stopPropagation();

    opcionesMenu.classList.remove("visible");

    const confirmar = confirm(
      `¿Querés borrar el producto "${producto.nombre}"?\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmar) {
      return;
    }

    await borrarProducto(producto);
  });

  return tarjeta;
}

async function borrarProducto(producto) {
  try {
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = doc(window.db, "productos", producto.id);

    await deleteDoc(referencia);

    console.log("Producto eliminado:", producto.nombre);
  } catch (error) {
    console.error("Error borrando producto:", error);

    alert("No se pudo borrar el producto.");
  }
}

async function moverProducto(producto, usuarioDestino) {
  try {
    const { doc, updateDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = doc(window.db, "productos", producto.id);

    await updateDoc(referencia, {
      creadoPor: usuarioDestino,
    });

    console.log(`Producto "${producto.nombre}" movido a ${usuarioDestino}`);
  } catch (error) {
    console.error("Error moviendo producto:", error);

    alert("No se pudo mover el producto.");
  }
}

// ========================================
// ESTADO STOCK
// ========================================

function obtenerEstadoStock(stock, categoria) {
  if (stock <= 0) {
    return {
      clase: "agotado",
      texto: "Agotado",
    };
  }

  const limite = Number(limitesStockProductos[categoria]);

  // Si no existe una configuración
  // para esta categoría, usamos 5
  const limiteStock = Number.isFinite(limite) ? limite : 5;

  if (stock <= limiteStock) {
    return {
      clase: "bajo",
      texto: "Bajo stock",
    };
  }

  return {
    clase: "disponible",
    texto: "Stock disponible",
  };
}

// ========================================
// FORMATEAR PRECIO
// ========================================

function formatearPrecio(valor) {
  return valor.toLocaleString("es-AR", {
    style: "currency",

    currency: "ARS",

    maximumFractionDigits: 0,
  });
}

// ========================================
// CATEGORÍAS
// ========================================

function renderizarCategorias() {
  const contenedor = document.getElementById("lista-categorias");

  if (!contenedor) {
    return;
  }

  // ========================================
  // CONTAR PRODUCTOS POR CATEGORÍA
  // ========================================

  const cantidades = {};

  productos.forEach((producto) => {
    const categoria = producto.categoria || "Sin categoría";

    if (!cantidades[categoria]) {
      cantidades[categoria] = 0;
    }

    cantidades[categoria]++;
  });

  // ========================================
  // CATEGORÍAS QUE SE MOSTRARÁN
  // ========================================

  /*
   * Usamos las categorías guardadas en Firestore.
   * De esta manera también aparecen las categorías
   * que todavía no tienen productos.
   */

  const categorias = [...categoriasDisponibles];

  /*
   * Por seguridad, agregamos también cualquier
   * categoría que exista en un producto pero que
   * todavía no esté en la colección "categorias".
   */

  productos.forEach((producto) => {
    const nombre = producto.categoria || "Sin categoría";

    const existe = categorias.some((categoria) => categoria.nombre === nombre);

    if (!existe) {
      categorias.push({
        nombre: nombre,
      });
    }
  });

  // ========================================
  // ORDENAR CATEGORÍAS
  // ========================================

  categorias.sort((a, b) => {
    return a.nombre.localeCompare(b.nombre, "es", {
      sensitivity: "base",
    });
  });

  // ========================================
  // ACTUALIZAR SELECT
  // ========================================

  const valorActual = filtroCategoria.value;

  filtroCategoria.innerHTML = `
        <option value="">
            Todas las categorías
        </option>
    `;

  categorias.forEach((categoria) => {
    const opcion = document.createElement("option");

    opcion.value = categoria.nombre;

    opcion.textContent = categoria.nombre;

    filtroCategoria.appendChild(opcion);
  });

  /*
   * Mantener el filtro seleccionado
   * si la categoría todavía existe.
   */

  if (
    valorActual &&
    categorias.some((categoria) => categoria.nombre === valorActual)
  ) {
    filtroCategoria.value = valorActual;
  }

  // ========================================
  // MOSTRAR CATEGORÍAS
  // ========================================

  contenedor.innerHTML = "";

  if (categorias.length === 0) {
    contenedor.innerHTML = `
            <div class="sin-categorias">
                No hay categorías creadas.
            </div>
        `;

    return;
  }

  categorias.forEach((categoria, indice) => {
    const nombre = categoria.nombre;

    const cantidad = cantidades[nombre] || 0;

    const item = document.createElement("div");

    item.className = "item-categoria";

    item.innerHTML = `

                <span
                    class="punto-categoria"
                    style="
                        background:
                        ${obtenerColorCategoria(indice)};
                    "
                ></span>


                <span class="nombre-categoria">

                    ${escaparHTML(nombre)}

                </span>


                <span class="cantidad-categoria">

                    ${cantidad}
                    ${cantidad === 1 ? "producto" : "productos"}

                </span>


                <button
                    type="button"
                    class="menu-categoria"
                >

                    ⋮

                </button>

            `;

    // ========================================
    // FILTRAR AL HACER CLICK
    // ========================================

    item.addEventListener("click", (evento) => {
      /*
       * Si se presionó el menú,
       * no aplicar el filtro.
       */

      if (evento.target.closest(".menu-categoria")) {
        return;
      }

      filtroCategoria.value = nombre;

      paginaActual = 1;

      renderizarProductos();
    });

    // ========================================
    // MENÚ DE CATEGORÍA
    // ========================================

    const botonMenuCategoria = item.querySelector(".menu-categoria");

    botonMenuCategoria.addEventListener("click", (evento) => {
      evento.stopPropagation();
    });

    contenedor.appendChild(item);
  });
}

window.actualizarCategoriasProductos = function () {
  if (Array.isArray(window.categoriasDisponibles)) {
    categoriasDisponibles = window.categoriasDisponibles;
  }

  renderizarCategorias();
};

function escaparHTML(texto) {
  const div = document.createElement("div");

  div.textContent = texto;

  return div.innerHTML;
}

// ========================================
// COLOR CATEGORÍA
// ========================================

function obtenerColorCategoria(indice) {
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

  return colores[indice % colores.length];
}

// ========================================
// PAGINACIÓN
// ========================================

function renderizarPaginacion(total) {
  const paginas = Math.max(1, Math.ceil(total / productosPorPagina));

  numerosPagina.innerHTML = "";

  for (let i = 1; i <= paginas; i++) {
    const boton = document.createElement("button");

    boton.type = "button";

    boton.className = "numero-pagina";

    if (i === paginaActual) {
      boton.classList.add("activo");
    }

    boton.textContent = i;

    boton.addEventListener("click", () => {
      paginaActual = i;

      renderizarProductos();
    });

    numerosPagina.appendChild(boton);
  }

  botonAnterior.disabled = paginaActual === 1;

  botonSiguiente.disabled = paginaActual === paginas;
}

// ========================================
// CAMBIAR VISTA
// ========================================

function activarVista(vista) {
  if (vista === "lista") {
    contenedorProductos.classList.add("vista-lista");

    vistaLista.classList.add("activo");

    vistaGrilla.classList.remove("activo");
  } else {
    contenedorProductos.classList.remove("vista-lista");

    vistaGrilla.classList.add("activo");

    vistaLista.classList.remove("activo");
  }
}

function cargarCSSConsultarProducto() {
  if (document.getElementById("css-consultar-producto")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-consultar-producto";

  link.rel = "stylesheet";

  link.href = "css/productos/consultarproducto.css";

  document.head.appendChild(link);
}

// ========================================
// CARGAR MODAL CONSULTAR
// ========================================

async function cargarModalConsultarProducto() {
  try {
    const contenedor = document.getElementById("modales-productos");

    if (!contenedor) {
      console.error("No se encontró #modales-productos.");
      return;
    }

    const respuesta = await fetch(
      "html/productos/consultarproductos-modal.html",
    );

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de consulta.");
    }

    const html = await respuesta.text();

    contenedor.insertAdjacentHTML("beforeend", html);
  } catch (error) {
    console.error("Error cargando modal consultar:", error);
  }
}

// ========================================
// CARGAR JS CONSULTAR
// ========================================

function cargarScriptModalConsultarProducto() {
  const existente = document.getElementById("js-consultar-producto");

  if (existente) {
    existente.remove();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.id = "js-consultar-producto";
    script.type = "module";
    script.src = `js/productos/consultarproducto.js?t=${Date.now()}`;

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

const botonNuevaCategoria = document.getElementById("nueva-categoria");

if (botonNuevaCategoria) {
  botonNuevaCategoria.addEventListener("click", () => {
    if (typeof window.abrirModalNuevaCategoria === "function") {
      window.abrirModalNuevaCategoria();
    } else {
      console.error("No se cargó el módulo de nueva categoría.");
    }
  });
}

async function cargarModalNuevaCategoria() {
  try {
    const respuesta = await fetch("html/productos/nueva-categoria-modal.html");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de nueva categoría.");
    }

    const html = await respuesta.text();

    document
      .getElementById("modales-productos")
      .insertAdjacentHTML("beforeend", html);
  } catch (error) {
    console.error("Error cargando modal de nueva categoría:", error);
  }
}

function cargarCSSNuevaCategoria() {
  if (document.getElementById("css-nueva-categoria")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-nueva-categoria";

  link.rel = "stylesheet";

  link.href = "css/productos/nueva-categoria.css";

  document.head.appendChild(link);
}

function cargarScriptNuevaCategoria() {
  return new Promise((resolve, reject) => {
    const scriptAnterior = document.getElementById("js-nueva-categoria");

    if (scriptAnterior) {
      scriptAnterior.remove();
    }

    const script = document.createElement("script");

    script.id = "js-nueva-categoria";
    script.type = "module";
    script.src = `js/productos/nueva-categoria.js?t=${Date.now()}`;

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

async function cargarModalRegistrarIngresos() {
  try {
    // Evita insertar el modal más de una vez
    if (document.getElementById("modal-registrar-ingresos")) {
      return;
    }

    const respuesta = await fetch(
      "html/productos/registraringresos-modal.html",
    );

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el modal de registrar ingresos.");
    }

    const html = await respuesta.text();

    const contenedor = document.getElementById("modales-productos");

    if (!contenedor) {
      console.error("No se encontró el contenedor #modales-productos.");
      return;
    }

    contenedor.insertAdjacentHTML("beforeend", html);
  } catch (error) {
    console.error("Error cargando modal de ingresos:", error);
  }
}

function cargarCSSRegistrarIngresos() {
  if (document.getElementById("css-registrar-ingresos")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-registrar-ingresos";

  link.rel = "stylesheet";

  link.href = "css/productos/registraringresos.css";

  document.head.appendChild(link);
}

function cargarScriptRegistrarIngresos() {
  return new Promise((resolve, reject) => {
    const existente = document.getElementById("js-registrar-ingresos");

    if (existente) {
      existente.remove();
    }

    const script = document.createElement("script");

    script.id = "js-registrar-ingresos";
    script.type = "module";
    script.src = `js/productos/registraringresos.js?t=${Date.now()}`;

    script.onload = resolve;
    script.onerror = reject;

    document.body.appendChild(script);
  });
}

window.limpiarProductos = function () {
  if (cancelarEscuchaProductos) {
    cancelarEscuchaProductos();
    cancelarEscuchaProductos = null;
  }

  window.removeEventListener(
    "usuarioOperativoCambiado",
    manejarCambioUsuarioProductos,
  );

  delete window.abrirModalRegistrarProducto;
  delete window.abrirModalConsultarProducto;
  delete window.abrirModalNuevaCategoria;
  delete window.abrirModalRegistrarIngresos;
  delete window.cargarCategorias;
  delete window.actualizarCategoriasProductos;
  delete window.recargarProductos;
  delete window.productosListos;

  // --------------------------------
  // ELIMINAR SCRIPTS DE LOS MODALES
  // --------------------------------

  const scriptsModales = [
    "js-registrar-producto",
    "js-consultar-producto",
    "js-nueva-categoria",
    "js-registrar-ingresos",
  ];

  scriptsModales.forEach((id) => {
    const script = document.getElementById(id);

    if (script) {
      script.remove();
    }
  });

  // --------------------------------
  // ELIMINAR MODALES
  // --------------------------------

  const modales = document.getElementById("modales-productos");

  if (modales) {
    modales.innerHTML = "";
  }
};
