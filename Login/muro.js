// ==========================================================================
// CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
// ==========================================================================
const postsDiv = document.getElementById('posts');
let archivosSeleccionados = [];

// ==========================================================================
// 1. UTILIDADES Y SESIÓN
// ==========================================================================
const obtenerNombreUsuario = () => localStorage.getItem('nombreUsuario') || "Usuario de Agora";
const obtenerRol = () => localStorage.getItem('userRole') || "user";

async function reportarPresencia() {
    try {
        await fetch('/track-online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: obtenerNombreUsuario() })
        });
    } catch (e) { /* Silencioso para no ensuciar consola */ }
}
setInterval(reportarPresencia, 10000);
reportarPresencia();

function mostrarAlertaAnimada(mensaje) {
    document.getElementById('alertaMensaje').textContent = mensaje;
    document.getElementById('alertaPersonalizada').classList.add('activo');
}

document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => {
    document.getElementById('alertaPersonalizada').classList.remove('activo');
});

// ==========================================================================
// 2. LÓGICA DEL NUEVO PUBLICADOR (Formulario)
// ==========================================================================
const postImage = document.getElementById('postImage');
const previewContainer = document.getElementById('preview-container');
const postContentArea = document.getElementById('postContent');
const charCount = document.getElementById('charCount');
const selectEstado = document.getElementById('postEstado');
const selectMunicipio = document.getElementById('postMunicipio');
const btnPublish = document.getElementById('btnPublish');

// Diccionario de ubicaciones
const datosUbicacion = {
    "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Puerto Vallarta"],
    "Nuevo León": ["Monterrey", "San Pedro Garza García", "Guadalupe", "San Nicolás"],
    "Ciudad de México": ["Coyoacán", "Tlalpan", "Cuauhtémoc", "Benito Juárez", "Miguel Hidalgo"]
};

// Inicializar Selects de Ubicación
if (selectEstado && selectMunicipio) {
    Object.keys(datosUbicacion).forEach(estado => {
        selectEstado.add(new Option(estado, estado));
    });

    selectEstado.addEventListener('change', (e) => {
        const estado = e.target.value;
        selectMunicipio.innerHTML = '<option value="">Selecciona un Municipio...</option>';
        selectMunicipio.disabled = !estado;
        
        if (estado) {
            datosUbicacion[estado].forEach(mun => selectMunicipio.add(new Option(mun, mun)));
        }
    });
}

// Contador de caracteres
if (postContentArea && charCount) {
    postContentArea.addEventListener('input', () => charCount.textContent = postContentArea.value.length);
}

// Selector y previsualización de Imágenes
if (postImage) {
    postImage.addEventListener('change', (e) => {
        const lblImage = document.getElementById('lblPostImage');
        if(lblImage) {
            lblImage.classList.remove('input-error');
            const errImg = document.getElementById('err-image');
            if (errImg) errImg.style.display = 'none';
        }

        Array.from(e.target.files).forEach(file => {
            if (!archivosSeleccionados.some(f => f.name === file.name && f.size === file.size)) {
                archivosSeleccionados.push(file);
            }
        });
        actualizarVistaPrevia();
        postImage.value = ""; 
    });
}

function actualizarVistaPrevia() {
    if (!previewContainer) return;
    previewContainer.innerHTML = ""; 
    previewContainer.style.display = archivosSeleccionados.length > 0 ? "flex" : "none";

    archivosSeleccionados.forEach((file, index) => {
        const reader = new FileReader();
        const div = document.createElement('div');
        div.className = "preview-item";
        div.style.cssText = "position: relative; width: 80px; height: 80px;";
        previewContainer.appendChild(div);

        reader.onload = (e) => {
            div.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.5rem; border: 1px solid #ddd;">
                <button type="button" onclick="eliminarFoto(${index})" style="position: absolute; top: -5px; right: -5px; background: #ff4d4d; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-weight: bold;">×</button>
            `;
        };
        reader.readAsDataURL(file);
    });
}

window.eliminarFoto = (index) => {
    archivosSeleccionados.splice(index, 1);
    actualizarVistaPrevia();
};

// ==========================================================================
// Evento: Publicar Artículo (CORREGIDO)
// ==========================================================================
if (btnPublish) {
    btnPublish.addEventListener('click', async (e) => {
        e.preventDefault(); // Evitamos recargas accidentales

        const title = document.getElementById('postTitle');
        const price = document.getElementById('postPrice');
        const estado = document.getElementById('postEstado');
        const municipio = document.getElementById('postMunicipio');
        const content = document.getElementById('postContent');

        // Función para marcar en rojo y mostrar error de forma segura
        const setValidacion = (input, spanId, valido) => {
            if (!input) return; // Si el input no existe, lo salta sin romper nada
            const spanError = document.getElementById(spanId);
            
            if (!valido) {
                input.classList.add('input-error');
                if (spanError) spanError.style.display = 'block';
            } else {
                input.classList.remove('input-error');
                if (spanError) spanError.style.display = 'none';
            }
        };

        // 1. Validar campos de texto
        let esValido = true;
        
        if (title && !title.value.trim()) { setValidacion(title, 'err-title', false); esValido = false; } else { setValidacion(title, 'err-title', true); }
        if (price && !price.value.trim()) { setValidacion(price, 'err-price', false); esValido = false; } else { setValidacion(price, 'err-price', true); }
        if (estado && !estado.value) { setValidacion(estado, 'err-estado', false); esValido = false; } else { setValidacion(estado, 'err-estado', true); }
        if (municipio && !municipio.value) { setValidacion(municipio, 'err-municipio', false); esValido = false; } else { setValidacion(municipio, 'err-municipio', true); }
        if (content && !content.value.trim()) { setValidacion(content, 'err-content', false); esValido = false; } else { setValidacion(content, 'err-content', true); }

        if (!esValido) {
            return; // Si falta un texto, nos detenemos aquí
        }

        // 2. Validar imagen con tu alerta animada
        if (archivosSeleccionados.length === 0) {
            mostrarAlertaAnimada("¡Ey! Selecciona al menos una imagen de lo que vas a publicar.");
            return; 
        }

        // 3. Todo válido, preparamos los datos
        const formData = new FormData();
        formData.append('titulo', title ? title.value : '');
        formData.append('precio', price ? price.value : '');
        formData.append('estado', estado ? estado.value : '');
        formData.append('municipio', municipio ? municipio.value : '');
        formData.append('texto', content ? content.value : '');
        formData.append('autor', obtenerNombreUsuario());
        formData.append('rol', obtenerRol());
        
        archivosSeleccionados.forEach(file => formData.append('imagenes', file));
        
        try {
            // 4. Enviamos al servidor
            const response = await fetch('/publicar', { method: 'POST', body: formData });
            
            if (response.ok) {
                // Limpiar todo el formulario después de publicar
                if (title) title.value = ""; 
                if (price) price.value = ""; 
                if (estado) estado.value = ""; 
                if (municipio) {
                    municipio.innerHTML = '<option value="">Selecciona un Municipio...</option>';
                    municipio.disabled = true;
                }
                if (content) content.value = ""; 
                
                const charCountDisplay = document.getElementById('charCount');
                if (charCountDisplay) charCountDisplay.textContent = "0";
                
                archivosSeleccionados = []; 
                actualizarVistaPrevia(); 
                cargarPosts();
                
                mostrarAlertaAnimada("¡Artículo publicado con éxito!"); 
            } else {
                mostrarAlertaAnimada("Error en el servidor al intentar publicar.");
            }
        } catch (error) {
            console.error("Error al publicar:", error);
            mostrarAlertaAnimada("No se pudo conectar con el servidor.");
        }
    });
}


// ==========================================================================
// 3. RENDERIZADO DE PUBLICACIONES (El Muro)
// ==========================================================================
async function cargarPosts() {
    try {
        const response = await fetch('/get-posts');
        const posts = await response.json();
        const usuarioActual = obtenerNombreUsuario(); 
        const rol = obtenerRol();
        
        postsDiv.innerHTML = ""; 
        
        posts.reverse().forEach(post => {
            const esDuenioPost = (post.autor === usuarioActual);
            const esMod = (rol === 'moderador' || rol === 'admin_server');
            const esAdminServ = (rol === 'admin_server');

            // --- LÓGICA DE LOS 3 ESTADOS ---
            const estadoActual = (post.estado_venta || 'disponible').toLowerCase().trim();
            let claseEstado = '';
            let textoEstado = '';
            
            if (estadoActual === 'disponible') {
                claseEstado = 'disponible'; // Verde
                textoEstado = 'Disponible';
            } else if (estadoActual === 'en trato') {
                claseEstado = 'en-trato';   // Azul
                textoEstado = 'En trato';
            } else {
                claseEstado = 'vendido';    // Rojo
                textoEstado = 'VENDIDO';
            }

            const claseVendido = estadoActual === 'vendido' ? 'post-vendido' : '';
            const etiquetaEstado = `<div class="badge ${claseEstado}">${textoEstado}</div>`;
            const insigniaPost = ['moderador', 'admin_server'].includes(post.rol) || post.autor === 'Moderador' ? `<span class="badge-mod">MODERADOR</span>` : '';

            // --- MENÚ DE OPCIONES (TRES PUNTOS) ---
            let menuHtml = '';
            if (esDuenioPost || esMod) {
                menuHtml = `
                <div class="menu-container">
                    <button class="btn-menu-trigger" onclick="toggleMenu(event, ${post.id})" style="font-size: 1.5rem; padding: 0 5px;">⋮</button>
                    <div class="menu-dropdown" id="menu-${post.id}">
                        ${(esDuenioPost || esAdminServ) ? `
                            <button onclick="iniciarEdicion(${post.id})">✏️ Editar publicación</button>
                            ${estadoActual !== 'disponible' ? `<button onclick="cambiarEstado(${post.id}, 'disponible')">✅ Marcar Disponible</button>` : ''}
                            ${estadoActual !== 'en trato' ? `<button onclick="cambiarEstado(${post.id}, 'en trato')">🤝 Marcar En trato</button>` : ''}
                            ${estadoActual !== 'vendido' ? `<button onclick="cambiarEstado(${post.id}, 'vendido')">❌ Marcar Vendido</button>` : ''}
                            <hr style="margin: 5px 0; border: 0; border-top: 1px solid #e2e8f0;">
                        ` : ''}
                        <button class="menu-borrar" onclick="borrarPost(${post.id}, '${post.autor}')" style="color: #dc2626;">🗑️ Borrar publicación</button>
                    </div>
                </div>`;
            }

            // --- CONSTRUIR IMÁGENES ---
            let htmlImagenes = '';
            if (post.imagenes?.length > 0) {
                const numImgs = post.imagenes.length;
                let gridClass = numImgs >= 4 ? 'grid-4' : `grid-${numImgs}`;
                let imgsArrayString = JSON.stringify(post.imagenes).replace(/"/g, '&quot;');

                htmlImagenes = `<div class="image-grid post-images-grid ${gridClass}" id="grid-${post.id}">`;
                post.imagenes.slice(0, 4).forEach((url, i) => {
                    if (i === 3 && numImgs > 4) {
                        htmlImagenes += `
                            <div style="position: relative; cursor: pointer;" onclick="abrirVisor('${imgsArrayString}', ${i})">
                                <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.6);">
                                <div class="more-photos-overlay">+${numImgs - 4}</div>
                            </div>`;
                    } else {
                        htmlImagenes += `<img src="${url}" onclick="abrirVisor('${imgsArrayString}', ${i})">`;
                    }
                });
                htmlImagenes += `</div>`;
            }

            // --- CONSTRUIR COMENTARIOS ---
            let comentariosHtml = (post.comentarios || []).map((com, index) => {
                const puedeBorrarCom = (com.autor === usuarioActual) || esMod;
                return `
                    <div class="comentario-item" id="com-item-${post.id}-${index}" style="display:flex; justify-content:space-between; align-items: flex-start;">
                        <div style="width:100%;">
                            <div style="display:flex; justify-content:space-between; align-items: flex-start; margin-top:2px;">
                                <div>
                                    <a href="perfil.html?user=${encodeURIComponent(com.autor)}" class="autor-link" style="font-weight:bold;">${com.autor}:</a> 
                                    <span>${com.texto}</span>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    ${com.autor === usuarioActual ? `<button onclick="iniciarEdicionComentario(${post.id}, ${index}, '${com.texto.replace(/'/g, "\\'")}')" style="font-size:0.65rem; color:#613DB7; cursor:pointer; border:none; background:none;">Editar</button>` : ''}
                                    ${puedeBorrarCom ? `<span class="del-com" onclick="borrarComentario(${post.id}, ${index}, '${com.autor}')" style="cursor:pointer; color:red; font-weight:bold;">×</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>`;
            }).join('');

            // --- ESTRUCTURA FINAL DE LA TARJETA DEL POST ---
            postsDiv.innerHTML += `
                <div class="post ${claseVendido}" style="position: relative;">
                    
                    <div style="position: absolute; right: 15px; top: 15px; z-index: 10;">
                        ${menuHtml}
                    </div>

                    <div class="post-header-top">
                        <div class="post-author-info">
                            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 5px;">
                                ${etiquetaEstado}
                                ${insigniaPost}
                            </div>
                            <strong><a href="perfil.html?user=${encodeURIComponent(post.autor)}" class="autor-link">${post.autor}</a> compartió:</strong>
                        </div>
                    </div>

                    <div style="margin-top: 10px; margin-bottom: 15px; padding-right: 30px;">
                        ${post.precio ? `<div style="font-size: 1.4rem; font-weight: 800; color: #059669; margin-bottom: 5px;">$${post.precio}</div>` : ''}
                        ${post.titulo ? `<h3 class="post-main-title" style="margin: 0 0 5px 0; font-size: 1.25rem; color: #1e293b;">${post.titulo}</h3>` : ''}
                        ${post.municipio && post.estado ? `<div class="post-location" style="color: #64748b; font-size: 0.85rem;">📍 <span>${post.municipio}, ${post.estado}</span></div>` : ''}
                    </div>
                    
                    <div class="post-body post-description-text" id="body-${post.id}" style="margin-bottom: 15px;">${post.texto}</div>
                    
                    ${htmlImagenes}

                    <div class="seccion-comentarios">
                        <button class="btn-ver-comentarios" onclick="toggleComentarios(${post.id})">
                            ${post.comentarios?.length ? `Ver comentarios (${post.comentarios.length})` : "Sin comentarios"}
                        </button>
                        <div class="lista-comentarios" id="lista-${post.id}">${comentariosHtml}</div>
                        <div class="input-comentario">
                            <input type="text" placeholder="Escribe un comentario..." id="input-${post.id}" onkeydown="manejarEnter(event, ${post.id})">
                            <button onclick="enviarComentario(${post.id})">Enviar</button>
                        </div>
                    </div>
                </div>`;
        });
    } catch (error) { console.error("Error cargando posts:", error); }
}
// ==========================================================================
// 4. ACCIONES GLOBALES (Edición, Borrado, Estados, Comentarios)
// ==========================================================================

// --- Edición de Post ---
window.iniciarEdicion = async (postId) => {
    const response = await fetch('/get-posts');
    const post = (await response.json()).find(p => p.id == postId);
    
    document.getElementById(`grid-${postId}`)?.style.setProperty("display", "none");
    window[`fotos_edit_${postId}`] = [...(post.imagenes || [])];
    window[`nuevos_archivos_${postId}`] = []; 

    document.getElementById(`body-${postId}`).innerHTML = `
        <div class="publicador" style="margin-bottom: 0; padding: 1rem; border: 1px dashed #613DB7;">
            <textarea id="edit-txt-${postId}" style="width: 100%; min-height: 90px; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 8px; outline: none;">${post.texto}</textarea>
            <div id="edit-preview-container-${postId}" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                ${window[`fotos_edit_${postId}`].map((url, i) => `
                    <div class="preview-item" style="position: relative; width: 80px; height: 80px;">
                        <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                        <button type="button" onclick="quitarFotoDeEdicion(${postId}, ${i})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">×</button>
                    </div>`).join('')}
            </div>
            <div class="acciones-publicador" style="margin-top: 1rem;">
                <label for="edit-new-files-${postId}" class="btn-image">
                    <span>📷 Añadir Fotos</span>
                    <input type="file" id="edit-new-files-${postId}" accept="image/*" multiple style="display:none;" onchange="agregarFotosEdicion(${postId}, this)">
                </label>
                <div style="display: flex; gap: 10px;">
                    <button onclick="guardarEdicionCompleta(${postId})" class="btn-publicar">Guardar</button>
                    <button onclick="cargarPosts()" class="btn-image" style="background:#f8fafc;">Cancelar</button>
                </div>
            </div>
        </div>`;
};

window.agregarFotosEdicion = (postId, input) => {
    if(input.files) {
        for(let file of input.files) {
            window[`nuevos_archivos_${postId}`].push(file);
            window[`fotos_edit_${postId}`].push(URL.createObjectURL(file));
        }
        actualizarPreviewEdicion(postId);
    }
};

window.quitarFotoDeEdicion = (postId, index) => {
    window[`fotos_edit_${postId}`].splice(index, 1);
    actualizarPreviewEdicion(postId);
};

window.actualizarPreviewEdicion = (postId) => {
    document.getElementById(`edit-preview-container-${postId}`).innerHTML = window[`fotos_edit_${postId}`].map((url, i) => `
        <div class="preview-item" style="position: relative; width: 80px; height: 80px;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
            <button type="button" onclick="quitarFotoDeEdicion(${postId}, ${i})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px;">×</button>
        </div>`).join('');
};

window.guardarEdicionCompleta = async (postId) => {
    const fotosRestantes = window[`fotos_edit_${postId}`] || [];
    const archivosNuevos = window[`nuevos_archivos_${postId}`] || [];

    if (fotosRestantes.length === 0 && archivosNuevos.length === 0) {
        mostrarAlertaAnimada("¡Ey! Debes dejar al menos una imagen en tu publicación.");
        return; 
    }

    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('nuevoTexto', document.getElementById(`edit-txt-${postId}`).value);
    formData.append('nombreUsuario', obtenerNombreUsuario());
    formData.append('role', obtenerRol());
    
    fotosRestantes.filter(url => url.startsWith('/uploads')).forEach(url => formData.append('imagenesRestantes', url));
    archivosNuevos.forEach(file => formData.append('imagenes', file));
    
    await fetch('/editar-post', { method: 'POST', body: formData });
    cargarPosts();
};

// --- Operaciones de API Simples ---
const operacionPost = async (url, body) => {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    cargarPosts();
};

window.cambiarEstado = (postId, nuevoEstado) => operacionPost('/cambiar-estado', { postId, nuevoEstado, nombreUsuario: obtenerNombreUsuario(), role: obtenerRol() });
window.enviarComentario = (postId) => {
    const input = document.getElementById(`input-${postId}`);
    if (input.value.trim()) {
        operacionPost('/comentar', { postId, textoComentario: input.value.trim(), autor: obtenerNombreUsuario(), rol: obtenerRol() });
    }
};

window.borrarPost = (postId, autorPost) => {
    const rol = obtenerRol();
    const razon = (autorPost === obtenerNombreUsuario()) ? "Autor" : (['moderador', 'admin_server'].includes(rol) ? prompt("Razón de moderación:") : null);
    if (razon !== null && confirm("¿Borrar post?")) operacionPost('/borrar-post', { postId, nombreUsuario: obtenerNombreUsuario(), role: rol, razon });
};

window.borrarComentario = (postId, comentarioIndex, autorCom) => {
    const rol = obtenerRol();
    const razon = (autorCom === obtenerNombreUsuario()) ? "Autor" : (['moderador', 'admin_server'].includes(rol) ? prompt("Razón de moderación:") : null);
    if (razon !== null && confirm("¿Borrar comentario?")) operacionPost('/borrar-comentario', { postId, comentarioIndex, nombreUsuario: obtenerNombreUsuario(), role: rol, razon });
};

window.iniciarEdicionComentario = (postId, index, textoActual) => {
    document.getElementById(`com-item-${postId}-${index}`).innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 5px;">
            <input type="text" id="edit-com-input-${postId}-${index}" value="${textoActual}" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            <div style="display:flex; gap: 5px;">
                <button onclick="guardarEdicionComentario(${postId}, ${index})" style="background: #059669; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 4px;">Guardar</button>
                <button onclick="cargarPosts()" style="background: #dc2626; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 4px;">Cancelar</button>
            </div>
        </div>`;
};

window.guardarEdicionComentario = (postId, index) => {
    const nuevoTexto = document.getElementById(`edit-com-input-${postId}-${index}`).value.trim();
    if(nuevoTexto) operacionPost('/editar-comentario', { postId, index, nuevoTexto, nombreUsuario: obtenerNombreUsuario(), role: obtenerRol() });
};

// --- Auxiliares de UI ---
window.toggleMenu = (event, postId) => {
    event.stopPropagation();
    document.querySelectorAll('.menu-dropdown').forEach(m => m.id !== `menu-${postId}` && m.classList.remove('show'));
    document.getElementById(`menu-${postId}`)?.classList.toggle('show');
};
window.toggleComentarios = (postId) => document.getElementById(`lista-${postId}`).classList.toggle('abierto');
window.manejarEnter = (event, postId) => { if (event.key === 'Enter') enviarComentario(postId); };

document.addEventListener('click', () => document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('show')));

// ==========================================================================
// 5. COMPONENTES GLOBALES DE UI (Visor, Menú Perfil, Barra Lateral)
// ==========================================================================

// --- Visor de Imágenes Modal ---
let currentFotosVisor = [], currentIndexVisor = 0;
const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('imgModalFull');

window.abrirVisor = (fotosString, indexClick) => {
    currentFotosVisor = Array.isArray(fotosString) ? fotosString : JSON.parse(fotosString.replace(/&quot;/g, '"'));
    currentIndexVisor = indexClick;
    if(modalImg) { modalImg.src = currentFotosVisor[currentIndexVisor]; }
    document.getElementById('modalNav').style.display = currentFotosVisor.length > 1 ? 'flex' : 'none';
    modal.classList.add('show');
};

document.getElementById('closeModal')?.addEventListener('click', () => modal.classList.remove('show'));
document.getElementById('btnPrevImg')?.addEventListener('click', () => moverVisor(-1));
document.getElementById('btnNextImg')?.addEventListener('click', () => moverVisor(1));

function moverVisor(dir) {
    currentIndexVisor = (currentIndexVisor + dir + currentFotosVisor.length) % currentFotosVisor.length;
    modalImg.src = currentFotosVisor[currentIndexVisor];
}

// --- Menú de Perfil Superior ---
const btnMenuPerfil = document.getElementById('btn-menu-perfil');
const dropdownPerfil = document.getElementById('dropdown-perfil');

if (btnMenuPerfil && dropdownPerfil) {
    btnMenuPerfil.addEventListener('click', (e) => { e.stopPropagation(); dropdownPerfil.classList.toggle('show'); });
    document.addEventListener('click', (e) => { if (!dropdownPerfil.contains(e.target) && e.target !== btnMenuPerfil) dropdownPerfil.classList.remove('show'); });
    
    document.getElementById('ver-mi-perfil')?.addEventListener('click', () => mostrarAlertaAnimada("Navegando a tu perfil..."));
    document.getElementById('cerrar-sesion')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html'; 
    });
}

// --- Categorías Lateral ---
document.querySelectorAll('.list-categorias__button').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('arrow');
        const menu = btn.nextElementSibling;
        menu.style.height = menu.clientHeight === 0 ? `${menu.scrollHeight}px` : "0px";
    });
});

// Inicialización
cargarPosts();