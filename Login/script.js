// --- FUNCIÓN DE VENTANA MODAL DE ÉXITO ---
function mostrarAlertaExito(mensaje, destinoUrl = null) {
    const modal = document.getElementById('modalExito');
    const mensajeP = document.getElementById('modalExitoMensaje');
    const btnContinuar = document.getElementById('btnModalExito');

    // Cambiamos el texto
    mensajeP.textContent = mensaje;
    
    // Mostramos la ventana
    modal.style.display = 'flex';

    // Qué hacer al darle click a "Continuar"
    btnContinuar.onclick = function() {
        modal.style.display = 'none'; // Ocultar
        if (destinoUrl) {
            window.location.href = destinoUrl; // Redirigir si hay url
        }
    };
}

// --- ELEMENTOS DEL DOM ---
const signInBtn = document.getElementById('sign-in');
const signUpBtn = document.getElementById('sign-up');
const formContainer = document.getElementById('form');
const banner = document.getElementById('banner');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

/* --- LÓGICA VISUAL --- */
signUpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    formContainer.classList.add('toggle');
    banner.classList.add('toggle');
});

signInBtn.addEventListener('click', (e) => {
    e.preventDefault();
    formContainer.classList.remove('toggle');
    banner.classList.remove('toggle');
});

/* --- LÓGICA DE COMUNICACIÓN CON EL SERVER --- */

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json(); 

        if (response.ok) {
            // Guardamos los datos de sesión
            localStorage.setItem('nombreUsuario', data.nombre);
            localStorage.setItem('userRole', data.role);

            // --- REDIRECCIÓN CON VENTANA MODAL SEGÚN ROL ---
            if (data.role === 'admin_server') {
                mostrarAlertaExito("¡Bienvenido Administrador! Ingresando al panel...", "admin.html");
            } else if (data.role === 'moderador') {
                mostrarAlertaExito("🛡️ Modo Moderador de Agora. Redirigiendo al muro...", "publicaciones.html");
            } else {
                mostrarAlertaExito("¡Inicio de sesión exitoso! Serás redirigido al muro.", "publicaciones.html");
            }
            
        } else {
            // Mantenemos la alerta normal para los errores
            alert("❌ " + (data.message || "Credenciales incorrectas"));
        }
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        alert("⚠️ Error de conexión.");
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        fullname: document.getElementById('name').value,
        email_reg: document.getElementById('email-reg').value,
        password_reg: document.getElementById('password-reg').value
    };

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Cambiamos la vista visualmente hacia el login
            formContainer.classList.remove('toggle');
            banner.classList.remove('toggle');
            
            // Limpiamos los datos que escribió
            registerForm.reset();
            
            // Mostramos la ventana de éxito (SIN redirección, para que se quede y haga login)
            mostrarAlertaExito("¡Registro exitoso! Ahora puedes iniciar sesión con tus nuevos datos.");
            
        } else {
            alert("❌ Hubo un error en el registro.");
        }
    } catch (error) {
        console.error("Error en el registro:", error);
        alert("⚠️ Error de conexión en el registro.");
    }
});