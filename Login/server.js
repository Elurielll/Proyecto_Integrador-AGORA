const express = require('express');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs'); 
const app = express();

// ==========================================
// 🚀 1. NUEVAS HERRAMIENTAS PARA EL CHAT
// ==========================================
const http = require('http').Server(app);
const io = require('socket.io')(http);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-')); }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se permiten imágenes.'), false);
};

const upload = multer({ storage, fileFilter });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads')); 

let usuariosRegistrados = []; 
let publicaciones = []; 
let logEventos = []; 
let rastroUsuarios = {}; 

function eliminarArchivos(listaRutas) {
    listaRutas.forEach(ruta => {
        const fullPath = path.join(__dirname, ruta);
        if (fs.existsSync(fullPath)) fs.unlink(fullPath, (err) => { if (err) console.error("Error al borrar:", ruta); });
    });
}

function registrarEvento(usuario, rol, accion, detalles = "") {
    const evento = { fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }), usuario, rol, accion, detalles };
    logEventos.push(evento);
    if (logEventos.length > 500) logEventos.shift(); 
    console.log(`[${evento.fecha}] ${usuario} (${rol}): ${accion}`);
}

const ADMIN_SERVER = { email: "admin@servidor.com", pass: "root123", role: "admin_server", nombre: "Admin" };
const MODERADOR = { email: "mod@agora.com", pass: "mod123", role: "moderador", nombre: "Moderador" };

app.post('/register', (req, res) => {
    const { fullname, email_reg, password_reg } = req.body;
    usuariosRegistrados.push({ 
        nombre: fullname, email: email_reg, password: password_reg,
        bio: "¡Hola! Bienvenido a mi perfil.", municipio: "No especificado",
        estado: "No especificado", fotoPerfil: "/icons/AgoralCON.jpeg"
    });
    registrarEvento(fullname, "user", "Registro Nuevo", `Email: ${email_reg}`);
    res.status(200).send("Registro exitoso");
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    let u = (email === ADMIN_SERVER.email && password === ADMIN_SERVER.pass) ? ADMIN_SERVER :
            (email === MODERADOR.email && password === MODERADOR.pass) ? MODERADOR :
            usuariosRegistrados.find(user => user.email === email && user.password === password);

    if (u) {
        registrarEvento(u.nombre || "Usuario", u.role || "user", "Inicio de Sesión");
        return res.json({ role: u.role || 'user', nombre: u.nombre });
    }
    res.status(401).json({ message: "Error de credenciales" });
});

app.get('/api/perfil/:nombre', (req, res) => {
    const usuario = usuariosRegistrados.find(u => u.nombre === req.params.nombre);
    if (usuario) {
        const { password, ...datosPublicos } = usuario;
        res.json(datosPublicos);
    } else res.status(404).json({ message: "Usuario no encontrado" });
});

app.get('/api/publicaciones/usuario/:nombre', (req, res) => {
    res.json(publicaciones.filter(p => p.autor === req.params.nombre));
});

app.post('/api/actualizar-perfil', (req, res) => {
    const { nombre, nuevoNombre, bio, municipio, estado } = req.body;
    
    const usuario = usuariosRegistrados.find(u => u.nombre === nombre);
    
    if (usuario) {
        if (nuevoNombre && nuevoNombre !== nombre) {
            const nombreOcupado = usuariosRegistrados.some(u => u.nombre === nuevoNombre);
            if (nombreOcupado) {
                return res.status(400).send("Ese nombre de usuario ya está ocupado.");
            }
            usuario.nombre = nuevoNombre;
            publicaciones.forEach(post => {
                if (post.autor === nombre) {
                    post.autor = nuevoNombre;
                }
                post.comentarios.forEach(comentario => {
                    if (comentario.autor === nombre) {
                        comentario.autor = nuevoNombre;
                    }
                });
            });
            
            registrarEvento(nuevoNombre, usuario.role || "user", "Cambió su nombre de usuario", `De: ${nombre}`);
        }

        if (bio !== undefined) usuario.bio = bio;
        if (municipio !== undefined) usuario.municipio = municipio;
        if (estado !== undefined) usuario.estado = estado;
        
        res.status(200).json({ message: "Perfil actualizado correctamente" });
    } else {
        res.status(404).json({ message: "Usuario no encontrado" });
    }
});

app.post('/api/actualizar-foto-perfil', upload.single('fotoPerfil'), (req, res) => {
    const { nombreUsuario } = req.body;
    if (!req.file) return res.status(400).json({ message: "No se subió ninguna imagen" });
    const usuario = usuariosRegistrados.find(u => u.nombre === nombreUsuario);
    if (usuario) {
        if (usuario.fotoPerfil && !usuario.fotoPerfil.includes("AgoralCON") && usuario.fotoPerfil.startsWith("/uploads/")) {
            eliminarArchivos([usuario.fotoPerfil]);
        }
        usuario.fotoPerfil = `/uploads/${req.file.filename}`;
        registrarEvento(nombreUsuario, usuario.role || "user", "Cambio Foto Perfil");
        res.status(200).json({ message: "Foto actualizada", nuevaRuta: usuario.fotoPerfil });
    } else {
        eliminarArchivos([`/uploads/${req.file.filename}`]);
        res.status(404).json({ message: "Usuario no encontrado" });
    }
});

app.get('/admin-full-stats', (req, res) => {
    const onlineReal = Object.values(rastroUsuarios).filter(t => Date.now() - t < 20000).length;
    res.json({ totalPosts: publicaciones.length, conectados: onlineReal || 1, eventos: logEventos });
});

app.post('/track-online', (req, res) => {
    if (req.body.nombre) rastroUsuarios[req.body.nombre] = Date.now();
    res.sendStatus(200);
});

// --- PUBLICAR ---
app.post('/publicar', upload.array('imagenes', 5), (req, res) => {
    const { titulo, precio, estado, municipio, texto, autor, rol, estado_venta, categoria, condicion } = req.body; 
    
    const nuevoPost = {
        id: Date.now(),
        titulo: titulo || '',            
        precio: precio || '',            
        estado: estado || '',            
        municipio: municipio || '',      
        texto: texto || '', 
        categoria: categoria || 'otros', 
        condicion: condicion || '',
        autor: autor || "Anónimo", 
        rol: rol || "user", 
        estado_venta: estado_venta || 'disponible', 
        imagenes: req.files ? req.files.map(file => `/uploads/${file.filename}`) : [],
        comentarios: [], 
        fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) 
    };
    
    publicaciones.push(nuevoPost);
    registrarEvento(nuevoPost.autor, nuevoPost.rol, "Nueva Publicación", `Post ID: ${nuevoPost.id}`);
    res.status(201).json(nuevoPost);
});

app.get('/get-posts', (req, res) => { res.json(publicaciones); });

// --- ESTADOS Y COMENTARIOS ---
app.post('/cambiar-estado', (req, res) => {
    const { id, estado_venta } = req.body;
    const post = publicaciones.find(p => p.id == id);
    if (post) {
        post.estado_venta = estado_venta;
        registrarEvento("Sistema", "N/A", "Cambio de Estado", `Post ${id} a ${estado_venta}`);
        return res.status(200).json({ message: "Estado actualizado" });
    }
    res.status(404).json({ message: "Publicación no encontrada" });
});

app.post('/comentar', (req, res) => {
    const { postId, textoComentario, autor, rol, fecha } = req.body; 
    const post = publicaciones.find(p => p.id == postId);
    if (post) {
        post.comentarios.push({ 
            texto: textoComentario, 
            autor: autor, 
            rol: rol || "user", 
            fecha: fecha || new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
        });
        registrarEvento(autor, rol || "user", "Nuevo Comentario", `En post ID: ${postId}`);
        res.status(200).json({ message: "Añadido" });
    } else { res.status(404).json({ message: "Error" }); }
});

app.post('/editar-comentario', (req, res) => {
    const { postId, indexComentario, nuevoTexto } = req.body;
    const post = publicaciones.find(p => p.id == postId);
    if (post && post.comentarios[indexComentario]) {
        post.comentarios[indexComentario].texto = nuevoTexto;
        return res.status(200).json({ message: "Comentario editado" });
    }
    res.status(403).json({ message: "Error al editar comentario" });
});

app.post('/borrar-comentario', (req, res) => {
    const { postId, indexComentario } = req.body;
    const post = publicaciones.find(p => p.id == postId);
    if (post && post.comentarios[indexComentario]) {
        post.comentarios.splice(indexComentario, 1);
        return res.status(200).json({ message: "Comentario eliminado" });
    }
    res.status(403).json({ message: "Error al borrar comentario" });
});

app.post('/editar-post', upload.array('imagenes', 5), (req, res) => {
    const { 
        postId, texto, titulo, precio, estado_venta, nombreUsuario, role, imagenesRestantes,
        condicion, categoria, estado, municipio
    } = req.body;
    
    const post = publicaciones.find(p => p.id == postId);
    
    if (post && (post.autor === nombreUsuario || role === 'admin_server')) {
        const fotosQueSeQuedan = Array.isArray(imagenesRestantes) ? imagenesRestantes : (imagenesRestantes ? [imagenesRestantes] : []);
        
        eliminarArchivos(post.imagenes.filter(img => !fotosQueSeQuedan.includes(img)));
        
        post.texto = texto;
        post.titulo = titulo || post.titulo;
        post.precio = precio || post.precio;
        post.estado_venta = estado_venta || post.estado_venta;
        
        post.condicion = condicion || post.condicion;
        post.categoria = categoria || post.categoria;
        post.estado = estado || post.estado;
        post.municipio = municipio || post.municipio;
        
        const nuevasFotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        post.imagenes = [...fotosQueSeQuedan, ...nuevasFotos];
        
        return res.status(200).json({ message: "Publicación actualizada" });
    }
    
    res.status(403).json({ message: "No autorizado" });
});

app.post('/borrar-post', (req, res) => {
    const { postId, role } = req.body;
    const idx = publicaciones.findIndex(p => p.id == postId);
    if (idx !== -1) {
        eliminarArchivos(publicaciones[idx].imagenes);
        publicaciones.splice(idx, 1);
        return res.status(200).json({ message: "Eliminado" });
    }
    res.status(403).json({ message: "Sin permisos" });
});

app.post('/limpiar-servidor', (req, res) => {
    if (req.body.confirmacion === "CONFIRMAR") {
        const archivos = fs.readdirSync(uploadDir);
        for (const archivo of archivos) fs.unlinkSync(path.join(uploadDir, archivo));
        publicaciones = [];
        return res.status(200).json({ message: "Limpio" });
    }
    res.status(400).json({ message: "Palabra incorrecta" });
});

// ==========================================
// 🚀 2. LÓGICA DEL CHAT (WEBSOCKETS)
// ==========================================
io.on('connection', (socket) => {
    console.log('💬 Usuario conectado al chat: ' + socket.id);

    socket.on('enviar-mensaje', (data) => {
        io.emit('mostrar-mensaje', {
            texto: data.texto,
            id: socket.id,
            hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('disconnect', () => {
        console.log('🚪 Usuario desconectado del chat');
    });
});

// ==========================================
// 🚀 3. INICIO DEL SERVIDOR (FUSIONADO)
// ==========================================
const PORT = 3000;
// ¡Cambiamos app por http para que escuche la web y el chat al mismo tiempo!
http.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 SERVIDOR AGORA INICIADO
    --------------------------------------------
    👉 Local: http://localhost:${PORT}
    👉 Admin Servidor: admin@servidor.com / root123
    👉 Moderador: mod@agora.com / mod123
    👉 Monitor de actividad activo...
    💬 Sistema de Chat conectado
    --------------------------------------------`);
});