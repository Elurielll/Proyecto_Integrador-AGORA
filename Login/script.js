const signInBtn = document.getElementById('sign-in');
const signUpBtn = document.getElementById('sign-up');
const formContainer = document.getElementById('form');
const banner = document.getElementById('banner');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

/* --- LÓGICA VISUAL (Intercambio entre Login y lo del Registro) --- */

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

/* --- LÓGICA DE COMUNICACIÓN CON E SERVER --- */

// Evento para el Inicio de Sesión
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

        const data = await response.json(); // Leemos la respuesta del servidor

        if (response.ok) {
            // Caso: Éxito (Admin o Usuario)
            if (data.role === 'admin') {
                alert("👑 Sesión iniciada como ADMINISTRADOR");
                window.location.href = "admin.html";
            } else {
                window.location.href = "publicaciones.html";
            }
        } else {
            // Caso: Error (Aquí capturamos lo que pediste)
            alert("❌ Error: " + (data.message || "Credenciales incorrectas") + ". ¡Por favor regístrate!");
        }
    } catch (error) {
        console.error("Error conectando al servidor:", error);
        alert("⚠️ No se pudo conectar con el servidor. ¿Iniciaste el comando 'node server.js'?");
    }
});

// Evento/funcion para el Registro
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
            alert("✅ ¡Registro exitoso! Ya puedes iniciar sesión.");
            // Regresamos automáticamente al formulario de login
            formContainer.classList.remove('toggle');
            banner.classList.remove('toggle');
        }
    } catch (error) {
        console.error("Error en el registro:", error);
    }
});