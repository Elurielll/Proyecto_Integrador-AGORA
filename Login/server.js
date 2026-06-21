const express = require('express');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs'); 
const app = express();

// ==========================================
// 🚀 1. NUEVAS HERRAMIENTAS PARA EL CHAT Y DB
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

// ==========================================
// 🛡️ REQUISITO DB: Recuerda agregar las columnas en MySQL si no existen:
// usuarios -> rol (VARCHAR, default 'user'), estado_aprobacion (VARCHAR, default 'pendiente')
// publicaciones -> estado_aprobacion (VARCHAR, default 'pendiente')
// ==========================================

// --- REGISTRO CON SOLICITUD ---
app.post('/register', (req, res) => {
    const { fullname, email_reg, password_reg } = req.body;

    // Validación de seguridad de backend (8-12 caracteres)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&._-])[A-Za-z\d@$!%*#?&._-]{8,12}$/;

    if (!passwordRegex.test(password_reg)) {
        return res.status(400).json({
            message: "La contraseña no cumple con los requisitos mínimos de seguridad."
        });
    }

    // 1. Comprobar si el usuario o el correo ya existen en la base de datos
    const checkSql = 'SELECT nombre, correo FROM usuarios WHERE nombre = ? OR correo = ?';
    db.query(checkSql, [fullname, email_reg], (err, results) => {
        if (err) {
            console.error('❌ Error al buscar duplicados:', err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }

        if (results.length > 0) {
            const usuarioOcupado = results.find(u => u.nombre.toLowerCase() === fullname.toLowerCase());
            if (usuarioOcupado) {
                return res.status(400).json({ error: 'user_exists', message: "El usuario ya existe" });
            }
            
            const correoOcupado = results.find(u => u.correo.toLowerCase() === email_reg.toLowerCase());
            if (correoOcupado) {
                return res.status(400).json({ error: 'email_exists', message: "El correo ya existe" });
            }
        }

        // 2. Si no hay duplicados, guardamos el nuevo usuario con rol predeterminado y estado PENDIENTE
        const sql = `INSERT INTO usuarios (nombre, correo, contrasena, rol, estado_aprobacion) VALUES (?, ?, ?, 'user', 'pendiente')`;
        
        db.query(sql, [fullname, email_reg, password_reg], (err, result) => {
            if (err) {
                console.error('❌ Error al insertar en MySQL (Registro):', err);
                return res.status(500).json({ message: "Error en el servidor al registrar" });
            }
            
            registrarEvento(fullname, "user", "Solicitud de Registro", `Email: ${email_reg}`);
            // Mensaje corto y profesional solicitado
            res.status(200).json({ 
                message: "Solicitud de registro enviada con éxito. Nuestro equipo revisará tu cuenta en un plazo de 24 hrs." 
            });
        });
    });
});

// --- INICIO DE SESIÓN CON FILTRO DE APROBACIÓN ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    // Cuenta Administrativa Maestra para el Panel Aparte (No depende de solicitudes)
    if (email === "admin@servidor.com" && password === "root123") {
        registrarEvento("Admin", "admin_server", "Inicio de Sesión (Panel)");
        return res.json({ 
            role: 'admin_server', 
            nombre: 'Administrador Principal', 
            id: 0 
        });
    }

    // 1. Buscamos por correo en la base de datos
    const sql = 'SELECT * FROM usuarios WHERE correo = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Error en el servidor" });

        if (results.length === 0) {
            return res.status(401).json({ error: 'wrong_email', message: "Correo no registrado" });
        }

        const u = results[0]; 

        // 2. Verificamos la contraseña
        if (u.contrasena !== password) {
            return res.status(401).json({ error: 'wrong_password', message: "Contraseña incorrecta" });
        }
        
        // 3. ⚠️ NUEVA RESTRICCIÓN: Verificar el estado de la solicitud
        if (u.estado_aprobacion === 'pendiente') {
            return res.status(403).json({ message: "Tu solicitud de registro está bajo revisión por nuestro equipo." });
        }
        if (u.estado_aprobacion === 'rechazado') {
            return res.status(403).json({ message: "Tu solicitud de acceso a la plataforma ha sido rechazada." });
        }
        
        // 4. Si es aprobado, damos acceso con su ROL dinámico desde la DB ('user' o 'moderator')
        registrarEvento(u.nombre, u.rol, "Inicio de Sesión");
        
        return res.json({ 
            role: u.rol, // Puede retornar 'user' o 'moderator'
            nombre: u.nombre, 
            id: u.id 
        });
    });
});

app.get('/api/perfil/:nombre', (req, res) => {
    const sql = 'SELECT nombre, correo, bio, estado, municipio, foto_perfil, rol FROM usuarios WHERE nombre = ?';
    
    db.query(sql, [req.params.nombre], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.json(results[0]);
    });
});

app.get('/api/publicaciones/usuario/:nombre', (req, res) => {
    const sqlPosts = `SELECT p.* FROM publicaciones p 
                      JOIN usuarios u ON p.id_usuario = u.id 
                      WHERE u.nombre = ? AND p.estado_aprobacion = 'aprobado' 
                      ORDER BY p.fecha_publicacion DESC`;
    
    db.query(sqlPosts, [req.params.nombre], (err, posts) => {
        if (err) return res.status(500).json({ message: "Error al obtener posts del usuario" });
        
        const sqlComments = `
            SELECT 
                c.id, 
                c.id_publicacion, 
                c.comentario, 
                c.comentario AS texto, 
                c.comentario AS textoComentario, 
                c.fecha, 
                u.nombre AS autor,
                u.rol AS autor_rol
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
    const { nombre, nuevoNombre, bio, municipio, estado } = req.body;
    const sql = `UPDATE usuarios SET nombre = ?, bio = ?, municipio = ?, estado = ? WHERE nombre = ?`;

    db.query(sql, [nuevoNombre, bio, municipio, estado, nombre], (err, result) => {
        if (err) return res.status(500).json({ message: "Error al guardar los datos en la base de datos" });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        registrarEvento(nuevoNombre, "user", "Actualizó su perfil", `Bio: ${bio}`);
        res.status(200).json({ message: "Perfil actualizado correctamente", nuevoNombre: nuevoNombre });
    });
});

app.post('/api/actualizar-foto-perfil', upload.single('fotoPerfil'), (req, res) => {
    const nombreUsuario = req.body.nombreUsuario;
    const archivo = req.file;

    if (!archivo || !nombreUsuario) {
        return res.status(400).json({ message: "Datos incompletos" });
    }

    const nuevaRutaFoto = `/uploads/${archivo.filename}`;
    const sql = 'UPDATE usuarios SET foto_perfil = ? WHERE nombre = ?';
    
    db.query(sql, [nuevaRutaFoto, nombreUsuario], (err, result) => {
        if (err) return res.status(500).json({ message: "Error en la base de datos" });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Usuario no encontrado" });

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

// --- PUBLICAR EN MODO PENDIENTE ---
app.post('/publicar', upload.array('imagenes', 5), (req, res) => {
    const { titulo, precio, estado, municipio, texto, autor, categoria, condicion, estado_venta } = req.body;
    const fotosPaths = req.files ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) : '[]';

    db.query('SELECT id FROM usuarios WHERE nombre = ?', [autor], (err, userResult) => {
        if (err || userResult.length === 0) {
            return res.status(400).json({ message: "Usuario autor no encontrado" });
        }
        
        const idUsuario = userResult[0].id;
        const tipoPublicacion = estado_venta || 'Disponible';

        const finalTitulo = titulo ? titulo.trim() : (tipoPublicacion === 'Borrador' ? 'Borrador sin título' : '');
        const finalTexto = texto ? texto.trim() : (tipoPublicacion === 'Borrador' ? 'Sin descripción' : '');
        // Asegurarnos de que sea un número válido. Si no lo es, forzamos un 0.
        const precioParseado = parseFloat(precio);
        const finalPrecio = isNaN(precioParseado) ? 0 : precioParseado;
        // Si no es borrador, el precio TIENE que ser mayor estricto que 0
        if (tipoPublicacion !== 'Borrador' && finalPrecio <= 0) {
            return res.status(400).json({ message: "El precio del artículo debe ser mayor a $0." });
        }

        // Si es un borrador va directo, pero si va a publicarse, cae en revisión manual ('pendiente')
        const aprobacionInicial = (tipoPublicacion === 'Borrador') ? 'aprobado' : 'pendiente';

        const sql = `INSERT INTO publicaciones 
                     (id_usuario, titulo, descripcion, precio, estado_venta, estado, municipio, categoria, condicion, fotos, estado_aprobacion) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const values = [idUsuario, finalTitulo, finalTexto, finalPrecio, tipoPublicacion, estado, municipio, categoria, condicion, fotosPaths, aprobacionInicial];

        db.query(sql, values, (err, result) => {
            if (err) return res.status(500).json({ message: "Error al procesar la publicación" });
            
            const accionLog = tipoPublicacion === 'Borrador' ? "Guardó Borrador" : "Envió Publicación a Revisión";
            registrarEvento(autor, "user", accionLog, `ID: ${result.insertId}`);
            
            res.status(201).json({ id: result.insertId, estado_venta: tipoPublicacion, estado_aprobacion: aprobacionInicial });
        });
    });
});

// --- LEER POSTS (SÓLO LOS APROBADOS POR EL ADMIN) ---
app.get('/get-posts', (req, res) => {
    // Agregamos el filtro WHERE estado_aprobacion = 'aprobado' e incluimos el 'rol' del autor
    const sqlPosts = `
        SELECT p.*, u.nombre AS autor, u.rol AS autor_rol 
        FROM publicaciones p 
        JOIN usuarios u ON p.id_usuario = u.id 
        WHERE p.estado_aprobacion = 'aprobado'
        ORDER BY p.fecha_publicacion DESC`;

    db.query(sqlPosts, (err, posts) => {
        if (err) return res.status(500).send(err);
        
        const sqlComments = `
            SELECT 
                c.id, 
                c.id_publicacion, 
                c.comentario, 
                c.comentario AS texto, 
                c.comentario AS textoComentario, 
                c.fecha, 
                u.nombre AS autor,
                u.rol AS autor_rol
            FROM comentarios c
            JOIN usuarios u ON c.id_usuario = u.id
            ORDER BY c.fecha ASC`;

        db.query(sqlComments, (err, comments) => {
            if (err) return res.status(500).send(err);

            const postsProcesados = posts.map(p => {
                const comentariosDelPost = comments.filter(c => c.id_publicacion === p.id);
                return {
                    ...p,
                    texto: p.descripcion, 
                    imagenes: JSON.parse(p.fotos || '[]'),
                    comentarios: comentariosDelPost
                };
            });
            
            res.json(postsProcesados);
        });
    });
});

app.post('/cambiar-estado', (req, res) => {
    const { id, estado_venta } = req.body;
    const sql = 'UPDATE publicaciones SET estado_venta = ? WHERE id = ?';
    
    db.query(sql, [estado_venta, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Error al actualizar estado" });
        res.status(200).json({ message: "Estado actualizado" });
    });
});

app.post('/comentar', (req, res) => {
    const { postId, id_usuario, textoComentario } = req.body;
    const sql = 'INSERT INTO comentarios (id_publicacion, id_usuario, comentario) VALUES (?, ?, ?)';
    
    db.query(sql, [postId, id_usuario, textoComentario], (err, result) => {
        if (err) return res.status(500).json({ message: "Error en el servidor" });
        res.status(200).json({ message: "Añadido correctamente", id: result.insertId });
    });
});

app.post('/editar-comentario', (req, res) => {
    const { idComentario, nuevoTexto, id_usuario } = req.body;
    const sql = 'UPDATE comentarios SET comentario = ? WHERE id = ? AND id_usuario = ?';
    
    db.query(sql, [nuevoTexto, idComentario, id_usuario], (err, result) => {
        if (err) return res.status(500).json({ message: "Error interno en la base de datos" });
        if (result.affectedRows === 0) return res.status(403).json({ message: "No autorizado" });
        res.status(200).json({ message: "Comentario editado" });
    });
});

// Actualizado para permitir que Moderadores y Admin borren cualquier comentario
app.post('/borrar-comentario', (req, res) => {
    const { idComentario, id_usuario, role } = req.body; // El front puede mandar el rol actual
    
    let sql = 'DELETE FROM comentarios WHERE id = ? AND id_usuario = ?';
    let params = [idComentario, id_usuario];

    // Si es moderador o admin, se rompe el candado de propiedad privada
    if (role === 'moderator' || role === 'moderador' || role === 'admin_server') {
        sql = 'DELETE FROM comentarios WHERE id = ?';
        params = [idComentario];
    }
    
    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ message: "Error en la base de datos" });
        if (result.affectedRows === 0) return res.status(403).json({ message: "No se pudo eliminar el comentario" });
        res.status(200).json({ message: "Comentario eliminado" });
    });
});

app.post('/editar-post', upload.array('imagenes', 5), (req, res) => {
    const { 
        postId, texto, titulo, precio, estado_venta, nombreUsuario, role, imagenesRestantes,
        condicion, categoria, estado, municipio
    } = req.body;

    const checkSql = `SELECT p.*, u.nombre AS autor FROM publicaciones p 
                      JOIN usuarios u ON p.id_usuario = u.id WHERE p.id = ?`;
    
    db.query(checkSql, [postId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "Post no encontrado" });
        
        const post = results[0];
        if (post.autor !== nombreUsuario && role !== 'admin_server') {
            return res.status(403).json({ message: "No autorizado" });
        }

        const fotosQueSeQuedan = Array.isArray(imagenesRestantes) ? imagenesRestantes : (imagenesRestantes ? [imagenesRestantes] : []);
        const viejasFotos = JSON.parse(post.fotos || '[]');
        eliminarArchivos(viejasFotos.filter(img => !fotosQueSeQuedan.includes(img)));

        const nuevasFotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const todasLasFotos = JSON.stringify([...fotosQueSeQuedan, ...nuevasFotos]);

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
    
    db.query('SELECT fotos FROM publicaciones WHERE id = ?', [postId], (err, results) => {
        if (results && results.length > 0) {
            const fotos = JSON.parse(results[0].fotos || '[]');
            eliminarArchivos(fotos);

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
        return res.status(200).json({ message: "Limpio" });
    }
    res.status(400).json({ message: "Palabra incorrecta" });
});

// ==========================================
// 🛡️ NUEVAS RUTAS EXCLUSIVAS DEL PANEL DE CONTROL (ADMIN)
// ==========================================

// 1. Obtener todas las solicitudes pendientes (Usuarios y Publicaciones)
app.get('/api/admin/pendientes', (req, res) => {
    const sqlUsers = "SELECT id, nombre, correo FROM usuarios WHERE estado_aprobacion = 'pendiente'";
    
    // 🔥 AQUÍ ESTÁ EL CAMBIO: agregamos p.fotos a la consulta
    const sqlPosts = `
        SELECT p.id, p.titulo, p.descripcion, p.precio, p.fotos, u.nombre AS autor 
        FROM publicaciones p
        JOIN usuarios u ON p.id_usuario = u.id
        WHERE p.estado_aprobacion = 'pendiente'`;

    db.query(sqlUsers, (err, users) => {
        if (err) return res.status(500).json({ message: "Error cargando usuarios" });
        
        db.query(sqlPosts, (err, posts) => {
            if (err) return res.status(500).json({ message: "Error cargando publicaciones" });
            res.json({ usuarios: users, publicaciones: posts });
        });
    });
});

// 2. Resolver cuenta de usuario (Aprobar o Rechazar)
app.post('/api/admin/resolver-usuario', (req, res) => {
    const { idUsuario, estado } = req.body; // estado: 'aprobado' o 'rechazado'
    const sql = "UPDATE usuarios SET estado_aprobacion = ? WHERE id = ?";
    
    db.query(sql, [estado, idUsuario], (err, result) => {
        if (err) return res.status(500).json({ message: "Error al cambiar estado" });
        registrarEvento("Admin", "admin_server", `Resolvió Usuario ID ${idUsuario}`, `Estado: ${estado}`);
        res.json({ success: true, message: `Usuario ${estado} correctamente.` });
    });
});

// 3. Resolver publicación manual (Aprobar o Rechazar)
app.post('/api/admin/resolver-publicacion', (req, res) => {
    const { idPost, estado } = req.body; // estado: 'aprobado' o 'rechazado'
    
    if (estado === 'rechazado') {
        // Si la rechaza, se borra el registro físico y DB para no saturar
        db.query('SELECT fotos FROM publicaciones WHERE id = ?', [idPost], (err, results) => {
            if (results && results.length > 0) {
                eliminarArchivos(JSON.parse(results[0].fotos || '[]'));
            }
            db.query('DELETE FROM publicaciones WHERE id = ?', [idPost], () => {
                registrarEvento("Admin", "admin_server", `Rechazó y Eliminó Post ID ${idPost}`);
                return res.json({ success: true, message: "Publicación rechazada y eliminada." });
            });
        });
    } else {
        // Si la aprueba, se vuelve visible al muro global
        db.query("UPDATE publicaciones SET estado_aprobacion = 'aprobado' WHERE id = ?", [idPost], (err) => {
            if (err) return res.status(500).json({ message: "Error al aprobar publicación" });
            registrarEvento("Admin", "admin_server", `Aprobó Publicación ID ${idPost}`);
            res.json({ success: true, message: "Publicación aprobada con éxito." });
        });
    }
});

// 4. Promover un usuario común a rol de Moderador
app.post('/api/admin/promover-moderador', (req, res) => {
    const { idUsuario } = req.body;
    const sql = "UPDATE usuarios SET rol = 'moderator' WHERE id = ?";
    
    db.query(sql, [idUsuario], (err, result) => {
        if (err) return res.status(500).json({ message: "Error al promover usuario" });
        registrarEvento("Admin", "admin_server", `Ascendió a Moderador al ID: ${idUsuario}`);
        res.json({ success: true, message: "Usuario ascendido a Moderador exitosamente." });
    });
});

// 5. Monitorear usuarios activos en tiempo real (Conexiones WebSocket concurrentes)
app.get('/api/admin/conectados', (req, res) => {
    const totalConectados = io.engine.clientsCount; // Método directo de Socket.io
    res.json({ conectados: totalConectados });
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
// 📝 SECCIÓN DE BORRADORES
// ==========================================

app.post('/api/borradores', (req, res) => {
    const { autor, titulo, precio, estado, municipio, categoria, condicion, descripcion } = req.body;

    if (!autor) return res.status(400).json({ message: "No se especificó el autor del borrador" });

    db.query('SELECT id FROM usuarios WHERE nombre = ?', [autor], (err, userResult) => {
        if (err || userResult.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        const usuarioId = userResult[0].id;
        const precioFinal = parseFloat(precio) || 0.00;

        const sql = `INSERT INTO borradores 
            (usuario_id, titulo, precio, estado_republica, municipio, categoria, condicion, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const valores = [usuarioId, titulo, precioFinal, estado, municipio, categoria, condicion, descripcion];

        db.query(sql, valores, (err, result) => {
            if (err) return res.status(500).json({ message: "Error al guardar en la base de datos" });
            registrarEvento(autor, "user", "Guardó Borrador", `Título: ${titulo}`);
            res.status(201).json({ message: "Borrador guardado exitosamente", id: result.insertId });
        });
    });
});

app.get('/api/borradores/usuario/:nombreUsuario', (req, res) => {
    const nombreUsuario = req.params.nombreUsuario;
    if (!nombreUsuario || nombreUsuario === "undefined" || nombreUsuario === "null") {
        return res.status(400).json({ message: "Nombre de usuario no válido" });
    }

    db.query('SELECT id FROM usuarios WHERE nombre = ?', [nombreUsuario], (err, userResult) => {
        if (err || userResult.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
        
        const idUsuario = userResult[0].id;
        const sql = `SELECT * FROM borradores WHERE usuario_id = ? ORDER BY id DESC`;
        
        db.query(sql, [idUsuario], (err, results) => {
            if (err) return res.status(500).json({ message: "Error al obtener los borradores" });

            const borradoresProcesados = results.map(b => ({
                id: b.id,
                titulo: b.titulo || 'Borrador sin título',
                precio: b.precio || 0,
                descripcion: b.descripcion || '',
                texto: b.descripcion || '', 
                estado: b.estado_republica, 
                estado_republica: b.estado_republica,
                municipio: b.municipio,
                categoria: b.categoria,
                condicion: b.condicion
            }));
            res.json(borradoresProcesados);
        });
    });
});

app.delete('/api/borradores/:id', (req, res) => {
    const borradorId = req.params.id;
    const sql = 'DELETE FROM borradores WHERE id = ?';
    
    db.query(sql, [borradorId], (err, result) => {
        if (err) return res.status(500).json({ message: "Error al intentar eliminar." });
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Borrador eliminado correctamente." });
        } else {
            res.status(404).json({ message: "El borrador no fue encontrado." });
        }
    });
});

// ==========================================
// 🚀 3. INICIO DEL SERVIDOR 
// ==========================================
const PORT = 3000;
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