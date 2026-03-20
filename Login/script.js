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

            // --- REDIRECCIÓN SEGÚN ROL ---
            if (data.role === 'admin_server') {
                // El administrador técnico va a su panel privado
                window.location.href = "admin.html";
            } else if (data.role === 'moderador') {
                // El moderador va al muro con herramientas de limpieza
                alert("🛡️ Modo: Moderador de Agora");
                window.location.href = "publicaciones.html";
            } else {
                // El usuario normal va al muro estándar
                window.location.href = "publicaciones.html";
            }
            
        } else {
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
            alert("✅ ¡Registro exitoso! Ya puedes iniciar sesión.");
            formContainer.classList.remove('toggle');
            banner.classList.remove('toggle');
        }
    } catch (error) {
        console.error("Error en el registro:", error);
    }
});