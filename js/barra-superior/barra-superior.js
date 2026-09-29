import {
    signOut
} from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ========================================
// ELEMENTOS
// ========================================

const usuarioBoton =
    document.getElementById(
        "usuario-boton"
    );


const menuUsuario =
    document.getElementById(
        "menu-usuario"
    );


const cerrarSesion =
    document.getElementById(
        "cerrar-sesion"
    );


const usuarioAvatar =
    document.getElementById(
        "usuario-avatar"
    );


const usuarioNombre =
    document.getElementById(
        "usuario-nombre"
    );


const opcionesUsuario =
    document.querySelectorAll(
        ".opcion-usuario"
    );


// ========================================
// INICIALIZAR USUARIO
// ========================================

inicializarUsuario();


function inicializarUsuario() {

    let usuario =
        sessionStorage.getItem(
            "usuarioOperativo"
        );


    // ----------------------------------------
    // USUARIO POR DEFECTO
    // ----------------------------------------

    if (
        usuario !== "Gon" &&
        usuario !== "Helen"
    ) {

        usuario =
            "Gon";


        sessionStorage.setItem(
            "usuarioOperativo",
            usuario
        );

    }


    actualizarUsuarioVisual(
        usuario
    );

}


// ========================================
// ABRIR / CERRAR MENÚ
// ========================================

usuarioBoton.addEventListener(
    "click",
    (evento) => {

        evento.stopPropagation();

        menuUsuario.classList.toggle(
            "visible"
        );

    }
);


// ========================================
// CERRAR AL HACER CLICK AFUERA
// ========================================

document.addEventListener(
    "click",
    () => {

        menuUsuario.classList.remove(
            "visible"
        );

    }
);


// ========================================
// CAMBIAR USUARIO
// ========================================

opcionesUsuario.forEach(
    (opcion) => {

        opcion.addEventListener(
            "click",
            (evento) => {

                evento.stopPropagation();


                const usuario =
                    obtenerUsuarioDesdeOpcion(
                        opcion
                    );


                // ----------------------------------------
                // GUARDAR USUARIO
                // ----------------------------------------

                sessionStorage.setItem(
                    "usuarioOperativo",
                    usuario
                );


                // ----------------------------------------
                // ACTUALIZAR INTERFAZ
                // ----------------------------------------

                actualizarUsuarioVisual(
                    usuario
                );


                // ----------------------------------------
                // AVISAR AL RESTO DE LA APLICACIÓN
                // ----------------------------------------

                window.dispatchEvent(
                    new CustomEvent(
                        "usuarioOperativoCambiado",
                        {
                            detail: {
                                usuario
                            }
                        }
                    )
                );


                // ----------------------------------------
                // CERRAR MENÚ
                // ----------------------------------------

                menuUsuario.classList.remove(
                    "visible"
                );


                console.log(
                    "Usuario operativo:",
                    usuario
                );

            }
        );

    }
);


// ========================================
// OBTENER USUARIO
// ========================================

function obtenerUsuarioDesdeOpcion(
    opcion
) {

    const usuario =
        opcion.dataset.usuario;


    if (
        usuario === "helen"
    ) {

        return "Helen";

    }


    return "Gon";

}


// ========================================
// ACTUALIZAR INTERFAZ
// ========================================

function actualizarUsuarioVisual(
    usuario
) {

    const nombre =
        usuario;


    usuarioNombre.textContent =
        nombre;


    usuarioAvatar.textContent =
        nombre
            .charAt(0)
            .toUpperCase();


    opcionesUsuario.forEach(
        (opcion) => {

            const usuarioOpcion =
                obtenerUsuarioDesdeOpcion(
                    opcion
                );


            if (
                usuarioOpcion ===
                usuario
            ) {

                opcion.classList.add(
                    "activo"
                );

            } else {

                opcion.classList.remove(
                    "activo"
                );

            }

        }
    );

}


// ========================================
// CERRAR SESIÓN
// ========================================

cerrarSesion.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                window.auth
            );


            sessionStorage.removeItem(
                "usuarioOperativo"
            );


            console.log(
                "Sesión cerrada."
            );


        } catch (error) {

            console.error(
                "Error al cerrar sesión:",
                error
            );

        }

    }
);