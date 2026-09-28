let categoriasActuales = [];

/* ========================================
   ABRIR MODAL
   ======================================== */

window.abrirModalNuevaCategoria = function () {
  const modal = document.getElementById("modal-nueva-categoria");

  const input = document.getElementById("nombre-nueva-categoria");

  const error = document.getElementById("error-nueva-categoria");

  if (!modal) {
    console.error("No se encontró el modal de nueva categoría.");
    return;
  }

  if (input) {
    input.value = "";
    input.classList.remove("error");
  }

  if (error) {
    error.textContent = "";
  }

  modal.classList.add("visible");

  setTimeout(() => {
    if (input) {
      input.focus();
    }
  }, 50);
};

/* ========================================
   CERRAR MODAL
   ======================================== */

function cerrarModalNuevaCategoria() {
  const modal = document.getElementById("modal-nueva-categoria");

  if (!modal) {
    return;
  }

  modal.classList.remove("visible");
}

/* ========================================
   GUARDAR NUEVA CATEGORÍA
   ======================================== */

async function guardarNuevaCategoria(evento) {
  /*
   * MUY IMPORTANTE:
   * evita que el formulario recargue
   * toda la página.
   */

  evento.preventDefault();
  evento.stopPropagation();

  const input = document.getElementById("nombre-nueva-categoria");

  const error = document.getElementById("error-nueva-categoria");

  const boton = document.querySelector(".boton-guardar-categoria");

  if (!input || !error || !boton) {
    console.error("No se encontraron los elementos del formulario.");

    return;
  }

  const nombre = input.value.trim();

  error.textContent = "";

  input.classList.remove("error");

  /* ========================================
       VALIDAR VACÍO
       ======================================== */

  if (!nombre) {
    error.textContent = "Ingresá un nombre para la categoría.";

    input.classList.add("error");

    input.focus();

    return;
  }

  /* ========================================
       VALIDAR DUPLICADO
       ======================================== */

  const nombreNormalizado = nombre.toLowerCase();

  const categoriaExistente = categoriasActuales.some((categoria) => {
    return categoria.nombre?.trim().toLowerCase() === nombreNormalizado;
  });

  if (categoriaExistente) {
    error.textContent = "Ya existe una categoría con ese nombre.";

    input.classList.add("error");

    input.focus();

    return;
  }

  try {
    boton.disabled = true;

    boton.textContent = "Creando...";

    /* ========================================
           FIREBASE FIRESTORE
           ======================================== */

    const { collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    if (!window.db) {
      throw new Error("Firestore no está inicializado.");
    }

    await addDoc(collection(window.db, "categorias"), {
      nombre: nombre,
      creadoEn: serverTimestamp(),
    });

    console.log("Categoría creada:", nombre);

    /* ========================================
           ACTUALIZAR LISTA
           ======================================== */

    if (typeof window.cargarCategorias === "function") {
      await window.cargarCategorias();
    }

    /* ========================================
           CERRAR MODAL
           ======================================== */

    cerrarModalNuevaCategoria();
  } catch (errorFirebase) {
    console.error("Error creando categoría:", errorFirebase);

    error.textContent = "No se pudo crear la categoría.";
  } finally {
    boton.disabled = false;

    boton.textContent = "Crear categoría";
  }
}

/* ========================================
   CARGAR CATEGORÍAS
   ======================================== */

window.cargarCategorias = async function () {
  try {
    const { collection, getDocs, query, orderBy } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = collection(window.db, "categorias");

    let resultado;

    try {
      resultado = await getDocs(query(referencia, orderBy("nombre", "asc")));
    } catch (errorOrden) {
      /*
       * Si falla el orderBy, cargamos
       * igualmente sin ordenar.
       */

      console.warn("No se pudo ordenar categorías:", errorOrden);

      resultado = await getDocs(referencia);
    }

    categoriasActuales = resultado.docs.map((documento) => {
      return {
        id: documento.id,
        ...documento.data(),
      };
    });

    /*
     * Guardamos las categorías para que
     * productos.js las pueda visualizar.
     */

    window.categoriasDisponibles = categoriasActuales;

    /*
     * Avisamos a productos.js que las categorías
     * cambiaron.
     */

    if (typeof window.actualizarCategoriasProductos === "function") {
      window.actualizarCategoriasProductos();
    }

    /*
     * Actualizar los select de categoría.
     */

    actualizarSelectCategorias("categoria-producto");

    actualizarSelectCategorias("consultar-categoria");
  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
};


/* ========================================
   ACTUALIZAR SELECTS
   ======================================== */

function actualizarSelectCategorias(idSelect) {
  const select = document.getElementById(idSelect);

  if (!select) {
    return;
  }

  const valorActual = select.value;

  select.innerHTML = `
        <option value="">
            Seleccionar categoría
        </option>
    `;

  categoriasActuales.forEach((categoria) => {
    const opcion = document.createElement("option");

    opcion.value = categoria.nombre;

    opcion.textContent = categoria.nombre;

    select.appendChild(opcion);
  });

  if (
    valorActual &&
    categoriasActuales.some((categoria) => categoria.nombre === valorActual)
  ) {
    select.value = valorActual;
  }
}

/* ========================================
   ESCAPAR HTML
   ======================================== */

function escaparHTML(texto) {
  const div = document.createElement("div");

  div.textContent = texto;

  return div.innerHTML;
}

/* ========================================
   INICIALIZAR EVENTOS
   ======================================== */

/*
 * Este archivo se carga dinámicamente.
 *
 * Por eso NO usamos:
 *
 * document.addEventListener(
 *     "DOMContentLoaded",
 *     ...
 * );
 *
 * El DOMContentLoaded ya ocurrió cuando
 * este script es agregado.
 */

function inicializarNuevaCategoria() {
  const cerrar = document.getElementById("cerrar-modal-nueva-categoria");

  const cancelar = document.getElementById("cancelar-nueva-categoria");

  const formulario = document.getElementById("formulario-nueva-categoria");

  const modal = document.getElementById("modal-nueva-categoria");

  if (!formulario) {
    console.error("No se encontró el formulario de nueva categoría.");

    return;
  }

  /* ========================================
       CERRAR
       ======================================== */

  cerrar?.addEventListener("click", cerrarModalNuevaCategoria);

  cancelar?.addEventListener("click", cerrarModalNuevaCategoria);

  /* ========================================
       FORMULARIO
       ======================================== */

  formulario.addEventListener("submit", guardarNuevaCategoria);

  /* ========================================
       CERRAR HACIENDO CLICK AFUERA
       ======================================== */

  modal?.addEventListener("click", (evento) => {
    if (evento.target === modal) {
      cerrarModalNuevaCategoria();
    }
  });

  /* ========================================
       CARGAR CATEGORÍAS EXISTENTES
       ======================================== */

  cargarCategorias();
}

/*
 * Como el script se agrega dinámicamente
 * al final del body, inicializamos
 * directamente.
 */

inicializarNuevaCategoria();
