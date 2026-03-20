const express = require('express');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs'); 
const app = express();

// --- CONFIGURACIÓN DE CARPETAS ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

// --- CONFIGURACIÓN DE MULTER (SOLO IMÁGENES) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato no válido. Solo se permiten imágenes.'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads')); 

// --- BASE DE DATOS EN MEMORIA ---
let usuariosRegistrados = []; 
let publicaciones = []; 
let logEventos = []; 
let rastroUsuarios = {}; 

// --- FUNCION: BORRAR ARCHIVOS FÍSICOS ---
function eliminarArchivos(listaRutas) {
    listaRutas.forEach(ruta => {
        const fullPath = path.join(__dirname, ruta);
        if (fs.existsSync(fullPath)) {
            fs.unlink(fullPath, (err) => {
                if (err) console.error("Error al borrar archivo:", ruta);
            });
        }
    });
}

function registrarEvento(usuario, rol, accion, detalles = "") {
    const evento = {
        fecha: new Date().toLocaleString(),
        usuario, rol, accion, detalles
    };
    logEventos.push(evento);
    if (logEventos.length > 500) logEventos.shift(); 
    console.log(`[${evento.fecha}] ${usuario} (${rol}): ${accion}`);
}

// --- CREDENCIALES ---
const ADMIN_SERVER = { email: "admin@servidor.com", pass: "root123", role: "admin_server", nombre: "Admin" };
const MODERADOR = { email: "mod@agora.com", pass: "mod123", role: "moderador", nombre: "Moderador" };

// --- RUTAS DE LOGIN Y REGISTRO ---
app.post('/register', (req, res) => {
    const { fullname, email_reg, password_reg } = req.body;
    // NUEVO: Se añaden campos de perfil por defecto al registrarse
    usuariosRegistrados.push({ 
        nombre: fullname, 
        email: email_reg, 
        password: password_reg,
        bio: "¡Hola! Bienvenido a mi perfil.",
        municipio: "No especificado",
        estado: "No especificado",
        fotoPerfil: "/icons/AgoralCON.jpeg"
    });
    registrarEvento(fullname, "user", "Registro Nuevo", `Email: ${email_reg}`);
    res.status(200).send("Registro exitoso");
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    let u = null;

    if (email === ADMIN_SERVER.email && password === ADMIN_SERVER.pass) u = ADMIN_SERVER;
    else if (email === MODERADOR.email && password === MODERADOR.pass) u = MODERADOR;
    else u = usuariosRegistrados.find(user => user.email === email && user.password === password);

    if (u) {
        registrarEvento(u.nombre || "Usuario", u.role || "user", "Inicio de Sesión", "Acceso al sistema");
        return res.json({ role: u.role || 'user', nombre: u.nombre });
    }
    res.status(401).json({ message: "Error de credenciales" });
});

// --- RUTAS DE PERFIL (NUEVO) ---

// Obtener datos de un usuario
app.get('/api/perfil/:nombre', (req, res) => {
    const usuario = usuariosRegistrados.find(u => u.nombre === req.params.nombre);
    if (usuario) {
        const { password, ...datosPublicos } = usuario;
        res.json(datosPublicos);
    } else {
        res.status(404).json({ message: "Usuario no encontrado" });
    }
});

// Obtener solo las publicaciones de un usuario específico
app.get('/api/publicaciones/usuario/:nombre', (req, res) => {
    const filtradas = publicaciones.filter(p => p.autor === req.params.nombre);
    res.json(filtradas);
});

// Actualizar datos del perfil
app.post('/api/actualizar-perfil', (req, res) => {
    const { nombre, bio, municipio, estado } = req.body;
    const usuario = usuariosRegistrados.find(u => u.nombre === nombre);
    if (usuario) {
        if (bio !== undefined) usuario.bio = bio;
        if (municipio !== undefined) usuario.municipio = municipio;
        if (estado !== undefined) usuario.estado = estado;
        res.json({ message: "Perfil actualizado" });
    } else {
        res.status(404).json({ message: "Usuario no encontrado" });
    }
});

// --- EL RESTO DE TUS RUTAS SE MANTIENEN IGUAL ---

app.get('/admin-full-stats', (req, res) => {
    const ahora = Date.now();
    const onlineReal = Object.values(rastroUsuarios).filter(t => ahora - t < 20000).length;
    res.json({
        totalPosts: publicaciones.length,
        conectados: onlineReal || 1,
        eventos: logEventos
    });
});

app.post('/track-online', (req, res) => {
    const { nombre } = req.body;
    if (nombre) rastroUsuarios[nombre] = Date.now();
    res.sendStatus(200);
});

app.post('/publicar', upload.array('imagenes', 10), (req, res) => {
    const { texto, autor, rol } = req.body; 
    const nuevoPost = {
        id: Date.now(),
        texto, 
        autor: autor || "Anónimo", 
        rol: rol || "user", 
        imagenes: req.files ? req.files.map(file => `/uploads/${file.filename}`) : [],
        comentarios: [], 
        fecha: new Date().toLocaleString(),
        estado: 'disponible' 
    };
    publicaciones.push(nuevoPost);
    registrarEvento(nuevoPost.autor, nuevoPost.rol, "Nueva Publicación", `Post ID: ${nuevoPost.id}`);
    res.status(201).json(nuevoPost);
});

app.get('/get-posts', (req, res) => { res.json(publicaciones); });

app.post('/comentar', (req, res) => {
    const { postId, textoComentario, autor, rol } = req.body; 
    const post = publicaciones.find(p => p.id == postId);
    if (post) {
        post.comentarios.push({
            texto: textoComentario,
            autor: autor,
            rol: rol || "user", 
            fecha: new Date().toLocaleString()
        });
        registrarEvento(autor, rol || "user", "Nuevo Comentario", `En post ID: ${postId}`);
        res.status(200).json({ message: "Añadido" });
    } else { res.status(404).json({ message: "Error" }); }
});

app.post('/cambiar-estado', (req, res) => {
    const { postId, nuevoEstado, nombreUsuario, role } = req.body;
    const post = publicaciones.find(p => p.id == postId);
    if (post && (post.autor === nombreUsuario || role === 'admin_server')) {
        post.estado = nuevoEstado;
        registrarEvento(nombreUsuario, role, "Cambio de Estado", `Post ${postId} -> ${nuevoEstado}`);
        return res.status(200).json({ message: "Ok" });
    }
    res.status(403).json({ message: "No autorizado" });
});

app.post('/editar-post', upload.array('imagenes', 10), (req, res) => {
    const { postId, nuevoTexto, nombreUsuario, role, imagenesRestantes } = req.body;
    const post = publicaciones.find(p => p.id == postId);
    if (post && (post.autor === nombreUsuario || role === 'admin_server')) {
        const fotosQueSeQuedan = Array.isArray(imagenesRestantes) ? imagenesRestantes : (imagenesRestantes ? [imagenesRestantes] : []);
        const fotosParaBorrar = post.imagenes.filter(img => !fotosQueSeQuedan.includes(img));
        eliminarArchivos(fotosParaBorrar);
        post.texto = nuevoTexto;
        const nuevasFotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        post.imagenes = [...fotosQueSeQuedan, ...nuevasFotos];
        registrarEvento(nombreUsuario, role, "Edición de Post", `ID: ${postId}`);
        return res.status(200).json({ message: "Ok" });
    }
    res.status(403).json({ message: "No autorizado" });
});

app.post('/borrar-post', (req, res) => {
    const { postId, nombreUsuario, role, razon } = req.body;
    const idx = publicaciones.findIndex(p => p.id == postId);
    if (idx !== -1) {
        const post = publicaciones[idx];
        if (post.autor === nombreUsuario || role === 'moderador' || role === 'admin_server') {
            eliminarArchivos(post.imagenes);
            registrarEvento(nombreUsuario, role, "Eliminación de Post", `ID: ${postId} | Razón: ${razon || 'Autor'}`);
            publicaciones.splice(idx, 1);
            return res.status(200).json({ message: "Eliminado" });
        }
    }
    res.status(403).json({ message: "Sin permisos" });
});

app.post('/editar-comentario', (req, res) => {
    const { postId, index, nuevoTexto, nombreUsuario, role } = req.body;
    const post = publicaciones.find(p => p.id == postId);
    if (post && post.comentarios[index]) {
        if (post.comentarios[index].autor === nombreUsuario || role === 'admin_server') {
            post.comentarios[index].texto = nuevoTexto;
            registrarEvento(nombreUsuario, role, "Edición de Comentario", `Post ID: ${postId}`);
            return res.status(200).json({ message: "Comentario editado" });
        }
    }
    res.status(403).json({ message: "Sin permisos" });
});

app.post('/borrar-comentario', (req, res) => {
    const { postId, comentarioIndex, nombreUsuario, role, razon } = req.body;
    const post = publicaciones.find(p => p.id == postId);
    if (post && post.comentarios[comentarioIndex]) {
        const comentario = post.comentarios[comentarioIndex];
        if (comentario.autor === nombreUsuario || role === 'moderador' || role === 'admin_server') {
            post.comentarios.splice(comentarioIndex, 1);
            registrarEvento(nombreUsuario, role, "Eliminación de Comentario", `Post ID: ${postId} | Razón: ${razon || 'Autor'}`);
            return res.status(200).json({ message: "Comentario eliminado" });
        }
    }
    res.status(403).json({ message: "Sin permisos o no encontrado" });
});

app.post('/limpiar-servidor', (req, res) => {
    const { confirmacion } = req.body;
    if (confirmacion === "CONFIRMAR") {
        const archivos = fs.readdirSync(uploadDir);
        for (const archivo of archivos) {
            fs.unlinkSync(path.join(uploadDir, archivo));
        }
        publicaciones = [];
        registrarEvento("ADMIN", "admin_server", "VACIADO TOTAL", "Disco y Muro reseteados");
        return res.status(200).json({ message: "Limpio" });
    }
    res.status(400).json({ message: "Palabra incorrecta" });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 SERVIDOR AGORA INICIADO
    --------------------------------------------
    👉 Local: http://localhost:${PORT}
    👉 Admin Servidor: admin@servidor.com / root123
    👉 Moderador: mod@agora.com / mod123
    👉 Monitor de actividad activo...
    --------------------------------------------`);
});