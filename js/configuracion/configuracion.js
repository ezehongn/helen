const CONFIGURACION_POR_DEFECTO = {
  recargo3Cuotas: 10,
  recargo6Cuotas: 15,

  limitesStock: {},

  datosNegocio: {
    nombre: "Helen",
    telefono: "",
    direccion: "",
    instagram: "",
  },
};

// =====================================================
// FIREBASE
// =====================================================

async function obtenerFirestoreConfiguracion() {
  const {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    query,
    where,
    writeBatch,
  } =
    await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js");

  if (!window.db) {
    const { initializeApp, getApps, getApp } =
      await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js");

    const firebaseConfig = {
      apiKey: "AIzaSyC89O5y1-UPfwqzZS3u1UkE5uEnZNo4f-I",
      authDomain: "helen-ceff5.firebaseapp.com",
      projectId: "helen-ceff5",
      storageBucket: "helen-ceff5.firebasestorage.app",
      messagingSenderId: "376230636371",
      appId: "1:376230636371:web:2b89e0225f799761804fa6",
    };

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    window.db = getFirestore(app);
  }

  return {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    query,
    where,
    writeBatch,
  };
}

// =====================================================
// CORREO AUTENTICADO
// =====================================================

function obtenerEmailUsuarioConfiguracion() {
  return window.auth?.currentUser?.email || "correo no disponible";
}

// =====================================================
// USUARIO OPERATIVO
// =====================================================

function obtenerUsuarioOperativoConfiguracion() {
  return sessionStorage.getItem("usuarioOperativo") || "Gon";
}

// =====================================================
// CARGAR CONFIGURACIÓN GUARDADA
// =====================================================

async function cargarConfiguracionGuardada() {
  try {
    const { doc, getDoc } = await obtenerFirestoreConfiguracion();

    const referencia = doc(window.db, "configuracion", "general");

    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
      return {
        ...CONFIGURACION_POR_DEFECTO,
      };
    }

    const datos = resultado.data();

    return {
      ...CONFIGURACION_POR_DEFECTO,

      ...datos,

      datosNegocio: {
        ...CONFIGURACION_POR_DEFECTO.datosNegocio,

        ...(datos.datosNegocio || {}),
      },
    };
  } catch (error) {
    console.error("Error cargando configuración:", error);

    return {
      ...CONFIGURACION_POR_DEFECTO,
    };
  }
}

// =====================================================
// CARGAR CONFIGURACIÓN EN PANTALLA
// =====================================================

async function cargarConfiguracionPantalla() {
  const configuracion = await cargarConfiguracionGuardada();

  // -----------------------------------------
  // CORREO DE SEGURIDAD
  // -----------------------------------------

  const usuarioSeguridad = document.getElementById(
    "usuario-seguridad-configuracion",
  );

  if (usuarioSeguridad) {
    usuarioSeguridad.textContent = obtenerEmailUsuarioConfiguracion();
  }

  // -----------------------------------------
  // RECARGOS
  // -----------------------------------------

  const recargo3 = document.getElementById("recargo-3-cuotas-configuracion");

  const recargo6 = document.getElementById("recargo-6-cuotas-configuracion");

  if (recargo3) {
    recargo3.value = configuracion.recargo3Cuotas;
  }

  if (recargo6) {
    recargo6.value = configuracion.recargo6Cuotas;
  }

  // -----------------------------------------
  // DATOS DEL NEGOCIO
  // -----------------------------------------

  const nombre = document.getElementById("nombre-negocio-configuracion");

  const telefono = document.getElementById("telefono-negocio-configuracion");

  const direccion = document.getElementById("direccion-negocio-configuracion");

  const instagram = document.getElementById("instagram-negocio-configuracion");

  if (nombre) {
    nombre.value = configuracion.datosNegocio.nombre || "";
  }

  if (telefono) {
    telefono.value = configuracion.datosNegocio.telefono || "";
  }

  if (direccion) {
    direccion.value = configuracion.datosNegocio.direccion || "";
  }

  if (instagram) {
    instagram.value = configuracion.datosNegocio.instagram || "";
  }

  // -----------------------------------------
  // LÍMITES DE STOCK
  // -----------------------------------------

  await cargarLimitesStock(configuracion.limitesStock || {});
}

// =====================================================
// CARGAR CATEGORÍAS SEGÚN USUARIO OPERATIVO
// =====================================================

async function cargarLimitesStock(limitesStock = {}) {
  const contenedor = document.getElementById(
    "lista-limites-stock-configuracion",
  );

  if (!contenedor) {
    return;
  }

  const usuarioOperativo = obtenerUsuarioOperativoConfiguracion();

  try {
    const { collection, getDocs, query, where } =
      await obtenerFirestoreConfiguracion();

    // -----------------------------------------
    // BUSCAR PRODUCTOS DEL USUARIO OPERATIVO
    // -----------------------------------------

    const consulta = query(
      collection(window.db, "productos"),
      where("creadoPor", "==", usuarioOperativo),
    );

    const resultado = await getDocs(consulta);

    // -----------------------------------------
    // OBTENER CATEGORÍAS ÚNICAS
    // -----------------------------------------

    const categorias = new Set();

    resultado.docs.forEach((documento) => {
      const datos = documento.data();

      const categoria = String(datos.categoria || "").trim();

      if (categoria) {
        categorias.add(categoria);
      }
    });

    const categoriasOrdenadas = [...categorias].sort((a, b) =>
      a.localeCompare(b, "es"),
    );

    // -----------------------------------------
    // SIN CATEGORÍAS
    // -----------------------------------------

    if (categoriasOrdenadas.length === 0) {
      contenedor.innerHTML = `
                <div class="fila-vacia-configuracion">
                    No hay categorías para ${escaparHTMLConfiguracion(
                      usuarioOperativo,
                    )}.
                </div>
            `;

      return;
    }

    // -----------------------------------------
    // MOSTRAR CATEGORÍAS
    // -----------------------------------------

    contenedor.innerHTML = categoriasOrdenadas
      .map((categoria) => {
        const usuarioOperativo = obtenerUsuarioOperativoConfiguracion();

        const limitesDelUsuario = limitesStock[usuarioOperativo] || {};

        const limite = limitesDelUsuario[categoria] ?? 3;

        return `
                            <div class="fila-limite-stock-configuracion">

                                <span class="nombre-categoria-configuracion">
                                    ${escaparHTMLConfiguracion(categoria)}
                                </span>

                                <input
                                    type="number"
                                    class="input-stock-configuracion"
                                    min="0"
                                    step="1"
                                    value="${Number(limite) || 0}"
                                    data-categoria="${escaparHTMLConfiguracion(
                                      categoria,
                                    )}"
                                >

                            </div>
                        `;
      })
      .join("");
  } catch (error) {
    console.error("Error cargando categorías para configuración:", error);

    contenedor.innerHTML = `
            <div class="fila-vacia-configuracion">
                No se pudieron cargar las categorías.
            </div>
        `;
  }
}

// =====================================================
// GUARDAR RECARGOS
// =====================================================

async function guardarRecargosConfiguracion() {
  const recargo3 = Number(
    document.getElementById("recargo-3-cuotas-configuracion")?.value,
  );

  const recargo6 = Number(
    document.getElementById("recargo-6-cuotas-configuracion")?.value,
  );

  if (
    !Number.isFinite(recargo3) ||
    recargo3 < 0 ||
    !Number.isFinite(recargo6) ||
    recargo6 < 0
  ) {
    alert("Ingresá porcentajes válidos.");

    return;
  }

  try {
    const { doc, setDoc } = await obtenerFirestoreConfiguracion();

    await setDoc(
      doc(window.db, "configuracion", "general"),

      {
        recargo3Cuotas: recargo3,

        recargo6Cuotas: recargo6,
      },

      {
        merge: true,
      },
    );

    alert("Los recargos fueron guardados correctamente.");
  } catch (error) {
    console.error("Error guardando recargos:", error);

    alert("No se pudieron guardar los recargos.");
  }
}

// =====================================================
// GUARDAR LÍMITES DE STOCK
// =====================================================

async function guardarLimitesStockConfiguracion() {
  const inputs = document.querySelectorAll(".input-stock-configuracion");

  const usuarioOperativo = obtenerUsuarioOperativoConfiguracion();

  const configuracionActual = await cargarConfiguracionGuardada();

  const limitesStock = configuracionActual.limitesStock || {};

  if (!limitesStock[usuarioOperativo]) {
    limitesStock[usuarioOperativo] = {};
  }

  inputs.forEach((input) => {
    const categoria = input.dataset.categoria;

    const valor = Number(input.value);

    if (categoria && Number.isFinite(valor) && valor >= 0) {
      limitesStock[usuarioOperativo][categoria] = Math.floor(valor);
    }
  });

  try {
    const { doc, setDoc } = await obtenerFirestoreConfiguracion();

    await setDoc(
      doc(window.db, "configuracion", "general"),

      {
        limitesStock,
      },

      {
        merge: true,
      },
    );

    alert("Los límites de stock fueron guardados correctamente.");
  } catch (error) {
    console.error("Error guardando límites de stock:", error);

    alert("No se pudieron guardar los límites de stock.");
  }
}

// =====================================================
// GUARDAR DATOS DEL NEGOCIO
// =====================================================

async function guardarDatosNegocioConfiguracion() {
  const datosNegocio = {
    nombre:
      document.getElementById("nombre-negocio-configuracion")?.value.trim() ||
      "",

    telefono:
      document.getElementById("telefono-negocio-configuracion")?.value.trim() ||
      "",

    direccion:
      document
        .getElementById("direccion-negocio-configuracion")
        ?.value.trim() || "",

    instagram:
      document
        .getElementById("instagram-negocio-configuracion")
        ?.value.trim() || "",
  };

  try {
    const { doc, setDoc } = await obtenerFirestoreConfiguracion();

    await setDoc(
      doc(window.db, "configuracion", "general"),

      {
        datosNegocio,
      },

      {
        merge: true,
      },
    );

    alert("Los datos del negocio fueron guardados correctamente.");
  } catch (error) {
    console.error("Error guardando datos del negocio:", error);

    alert("No se pudieron guardar los datos del negocio.");
  }
}

// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

async function cambiarContrasenaConfiguracion() {
  const contrasenaActual = document.getElementById(
    "contrasena-actual-configuracion",
  );

  const nuevaContrasena = document.getElementById(
    "nueva-contrasena-configuracion",
  );

  const confirmarContrasena = document.getElementById(
    "confirmar-contrasena-configuracion",
  );

  const actual = contrasenaActual?.value || "";
  const nueva = nuevaContrasena?.value || "";
  const confirmacion = confirmarContrasena?.value || "";

  if (!actual || !nueva || !confirmacion) {
    alert("Completá todos los campos.");
    return;
  }

  if (nueva.length < 6) {
    alert("La nueva contraseña debe tener al menos 6 caracteres.");
    return;
  }

  if (nueva !== confirmacion) {
    alert("La nueva contraseña y su confirmación no coinciden.");
    return;
  }

  const usuario = window.auth?.currentUser;

  if (!usuario || !usuario.email) {
    alert("No hay un usuario autenticado.");
    return;
  }

  try {
    const {
      EmailAuthProvider,
      reauthenticateWithCredential,
      updatePassword,
    } = await import(
      "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
    );

    const credencial = EmailAuthProvider.credential(
      usuario.email,
      actual,
    );

    await reauthenticateWithCredential(usuario, credencial);

    await updatePassword(usuario, nueva);

    alert("La contraseña fue cambiada correctamente.");

    contrasenaActual.value = "";
    nuevaContrasena.value = "";
    confirmarContrasena.value = "";
  } catch (error) {
    console.error("Error cambiando contraseña:", error);

    if (error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password") {
      alert("La contraseña actual es incorrecta.");
      return;
    }

    if (error.code === "auth/weak-password") {
      alert("La nueva contraseña no cumple los requisitos de seguridad.");
      return;
    }

    if (error.code === "auth/requires-recent-login") {
      alert(
        "Por seguridad, tenés que volver a iniciar sesión antes de cambiar la contraseña.",
      );
      return;
    }

    alert("No se pudo cambiar la contraseña.");
  }
}

// =====================================================
// ABRIR MODAL RESTABLECER
// =====================================================

function abrirModalRestablecerConfiguracion() {
  const modal = document.getElementById("modal-restablecer-configuracion");

  if (!modal) {
    return;
  }

  modal.hidden = false;

  document.body.style.overflow = "hidden";

  const input = document.getElementById(
    "confirmacion-restablecer-configuracion",
  );

  if (input) {
    input.value = "";

    setTimeout(() => input.focus(), 0);
  }
}

// =====================================================
// CERRAR MODAL RESTABLECER
// =====================================================

function cerrarModalRestablecerConfiguracion() {
  const modal = document.getElementById("modal-restablecer-configuracion");

  if (!modal) {
    return;
  }

  modal.hidden = true;

  document.body.style.overflow = "";
}

// =====================================================
// RESTABLECER DATOS
// =====================================================

async function restablecerDatosSistema() {
  const input = document.getElementById(
    "confirmacion-restablecer-configuracion",
  );

  if (!input || input.value.trim() !== "ELIMINAR") {
    alert("Escribí ELIMINAR para confirmar.");

    return;
  }

  const confirmar = confirm(
    "Esta acción eliminará todos los datos del sistema. ¿Querés continuar?",
  );

  if (!confirmar) {
    return;
  }

  try {
    const { collection, getDocs, writeBatch } =
      await obtenerFirestoreConfiguracion();

    const colecciones = [
      "productos",
      "ventas",
      "clientes",
      "gastos",
      "categoriasGastos",
    ];

    for (const nombreColeccion of colecciones) {
      const resultado = await getDocs(collection(window.db, nombreColeccion));

      for (let i = 0; i < resultado.docs.length; i += 400) {
        const lote = writeBatch(window.db);

        resultado.docs.slice(i, i + 400).forEach((documento) => {
          lote.delete(documento.ref);
        });

        await lote.commit();
      }
    }

    cerrarModalRestablecerConfiguracion();

    alert("Los datos del sistema fueron restablecidos.");

    await cargarLimitesStock();
  } catch (error) {
    console.error("Error restableciendo datos:", error);

    alert("No se pudieron restablecer todos los datos.");
  }
}

// =====================================================
// CAMBIO DE USUARIO OPERATIVO
// =====================================================

function escucharCambioUsuarioConfiguracion() {
  window.addEventListener("usuarioOperativoCambiado", async () => {
    const configuracion = await cargarConfiguracionGuardada();

    // Actualizar correo mostrado
    const usuarioSeguridad = document.getElementById(
      "usuario-seguridad-configuracion",
    );

    if (usuarioSeguridad) {
      usuarioSeguridad.textContent = obtenerEmailUsuarioConfiguracion();
    }

    // Actualizar categorías
    await cargarLimitesStock(configuracion.limitesStock || {});
  });
}

// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTMLConfiguracion(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// EVENTOS
// =====================================================

function configurarEventosConfiguracion() {
  document
    .getElementById("guardar-recargos-configuracion")
    ?.addEventListener("click", guardarRecargosConfiguracion);

  document
    .getElementById("guardar-limites-stock-configuracion")
    ?.addEventListener("click", guardarLimitesStockConfiguracion);

  document
    .getElementById("guardar-datos-negocio-configuracion")
    ?.addEventListener("click", guardarDatosNegocioConfiguracion);

  document
    .getElementById("cambiar-contrasena-configuracion")
    ?.addEventListener("click", cambiarContrasenaConfiguracion);

  document
    .getElementById("restablecer-datos-configuracion")
    ?.addEventListener("click", abrirModalRestablecerConfiguracion);

  document
    .getElementById("cerrar-modal-restablecer-configuracion")
    ?.addEventListener("click", cerrarModalRestablecerConfiguracion);

  document
    .getElementById("cancelar-restablecer-configuracion")
    ?.addEventListener("click", cerrarModalRestablecerConfiguracion);

  document
    .getElementById("confirmar-restablecer-configuracion")
    ?.addEventListener("click", restablecerDatosSistema);

  document
    .getElementById("modal-restablecer-configuracion")
    ?.addEventListener("click", (evento) => {
      if (evento.target.id === "modal-restablecer-configuracion") {
        cerrarModalRestablecerConfiguracion();
      }
    });
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

async function inicializarConfiguracion() {
  cargarCSSConfiguracion();

  configurarEventosConfiguracion();

  escucharCambioUsuarioConfiguracion();

  await cargarConfiguracionPantalla();
}

// =====================================================
// CARGAR CSS
// =====================================================

function cargarCSSConfiguracion() {
  const existente = document.getElementById("css-configuracion");

  if (existente) {
    return;
  }

  const link = document.createElement("link");

  link.id = "css-configuracion";

  link.rel = "stylesheet";

  link.href = `css/configuracion/configuracion.css?t=${Date.now()}`;

  document.head.appendChild(link);
}

// =====================================================
// INICIAR
// =====================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarConfiguracion, {
    once: true,
  });
} else {
  inicializarConfiguracion();
}
