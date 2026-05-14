const express = require('express');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs'); 
const app = express();

// ==========================================
// 🚀 1. NUEVAS HERRAMIENTAS PARA EL CHAT
// ==========================================
const mysql = require('mysql2');

// Crear la conexión a la base de datos de XAMPP
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // XAMPP usa 'root' como usuario por defecto
    password: '',      // XAMPP no tiene contraseña por defecto, se deja en blanco
    database: 'agora_db'
});

// Comprobar que el puente funciona
db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        return;
    }
    console.log('✅ ¡Conectado exitosamente a la base de datos MySQL de Ágora!');
});

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

    // 1. La consulta SQL para insertar
    const sql = 'INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)';
    
    db.query(sql, [fullname, email_reg, password_reg], (err, result) => {
        if (err) {
            console.error('❌ Error al insertar en MySQL:', err);
            return res.status(500).send("Error en el servidor al registrar");
        }
        
        // Mantuvimos tu lógica de registro de eventos
        registrarEvento(fullname, "user", "Registro Nuevo", `Email: ${email_reg}`);
        res.status(200).send("Registro exitoso");
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    // ... (lógica de admin y moderador se queda igual)

    const sql = 'SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ message: "Error en el servidor" });

        if (results.length > 0) {
            const u = results[0]; 
            registrarEvento(u.nombre, "user", "Inicio de Sesión");
            
            // --- CAMBIO AQUÍ: Enviamos también el u.id ---
            return res.json({ 
                role: 'user', 
                nombre: u.nombre, 
                id: u.id  // <--- Esto es vital
            });
        } else {
            res.status(401).json({ message: "Correo o contraseña incorrectos" });
        }
    });
});

app.get('/api/perfil/:nombre', (req, res) => {
    // Pedimos explícitamente la columna foto_perfil
    const sql = 'SELECT nombre, correo, bio, estado, municipio, foto_perfil FROM usuarios WHERE nombre = ?';
    
    db.query(sql, [req.params.nombre], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Enviamos los datos al navegador
        const usuario = results[0];
        res.json(usuario);
    });
});

app.get('/api/publicaciones/usuario/:nombre', (req, res) => {
    // Aquí está el sqlPosts que se había borrado
    const sqlPosts = `SELECT p.* FROM publicaciones p 
                      JOIN usuarios u ON p.id_usuario = u.id 
                      WHERE u.nombre = ? ORDER BY p.fecha_publicacion DESC`;
    
    db.query(sqlPosts, [req.params.nombre], (err, posts) => {
        if (err) return res.status(500).json({ message: "Error al obtener posts del usuario" });
        
        // Y aquí está el sqlComments actualizado
        const sqlComments = `
            SELECT 
                c.id, 
                c.id_publicacion, 
                c.comentario, 
                c.comentario AS texto, 
                c.comentario AS textoComentario, 
                c.fecha, 
                u.nombre AS autor 
            FROM comentarios c
            JOIN usuarios u ON c.id_usuario = u.id
            ORDER BY c.fecha ASC`;

        db.query(sqlComments, (err, comments) => {
            if (err) return res.status(500).json({ message: "Error al obtener comentarios" });

            const postsProcesados = posts.map(p => ({
                ...p,
                texto: p.descripcion,
                imagenes: JSON.parse(p.fotos || '[]'),
                comentarios: comments.filter(c => c.id_publicacion === p.id)
            }));
            res.json(postsProcesados);
        });
    });
});

app.post('/api/actualizar-perfil', (req, res) => {
    // Es mucho más seguro recibir el ID del usuario desde el frontend
    const { id, nombre, nuevoNombre, bio, municipio, estado } = req.body;

    // Si tu frontend envía el ID, úsalo en el WHERE. 
    // Si aún usas el nombre, asegúrate de que el frontend sepa que el nombre cambió.
    const sql = `UPDATE usuarios 
                 SET nombre = ?, bio = ?, municipio = ?, estado = ? 
                 WHERE nombre = ?`;

    db.query(sql, [nuevoNombre, bio, municipio, estado, nombre], (err, result) => {
        if (err) {
            console.error("❌ Error SQL al actualizar perfil:", err);
            // Si el error dice 'Foreign key constraint fails', es por la relación con publicaciones
            return res.status(500).json({ message: "Error al guardar los datos en la base de datos" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        registrarEvento(nuevoNombre, "user", "Actualizó su perfil", `Bio: ${bio}`);
        res.status(200).json({ 
            message: "Perfil actualizado correctamente",
            nuevoNombre: nuevoNombre // Devolvemos el nuevo nombre para que el frontend lo actualice
        });
    });
});

app.post('/api/actualizar-foto-perfil', upload.single('fotoPerfil'), (req, res) => {
    // 1. Verificamos qué está llegando exactamente
    const nombreUsuario = req.body.nombreUsuario;
    const archivo = req.file;

    console.log("--- Intento de actualización de foto ---");
    console.log("Usuario recibido:", nombreUsuario);
    console.log("Archivo recibido:", archivo ? archivo.filename : "NINGUNO");

    if (!archivo) {
        return res.status(400).json({ message: "No se recibió ninguna imagen" });
    }

    if (!nombreUsuario) {
        return res.status(400).json({ message: "No se recibió el nombre del usuario" });
    }

    const nuevaRutaFoto = `/uploads/${archivo.filename}`;

    // 2. Actualizamos la base de datos
    const sql = 'UPDATE usuarios SET foto_perfil = ? WHERE nombre = ?';
    
    db.query(sql, [nuevaRutaFoto, nombreUsuario], (err, result) => {
        if (err) {
            console.error("❌ Error SQL:", err);
            return res.status(500).json({ message: "Error en la base de datos" });
        }

        if (result.affectedRows === 0) {
            console.log("⚠️ No se encontró al usuario en la DB para actualizar la foto");
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        console.log("✅ Foto guardada en DB con éxito para:", nombreUsuario);
        res.status(200).json({ message: "Foto actualizada", nuevaRuta: nuevaRutaFoto });
    });
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
    const { titulo, precio, estado, municipio, texto, autor, categoria, condicion } = req.body;
    const fotosPaths = req.files ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) : '[]';

    // 1. Buscamos el ID del usuario basado en su nombre (autor)
    db.query('SELECT id FROM usuarios WHERE nombre = ?', [autor], (err, userResult) => {
        if (err || userResult.length === 0) {
            return res.status(400).json({ message: "Usuario autor no encontrado" });
        }
        
        const idUsuario = userResult[0].id;

        // 2. Insertamos la publicación con el ID real
        const sql = `INSERT INTO publicaciones 
                     (id_usuario, titulo, descripcion, precio, estado_venta, estado, municipio, categoria, condicion, fotos) 
                     VALUES (?, ?, ?, ?, 'Disponible', ?, ?, ?, ?, ?)`;
        
        const values = [idUsuario, titulo, texto, precio, estado, municipio, categoria, condicion, fotosPaths];

        db.query(sql, values, (err, result) => {
            if (err) return res.status(500).json({ message: "Error al publicar" });
            registrarEvento(autor, "user", "Nueva Publicación", `ID: ${result.insertId}`);
            res.status(201).json({ id: result.insertId });
        });
    });
});

app.get('/get-posts', (req, res) => {
    // 1. Traemos las publicaciones
    const sqlPosts = `
        SELECT p.*, u.nombre AS autor 
        FROM publicaciones p 
        JOIN usuarios u ON p.id_usuario = u.id 
        ORDER BY p.fecha_publicacion DESC`;

    db.query(sqlPosts, (err, posts) => {
        if (err) return res.status(500).send(err);
        
        // 2. Traemos TODOS los comentarios unidos con el nombre de su autor
        const sqlComments = `
            SELECT 
                c.id, 
                c.id_publicacion, 
                c.comentario, 
                c.comentario AS texto, 
                c.comentario AS textoComentario, 
                c.fecha, 
                u.nombre AS autor 
            FROM comentarios c
            JOIN usuarios u ON c.id_usuario = u.id
            ORDER BY c.fecha ASC`;

        db.query(sqlComments, (err, comments) => {
            if (err) return res.status(500).send(err);

            // 3. Empaquetamos todo junto para el frontend
            const postsProcesados = posts.map(p => {
                // Filtramos solo los comentarios que le pertenecen a esta publicación
                const comentariosDelPost = comments.filter(c => c.id_publicacion === p.id);

                return {
                    ...p,
                    texto: p.descripcion, 
                    imagenes: JSON.parse(p.fotos || '[]'),
                    comentarios: comentariosDelPost // 🔥 Aquí inyectamos los comentarios
                };
            });
            
            res.json(postsProcesados);
        });
    });
});

// --- ESTADOS Y COMENTARIOS ---
app.post('/cambiar-estado', (req, res) => {
    const { id, estado_venta } = req.body;
    const sql = 'UPDATE publicaciones SET estado_venta = ? WHERE id = ?';
    
    db.query(sql, [estado_venta, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Error al actualizar estado" });
        registrarEvento("Sistema", "N/A", "Cambio de Estado", `Post ${id} a ${estado_venta}`);
        res.status(200).json({ message: "Estado actualizado" });
    });
});

app.post('/comentar', (req, res) => {
    // IMPORTANTE: Asegúrate de que el frontend envíe 'id_usuario' (el número)
    const { postId, id_usuario, textoComentario } = req.body;
    
    // Usamos los nombres exactos: id_publicacion, id_usuario, comentario
    const sql = 'INSERT INTO comentarios (id_publicacion, id_usuario, comentario) VALUES (?, ?, ?)';
    
    db.query(sql, [postId, id_usuario, textoComentario], (err, result) => {
        if (err) {
            console.error("❌ Error real en MySQL:", err);
            return res.status(500).json({ message: "Error en el servidor" });
        }
        res.status(200).json({ message: "Añadido correctamente", id: result.insertId });
    });
});

app.post('/editar-comentario', (req, res) => {
    const { idComentario, nuevoTexto, id_usuario } = req.body;
    
    const sql = 'UPDATE comentarios SET comentario = ? WHERE Id = ? AND id_usuario = ?';
    
    db.query(sql, [nuevoTexto, idComentario, id_usuario], (err, result) => {
        if (err || result.affectedRows === 0) return res.status(403).json({ message: "No se pudo editar" });
        res.status(200).json({ message: "Comentario editado" });
    });
});

app.post('/borrar-comentario', (req, res) => {
    const { idComentario, id_usuario } = req.body; 
    
    // Solo borra si el ID del comentario y el ID del usuario coinciden (dueño)
    const sql = 'DELETE FROM comentarios WHERE Id = ? AND id_usuario = ?';
    
    db.query(sql, [idComentario, id_usuario], (err, result) => {
        if (err || result.affectedRows === 0) return res.status(403).json({ message: "No se pudo eliminar" });
        res.status(200).json({ message: "Comentario eliminado" });
    });
});

app.post('/editar-post', upload.array('imagenes', 5), (req, res) => {
    const { 
        postId, texto, titulo, precio, estado_venta, nombreUsuario, role, imagenesRestantes,
        condicion, categoria, estado, municipio
    } = req.body;

    // 1. Verificar que el usuario sea el dueño o admin
    const checkSql = `SELECT p.*, u.nombre AS autor FROM publicaciones p 
                      JOIN usuarios u ON p.id_usuario = u.id WHERE p.id = ?`;
    
    db.query(checkSql, [postId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "Post no encontrado" });
        
        const post = results[0];
        if (post.autor !== nombreUsuario && role !== 'admin_server') {
            return res.status(403).json({ message: "No autorizado" });
        }

        // 2. Gestionar imágenes
        const fotosQueSeQuedan = Array.isArray(imagenesRestantes) ? imagenesRestantes : (imagenesRestantes ? [imagenesRestantes] : []);
        const viejasFotos = JSON.parse(post.fotos || '[]');
        eliminarArchivos(viejasFotos.filter(img => !fotosQueSeQuedan.includes(img)));

        const nuevasFotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const todasLasFotos = JSON.stringify([...fotosQueSeQuedan, ...nuevasFotos]);

        // 3. Actualizar en la DB
        const updateSql = `UPDATE publicaciones SET 
                           titulo = ?, descripcion = ?, precio = ?, estado_venta = ?, 
                           condicion = ?, categoria = ?, estado = ?, municipio = ?, fotos = ? 
                           WHERE id = ?`;
        
        const values = [titulo, texto, precio, estado_venta, condicion, categoria, estado, municipio, todasLasFotos, postId];

        db.query(updateSql, values, (err) => {
            if (err) return res.status(500).json({ message: "Error al actualizar" });
            res.status(200).json({ message: "Publicación actualizada" });
        });
    });
});

app.post('/borrar-post', (req, res) => {
    const { postId } = req.body;
    
    // Primero obtenemos las fotos para borrarlas del disco
    db.query('SELECT fotos FROM publicaciones WHERE id = ?', [postId], (err, results) => {
        if (results.length > 0) {
            const fotos = JSON.parse(results[0].fotos || '[]');
            eliminarArchivos(fotos); // Borra los archivos de la carpeta uploads

            // Luego borramos de la DB
            db.query('DELETE FROM publicaciones WHERE id = ?', [postId], (err) => {
                if (err) return res.status(500).json({ message: "Error al eliminar de DB" });
                res.status(200).json({ message: "Eliminado con éxito" });
            });
        } else {
            res.status(404).json({ message: "No se encontró el post" });
        }
    });
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