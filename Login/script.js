// --- CONTROL DE HISTORIAL: Limpia el login al regresar con botón atrás ---
window.addEventListener('pageshow', function (evento) {
    if (evento.persisted) {
        const formularioLogin = document.getElementById('login-form');
        if (formularioLogin) {
            formularioLogin.reset(); 
        }
    }
});

// --- FUNCIÓN DE VENTANA MODAL INTELIGENTE (ÉXITO / ERROR) ---
function mostrarAlerta(titulo, mensaje, tipo = 'exito', destinoUrl = null) {
    const modal = document.getElementById('modalExito');
    const icono = modal.querySelector('.modal-exito-icono');
    const txtTitulo = document.getElementById('modalExitoTitulo');
    const txtMensaje = document.getElementById('modalExitoMensaje');
    const btnContinuar = document.getElementById('btnModalExito');

    // Configuramos visualmente si es error o éxito
    if (tipo === 'error') {
        icono.textContent = '❌';
        txtTitulo.style.color = '#ef4444'; // Rojo para error
    } else {
        icono.textContent = '✅';
        txtTitulo.style.color = '#10b981'; // Verde para éxito
    }

    txtTitulo.textContent = titulo;
    txtMensaje.innerHTML = mensaje; // Usamos innerHTML para permitir saltos de línea (<br>)
    modal.style.display = 'flex';

    // Qué hacer al darle click a "Continuar"
    btnContinuar.onclick = function() {
        modal.style.display = 'none'; 
        if (destinoUrl && tipo === 'exito') {
            window.location.href = destinoUrl; 
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

// 1. LOGIN
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
            localStorage.setItem('nombreUsuario', data.nombre);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data.id); 

            if (data.role === 'admin_server') {
                mostrarAlerta("¡Bienvenido Administrador!", "Ingresando al panel...", "exito", "admin.html");
            } else if (data.role === 'moderador') {
                mostrarAlerta("🛡️ Modo Moderador", "Redirigiendo al muro de Agora...", "exito", "publicaciones.html");
            } else {
                mostrarAlerta("¡Inicio de sesión exitoso!", "Serás redirigido al muro.", "exito", "publicaciones.html");
            }
        } else {
            // Manejo de errores específicos del Login (Depende de tu backend)
            if (data.error === 'wrong_email') {
                mostrarAlerta("Correo no encontrado", "El correo electrónico ingresado no pertenece a ninguna cuenta.", "error");
            } else if (data.error === 'wrong_password') {
                mostrarAlerta("Contraseña incorrecta", "La contraseña que ingresaste es incorrecta. Inténtalo de nuevo.", "error");
            } else {
                mostrarAlerta("Acceso Denegado", data.message || "Credenciales incorrectas.", "error");
            }
        }
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        mostrarAlerta("Error de conexión", "No se pudo conectar con el servidor.", "error");
    }
});


// 2. REGISTRO
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullname = document.getElementById('name').value;
    const email_reg = document.getElementById('email-reg').value;
    const password_reg = document.getElementById('password-reg').value;

    // --- FILTROS DE CONTRASEÑA ---
    let erroresPassword = [];
    if (password_reg.length < 8 || password_reg.length > 12) {
        erroresPassword.push("• Debe tener entre 8 y 12 caracteres.");
    }
    if (!/[A-Z]/.test(password_reg)) {
        erroresPassword.push("• Le falta al menos una letra MAYÚSCULA.");
    }
    if (!/\d/.test(password_reg)) {
        erroresPassword.push("• Le falta al menos un NÚMERO.");
    }
    if (!/[@$!%*#?&._\-]/.test(password_reg)) {
        erroresPassword.push("• Le falta al menos un SÍMBOLO (ej: @, $, !, #, etc).");
    }

    // Si la contraseña no pasa el filtro, detenemos todo y mostramos el modal de error
    if (erroresPassword.length > 0) {
        mostrarAlerta(
            "Contraseña Débil", 
            "Tu contraseña no cumple los requisitos:<br><br>" + erroresPassword.join('<br>'), 
            "error"
        );
        return; 
    }

    const formData = { fullname, email_reg, password_reg };

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json(); // Leemos la respuesta del servidor

        if (response.ok) {
            // Animación visual de regreso al login
            formContainer.classList.remove('toggle');
            banner.classList.remove('toggle');
            registerForm.reset();
            
            mostrarAlerta("¡Registro exitoso!", "Ahora puedes iniciar sesión con tus nuevos datos.", "exito");
            
        } else {
            // Manejo de errores específicos del Registro (Depende de tu backend)
            if (data.error === 'user_exists') {
                mostrarAlerta("Usuario no disponible", "Ese nombre de usuario ya está ocupado por otra persona.", "error");
            } else if (data.error === 'email_exists') {
                mostrarAlerta("Correo ya asociado", "Este correo electrónico ya tiene una cuenta activa.", "error");
            } else {
                mostrarAlerta("Error de Registro", data.message || "Hubo un problema al crear la cuenta.", "error");
            }
        }
    } catch (error) {
        console.error("Error en el registro:", error);
        mostrarAlerta("Error de conexión", "No se pudo conectar con el servidor para registrarte.", "error");
    }
});

// --- FUNCIÓN DEL OJO (CONTRASEÑA) ---
function togglePassword(inputId, button) {
    const passwordInput = document.getElementById(inputId);
    
    if (passwordInput && passwordInput.type === 'password') {
        passwordInput.type = 'text';
        button.textContent = '🙈'; 
    } else if (passwordInput) {
        passwordInput.type = 'password';
        button.textContent = '👁️'; 
    }
}