// ========================================
// REGISTRAR PRODUCTO
// ========================================

// ========================================
// ELEMENTOS
// ========================================

const modalRegistrarProducto = document.getElementById("modal-producto");

const formularioRegistrarProducto = document.getElementById(
  "formulario-registrar-producto",
);

const cerrarModalRegistrarProducto = document.getElementById(
  "cerrar-modal-producto",
);

const cancelarRegistrarProducto = document.getElementById("cancelar-producto");

const botonAgregarTalle = document.getElementById("agregar-talle");

const listaTalles = document.getElementById("lista-talles");

const precioCompra = document.getElementById("precio-compra");

const precioLista = document.getElementById("precio-lista");

const gananciaProducto = document.getElementById("ganancia-producto");

const porcentajeGanancia = document.getElementById("porcentaje-ganancia");

const imagenProducto = document.getElementById("imagen-producto");

const selectorImagen = document.querySelector(".selector-imagen");

// ========================================
// CONFIGURACIÓN DE IMAGEN
// ========================================

const MAX_TAMANO_IMAGEN = 800 * 1024;

const MAX_DIMENSION_IMAGEN = 1000;

// ========================================
// ABRIR MODAL
// ========================================

window.abrirModalRegistrarProducto = function () {
  modalRegistrarProducto.classList.add("visible");

  document.body.style.overflow = "hidden";
};

// ========================================
// CERRAR MODAL
// ========================================

function cerrarModal() {
  modalRegistrarProducto.classList.remove("visible");

  document.body.style.overflow = "";

  limpiarFormulario();
}

cerrarModalRegistrarProducto.addEventListener("click", cerrarModal);

cancelarRegistrarProducto.addEventListener("click", cerrarModal);

modalRegistrarProducto.addEventListener("click", (evento) => {
  if (evento.target === modalRegistrarProducto) {
    cerrarModal();
  }
});

// ========================================
// ESCAPE
// ========================================

document.addEventListener("keydown", (evento) => {
  if (
    evento.key === "Escape" &&
    modalRegistrarProducto.classList.contains("visible")
  ) {
    cerrarModal();
  }
});

// ========================================
// TALLES
// ========================================

botonAgregarTalle.addEventListener("click", () => {
  agregarTalle();
});

function agregarTalle(talle = "", stock = "") {
  const fila = document.createElement("div");

  fila.className = "talle-fila";

  fila.innerHTML = `

        <input
            type="text"
            class="input-talle"
            placeholder="Ej. 38"
            value="${talle}"
        >

        <input
    type="text"
    class="input-stock-talle"
    inputmode="numeric"
    placeholder="0"
    value="${stock}"
    autocomplete="off"
>

        <button
            type="button"
            class="boton-eliminar-talle"
            title="Eliminar talle"
        >
            ×
        </button>

    `;

  const botonEliminar = fila.querySelector(".boton-eliminar-talle");

  botonEliminar.addEventListener("click", () => {
    fila.remove();
  });

  listaTalles.appendChild(fila);
}

// ========================================
// GANANCIA
// ========================================

precioCompra.addEventListener("input", actualizarGanancia);

precioLista.addEventListener("input", actualizarGanancia);

function actualizarGanancia() {
  const compra = convertirNumero(precioCompra.value);

  const lista = convertirNumero(precioLista.value);

  const ganancia = lista - compra;

  let porcentaje = 0;

  if (compra > 0) {
    porcentaje = (ganancia / compra) * 100;
  }

  gananciaProducto.textContent = formatearPrecio(ganancia);

  porcentajeGanancia.textContent = `(${porcentaje.toFixed(0)}%)`;

  // ========================================
  // COLOR DE LA GANANCIA
  // ========================================

  gananciaProducto.classList.remove(
    "ganancia-neutral",
    "ganancia-positiva",
    "ganancia-negativa",
  );

  porcentajeGanancia.classList.remove(
    "ganancia-neutral",
    "ganancia-positiva",
    "ganancia-negativa",
  );

  if (ganancia > 0) {
    gananciaProducto.classList.add("ganancia-positiva");

    porcentajeGanancia.classList.add("ganancia-positiva");
  } else if (ganancia < 0) {
    gananciaProducto.classList.add("ganancia-negativa");

    porcentajeGanancia.classList.add("ganancia-negativa");
  } else {
    gananciaProducto.classList.add("ganancia-neutral");

    porcentajeGanancia.classList.add("ganancia-neutral");
  }
}

function convertirNumero(valor) {
  if (!valor) {
    return 0;
  }

  const limpio = valor.replace(/\./g, "").replace(",", ".");

  return Number(limpio) || 0;
}

// ========================================
// SELECCIÓN DE IMAGEN
// ========================================

imagenProducto.addEventListener("change", () => {
  const archivo = imagenProducto.files[0];

  if (!archivo) {
    return;
  }

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!tiposPermitidos.includes(archivo.type)) {
    alert("La imagen debe ser JPG, PNG o WEBP.");

    imagenProducto.value = "";

    return;
  }

  // ----------------------------------------
  // VISTA PREVIA
  // ----------------------------------------

  const lector = new FileReader();

  lector.onload = (evento) => {
    selectorImagen.style.backgroundImage = `url("${evento.target.result}")`;

    selectorImagen.style.backgroundSize = "cover";

    selectorImagen.style.backgroundPosition = "center";

    selectorImagen.classList.add("imagen-seleccionada");

    const elementos = selectorImagen.querySelectorAll("span, strong, small");

    elementos.forEach((elemento) => {
      elemento.style.visibility = "hidden";
    });
  };

  lector.readAsDataURL(archivo);
});

// ========================================
// GUARDAR PRODUCTO
// ========================================

function convertirNumeroEntero(valor) {
  if (!valor) {
    return 0;
  }

  const limpio = valor.replace(/\D/g, "");

  return Number(limpio) || 0;
}

formularioRegistrarProducto.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  // ========================================
  // DATOS
  // ========================================

  const nombre = document.getElementById("nombre-producto").value.trim();

  const precioCompraValor = convertirNumero(precioCompra.value);

  const precioListaValor = convertirNumero(precioLista.value);

  const categoria = document.getElementById("categoria-producto").value;

  const estado = document.getElementById("estado-producto").value;

  const descripcion = document
    .getElementById("descripcion-producto")
    .value.trim();

  // ========================================
  // VALIDACIONES
  // ========================================

  if (!nombre || precioCompraValor < 0 || precioListaValor < 0 || !categoria) {
    alert("Completá todos los campos obligatorios.");

    return;
  }

  // ========================================
  // USUARIO OPERATIVO
  // ========================================

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo");

  if (usuarioOperativo !== "Gon" && usuarioOperativo !== "Matias") {
    alert("Seleccioná primero el usuario operativo.");

    return;
  }

  // ========================================
  // TALLES
  // ========================================

  const talles = [];

  document.querySelectorAll(".talle-fila").forEach((fila) => {
    const talle = fila.querySelector(".input-talle").value.trim();

    const stock = convertirNumeroEntero(
      fila.querySelector(".input-stock-talle").value,
    );

    if (talle) {
      talles.push({
        talle,

        stock,
      });
    }
  });

  // ========================================
  // STOCK TOTAL
  // ========================================

  const stockTotal = talles.reduce((total, item) => {
    return total + item.stock;
  }, 0);

  // ========================================
  // BOTÓN
  // ========================================

  const botonGuardar =
    formularioRegistrarProducto.querySelector(".boton-guardar");

  const textoOriginal = botonGuardar.textContent;

  botonGuardar.disabled = true;

  botonGuardar.textContent = "Guardando...";

  try {
    // ========================================
    // FIRESTORE
    // ========================================

    const { collection, addDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    // ========================================
    // IMAGEN
    // ========================================

    let imagen = "";

    const archivo = imagenProducto.files[0];

    if (archivo) {
      imagen = await prepararImagen(archivo);
    }

    // ========================================
    // PRODUCTO
    // ========================================

    const producto = {
      nombre,

      precioCompra: precioCompraValor,

      precio: precioListaValor,

      categoria,

      estado,

      descripcion,

      talles,

      stock: stockTotal,

      creadoPor: usuarioOperativo,

      creadoEn: new Date(),

      imagen,
    };

    // ========================================
    // GUARDAR
    // ========================================

    await addDoc(collection(window.db, "productos"), producto);

    // ========================================
    // ACTUALIZAR LISTADO
    // ========================================

    if (window.recargarProductos) {
      await window.recargarProductos();
    }

    cerrarModal();
  } catch (error) {
    console.error("Error guardando producto:", error);

    alert(obtenerMensajeError(error));
  } finally {
    botonGuardar.disabled = false;

    botonGuardar.textContent = textoOriginal;
  }
});

// ========================================
// PREPARAR IMAGEN
// ========================================

function prepararImagen(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = (evento) => {
      const imagen = new Image();

      imagen.onload = () => {
        let ancho = imagen.width;

        let alto = imagen.height;

        // ----------------------------------------
        // REDIMENSIONAR
        // ----------------------------------------

        if (ancho > MAX_DIMENSION_IMAGEN || alto > MAX_DIMENSION_IMAGEN) {
          const escala = Math.min(
            MAX_DIMENSION_IMAGEN / ancho,

            MAX_DIMENSION_IMAGEN / alto,
          );

          ancho = Math.round(ancho * escala);

          alto = Math.round(alto * escala);
        }

        // ----------------------------------------
        // CANVAS
        // ----------------------------------------

        const canvas = document.createElement("canvas");

        canvas.width = ancho;

        canvas.height = alto;

        const contexto = canvas.getContext("2d");

        contexto.drawImage(imagen, 0, 0, ancho, alto);

        // ----------------------------------------
        // JPEG COMPRIMIDO
        // ----------------------------------------

        let calidad = 0.8;

        let resultado = canvas.toDataURL("image/jpeg", calidad);

        // ----------------------------------------
        // REDUCIR SI TODAVÍA ES GRANDE
        // ----------------------------------------

        while (
          calcularTamanoBase64(resultado) > MAX_TAMANO_IMAGEN &&
          calidad > 0.3
        ) {
          calidad -= 0.1;

          resultado = canvas.toDataURL("image/jpeg", calidad);
        }

        if (calcularTamanoBase64(resultado) > MAX_TAMANO_IMAGEN) {
          reject(
            new Error(
              "La imagen es demasiado grande incluso después de comprimirla.",
            ),
          );

          return;
        }

        resolve(resultado);
      };

      imagen.onerror = () => {
        reject(new Error("No se pudo procesar la imagen."));
      };

      imagen.src = evento.target.result;
    };

    lector.onerror = () => {
      reject(new Error("No se pudo leer la imagen."));
    };

    lector.readAsDataURL(archivo);
  });
}

// ========================================
// TAMAÑO BASE64
// ========================================

function calcularTamanoBase64(base64) {
  const parte = base64.split(",")[1] || "";

  return parte.length * 0.75;
}

// ========================================
// MENSAJE DE ERROR
// ========================================

function obtenerMensajeError(error) {
  if (error && error.message) {
    return "No se pudo guardar el producto.\n\n" + error.message;
  }

  return "No se pudo guardar el producto.";
}

// ========================================
// LIMPIAR FORMULARIO
// ========================================

function limpiarFormulario() {
  // ========================================
  // CAMPOS DEL FORMULARIO
  // ========================================

  formularioRegistrarProducto.reset();

  // ========================================
  // TALLES
  // ========================================

  listaTalles.innerHTML = "";

  // ========================================
  // IMAGEN
  // ========================================

  imagenProducto.value = "";

  selectorImagen.style.backgroundImage = "";

  selectorImagen.style.backgroundSize = "";

  selectorImagen.style.backgroundPosition = "";

  selectorImagen.classList.remove("imagen-seleccionada");

  const elementos = selectorImagen.querySelectorAll("span, strong, small");

  elementos.forEach((elemento) => {
    elemento.style.visibility = "";
  });

  // ========================================
  // GANANCIA
  // ========================================

  gananciaProducto.textContent = "$ 0,00";

  porcentajeGanancia.textContent = "(0%)";

  gananciaProducto.classList.remove("ganancia-positiva", "ganancia-negativa");

  gananciaProducto.classList.add("ganancia-neutral");

  porcentajeGanancia.classList.remove("ganancia-positiva", "ganancia-negativa");

  porcentajeGanancia.classList.add("ganancia-neutral");
}
function limpiarFormulario() {
  // ========================================
  // CAMPOS DEL FORMULARIO
  // ========================================

  formularioRegistrarProducto.reset();

  // ========================================
  // TALLES
  // ========================================

  listaTalles.innerHTML = "";

  // ========================================
  // IMAGEN
  // ========================================

  imagenProducto.value = "";

  selectorImagen.style.backgroundImage = "";

  selectorImagen.style.backgroundSize = "";

  selectorImagen.style.backgroundPosition = "";

  selectorImagen.classList.remove("imagen-seleccionada");

  const elementos = selectorImagen.querySelectorAll("span, strong, small");

  elementos.forEach((elemento) => {
    elemento.style.visibility = "";
  });

  // ========================================
  // GANANCIA
  // ========================================

  gananciaProducto.textContent = "$ 0,00";

  porcentajeGanancia.textContent = "(0%)";

  gananciaProducto.classList.remove("ganancia-positiva", "ganancia-negativa");

  gananciaProducto.classList.add("ganancia-neutral");

  porcentajeGanancia.classList.remove("ganancia-positiva", "ganancia-negativa");

  porcentajeGanancia.classList.add("ganancia-neutral");
}

// ========================================
// FORMATEAR PRECIO
// ========================================

function formatearPrecio(valor) {
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}
