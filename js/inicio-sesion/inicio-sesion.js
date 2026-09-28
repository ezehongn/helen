import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// ========================================
// ELEMENTOS
// ========================================

const formulario =
    document.getElementById(
        "formulario-login"
    );


const botonMostrar =
    document.getElementById(
        "mostrar-contrasena"
    );


const contrasena =
    document.getElementById(
        "contrasena"
    );


const recordarSesion =
    document.getElementById(
        "recordar-sesion"
    );


// ========================================
// MOSTRAR / OCULTAR CONTRASEÑA
// ========================================

botonMostrar.addEventListener(
    "click",
    () => {

        if (
            contrasena.type ===
            "password"
        ) {

            contrasena.type =
                "text";


            botonMostrar.setAttribute(
                "aria-label",
                "Ocultar contraseña"
            );

        } else {

            contrasena.type =
                "password";


            botonMostrar.setAttribute(
                "aria-label",
                "Mostrar contraseña"
            );

        }

    }
);


// ========================================
// INICIAR SESIÓN
// ========================================

formulario.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();


        const correo =
            document.getElementById(
                "correo"
            ).value.trim();


        const contrasenaValor =
            contrasena.value;


        const recordar =
            recordarSesion.checked;


        const botonLogin =
            formulario.querySelector(
                ".boton-login"
            );


        try {

            // --------------------------------
            // DESHABILITAR BOTÓN
            // --------------------------------

            botonLogin.disabled =
                true;


            botonLogin.querySelector(
                "span"
            ).textContent =
                "Ingresando...";


            // --------------------------------
            // CONFIGURAR PERSISTENCIA
            // --------------------------------

            await setPersistence(
                window.auth,
                recordar
                    ? browserLocalPersistence
                    : browserSessionPersistence
            );


            // --------------------------------
            // INICIAR SESIÓN
            // --------------------------------

            const resultado =
                await signInWithEmailAndPassword(
                    window.auth,
                    correo,
                    contrasenaValor
                );


            const usuario =
                resultado.user;


            console.log(
                "Usuario autenticado:",
                usuario
            );


            console.log(
                "UID:",
                usuario.uid
            );


            console.log(
                "Correo:",
                usuario.email
            );

        } catch (error) {

            console.error(
                "Error al iniciar sesión:",
                error
            );


            mostrarErrorLogin(
                error
            );


        } finally {

            botonLogin.disabled =
                false;


            botonLogin.querySelector(
                "span"
            ).textContent =
                "Iniciar sesión";

        }

    }
);


// ========================================
// MENSAJE DE ERROR
// ========================================

function mostrarErrorLogin(error) {

    console.error(
        "Código de error Firebase:",
        error.code
    );


    console.error(
        "Mensaje de error Firebase:",
        error.message
    );


    let mensaje =
        "No se pudo iniciar sesión.";


    switch (error.code) {

        case "auth/invalid-credential":

            mensaje =
                "El correo o la contraseña son incorrectos.";

            break;


        case "auth/user-not-found":

            mensaje =
                "El correo o la contraseña son incorrectos.";

            break;


        case "auth/wrong-password":

            mensaje =
                "El correo o la contraseña son incorrectos.";

            break;


        case "auth/invalid-email":

            mensaje =
                "El correo electrónico no es válido.";

            break;


        case "auth/too-many-requests":

            mensaje =
                "Demasiados intentos. Intentá nuevamente más tarde.";

            break;


        case "auth/network-request-failed":

            mensaje =
                "No se pudo conectar con Firebase.";

            break;


        case "auth/api-key-not-valid":

            mensaje =
                "La configuración de Firebase no es válida.";

            break;


        case "auth/operation-not-allowed":

            mensaje =
                "El inicio de sesión con correo y contraseña no está habilitado.";

            break;

    }


    alert(mensaje);

}