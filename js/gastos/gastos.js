/* ========================================
   GASTOS
======================================== */

let gastoEditandoId = null;

let gastos = [];

let categoriasGastos = [];

/* ========================================
   INICIALIZACIÓN
======================================== */

function inicializarGastos() {
  cargarCSSGastos();

  configurarEventosGastos();

  renderizarCategoriasGastos();

  actualizarSelectCategoriasGastos();

  establecerFechaActualGasto();

  iniciarEscuchaGastos();

  iniciarEscuchaCategoriasGastos();
}

/* ========================================
   CSS
======================================== */

function cargarCSSGastos() {
  if (document.getElementById("css-gastos")) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-gastos";
  link.rel = "stylesheet";
  link.href = "css/gastos/gastos.css";

  document.head.appendChild(link);
}

/* ========================================
   EVENTOS
======================================== */

function configurarEventosGastos() {
  document
    .getElementById("busqueda-gastos")
    ?.addEventListener("input", renderizarGastos);

  document
    .getElementById("filtro-categoria-gastos")
    ?.addEventListener("change", renderizarGastos);

  document
    .getElementById("filtro-estado-gastos")
    ?.addEventListener("change", renderizarGastos);

  document
    .getElementById("filtro-periodo-desde")
    ?.addEventListener("change", renderizarGastos);

  document
    .getElementById("filtro-periodo-hasta")
    ?.addEventListener("change", renderizarGastos);

  document
    .getElementById("guardar-gasto")
    ?.addEventListener("click", guardarGasto);

  document
    .getElementById("limpiar-filtros-gastos")
    ?.addEventListener("click", limpiarFiltrosGastos);

  document
    .getElementById("nueva-categoria-gasto")
    ?.addEventListener("click", abrirModalCategoriaGasto);

  document
    .getElementById("cerrar-modal-categoria-gasto")
    ?.addEventListener("click", cerrarModalCategoriaGasto);

  document
    .getElementById("cancelar-modal-categoria-gasto")
    ?.addEventListener("click", cerrarModalCategoriaGasto);

  document
    .getElementById("guardar-categoria-gasto")
    ?.addEventListener("click", guardarCategoriaGasto);

  document
    .getElementById("nombre-nueva-categoria-gasto")
    ?.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        guardarCategoriaGasto();
      }
    });
}

let cancelarEscuchaGastos = null;

async function iniciarEscuchaGastos() {
  if (cancelarEscuchaGastos) {
    cancelarEscuchaGastos();
    cancelarEscuchaGastos = null;
  }

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (!usuarioOperativo) {
    gastos = [];
    renderizarGastos();
    actualizarEstadisticasGastos();
    renderizarCategoriasGastos();
    return;
  }

  try {
    const { collection, query, where, onSnapshot } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    if (!window.db) {
      throw new Error("Firebase Firestore no está inicializado.");
    }

    const referenciaGastos = collection(window.db, "gastos");

    const consulta = query(
      referenciaGastos,
      where("usuario", "==", usuarioOperativo),
    );

    cancelarEscuchaGastos = onSnapshot(
      consulta,
      (snapshot) => {
        gastos = snapshot.docs.map((documento) => {
          const datos = documento.data();

          return {
            id: documento.id,
            fecha: datos.fecha || "",
            descripcion: datos.descripcion || "",
            categoria: datos.categoria || "",
            proveedor: datos.proveedor || "",
            monto: Number(datos.monto) || 0,
            estado: datos.estado || "pagado",
            notas: datos.notas || "",
            usuario: datos.usuario || "",
            creadoEn: datos.creadoEn || null,
          };
        });

        gastos.sort((a, b) => {
          return String(b.fecha).localeCompare(String(a.fecha));
        });

        renderizarGastos();
        renderizarCategoriasGastos();
        actualizarEstadisticasGastos();
      },
      (error) => {
        console.error("Error escuchando gastos:", error);
      },
    );
  } catch (error) {
    console.error("Error iniciando gastos:", error);
  }
}

let cancelarEscuchaCategoriasGastos = null;

async function iniciarEscuchaCategoriasGastos() {
  if (cancelarEscuchaCategoriasGastos) {
    cancelarEscuchaCategoriasGastos();
    cancelarEscuchaCategoriasGastos = null;
  }

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (!usuarioOperativo) {
    categoriasGastos = [];

    renderizarCategoriasGastos();
    actualizarSelectCategoriasGastos();

    return;
  }

  try {
    const { collection, query, where, onSnapshot } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    if (!window.db) {
      throw new Error("Firebase Firestore no está inicializado.");
    }

    const referenciaCategorias = collection(window.db, "categoriasGastos");

    const consulta = query(
      referenciaCategorias,
      where("usuario", "==", usuarioOperativo),
    );

    cancelarEscuchaCategoriasGastos = onSnapshot(
      consulta,
      (snapshot) => {
        categoriasGastos = snapshot.docs
          .map((documento) => {
            const datos = documento.data();

            return {
              id: documento.id,
              nombre: datos.nombre || "",
              usuario: datos.usuario || "",
              creadoEn: datos.creadoEn || null,
            };
          })
          .sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
          );

        renderizarCategoriasGastos();

        actualizarSelectCategoriasGastos();
      },
      (error) => {
        console.error("Error escuchando categorías de gastos:", error);
      },
    );
  } catch (error) {
    console.error("Error iniciando categorías de gastos:", error);
  }
}

window.addEventListener("usuarioOperativoCambiado", () => {
  iniciarEscuchaGastos();
  iniciarEscuchaCategoriasGastos();
});

/* ========================================
   RENDERIZAR GASTOS
======================================== */

function renderizarGastos() {
  const contenedor = document.getElementById("lista-gastos");

  if (!contenedor) {
    return;
  }

  const gastosFiltrados = obtenerGastosFiltrados();

  contenedor.innerHTML = "";

  gastosFiltrados.forEach((gasto) => {
    const fila = document.createElement("div");

    fila.className = "fila-gasto";

    fila.innerHTML = `

            <span class="fecha-gasto-tabla">
                ${formatearFechaGasto(gasto.fecha)}
            </span>

            <span class="descripcion-gasto-tabla">
                ${escaparHTMLGasto(gasto.descripcion)}
            </span>

            <span>
                <span class="categoria-gasto-tabla">
                    ${escaparHTMLGasto(gasto.categoria)}
                </span>
            </span>

            <span class="proveedor-gasto-tabla">
                ${escaparHTMLGasto(gasto.proveedor)}
            </span>

<span class="notas-gasto-tabla">
    ${escaparHTMLGasto(gasto.notas || "-")}
</span>
            <span class="monto-gasto-tabla">
                ${formatearPrecioGasto(gasto.monto)}
            </span>

            <span>
                <span class="estado-gasto-tabla ${gasto.estado}">
                    ${gasto.estado === "pagado" ? "Pagado" : "Pendiente"}
                </span>
            </span>

            <span class="acciones-gasto-tabla">

    <button
        type="button"
        class="boton-editar-gasto"
        title="Editar"
    >
        ✎
    </button>

    <button
        type="button"
        class="boton-eliminar-gasto"
        title="Eliminar"
    >
        🗑
    </button>

</span>

        `;

    const botonEditar = fila.querySelector(".boton-editar-gasto");

    const botonEliminar = fila.querySelector(".boton-eliminar-gasto");

    botonEditar?.addEventListener("click", () => {
      editarGasto(gasto.id);
    });

    botonEliminar?.addEventListener("click", () => {
      eliminarGasto(gasto.id);
    });

    contenedor.appendChild(fila);
  });

  const texto = document.getElementById("texto-paginacion-gastos");

  if (texto) {
    texto.textContent = `Mostrando ${gastosFiltrados.length} gastos`;
  }

  actualizarEstadisticasGastos();
}

/* ========================================
   FILTROS
======================================== */

function obtenerGastosFiltrados() {
  const busqueda =
    document.getElementById("busqueda-gastos")?.value.trim().toLowerCase() ||
    "";

  const categoria =
    document.getElementById("filtro-categoria-gastos")?.value || "";

  const estado = document.getElementById("filtro-estado-gastos")?.value || "";

  const desde = document.getElementById("filtro-periodo-desde")?.value || "";

  const hasta = document.getElementById("filtro-periodo-hasta")?.value || "";

  return gastos.filter((gasto) => {
    if (categoria && gasto.categoria !== categoria) {
      return false;
    }

    if (estado && gasto.estado !== estado) {
      return false;
    }

    if (desde && gasto.fecha < desde) {
      return false;
    }

    if (hasta && gasto.fecha > hasta) {
      return false;
    }

    if (busqueda) {
      const texto = `${gasto.descripcion} ${gasto.proveedor}`.toLowerCase();

      if (!texto.includes(busqueda)) {
        return false;
      }
    }

    return true;
  });
}

/* ========================================
   ESTADÍSTICAS
======================================== */

function actualizarEstadisticasGastos() {
  const total = gastos.reduce(
    (suma, gasto) => suma + Number(gasto.monto || 0),
    0,
  );

  const cantidad = gastos.length;

  const promedio = cantidad > 0 ? total / cantidad : 0;

  const pendientes = gastos.filter((gasto) => gasto.estado === "pendiente");

  const montoPendiente = pendientes.reduce(
    (suma, gasto) => suma + Number(gasto.monto || 0),
    0,
  );

  document.getElementById("total-gastos-mes").textContent =
    formatearPrecioGasto(total);

  document.getElementById("cantidad-gastos").textContent = cantidad;

  document.getElementById("gasto-promedio").textContent =
    formatearPrecioGasto(promedio);

  document.getElementById("resumen-gastos-pendientes").textContent =
    `${formatearPrecioGasto(montoPendiente)} (${pendientes.length})`;
}

/* ========================================
   CATEGORÍAS
======================================== */

function renderizarCategoriasGastos() {
  const contenedor = document.getElementById("lista-categorias-gastos");

  if (!contenedor) {
    return;
  }

  contenedor.innerHTML = "";

  categoriasGastos.forEach((categoria, indice) => {
    const gastosCategoria = gastos.filter(
      (gasto) => gasto.categoria === categoria.nombre,
    );

    const total = gastosCategoria.reduce(
      (suma, gasto) => suma + Number(gasto.monto || 0),
      0,
    );

    const elemento = document.createElement("div");

    elemento.className = "item-categoria-gasto";

    elemento.innerHTML = `

                <span
                    class="punto-categoria-gasto"
                    style="background:${obtenerColorCategoria(indice)}"
                ></span>

                <span class="nombre-categoria-gasto">
                    ${escaparHTMLGasto(categoria.nombre)}
                </span>

                <span class="cantidad-categoria-gasto">
                    ${gastosCategoria.length}
                    ${gastosCategoria.length === 1 ? "gasto" : "gastos"}
                </span>

                <span class="total-categoria-gasto">
                    ${formatearPrecioGasto(total)}
                </span>

                <button
                    type="button"
                    class="boton-eliminar-categoria-gasto"
                    onclick="eliminarCategoriaGasto(${categoria.id})"
                    title="Eliminar categoría"
                >
                    ×
                </button>

            `;

    elemento.addEventListener("click", () => {
      const filtroCategoria = document.getElementById(
        "filtro-categoria-gastos",
      );

      if (filtroCategoria) {
        filtroCategoria.value = categoria.nombre;
      }

      renderizarGastos();
    });

    const botonEliminar = elemento.querySelector(
      ".boton-eliminar-categoria-gasto",
    );

    if (botonEliminar) {
      botonEliminar.addEventListener("click", (evento) => {
        evento.stopPropagation();
      });
    }

    contenedor.appendChild(elemento);
  });
}

function actualizarSelectCategoriasGastos() {
  const selectFiltro = document.getElementById("filtro-categoria-gastos");

  const selectFormulario = document.getElementById("categoria-gasto");

  if (selectFiltro) {
    selectFiltro.innerHTML = `<option value="">Todas</option>`;

    categoriasGastos.forEach((categoria) => {
      selectFiltro.innerHTML += `
                    <option value="${escaparHTMLGasto(categoria.nombre)}">
                        ${escaparHTMLGasto(categoria.nombre)}
                    </option>
                `;
    });
  }

  if (selectFormulario) {
    selectFormulario.innerHTML = `<option value="">
                Seleccionar categoría
            </option>`;

    categoriasGastos.forEach((categoria) => {
      selectFormulario.innerHTML += `
                    <option value="${escaparHTMLGasto(categoria.nombre)}">
                        ${escaparHTMLGasto(categoria.nombre)}
                    </option>
                `;
    });
  }
}

/* ========================================
   NUEVA CATEGORÍA
======================================== */

function abrirModalCategoriaGasto() {
  const modal = document.getElementById("modal-categoria-gasto");

  const input = document.getElementById("nombre-nueva-categoria-gasto");

  if (!modal || !input) {
    return;
  }

  input.value = "";

  modal.removeAttribute("hidden");

  setTimeout(() => {
    input.focus();
  }, 0);
}

function cerrarModalCategoriaGasto() {
  const modal = document.getElementById("modal-categoria-gasto");

  if (!modal) {
    return;
  }

  modal.setAttribute("hidden", "");
}

async function guardarCategoriaGasto() {
  const input = document.getElementById("nombre-nueva-categoria-gasto");

  const nombre = input?.value.trim();

  if (!nombre) {
    alert("Ingresá un nombre para la categoría.");
    return;
  }

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (!usuarioOperativo) {
    alert("No hay un usuario operativo seleccionado.");
    return;
  }

  const categoriaExistente = categoriasGastos.some(
    (categoria) => categoria.nombre.toLowerCase() === nombre.toLowerCase(),
  );

  if (categoriaExistente) {
    alert("Ya existe una categoría con ese nombre.");
    return;
  }

  try {
    const { collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    await addDoc(collection(window.db, "categoriasGastos"), {
      nombre,
      usuario: usuarioOperativo,
      creadoEn: serverTimestamp(),
    });

    cerrarModalCategoriaGasto();
  } catch (error) {
    console.error("Error creando categoría:", error);

    alert("No se pudo crear la categoría.");
  }
}

/* ========================================
   GUARDAR GASTO
======================================== */

async function guardarGasto() {
  const fecha = document.getElementById("fecha-gasto").value;

  const descripcion = document.getElementById("descripcion-gasto").value.trim();

  const categoria = document.getElementById("categoria-gasto").value;

  const proveedor = document.getElementById("proveedor-gasto").value.trim();

  const monto = convertirNumeroGasto(
    document.getElementById("monto-gasto").value,
  );

  const estado = document.getElementById("estado-gasto").value;

  const notas = document.getElementById("notas-gasto").value.trim();

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (!fecha || !categoria || monto <= 0) {
    alert("Completá la fecha, categoría y monto.");

    return;
  }

  if (!usuarioOperativo) {
    alert("No hay un usuario operativo seleccionado.");
    return;
  }

  try {
    const { collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    if (!window.db) {
      throw new Error("Firebase Firestore no está inicializado.");
    }

    if (gastoEditandoId) {
      const { doc, updateDoc } =
        await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

      const referenciaGasto = doc(window.db, "gastos", gastoEditandoId);

      await updateDoc(referenciaGasto, {
        fecha,
        descripcion,
        categoria,
        proveedor,
        monto,
        estado,
        notas,
        actualizadoEn: serverTimestamp(),
      });

      gastoEditandoId = null;
    } else {
      await addDoc(collection(window.db, "gastos"), {
        fecha,
        descripcion,
        categoria,
        proveedor,
        monto,
        estado,
        notas,
        usuario: usuarioOperativo,
        creadoEn: serverTimestamp(),
      });
    }

    limpiarFormularioGasto();

    establecerFechaActualGasto();
  } catch (error) {
    console.error("Error registrando gasto:", error);

    alert("No se pudo registrar el gasto.");
  }
}

/* ========================================
   EDITAR / ELIMINAR
======================================== */

function editarGasto(id) {
  const gasto = gastos.find((item) => item.id === id);

  if (!gasto) {
    return;
  }

  gastoEditandoId = id;

  document.getElementById("fecha-gasto").value = gasto.fecha;

  document.getElementById("descripcion-gasto").value = gasto.descripcion;

  document.getElementById("categoria-gasto").value = gasto.categoria;

  document.getElementById("proveedor-gasto").value = gasto.proveedor;

  document.getElementById("monto-gasto").value = gasto.monto;

  document.getElementById("estado-gasto").value = gasto.estado;

  document.getElementById("notas-gasto").value = gasto.notas || "";

  document.getElementById("descripcion-gasto")?.focus();
}

async function eliminarGasto(id) {
  const confirmar = confirm("¿Querés eliminar este gasto?");

  if (!confirmar) {
    return;
  }

  try {
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    if (!window.db) {
      throw new Error("Firebase Firestore no está inicializado.");
    }

    const referenciaGasto = doc(window.db, "gastos", id);

    await deleteDoc(referenciaGasto);
  } catch (error) {
    console.error("Error eliminando gasto:", error);

    alert("No se pudo eliminar el gasto.");
  }
}

async function eliminarCategoriaGasto(id) {
  const categoria = categoriasGastos.find((item) => item.id === id);

  if (!categoria) {
    return;
  }

  const tieneGastos = gastos.some(
    (gasto) => gasto.categoria === categoria.nombre,
  );

  if (tieneGastos) {
    alert("No se puede eliminar una categoría que tiene gastos asociados.");

    return;
  }

  const confirmar = confirm(
    `¿Querés eliminar la categoría "${categoria.nombre}"?`,
  );

  if (!confirmar) {
    return;
  }

  try {
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    await deleteDoc(doc(window.db, "categoriasGastos", id));
  } catch (error) {
    console.error("Error eliminando categoría:", error);

    alert("No se pudo eliminar la categoría.");
  }
}

/* ========================================
   FORMULARIO
======================================== */

function limpiarFormularioGasto() {
  gastoEditandoId = null;

  establecerFechaActualGasto();

  document.getElementById("descripcion-gasto").value = "";

  document.getElementById("categoria-gasto").value = "";

  document.getElementById("proveedor-gasto").value = "";

  document.getElementById("monto-gasto").value = "";

  document.getElementById("estado-gasto").value = "pagado";

  document.getElementById("notas-gasto").value = "";
}

/* ========================================
   UTILIDADES
======================================== */

function formatearPrecioGasto(valor) {
  return `$ ${Number(valor || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function limpiarFiltrosGastos() {
  document.getElementById("filtro-periodo-desde").value = "";

  document.getElementById("filtro-periodo-hasta").value = "";

  document.getElementById("filtro-categoria-gastos").value = "";

  document.getElementById("filtro-estado-gastos").value = "";

  document.getElementById("busqueda-gastos").value = "";

  renderizarGastos();
}

function convertirNumeroGasto(valor) {
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

function formatearFechaGasto(fecha) {
  if (!fecha) {
    return "";
  }

  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function establecerFechaActualGasto() {
  const input = document.getElementById("fecha-gasto");

  if (!input) {
    return;
  }

  const ahora = new Date();

  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  input.value = `${año}-${mes}-${dia}`;
}

function escaparHTMLGasto(texto) {
  const div = document.createElement("div");

  div.textContent = texto ?? "";

  return div.innerHTML;
}

function obtenerColorCategoria(indice) {
  const colores = [
    "#1976d2",
    "#eab308",
    "#8b5cf6",
    "#ec4899",
    "#22a06b",
    "#38a1db",
    "#ef4444",
    "#64748b",
  ];

  return colores[indice % colores.length];
}

/* ========================================
   INICIAR
======================================== */

inicializarGastos();
