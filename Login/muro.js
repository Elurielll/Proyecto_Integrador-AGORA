const btnPublish = document.getElementById('btnPublish');
const postContent = document.getElementById('postContent');
const postImage = document.getElementById('postImage');
const previewContainer = document.getElementById('preview-container');
const postsDiv = document.getElementById('posts');

let archivosSeleccionados = []; 

// --- DETECCIÓN DE USUARIO Y ROL ---
function obtenerNombreUsuario() {
    return localStorage.getItem('nombreUsuario') || "Usuario de Agora";
}

function obtenerRol() {
    return localStorage.getItem('userRole') || "user";
}

// --- RASTREADOR DE PRESENCIA ---
async function reportarPresencia() {
    try {
        await fetch('/track-online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: obtenerNombreUsuario() })
        });
    } catch (e) { }
}
setInterval(reportarPresencia, 10000);
reportarPresencia();

// 1. Selección y vista previa de imágenes (Publicación Nueva)
if (postImage) {
    postImage.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
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
    archivosSeleccionados.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = "preview-item";
            div.innerHTML = `
                <img src="${e.target.result}">
                <button type="button" class="btn-remove" onclick="eliminarFoto(${index})">×</button>
            `;
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

window.eliminarFoto = (index) => {
    archivosSeleccionados.splice(index, 1);
    actualizarVistaPrevia();
};

// 2. Cargar publicaciones
async function cargarPosts() {
    try {
        const response = await fetch('/get-posts');
        const posts = await response.json();
        const usuarioActual = obtenerNombreUsuario(); 
        const rol = obtenerRol();
        
        postsDiv.innerHTML = ""; 
        
        posts.reverse().forEach(post => {
            const esDuenioPost = (post.autor === usuarioActual);
            const esMod = (rol === 'moderador');
            const esAdminServ = (rol === 'admin_server');

            const estadoActual = (post.estado || 'disponible').toLowerCase().trim();
            const esDisponible = estadoActual === 'disponible';
            
            const claseVendido = esDisponible ? '' : 'post-vendido';
            const etiquetaEstado = `<div class="badge ${esDisponible ? 'disponible' : 'vendido'}">${esDisponible ? 'Disponible' : 'VENDIDO'}</div>`;

            // INSIGNIA MODERADOR EN PUBLICACIÓN (ARRIBA DEL NOMBRE)
            const insigniaPost = (post.rol === 'moderador' || post.rol === 'admin_server' || post.autor === 'Moderador') 
                ? `<span class="badge-mod">MODERADOR</span>` : '';

            let menuHtml = '';
            if (esDuenioPost || esMod || esAdminServ) {
                menuHtml = `
                <div class="menu-container">
                    <button class="btn-menu-trigger" onclick="toggleMenu(event, ${post.id})">⋮</button>
                    <div class="menu-dropdown" id="menu-${post.id}">
                        ${(esDuenioPost || esAdminServ) ? `
                            <button onclick="iniciarEdicion(${post.id})">Editar publicación</button>
                            <button onclick="cambiarEstado(${post.id}, '${esDisponible ? 'vendido' : 'disponible'}')">
                                ${esDisponible ? 'Marcar como vendido' : 'Marcar como disponible'}
                            </button>
                        ` : ''}
                        <button class="menu-borrar" onclick="borrarPost(${post.id}, '${post.autor}')">Borrar publicación</button>
                    </div>
                </div>`;
            }

            let comentariosHtml = post.comentarios.map((com, index) => {
                const esDuenioCom = (com.autor === usuarioActual);
                const puedeBorrarCom = esDuenioCom || esMod || esAdminServ;
                
                // INSIGNIA MODERADOR EN COMENTARIO (ARRIBA DEL NOMBRE)
                const insigniaCom = (com.rol === 'moderador' || com.rol === 'admin_server' || com.autor === 'Moderador') 
                    ? `<span class="badge-mod">MODERADOR</span>` : '';
                
                return `
                    <div class="comentario-item" id="com-item-${post.id}-${index}" style="display:flex; justify-content:space-between; align-items: flex-start;">
                        <div style="display:flex; flex-direction:column; width:100%;">
                            ${insigniaCom}
                            <div style="display:flex; justify-content:space-between; align-items: flex-start; margin-top:2px;">
                                <div><strong>${com.autor}:</strong> <span>${com.texto}</span></div>
                                <div style="display:flex; gap:8px;">
                                    ${esDuenioCom ? `<button onclick="iniciarEdicionComentario(${post.id}, ${index}, '${com.texto.replace(/'/g, "\\'")}')" style="font-size:0.65rem; color:#613DB7; cursor:pointer; border:none; background:none; text-decoration:underline;">Editar</button>` : ''}
                                    ${puedeBorrarCom ? `<span class="del-com" onclick="borrarComentario(${post.id}, ${index}, '${com.autor}')" style="cursor:pointer; color:red; font-weight:bold;">×</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>`;
            }).join('');

            // ---> LÓGICA DE GRID DE IMÁGENES <---
            let htmlImagenes = '';
            if (post.imagenes && post.imagenes.length > 0) {
                const numImgs = post.imagenes.length;
                let gridClass = 'grid-1';
                if (numImgs === 2) gridClass = 'grid-2';
                else if (numImgs === 3) gridClass = 'grid-3';
                else if (numImgs === 4) gridClass = 'grid-4';
                else if (numImgs > 4) gridClass = 'grid-more';

                let imgsArrayString = JSON.stringify(post.imagenes).replace(/"/g, '&quot;');

                htmlImagenes = `<div class="image-grid ${gridClass}" id="grid-${post.id}">`;
                
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

            postsDiv.innerHTML += `
                <div class="post ${claseVendido}">
                    ${etiquetaEstado}
                    <div class="post-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; flex-direction: column;">
                            ${insigniaPost}
                            <strong style="margin-top:4px;">${post.autor} compartió:</strong>
                        </div>
                        ${menuHtml}
                    </div>
                    <div class="post-body" id="body-${post.id}">${post.texto}</div>
                    ${htmlImagenes}
                    <div class="seccion-comentarios">
                        <button class="btn-ver-comentarios" onclick="toggleComentarios(${post.id})">
                            ${post.comentarios.length === 0 ? "Sin comentarios" : `Ver comentarios (${post.comentarios.length})`}
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

// --- EDICIÓN AVANZADA (IDÉNTICA AL PUBLICADOR) ---
window.iniciarEdicion = async (postId) => {
    const response = await fetch('/get-posts');
    const posts = await response.json();
    const post = posts.find(p => p.id == postId);
    
    const body = document.getElementById(`body-${postId}`);
    const grid = document.getElementById(`grid-${postId}`);
    window[`fotos_edit_${postId}`] = [...post.imagenes];
    window[`nuevos_archivos_${postId}`] = []; 

    body.innerHTML = `
        <div class="publicador" style="margin-bottom: 0; padding: 1rem; border: 1px dashed #613DB7;">
            <textarea id="edit-txt-${postId}" style="width: 100%; height: 100px; padding: 1rem; border: 1px solid #cbcbcb; border-radius: 0.5rem; resize: none; outline: none; font-family: inherit;">${post.texto}</textarea>
            
            <div id="edit-preview-container-${postId}" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 0.5rem;">
                ${window[`fotos_edit_${postId}`].map((url, i) => `
                    <div class="preview-item" style="position: relative; width: 80px; height: 80px;">
                        <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.5rem; border: 1px solid #ddd;">
                        <button type="button" class="btn-remove" onclick="quitarFotoDeEdicion(${postId}, ${i})">×</button>
                    </div>
                `).join('')}
            </div>
            
            <div class="acciones-publicador" style="margin-top: 1rem;">
                <label for="edit-new-files-${postId}" class="btn-image">
                    <span>📷 Añadir Fotos</span>
                    <input type="file" id="edit-new-files-${postId}" accept="image/png, image/jpeg, image/jpg, image/webp" multiple style="display:none;" onchange="agregarFotosEdicion(${postId}, this)">
                </label>
                <div style="display: flex; gap: 10px;">
                    <button onclick="guardarEdicionCompleta(${postId})" class="btn-publicar">Guardar</button>
                    <button onclick="cargarPosts()" style="background:#64748b; color:white; border:none; padding:0.7rem 1.5rem; border-radius:0.5rem; cursor:pointer; font-weight:600;">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    if(grid) grid.style.display = "none";
};

window.agregarFotosEdicion = (postId, input) => {
    if(input.files) {
        for(let file of input.files) {
            window[`nuevos_archivos_${postId}`].push(file);
            const url = URL.createObjectURL(file);
            window[`fotos_edit_${postId}`].push(url);
        }
        actualizarPreviewEdicion(postId);
    }
};

window.quitarFotoDeEdicion = (postId, index) => {
    window[`fotos_edit_${postId}`].splice(index, 1);
    actualizarPreviewEdicion(postId);
};

window.actualizarPreviewEdicion = (postId) => {
    const container = document.getElementById(`edit-preview-container-${postId}`);
    container.innerHTML = window[`fotos_edit_${postId}`].map((url, i) => `
        <div class="preview-item" style="position: relative; width: 80px; height: 80px;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.5rem; border: 1px solid #ddd;">
            <button type="button" class="btn-remove" onclick="quitarFotoDeEdicion(${postId}, ${i})">×</button>
        </div>
    `).join('');
};

window.guardarEdicionCompleta = async (postId) => {
    const nuevoTexto = document.getElementById(`edit-txt-${postId}`).value;
    const archivosNuevos = window[`nuevos_archivos_${postId}`] || [];
    
    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('nuevoTexto', nuevoTexto);
    formData.append('nombreUsuario', obtenerNombreUsuario());
    formData.append('role', obtenerRol());
    
    window[`fotos_edit_${postId}`].forEach(url => {
        if(url.startsWith('/uploads')) formData.append('imagenesRestantes', url);
    });
    
    archivosNuevos.forEach(file => formData.append('imagenes', file));

    await fetch('/editar-post', { method: 'POST', body: formData });
    
    delete window[`nuevos_archivos_${postId}`];
    delete window[`fotos_edit_${postId}`];
    cargarPosts();
};

// --- EDICIÓN DE COMENTARIOS ---
window.iniciarEdicionComentario = (postId, index, textoActual) => {
    const comItem = document.getElementById(`com-item-${postId}-${index}`);
    comItem.innerHTML = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 5px; padding: 5px 0;">
            <input type="text" id="edit-com-input-${postId}-${index}" value="${textoActual}" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.3rem; font-size: 0.85rem; width: 100%;">
            <div style="display:flex; gap: 5px;">
                <button onclick="guardarEdicionComentario(${postId}, ${index})" style="background: #059669; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Guardar</button>
                <button onclick="cargarPosts()" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Cancelar</button>
            </div>
        </div>
    `;
};

window.guardarEdicionComentario = async (postId, index) => {
    const nuevoTexto = document.getElementById(`edit-com-input-${postId}-${index}`).value.trim();
    if(!nuevoTexto) return;

    await fetch('/editar-comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, index, nuevoTexto, nombreUsuario: obtenerNombreUsuario(), role: obtenerRol() })
    });
    cargarPosts();
};

// --- ESTADOS Y COMENTARIOS ---
window.cambiarEstado = async (postId, nuevoEstado) => {
    await fetch('/cambiar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, nuevoEstado, nombreUsuario: obtenerNombreUsuario(), role: obtenerRol() })
    });
    cargarPosts();
};

window.enviarComentario = async (postId) => {
    const input = document.getElementById(`input-${postId}`);
    const texto = input.value.trim();
    if (!texto) return;

    await fetch('/comentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, textoComentario: texto, autor: obtenerNombreUsuario(), rol: obtenerRol() })
    });
    input.value = "";
    cargarPosts();
};

// --- BORRADO LÓGICO ---
window.borrarComentario = async (postId, comentarioIndex, autorCom) => {
    const rol = obtenerRol();
    const usuarioActual = obtenerNombreUsuario();
    let razon = "";

    if (autorCom === usuarioActual) {
        if (!confirm("¿Seguro que deseas borrar tu comentario?")) return;
        razon = "Borrado por el autor";
    } else if (rol === 'moderador' || rol === 'admin_server') {
        let opcion = prompt(`MODERACIÓN (Comentario en Post ID-${postId}).\nSelecciona el número de la razón:\n1. Lenguaje Ofensivo\n2. Spam\n3. Otro`);
        if (opcion === null) return;
        
        if (opcion === "1") razon = "Lenguaje Ofensivo";
        else if (opcion === "2") razon = "Spam";
        else razon = "Incumplimiento de reglas";
    }

    await fetch('/borrar-comentario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, comentarioIndex, nombreUsuario: usuarioActual, role: rol, razon })
    });
    cargarPosts();
};

window.borrarPost = async (postId, autorPost) => {
    const rol = obtenerRol();
    const usuarioActual = obtenerNombreUsuario();
    let razon = "";

    if (autorPost === usuarioActual) {
        if (!confirm(`¿Seguro que deseas borrar tu publicación?`)) return;
        razon = "Borrado por el autor";
    } else if (rol === 'moderador' || rol === 'admin_server') {
        let opcion = prompt(`MODERACIÓN (Post ID-${postId}).\nSelecciona el número de la razón:\n1. Contenido Inapropiado\n2. Spam o Flood\n3. Venta Prohibida\n4. Otro`);
        if (opcion === null) return; 
        
        if (opcion === "1") razon = "Contenido Inapropiado";
        else if (opcion === "2") razon = "Spam o Flood";
        else if (opcion === "3") razon = "Venta Prohibida";
        else razon = "Incumplimiento de normas";
    }

    await fetch('/borrar-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, nombreUsuario: usuarioActual, role: rol, razon })
    });
    cargarPosts();
};

// --- AUXILIARES ---
window.toggleMenu = (event, postId) => {
    event.stopPropagation();
    document.querySelectorAll('.menu-dropdown').forEach(m => { 
        if (m.id !== `menu-${postId}`) m.classList.remove('show'); 
    });
    const menu = document.getElementById(`menu-${postId}`);
    if (menu) menu.classList.toggle('show');
};

window.toggleComentarios = (postId) => document.getElementById(`lista-${postId}`).classList.toggle('abierto');
window.manejarEnter = (event, postId) => { if (event.key === 'Enter') enviarComentario(postId); };

if (btnPublish) {
    btnPublish.addEventListener('click', async () => {
        if (!postContent.value.trim() && archivosSeleccionados.length === 0) return;
        const formData = new FormData();
        formData.append('texto', postContent.value);
        formData.append('autor', obtenerNombreUsuario());
        formData.append('rol', obtenerRol());
        archivosSeleccionados.forEach(file => formData.append('imagenes', file));
        await fetch('/publicar', { method: 'POST', body: formData });
        postContent.value = ""; 
        archivosSeleccionados = []; 
        actualizarVistaPrevia(); 
        cargarPosts();
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('show'));
});

cargarPosts();

// =========================================
//   SISTEMA DE VISOR DE IMÁGENES (MODAL)
// =========================================
let currentFotosVisor = [];
let currentIndexVisor = 0;

const modal = document.getElementById('imageModal');
const modalImg = document.getElementById('imgModalFull');
const closeModal = document.getElementById('closeModal');
const modalNav = document.getElementById('modalNav');
const btnPrevImg = document.getElementById('btnPrevImg');
const btnNextImg = document.getElementById('btnNextImg');

window.abrirVisor = (fotosString, indexClick) => {
    try {
        currentFotosVisor = JSON.parse(fotosString.replace(/&quot;/g, '"'));
    } catch (e) {
        currentFotosVisor = [fotosString]; 
    }
    
    currentIndexVisor = indexClick;
    actualizarImagenVisor();
    modal.classList.add('show');
};

function actualizarImagenVisor() {
    if(!modalImg) return;
    modalImg.src = currentFotosVisor[currentIndexVisor];
    
    if (currentFotosVisor.length > 1) {
        if(modalNav) modalNav.style.display = 'flex';
    } else {
        if(modalNav) modalNav.style.display = 'none';
    }
}

if (closeModal) closeModal.onclick = () => modal.classList.remove('show');
if (btnPrevImg) btnPrevImg.onclick = () => moverVisor(-1);
if (btnNextImg) btnNextImg.onclick = () => moverVisor(1);

function moverVisor(direccion) {
    currentIndexVisor += direccion;
    if (currentIndexVisor < 0) currentIndexVisor = currentFotosVisor.length - 1;
    if (currentIndexVisor >= currentFotosVisor.length) currentIndexVisor = 0;
    actualizarImagenVisor();
}

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
}

document.addEventListener('keydown', (e) => {
    if (modal && modal.classList.contains('show')) {
        if (e.key === 'Escape') modal.classList.remove('show');
        if (e.key === 'ArrowRight') moverVisor(1);
        if (e.key === 'ArrowLeft') moverVisor(-1);
    }
});