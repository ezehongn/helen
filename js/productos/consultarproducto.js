// ========================================
// CONSULTAR / EDITAR PRODUCTO
// ========================================

let limitesStockConfiguracion = {};

let productoEditando = null;

// ========================================
// ELEMENTOS
// ========================================

const modalConsultarProducto = document.getElementById(
  "modal-consultar-producto",
);

const formularioConsultarProducto = document.getElementById(
  "formulario-consultar-producto",
);

const cerrarModalConsultar = document.getElementById("cerrar-modal-consultar");

const cancelarConsultar = document.getElementById("cancelar-consultar");

const consultarImagen = document.getElementById("consultar-imagen-producto");

const consultarSelectorImagen = document.getElementById(
  "consultar-selector-imagen",
);

const consultarNombre = document.getElementById("consultar-nombre");

const consultarPrecioCompra = document.getElementById(
  "consultar-precio-compra",
);

const consultarPrecioLista = document.getElementById("consultar-precio-lista");

const consultarGanancia = document.getElementById("consultar-ganancia");

const consultarPorcentaje = document.getElementById("consultar-porcentaje");

const consultarCategoria = document.getElementById("consultar-categoria");

const consultarEstado = document.getElementById("consultar-estado");

const consultarDescripcion = document.getElementById("consultar-descripcion");

const consultarListaTalles = document.getElementById("consultar-lista-talles");

const consultarAgregarTalle = document.getElementById(
  "consultar-agregar-talle",
);

const guardarCambios = document.getElementById("guardar-cambios-producto");

// ========================================
// ABRIR MODAL
// ========================================

window.abrirModalConsultarProducto = async function (producto) {
  await cargarLimitesStockConfiguracion();
  
  productoEditando = producto;

  cargarDatosProducto(producto);

  modalConsultarProducto.classList.add("visible");

  document.body.style.overflow = "hidden";
};

// ========================================
// CARGAR DATOS
// ========================================

function cargarDatosProducto(producto) {
  consultarNombre.value = producto.nombre || "";

  consultarPrecioCompra.value = formatearNumeroInput(producto.precioCompra);

  consultarPrecioLista.value = formatearNumeroInput(producto.precio);

  consultarCategoria.value = producto.categoria || "Ropa";

  consultarEstado.value = producto.estado || "activo";

  consultarDescripcion.value = producto.descripcion || "";

  cargarImagen(producto.imagen);

  consultarListaTalles.innerHTML = "";

  const talles = Array.isArray(producto.talles) ? producto.talles : [];

  talles.forEach((item) => {
    agregarFilaTalle(item.talle || "", item.stock ?? "");
  });

  actualizarGananciaConsultar();
}

async function cargarLimitesStockConfiguracion() {
  try {
    const { doc, getDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    const referencia = doc(window.db, "configuracion", "general");

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      limitesStockConfiguracion = {};
      return;
    }

    const datos = resultado.data();

    limitesStockConfiguracion = datos.limitesStock || {};
  } catch (error) {
    console.error("Error cargando límites de stock:", error);

    limitesStockConfiguracion = {};
  }
}
// ========================================
// IMAGEN
// ========================================

function cargarImagen(imagen) {
  if (imagen) {
    consultarSelectorImagen.style.backgroundImage = `url("${imagen}")`;

    consultarSelectorImagen.style.backgroundSize = "cover";

    consultarSelectorImagen.style.backgroundPosition = "center";

    document.getElementById("consultar-placeholder-imagen").style.display =
      "none";
  } else {
    consultarSelectorImagen.style.backgroundImage = "";

    document.getElementById("consultar-placeholder-imagen").style.display = "";
  }
}

// ========================================
// NUEVA IMAGEN
// ========================================

consultarImagen.addEventListener("change", async () => {
  const archivo = consultarImagen.files[0];

  if (!archivo) {
    return;
  }

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!tiposPermitidos.includes(archivo.type)) {
    alert("La imagen debe ser JPG, PNG o WEBP.");

    consultarImagen.value = "";

    return;
  }

  try {
    const imagen = await prepararImagen(archivo);

    consultarSelectorImagen.style.backgroundImage = `url("${imagen}")`;

    consultarSelectorImagen.style.backgroundSize = "cover";

    consultarSelectorImagen.style.backgroundPosition = "center";

    document.getElementById("consultar-placeholder-imagen").style.display =
      "none";

    consultarImagen.dataset.imagenNueva = imagen;
  } catch (error) {
    console.error("Error preparando imagen:", error);

    alert("No se pudo procesar la imagen.");
  }
});

// ========================================
// PRECIOS
// ========================================

consultarPrecioCompra.addEventListener("input", actualizarGananciaConsultar);

consultarPrecioLista.addEventListener("input", actualizarGananciaConsultar);

function actualizarGananciaConsultar() {
  const compra = convertirNumero(consultarPrecioCompra.value);

  const lista = convertirNumero(consultarPrecioLista.value);

  const ganancia = lista - compra;

  let porcentaje = 0;

  if (compra > 0) {
    porcentaje = (ganancia / compra) * 100;
  }

  consultarGanancia.textContent = formatearPrecio(ganancia);

  consultarPorcentaje.textContent = `(${porcentaje.toFixed(0)}%)`;

  const contenedor = document.getElementById("ganancia-consultar");

  contenedor.classList.remove("neutral", "positiva", "negativa");

  if (ganancia > 0) {
    contenedor.classList.add("positiva");
  } else if (ganancia < 0) {
    contenedor.classList.add("negativa");
  } else {
    contenedor.classList.add("neutral");
  }
}

// ========================================
// TALLES
// ========================================

consultarAgregarTalle.addEventListener("click", () => {
  agregarFilaTalle();
});

function agregarFilaTalle(talle = "", stock = "") {
  const fila = document.createElement("div");

  fila.className = "fila-talle-consultar";

  fila.innerHTML = `

        <input
            type="text"
            class="consultar-input-talle"
            placeholder="Ej. 38"
            value="${talle}"
            autocomplete="off"
        >


        <input
            type="text"
            class="consultar-input-stock"
            placeholder="0"
            value="${stock}"
            inputmode="numeric"
            autocomplete="off"
        >


        <span
            class="estado-talle-consultar"
        >
            Stock disponible
        </span>


        <div
            class="acciones-talle-consultar"
        >

            <button
                type="button"
                class="boton-eliminar-talle-consultar"
                title="Eliminar talle"
            >
                ×
            </button>

        </div>

    `;

  const inputStock = fila.querySelector(".consultar-input-stock");

  const estado = fila.querySelector(".estado-talle-consultar");

  actualizarEstadoTalle(inputStock, estado);

  inputStock.addEventListener("input", () => {
    inputStock.value = inputStock.value.replace(/\D/g, "");

    actualizarEstadoTalle(inputStock, estado);
  });

  fila
    .querySelector(".boton-eliminar-talle-consultar")
    .addEventListener("click", () => {
      fila.remove();
    });

  consultarListaTalles.appendChild(fila);
}

function actualizarEstadoTalle(inputStock, estado) {
  const stock = Number(inputStock.value) || 0;

  estado.classList.remove("disponible", "bajo", "agotado");

  if (stock <= 0) {
    estado.classList.add("agotado");
    estado.textContent = "Agotado";
    return;
  }

  const usuarioOperativo = sessionStorage.getItem("usuarioOperativo") || "Gon";

  const limiteCategoria =
    limitesStockConfiguracion?.[usuarioOperativo]?.[
      productoEditando?.categoria
    ] ?? 3;

  if (stock <= limiteCategoria) {
    estado.classList.add("bajo");
    estado.textContent = "Bajo stock";
    return;
  }

  estado.classList.add("disponible");
  estado.textContent = "Stock disponible";
}

// ========================================
// GUARDAR CAMBIOS
// ========================================

formularioConsultarProducto.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!productoEditando) {
    return;
  }

  const nombre = consultarNombre.value.trim();

  const precioCompra = convertirNumero(consultarPrecioCompra.value);

  const precioLista = convertirNumero(consultarPrecioLista.value);

  const categoria = consultarCategoria.value;

  const estado = consultarEstado.value;

  const descripcion = consultarDescripcion.value.trim();

  if (!nombre || precioCompra < 0 || precioLista < 0) {
    alert("Completá correctamente los campos obligatorios.");

    return;
  }

  const talles = [];

  consultarListaTalles
    .querySelectorAll(".fila-talle-consultar")
    .forEach((fila) => {
      const talle = fila.querySelector(".consultar-input-talle").value.trim();

      const stock =
        Number(fila.querySelector(".consultar-input-stock").value) || 0;

      if (talle) {
        talles.push({
          talle,

          stock,
        });
      }
    });

  const stockTotal = talles.reduce((total, item) => {
    return total + item.stock;
  }, 0);

  guardarCambios.disabled = true;

  const textoOriginal = guardarCambios.textContent;

  guardarCambios.textContent = "Guardando...";

  try {
    const { doc, updateDoc } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

    let imagen = productoEditando.imagen || "";

    if (consultarImagen.dataset.imagenNueva) {
      imagen = consultarImagen.dataset.imagenNueva;
    }

    const productoActualizado = {
      nombre,

      precioCompra,

      precio: precioLista,

      categoria,

      estado,

      descripcion,

      talles,

      stock: stockTotal,

      imagen,
    };

    const referencia = doc(window.db, "productos", productoEditando.id);

    await updateDoc(referencia, productoActualizado);

    cerrarModalConsultarProducto();
  } catch (error) {
    console.error("Error actualizando producto:", error);

    alert("No se pudieron guardar los cambios.");
  } finally {
    guardarCambios.disabled = false;

    guardarCambios.textContent = textoOriginal;
  }
});

// ========================================
// CERRAR
// ========================================

cerrarModalConsultar.addEventListener("click", cerrarModalConsultarProducto);

cancelarConsultar.addEventListener("click", cerrarModalConsultarProducto);

modalConsultarProducto.addEventListener("click", (evento) => {
  if (evento.target === modalConsultarProducto) {
    cerrarModalConsultarProducto();
  }
});

document.addEventListener("keydown", (evento) => {
  if (
    evento.key === "Escape" &&
    modalConsultarProducto.classList.contains("visible")
  ) {
    cerrarModalConsultarProducto();
  }
});

function cerrarModalConsultarProducto() {
  modalConsultarProducto.classList.remove("visible");

  document.body.style.overflow = "";

  consultarImagen.value = "";

  delete consultarImagen.dataset.imagenNueva;

  productoEditando = null;
}

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

        const maxDimension = 1000;

        if (ancho > maxDimension || alto > maxDimension) {
          const escala = Math.min(maxDimension / ancho, maxDimension / alto);

          ancho = Math.round(ancho * escala);

          alto = Math.round(alto * escala);
        }

        const canvas = document.createElement("canvas");

        canvas.width = ancho;

        canvas.height = alto;

        const contexto = canvas.getContext("2d");

        contexto.drawImage(imagen, 0, 0, ancho, alto);

        let calidad = 0.8;

        let resultado = canvas.toDataURL("image/jpeg", calidad);

        while (calcularTamanoBase64(resultado) > 800 * 1024 && calidad > 0.3) {
          calidad -= 0.1;

          resultado = canvas.toDataURL("image/jpeg", calidad);
        }

        if (calcularTamanoBase64(resultado) > 800 * 1024) {
          reject(new Error("La imagen sigue siendo demasiado grande."));

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
// UTILIDADES
// ========================================

function calcularTamanoBase64(base64) {
  const parte = base64.split(",")[1] || "";

  return parte.length * 0.75;
}

function convertirNumero(valor) {
  if (!valor) {
    return 0;
  }

  const limpio = valor.replace(/\./g, "").replace(",", ".");

  return Number(limpio) || 0;
}

function formatearNumeroInput(valor) {
  return Number(valor || 0).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  });
}

function formatearPrecio(valor) {
  return Number(valor || 0).toLocaleString("es-AR", {
    style: "currency",

    currency: "ARS",

    maximumFractionDigits: 2,
  });
}
