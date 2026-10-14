import "./firebase/firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// ========================================
// ELEMENTOS
// ========================================

const contenido = document.getElementById("contenido");

let navegacionActual = 0;

// ========================================
// CARGAR CSS
// ========================================

function cargarCSS(ruta, identificador) {
  const existente = document.querySelector(`link[data-css="${identificador}"]`);

  if (existente) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");

    link.rel = "stylesheet";
    link.href = ruta;
    link.dataset.css = identificador;

    link.onload = resolve;
    link.onerror = reject;

    document.head.appendChild(link);
  });
}

// ========================================
// CARGAR PANTALLA
// ========================================

async function cargarPantalla(ruta, script = null, css = null) {
  const navegacion = ++navegacionActual;

  try {
    const contenedor = document.getElementById("contenido-pantalla");

    if (!contenedor) {
      throw new Error("No existe #contenido-pantalla.");
    }

    const cargaHTML = fetch(ruta).then(async (respuesta) => {
      if (!respuesta.ok) {
        throw new Error(
          `No se pudo cargar ${ruta}. Código: ${respuesta.status}`,
        );
      }

      return respuesta.text();
    });

    const cargaCSS = css ? cargarCSS(css.ruta, css.id) : Promise.resolve();

    const [html] = await Promise.all([cargaHTML, cargaCSS]);

    // Si el usuario cambió de pantalla durante la descarga,
    // descartamos esta navegación.
    if (navegacion !== navegacionActual) return;

    // Puede haber cambiado la pantalla mientras cargaba el CSS.
    if (navegacion !== navegacionActual) return;

    // Limpiar la pantalla anterior.
    if (typeof window.limpiarInicio === "function") {
      window.limpiarInicio();
    }

    if (typeof window.limpiarProductos === "function") {
      window.limpiarProductos();
    }

    if (typeof window.limpiarClientes === "function") {
      window.limpiarClientes();
    }

    // Retirar el script de la pantalla anterior.
    const scriptAnterior = document.querySelector("script[data-pantalla]");

    if (scriptAnterior) {
      scriptAnterior.remove();
    }

    // Mostrar el HTML.
    contenedor.innerHTML = html;

    // Inicializar el JavaScript de la pantalla.
    if (script) {
      const nuevoScript = document.createElement("script");

      nuevoScript.src = `${script}?t=${Date.now()}`;
      nuevoScript.type = "module";
      nuevoScript.dataset.pantalla = "true";

      await new Promise((resolve, reject) => {
        nuevoScript.onload = resolve;
        nuevoScript.onerror = () => {
          reject(new Error(`No se pudo cargar ${script}`));
        };

        document.body.appendChild(nuevoScript);
      });
    }
  } catch (error) {
    // No mostrar errores de una navegación que ya fue descartada.
    if (navegacion !== navegacionActual) return;

    console.error("Error al cargar pantalla:", error);

    const contenedor = document.getElementById("contenido-pantalla");

    if (contenedor) {
      contenedor.innerHTML = `
        <div style="
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: Arial, Helvetica, sans-serif;
          color: #626a76;
        ">
          <p>No se pudo cargar la pantalla.</p>
        </div>
      `;
    }
  }
}

// ========================================
// CARGAR BARRA LATERAL
// ========================================

async function cargarBarraLateral() {
  try {
    const respuesta = await fetch("html/barra-lateral/barra-lateral.html");

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo cargar la barra lateral. Código: ${respuesta.status}`,
      );
    }

    const html = await respuesta.text();

    const contenedor = document.getElementById("barra-lateral-contenedor");

    if (!contenedor) {
      throw new Error("No existe #barra-lateral-contenedor.");
    }

    contenedor.innerHTML = html;

    // --------------------------------
    // CARGAR CSS BARRA
    // --------------------------------

    await cargarCSS("css/barra-lateral/barra-lateral.css", "barra-lateral");

    // --------------------------------
    // CARGAR JS BARRA
    // --------------------------------

    const scriptAnterior = document.querySelector("script[data-barra-lateral]");

    if (scriptAnterior) {
      scriptAnterior.remove();
    }

    const script = document.createElement("script");

    script.src = `js/barra-lateral/barra-lateral.js?t=${Date.now()}`;

    script.type = "module";

    script.dataset.barraLateral = "true";

    document.body.appendChild(script);
  } catch (error) {
    console.error("Error al cargar barra lateral:", error);
  }
}

// ========================================
// CARGAR APLICACIÓN
// ========================================

async function cargarAplicacion() {
  try {
    // --------------------------------
    // CARGAR CSS APLICACIÓN
    // --------------------------------

    await cargarCSS("css/aplicacion/aplicacion.css", "aplicacion");

    // --------------------------------
    // CARGAR ESTRUCTURA
    // --------------------------------

    const respuesta = await fetch("html/aplicacion/aplicacion.html");

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo cargar la aplicación. Código: ${respuesta.status}`,
      );
    }

    const html = await respuesta.text();

    contenido.innerHTML = html;

    // --------------------------------
    // CARGAR BARRA
    // --------------------------------

    await Promise.all([cargarBarraLateral(), cargarBarraSuperior()]);

    // --------------------------------
    // CARGAR INICIO
    // --------------------------------

    await cargarPantalla("html/inicio/inicio.html", "js/inicio/inicio.js", {
      ruta: "css/inicio/inicio.css",
      id: "inicio",
    });
  } catch (error) {
    console.error("Error al cargar aplicación:", error);

    contenido.innerHTML = `
            <div
                style="
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-family: Arial, Helvetica, sans-serif;
                "
            >
                <p>
                    No se pudo cargar Helen.
                </p>
            </div>
        `;
  }
}

// ========================================
// NAVEGACIÓN GLOBAL
// ========================================

window.cargarPantalla = cargarPantalla;

window.cargarAplicacion = cargarAplicacion;

// ========================================
// COMPROBAR AUTENTICACIÓN
// ========================================

onAuthStateChanged(window.auth, (usuario) => {
  if (usuario) {
    console.log("Sesión encontrada:", usuario.email);

    cargarAplicacion();
  } else {
    console.log("No hay sesión activa.");

    cargarPantallaLogin();
  }
});

// ========================================
// CARGAR LOGIN
// ========================================

async function cargarPantallaLogin() {
  try {
    await cargarCSS("css/inicio-sesion/inicio-sesion.css", "inicio-sesion");

    const respuesta = await fetch("html/inicio-sesion/inicio-sesion.html");

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo cargar el login. Código: ${respuesta.status}`,
      );
    }

    const html = await respuesta.text();

    contenido.innerHTML = html;

    // --------------------------------
    // ELIMINAR SCRIPT ANTERIOR
    // --------------------------------

    const scriptAnterior = document.querySelector("script[data-pantalla]");

    if (scriptAnterior) {
      scriptAnterior.remove();
    }

    // --------------------------------
    // CARGAR JS LOGIN
    // --------------------------------

    const script = document.createElement("script");

    script.src = `js/inicio-sesion/inicio-sesion.js?t=${Date.now()}`;

    script.type = "module";

    script.dataset.pantalla = "true";

    document.body.appendChild(script);
  } catch (error) {
    console.error("Error al cargar login:", error);
  }
}

// ========================================
// CARGAR BARRA SUPERIOR
// ========================================

async function cargarBarraSuperior() {
  try {
    const respuesta = await fetch("html/barra-superior/barra-superior.html");

    if (!respuesta.ok) {
      throw new Error(
        `No se pudo cargar la barra superior. Código: ${respuesta.status}`,
      );
    }

    const html = await respuesta.text();

    const contenedor = document.getElementById("barra-superior-contenedor");

    if (!contenedor) {
      throw new Error("No existe #barra-superior-contenedor.");
    }

    // --------------------------------
    // INSERTAR HTML
    // --------------------------------

    contenedor.innerHTML = html;

    // --------------------------------
    // CARGAR CSS
    // --------------------------------

    await cargarCSS("css/barra-superior/barra-superior.css", "barra-superior");

    // --------------------------------
    // ELIMINAR SCRIPT ANTERIOR
    // --------------------------------

    const scriptAnterior = document.querySelector(
      "script[data-barra-superior]",
    );

    if (scriptAnterior) {
      scriptAnterior.remove();
    }

    // --------------------------------
    // CARGAR JAVASCRIPT
    // --------------------------------

    const script = document.createElement("script");

    script.src = `js/barra-superior/barra-superior.js?t=${Date.now()}`;

    script.type = "module";

    script.dataset.barraSuperior = "true";

    document.body.appendChild(script);
  } catch (error) {
    console.error("Error al cargar barra superior:", error);
  }
}
