const express = require('express');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs'); 
const app = express();

// ==========================================
// 🚀 1. NUEVAS HERRAMIENTAS PARA EL CHAT Y DB
// ==========================================
const mysql = require('mysql2');

// Cambiado a createPool para evitar desconexiones automáticas de MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',      
    password: '',      
    database: 'agora_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificación inicial del Pool
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        return;
    }
    console.log('✅ ¡Conectado exitosamente a la base de datos MySQL de Ágora!');
    connection.release(); // Libera la conexión de prueba

    // 🔥 AUTO-FIX: Creamos las columnas necesarias si no existen
    db.query("ALTER TABLE publicaciones ADD COLUMN motivo_borrado VARCHAR(500) DEFAULT NULL", () => {});
    db.query("ALTER TABLE publicaciones ADD COLUMN mod_solicitante VARCHAR(100) DEFAULT NULL", () => {});
    db.query("ALTER TABLE publicaciones MODIFY estado_aprobacion VARCHAR(50) DEFAULT 'pendiente'", () => {
        console.log('🔧 ¡Estados de aprobación actualizados a texto libre!');
    });
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

// --- RUTAS DE USUARIO Y LOGIN ---
app.post('/register', (req, res) => {
    const { fullname, email_reg, password_reg } = req.body;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&._-])[A-Za-z\d@$!%*#?&._-]{8,12}$/;

    if (!passwordRegex.test(password_reg)) return res.status(400).json({ message: "Contraseña débil." });

    db.query('SELECT nombre, correo FROM usuarios WHERE nombre = ? OR correo = ?', [fullname, email_reg], (err, results) => {
        if (err) return res.status(500).json({ message: "Error interno" });
        if (results.length > 0) return res.status(400).json({ message: "El usuario o correo ya existe" });

        db.query(`INSERT INTO usuarios (nombre, correo, contrasena, rol, estado_aprobacion) VALUES (?, ?, ?, 'user', 'pendiente')`, 
        [fullname, email_reg, password_reg], (err, result) => {
            if (err) return res.status(500).json({ message: "Error al registrar" });
            registrarEvento(fullname, "user", "Solicitud de Registro");
            res.status(200).json({ message: "Solicitud de registro enviada con éxito." });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === "admin@servidor.com" && password === "root123") {
        registrarEvento("Admin", "admin_server", "Inicio de Sesión (Panel)");
        return res.json({ role: 'admin_server', nombre: 'Administrador Principal', id: 0 });
    }

    db.query('SELECT * FROM usuarios WHERE correo = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ message: "Error en el servidor" });
        if (results.length === 0) return res.status(401).json({ message: "Correo no registrado" });

        const u = results[0]; 
        if (u.contrasena !== password) return res.status(401).json({ message: "Contraseña incorrecta" });
        if (u.estado_aprobacion === 'pendiente') return res.status(403).json({ message: "Cuenta en revisión." });
        if (u.estado_aprobacion === 'rechazado') return res.status(403).json({ message: "Cuenta rechazada." });
        
        registrarEvento(u.nombre, u.rol, "Inicio de Sesión");
        return res.json({ role: u.rol, nombre: u.nombre, id: u.id });
    });
});

app.get('/api/perfil/:nombre', (req, res) => {
    db.query('SELECT nombre, correo, bio, estado, municipio, foto_perfil, rol FROM usuarios WHERE nombre = ?', [req.params.nombre], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "No encontrado" });
        res.json(results[0]);
    });
});

app.get('/api/publicaciones/usuario/:nombre', (req, res) => {
    const sql = `SELECT p.* FROM publicaciones p JOIN usuarios u ON p.id_usuario = u.id WHERE u.nombre = ? AND p.estado_aprobacion = 'aprobado' ORDER BY p.fecha_publicacion DESC`;
    db.query(sql, [req.params.nombre], (err, posts) => {
        if (err) return res.status(500).json({ message: "Error" });
        db.query(`SELECT c.*, u.nombre AS autor, u.rol AS autor_rol FROM comentarios c JOIN usuarios u ON c.id_usuario = u.id ORDER BY c.fecha ASC`, (err, comments) => {
            if (err) return res.status(500).json({ message: "Error cargando comentarios" });
            
            res.json(posts.map(p => {
                let imagenes = [];
                try { imagenes = JSON.parse(p.fotos || '[]'); } catch(e) { console.error("Error parseando fotos", e); }
                return { ...p, texto: p.descripcion, imagenes, comentarios: comments.filter(c => c.id_publicacion === p.id) };
            }));
        });
    });
});

app.post('/api/actualizar-perfil', (req, res) => {
    const { nombre, nuevoNombre, bio, municipio, estado } = req.body;
    db.query(`UPDATE usuarios SET nombre = ?, bio = ?, municipio = ?, estado = ? WHERE nombre = ?`, [nuevoNombre, bio, municipio, estado, nombre], (err, result) => {
        if (err) return res.status(500).json({ message: "Error" });
        res.status(200).json({ message: "Perfil actualizado", nuevoNombre: nuevoNombre });
    });
});

app.post('/api/actualizar-foto-perfil', upload.single('fotoPerfil'), (req, res) => {
    const { nombreUsuario } = req.body;
    if (!req.file || !nombreUsuario) return res.status(400).json({ message: "Datos incompletos" });
    const nuevaRuta = `/uploads/${req.file.filename}`;
    db.query('UPDATE usuarios SET foto_perfil = ? WHERE nombre = ?', [nuevaRuta, nombreUsuario], (err) => {
        if (err) return res.status(500).json({ message: "Error" });
        res.status(200).json({ message: "Foto actualizada", nuevaRuta });
    });
});

app.post('/publicar', upload.array('imagenes', 5), (req, res) => {
    const { titulo, precio, estado, municipio, texto, autor, categoria, condicion, estado_venta } = req.body;
    const fotosPaths = req.files ? JSON.stringify(req.files.map(file => `/uploads/${file.filename}`)) : '[]';

    db.query('SELECT id FROM usuarios WHERE nombre = ?', [autor], (err, userResult) => {
        if (err || userResult.length === 0) return res.status(400).json({ message: "Usuario no encontrado" });
        
        const idUsuario = userResult[0].id;
        const tipoPublicacion = estado_venta || 'Disponible';
        const finalPrecio = isNaN(parseFloat(precio)) ? 0 : parseFloat(precio);
        const aprobacionInicial = (tipoPublicacion === 'Borrador') ? 'aprobado' : 'pendiente';

        db.query(`INSERT INTO publicaciones (id_usuario, titulo, descripcion, precio, estado_venta, estado, municipio, categoria, condicion, fotos, estado_aprobacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [idUsuario, titulo || '', texto || '', finalPrecio, tipoPublicacion, estado, municipio, categoria, condicion, fotosPaths, aprobacionInicial], (err, result) => {
            if (err) return res.status(500).json({ message: "Error" });
            registrarEvento(autor, "user", "Publicación nueva", `ID: ${result.insertId}`);
            res.status(201).json({ id: result.insertId, estado_venta: tipoPublicacion, estado_aprobacion: aprobacionInicial });
        });
    });
});

app.get('/get-posts', (req, res) => {
    db.query(`SELECT p.*, u.nombre AS autor, u.rol AS autor_rol FROM publicaciones p JOIN usuarios u ON p.id_usuario = u.id WHERE p.estado_aprobacion = 'aprobado' ORDER BY p.fecha_publicacion DESC`, (err, posts) => {
        if (err) return res.status(500).send(err);
        db.query(`SELECT c.*, u.nombre AS autor, u.rol AS autor_rol FROM comentarios c JOIN usuarios u ON c.id_usuario = u.id ORDER BY c.fecha ASC`, (err, comments) => {
            if (err) return res.status(500).send(err);

            res.json(posts.map(p => {
                let imagenes = [];
                try { imagenes = JSON.parse(p.fotos || '[]'); } catch(e) {}
                return { ...p, texto: p.descripcion, imagenes, comentarios: comments.filter(c => c.id_publicacion === p.id) };
            }));
        });
    });
});

app.post('/borrar-post', (req, res) => {
    const { postId, role, nombreUsuario, motivo } = req.body;
    
    if (role === 'moderator' || role === 'moderador') {
        const motivoSeguro = motivo ? motivo.substring(0, 500) : "Sin motivo especificado";
        const sql = "UPDATE publicaciones SET estado_aprobacion = 'pendiente_borrado', motivo_borrado = ?, mod_solicitante = ? WHERE id = ?";
        
        db.query(sql, [motivoSeguro, nombreUsuario, postId], (err, result) => {
            if (err) return res.status(500).json({ message: "Error al solicitar la eliminación" });
            registrarEvento(nombreUsuario, role, "Solicitó borrar publicación (Mod)", `Motivo: ${motivoSeguro}`);
            res.status(200).json({ message: "Solicitud de eliminación enviada al administrador." });
        });
    } else {
        db.query('SELECT fotos FROM publicaciones WHERE id = ?', [postId], (err, results) => {
            if (results && results.length > 0) {
                let fotos = [];
                try { fotos = JSON.parse(results[0].fotos || '[]'); } catch(e) {}
                eliminarArchivos(fotos);
                db.query('DELETE FROM publicaciones WHERE id = ?', [postId], (err) => {
                    if (err) return res.status(500).json({ message: "Error al eliminar" });
                    registrarEvento(nombreUsuario || "Usuario", role || "user", "Eliminó publicación");
                    res.status(200).json({ message: "Eliminado con éxito" });
                });
            } else {
                res.status(404).json({ message: "No se encontró" });
            }
        });
    }
});
// ==========================================
// 🤝 RUTA PARA CAMBIAR ESTADO (En trato / Vendido / Disponible)
// ==========================================
app.post('/cambiar-estado', (req, res) => {
    const { id, estado_venta } = req.body;

    if (!id || !estado_venta) {
        return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const sql = "UPDATE publicaciones SET estado_venta = ? WHERE id = ?";
    db.query(sql, [estado_venta, id], (err, result) => {
        if (err) {
            console.error("❌ Error SQL al cambiar estado:", err);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
        res.status(200).json({ message: "Estado actualizado correctamente." });
    });
});

// ==========================================
// ✏️ RUTA PARA EDITAR POST (Con soporte para subir nuevas imágenes)
// ==========================================
app.post('/editar-post', upload.array('imagenes', 5), (req, res) => {
    // Recibimos los campos del FormData de muro.js
    const { postId, titulo, texto, precio, estado_venta, condicion, categoria, estado, municipio, imagenesRestantes } = req.body;

    const sqlBusqueda = `SELECT fotos FROM publicaciones WHERE id = ?`;
    
    db.query(sqlBusqueda, [postId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "Post no encontrado" });

        // 1. Conservamos las fotos que el usuario NO borró
        const fotosQueSeQuedan = Array.isArray(imagenesRestantes) ? imagenesRestantes : (imagenesRestantes ? [imagenesRestantes] : []);
        
        // 2. Comparamos con las viejas para borrar de la carpeta "uploads" las que ya no sirven
        let viejasFotos = [];
        try { viejasFotos = JSON.parse(results[0].fotos || '[]'); } catch(e) {}
        eliminarArchivos(viejasFotos.filter(img => !fotosQueSeQuedan.includes(img)));

        // 3. Añadimos las fotos nuevas (si las subió)
        const nuevasFotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const todasLasFotos = JSON.stringify([...fotosQueSeQuedan, ...nuevasFotos]);
        const finalPrecio = isNaN(parseFloat(precio)) ? 0 : parseFloat(precio);

        // 4. Actualizamos la base de datos
        const updateSql = `UPDATE publicaciones 
                           SET titulo = ?, descripcion = ?, precio = ?, estado_venta = ?, condicion = ?, categoria = ?, estado = ?, municipio = ?, fotos = ? 
                           WHERE id = ?`;
                           
        db.query(updateSql, [titulo, texto, finalPrecio, estado_venta, condicion, categoria, estado, municipio, todasLasFotos, postId], (err) => {
            if (err) {
                console.error("❌ Error al editar post:", err);
                return res.status(500).json({ message: "Error al actualizar" });
            }
            res.status(200).json({ message: "Publicación actualizada" });
        });
    });
});
// ==========================================
// 🛡️ PANEL DE ADMIN - CORREGIDO
// ==========================================
app.get('/api/admin/pendientes', (req, res) => {
    const sqlUsers = "SELECT id, nombre, correo FROM usuarios WHERE estado_aprobacion = 'pendiente'";
    const sqlPosts = `SELECT p.id, p.titulo, p.descripcion, p.precio, p.fotos, u.nombre AS autor FROM publicaciones p JOIN usuarios u ON p.id_usuario = u.id WHERE p.estado_aprobacion = 'pendiente'`;
    
    // Aquí quité la duplicación de const sqlBorrados que rompía tu código viejo
    const sqlBorrados = `
        SELECT p.id, p.titulo, p.descripcion, p.fotos, p.motivo_borrado, p.mod_solicitante, u.nombre AS autor 
        FROM publicaciones p
        JOIN usuarios u ON p.id_usuario = u.id
        WHERE p.estado_aprobacion = 'pendiente_borrado'`;

    db.query(sqlUsers, (err, users) => {
        if (err) {
            console.error("❌ Error SQL en Usuarios Pendientes:", err);
            return res.status(500).json({ message: "Error en servidor" });
        }
        
        db.query(sqlPosts, (err, posts) => {
            if (err) {
                console.error("❌ Error SQL en Publicaciones Pendientes:", err);
                return res.status(500).json({ message: "Error en servidor" });
            }
            
            db.query(sqlBorrados, (err, borrados) => {
                if (err) {
                    console.error("❌ Error SQL en Solicitudes de Borrado:", err);
                    return res.status(500).json({ message: "Error cargando solicitudes de borrado" });
                }
                
                res.json({ usuarios: users, publicaciones: posts, solicitudesBorrado: borrados });
            });
        });
    });
});

app.post('/api/admin/resolver-borrado', (req, res) => {
    const { idPost, resolucion } = req.body;

    if (!idPost) return res.status(400).json({ message: "Error: No se recibió el ID del post." });

    const accion = String(resolucion).toLowerCase();

    if (accion.includes('aprob') || accion.includes('borrar') || accion.includes('true')) {
        db.query('SELECT fotos FROM publicaciones WHERE id = ?', [idPost], (err, results) => {
            if (results && results.length > 0) {
                let fotos = [];
                try { fotos = JSON.parse(results[0].fotos || '[]'); } catch(e) {}
                eliminarArchivos(fotos);
            }
            db.query('DELETE FROM publicaciones WHERE id = ?', [idPost], (err) => {
                if (err) return res.status(500).json({ message: "Error al borrar post" });
                registrarEvento("Admin", "admin_server", `Aprobó Borrado de Post ID ${idPost}`);
                return res.json({ success: true, message: "Publicación eliminada permanentemente." });
            });
        });
    } else if (accion.includes('rechaz') || accion.includes('restaur') || accion.includes('false')) {
        db.query("UPDATE publicaciones SET estado_aprobacion = 'aprobado', motivo_borrado = NULL, mod_solicitante = NULL WHERE id = ?", [idPost], (err) => {
            if (err) return res.status(500).json({ message: "Error al restaurar post" });
            registrarEvento("Admin", "admin_server", `Rechazó Borrado de Post ID ${idPost}`);
            return res.json({ success: true, message: "Solicitud rechazada. La publicación sigue activa." });
        });
    } else {
        return res.status(400).json({ message: `Acción no válida. El servidor recibió: "${resolucion}"` });
    }
});

app.post('/api/admin/resolver-usuario', (req, res) => {
    const { idUsuario, estado } = req.body; 
    db.query("UPDATE usuarios SET estado_aprobacion = ? WHERE id = ?", [estado, idUsuario], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: `Usuario ${estado}.` });
    });
});

app.post('/api/admin/resolver-publicacion', (req, res) => {
    const { idPost, estado } = req.body; 
    if (estado === 'rechazado') {
        db.query('SELECT fotos FROM publicaciones WHERE id = ?', [idPost], (err, results) => {
            if (results && results.length > 0) {
                let fotos = [];
                try { fotos = JSON.parse(results[0].fotos || '[]'); } catch(e) {}
                eliminarArchivos(fotos);
            }
            db.query('DELETE FROM publicaciones WHERE id = ?', [idPost], (err) => {
                if (err) return res.status(500).json({ success: false });
                return res.json({ success: true, message: "Rechazada y eliminada." });
            });
        });
    } else {
        db.query("UPDATE publicaciones SET estado_aprobacion = 'aprobado' WHERE id = ?", [idPost], (err) => {
            if (err) return res.status(500).json({ success: false });
            res.json({ success: true, message: "Aprobada." });
        });
    }
});

app.post('/api/admin/promover-moderador', (req, res) => {
    db.query("UPDATE usuarios SET rol = 'moderator' WHERE id = ?", [req.body.idUsuario], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Ascendido." });
    });
});

app.get('/api/admin/conectados', (req, res) => res.json({ conectados: io.engine.clientsCount }));

// ==========================================
// 🚀 WEBSOCKETS Y BORRADORES
// ==========================================
io.on('connection', (socket) => {
    socket.on('enviar-mensaje', (data) => {
        io.emit('mostrar-mensaje', { texto: data.texto, id: socket.id, hora: new Date().toLocaleTimeString('es-MX') });
    });
});

// 🚀 INICIO DEL SERVIDOR 
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