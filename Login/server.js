const express = require('express');
const path = require('path');
const app = express();

// Configuración para leer datos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS, Imágenes)
app.use(express.static(__dirname));

// --- BASE DE DATOS TEMPORAL (Este se va almacenar en la lap que usemos de server) ---
let usuariosRegistrados = []; 

// --- RUTA DE REGISTRO ---
app.post('/register', (req, res) => {
    const { fullname, email_reg, password_reg } = req.body;

    usuariosRegistrados.push({
        nombre: fullname,
        email: email_reg,
        password: password_reg
    });

    console.log(`📝 Nuevo registro: ${fullname} (${email_reg})`);
    res.status(200).send("Registro exitoso");
});

// --- RUTA DE LOGIN ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const ADMIN_USER = "admin@agora.com";
    const ADMIN_PASS = "admin123";

    console.log(`📡 Intento de acceso: ${email}`);

    // 1. Verificación de Admin
    if (email === ADMIN_USER && password === ADMIN_PASS) {
        console.log("👑 Acceso de Administrador concedido.");
        return res.json({ role: 'admin' });
    }

    // 2. Verificación de Usuario Normal
    const usuarioEncontrado = usuariosRegistrados.find(u => u.email === email && u.password === password);

    if (usuarioEncontrado) {
        console.log(`👤 Usuario logueado: ${usuarioEncontrado.nombre}`);
        return res.json({ role: 'user' });
    } else {
        console.log("❌ Acceso fallido: No encontrado.");
        return res.status(401).json({ message: "Usuario no registrado" });
    }
});

// --- INICIAR EL SERVIDOR (y mensaje de el link y la cuenta admin ya hecha por si se nos olvida)---
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 SERVIDOR AGORA INICIADO
    --------------------------------------------
    👉 Local: http://localhost:${PORT}
    👉 Admin: admin@agora.com / admin123
    --------------------------------------------
    `);
});