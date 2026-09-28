// ========================================
// ELEMENTOS DEL MENÚ
// ========================================

const itemsMenu = document.querySelectorAll(".item-menu");

// ========================================
// RUTAS
// ========================================

const rutasPantallas = {

    inicio: {
        html: "html/inicio/inicio.html",
        js: "js/inicio/inicio.js",
        css: {
            ruta: "css/inicio/inicio.css",
            id: "inicio"
        }
    },

    productos: {
        html: "html/productos/productos.html",
        js: "js/productos/productos.js",
        css: {
            ruta: "css/productos/productos.css",
            id: "productos"
        }
    },

    ventas: {
        html: "html/ventas/ventas.html",
        js: "js/ventas/ventas.js",
        css: {
            ruta: "css/ventas/ventas.css",
            id: "ventas"
        }
    },

    clientes: {
        html: "html/clientes/clientes.html",
        js: "js/clientes/clientes.js",
        css: {
            ruta: "css/clientes/clientes.css",
            id: "clientes"
        }
    },

    gastos: {
        html: "html/gastos/gastos.html",
        js: "js/gastos/gastos.js",
        css: {
            ruta: "css/gastos/gastos.css",
            id: "gastos"
        }
    },

    informes: {
        html: "html/informes/informes.html",
        js: "js/informes/informes.js",
        css: {
            ruta: "css/informes/informes.css",
            id: "informes"
        }
    },

    configuracion: {
        html: "html/configuracion/configuracion.html",
        js: "js/configuracion/configuracion.js",
        css: {
            ruta: "css/configuracion/configuracion.css",
            id: "configuracion"
        }
    }

};

// ========================================
// ACTUALIZAR PANTALLA ACTIVA
// ========================================

function actualizarPantallaActiva(rutaHtml) {

    itemsMenu.forEach((item) => {
        item.classList.remove("activo");
    });

    const pantallaActiva = Object.entries(rutasPantallas).find(
        ([, ruta]) => ruta.html === rutaHtml
    );

    if (!pantallaActiva) {
        return;
    }

    const [nombrePantalla] = pantallaActiva;

    const itemActivo = document.querySelector(
        `.item-menu[data-pantalla="${nombrePantalla}"]`
    );

    if (itemActivo) {
        itemActivo.classList.add("activo");
    }
}

window.actualizarPantallaActiva = actualizarPantallaActiva;

// ========================================
// NAVEGACIÓN
// ========================================

itemsMenu.forEach((item) => {

    item.addEventListener("click", async () => {

        const pantalla = item.dataset.pantalla;

        const ruta = rutasPantallas[pantalla];

        if (!ruta) {

            console.error(
                "No existe una ruta para:",
                pantalla
            );

            return;
        }

        // ----------------------------
        // CARGAR PANTALLA
        // ----------------------------

        if (
            typeof window.cargarPantalla ===
            "function"
        ) {

            await window.cargarPantalla(
                ruta.html,
                ruta.js,
                ruta.css
            );

            // ----------------------------
            // MARCAR OPCIÓN ACTIVA
            // ----------------------------

            actualizarPantallaActiva(
                ruta.html
            );
        }
    });

});