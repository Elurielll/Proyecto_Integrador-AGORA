// ==========================================================================
// CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
// ==========================================================================
const postsDiv = document.getElementById('posts');
let archivosSeleccionados = [];
let postsCargados = []; 
let categoriaActual = "todas"; // Nueva variable para saber qué filtro está activo

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
    } catch (e) {} 
}
setInterval(reportarPresencia, 10000);
reportarPresencia();

function mostrarAlertaAnimada(mensaje, tipo = 'error') {
    const alertaModal = document.getElementById('alertaPersonalizada');
    const mensajeEl = document.getElementById('alertaMensaje');
    const iconoEl = alertaModal.querySelector('.alerta-icono');

    if (mensajeEl) mensajeEl.textContent = mensaje;

    if (iconoEl) {
        if (tipo === 'exito') {
            iconoEl.textContent = '🎉';
        } else {
            iconoEl.textContent = '⚠️';
        }
    }
    if (alertaModal) alertaModal.classList.add('activo');
}

document.getElementById('btnCerrarAlerta')?.addEventListener('click', () => {
    document.getElementById('alertaPersonalizada').classList.remove('activo');
});

const AgoraModals = {
    prompt: function(titulo, valorActual, callback) {
        const overlay = document.createElement('div');
        overlay.className = 'agora-modal-overlay';
        overlay.innerHTML = `
            <div class="agora-modal">
                <h3>${titulo}</h3>
                <input type="text" id="agora-modal-input" value="${valorActual}" autocomplete="off" />
                <div class="agora-modal-buttons">
                    <button class="agora-btn-cancel" onclick="this.closest('.agora-modal-overlay').remove()">Cancelar</button>
                    <button class="agora-btn-confirm" id="agora-modal-save">Guardar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#agora-modal-input');
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length; 

        overlay.querySelector('#agora-modal-save').onclick = () => {
            const newVal = input.value.trim();
            if(newVal) callback(newVal);
            overlay.remove();
        };
    },
    confirm: function(titulo, mensaje, textoBoton, callback) {
        const overlay = document.createElement('div');
        overlay.className = 'agora-modal-overlay';
        overlay.innerHTML = `
            <div class="agora-modal">
                <h3>${titulo}</h3>
                <p>${mensaje}</p>
                <div class="agora-modal-buttons">
                    <button class="agora-btn-cancel" onclick="this.closest('.agora-modal-overlay').remove()">Cancelar</button>
                    <button class="agora-btn-danger" id="agora-modal-delete">${textoBoton}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#agora-modal-delete').onclick = () => {
            callback();
            overlay.remove();
        };
    }
};

// ==========================================================================
// 1.5 LÓGICA DEL MENÚ DE CATEGORÍAS (Animación y Filtros)
// ==========================================================================
const btnCategorias = document.querySelector('.list-categorias__button');
const menuCategorias = document.querySelector('.list-categorias__show');
const enlacesCategorias = document.querySelectorAll('.nav-categorias_link--inside');

if (btnCategorias && menuCategorias) {
    btnCategorias.addEventListener('click', (e) => {
        e.preventDefault();
        menuCategorias.classList.toggle('abierto');
    });
}

enlacesCategorias.forEach(enlace => {
    enlace.addEventListener('click', (e) => {
        e.preventDefault();
        categoriaActual = e.target.getAttribute('data-categoria');

        enlacesCategorias.forEach(link => link.style.fontWeight = 'normal');
        e.target.style.fontWeight = 'bold';
        
        renderizarPostsEnMuro();
    });
});

// ==========================================================================
// 2. LÓGICA DEL NUEVO PUBLICADOR (Formulario)
// ==========================================================================
const selectEstado = document.getElementById('postEstado');
const selectMunicipio = document.getElementById('postMunicipio');
const btnPublish = document.getElementById('btnPublish');
const postImage = document.getElementById('postImage');

const datosUbicacion = {
    "Aguascalientes": ["Aguascalientes", "Asientos", "Calvillo", "Jesús María", "Pabellón de Arteaga", "Rincón de Romos"],
    "Baja California": ["Ensenada", "Mexicali", "Tecate", "Tijuana", "Playas de Rosarito", "San Quintín"],
    "Baja California Sur": ["Comondú", "Mulegé", "La Paz", "Los Cabos", "Loreto"],
    "Campeche": ["Campeche", "Carmen", "Champotón", "Escárcega", "Calkiní"],
    "Chiapas": ["Tuxtla Gutiérrez", "San Cristóbal de las Casas", "Tapachula", "Palenque", "Comitán", "Chiapa de Corzo"],
    "Chihuahua": ["Chihuahua", "Ciudad Juárez", "Cuauhtémoc", "Delicias", "Hidalgo del Parral", "Nuevo Casas Grandes"],
    "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"],
    "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña", "Ramos Arizpe"],
    "Colima": ["Armería", "Colima", "Comala", "Coquimatlán", "Cuauhtémoc", "Ixtlahuacán", "Manzanillo", "Minatitlán", "Tecomán", "Villa de Álvarez"],
    "Durango": ["Durango", "Gómez Palacio", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro"],
    "Estado de México": ["Toluca", "Ecatepec", "Nezahualcóyotl", "Naucalpan", "Tlalnepantla", "Chimalhuacán", "Cuautitlán Izcalli", "Atizapán", "Metepec", "Chalco", "Valle de Chalco", "Ixtapaluca"],
    "Guanajuato": ["León", "Irapuato", "Celaya", "Salamanca", "Guanajuato", "Silao", "San Miguel de Allende"],
    "Guerrero": ["Acapulco", "Chilpancingo", "Iguala", "Taxco", "Zihuatanejo", "Tlapa"],
    "Hidalgo": ["Pachuca", "Tulancingo", "Tula de Allende", "Mineral de la Reforma", "Ixmiquilpan", "Tizayuca"],
    "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Puerto Vallarta", "Tlajomulco de Zúñiga", "Lagos de Moreno", "Tepatitlán"],
    "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas", "Zitácuaro", "Apatzingán", "Pátzcuaro"],
    "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco", "Yautepec", "Jojutla"],
    "Nayarit": ["Tepic", "Bahía de Banderas", "Santiago Ixcuintla", "Compostela", "San Blas", "Xalisco"],
    "Nuevo León": ["Monterrey", "Guadalupe", "Apodaca", "San Nicolás de los Garza", "General Escobedo", "Santa Catarina", "San Pedro Garza García", "García"],
    "Oaxaca": ["Oaxaca de Juárez", "San Juan Bautista Tuxtepec", "Salina Cruz", "Juchitán", "Santa Cruz Xoxocotlán", "Huajuapan"],
    "Puebla": ["Puebla", "Tehuacán", "San Martín Texmelucan", "Atlixco", "Cholula", "Amozoc"],
    "Querétaro": ["Querétaro", "San Juan del Río", "Corregidora", "El Marqués", "Tequisquiapan", "Huimilpan"],
    "Quintana Roo": ["Cancún (Benito Juárez)", "Playa del Carmen (Solidaridad)", "Chetumal (Othón P. Blanco)", "Cozumel", "Tulum", "Isla Mujeres"],
    "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles", "Matehuala", "Rioverde"],
    "Sinaloa": ["Culiacán", "Mazatlán", "Ahome", "Guasave", "Navolato", "Salvador Alvarado"],
    "Sonora": ["Hermosillo", "Ciudad Obregón (Cajeme)", "Nogales", "San Luis Río Colorado", "Navojoa", "Guaymas", "Agua Prieta"],
    "Tabasco": ["Villahermosa (Centro)", "Cárdenas", "Comalcalco", "Macuspana", "Huimanguillo", "Cunduacán"],
    "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Tampico", "Ciudad Victoria", "Ciudad Madero", "Altamira"],
    "Tlaxcala": ["Tlaxcala", "Apizaco", "Huamantla", "Chiautempan", "Zacatelco", "San Pablo del Monte"],
    "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica", "Orizaba", "Boca del Río", "Minatitlán"],
    "Yucatán": ["Mérida", "Kanasín", "Valladolid", "Tizimín", "Progreso", "Umán"],
    "Zacatecas": ["Zacatecas", "Guadalupe", "Fresnillo", "Jerez", "Río Grande", "Sombrerete"]
};

if (selectEstado && selectMunicipio) {
    Object.keys(datosUbicacion).forEach(estado => selectEstado.add(new Option(estado, estado)));
    selectEstado.addEventListener('change', (e) => {
        const estado = e.target.value;
        selectMunicipio.innerHTML = '<option value="">Selecciona un Municipio...</option>';
        selectMunicipio.disabled = !estado;
        if (estado) datosUbicacion[estado].forEach(mun => selectMunicipio.add(new Option(mun, mun)));
    });
}

document.getElementById('postContent')?.addEventListener('input', (e) => {
    const counter = document.getElementById('charCount');
    if(counter) counter.textContent = e.target.value.length;
});

if (postImage) {
    postImage.addEventListener('change', (e) => {
        const archivos = Array.from(e.target.files);
        const MAX_IMAGENES = 5;
        const MAX_PESO = 1 * 1024 * 1024; 

        if (archivosSeleccionados.length + archivos.length > MAX_IMAGENES) {
            mostrarAlertaAnimada("⚠️ Solo puedes subir un máximo de 5 imágenes.");
            postImage.value = ""; return;
        }

        for (let file of archivos) {
            if (file.size > MAX_PESO) {
                mostrarAlertaAnimada(`⚠️ La imagen "${file.name}" pesa más de 1MB. Elige una más ligera.`);
                postImage.value = ""; return;
            }
            if (!archivosSeleccionados.some(f => f.name === file.name)) {
                archivosSeleccionados.push(file);
            }
        }
        actualizarVistaPrevia();
        postImage.value = ""; 
    });
}

function actualizarVistaPrevia() {
    const previewContainer = document.getElementById('preview-container');
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
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                <button type="button" onclick="eliminarFoto(${index})" style="position: absolute; top: -5px; right: -5px; background: #ff4d4d; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer;">×</button>
            `;
        };
        reader.readAsDataURL(file);
    });
}

window.eliminarFoto = (index) => {
    archivosSeleccionados.splice(index, 1);
    actualizarVistaPrevia();
};

if (btnPublish) {
    btnPublish.addEventListener('click', async (e) => {
        e.preventDefault();

        const campos = ['postTitle', 'postPrice', 'postEstado', 'postMunicipio', 'postCategoria', 'postCondicion', 'postContent'];
        let esValido = true;
        const valores = {};

        campos.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                valores[id] = input.value.trim();
                const errorSpan = document.getElementById(`err-${id.replace('post', '').toLowerCase()}`);
                if (errorSpan) errorSpan.style.display = 'none';

                if (!valores[id]) {
                    input.classList.add('input-error');
                    if (errorSpan) errorSpan.style.display = 'block';
                    esValido = false;
                } else {
                    input.classList.remove('input-error');
                }
            }
        });

        if (!esValido) {
            mostrarAlertaAnimada("Por favor, llena todos los campos marcados.");
            return;
        }
        if (archivosSeleccionados.length === 0) {
            mostrarAlertaAnimada("¡Ey! Selecciona al menos una imagen de lo que vas a publicar.");
            return; 
        }

        const formData = new FormData();
        formData.append('titulo', valores['postTitle']);
        formData.append('precio', valores['postPrice']);
        formData.append('estado', valores['postEstado']);
        formData.append('municipio', valores['postMunicipio']);
        formData.append('categoria', valores['postCategoria']);

        formData.append('condicion', valores['postCondicion']); 
        
        formData.append('texto', valores['postContent']);
        formData.append('estado_venta', 'disponible'); 
        formData.append('autor', obtenerNombreUsuario());
        formData.append('rol', obtenerRol());
        
        archivosSeleccionados.forEach(file => formData.append('imagenes', file));
        
        try {
            const response = await fetch('/publicar', { method: 'POST', body: formData });
            if (response.ok) {
                campos.forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
                archivosSeleccionados = []; 
                actualizarVistaPrevia(); 

                const counter = document.getElementById('charCount');
                if(counter) counter.textContent = '0';

                cargarPosts();
                
                mostrarAlertaAnimada("¡Artículo publicado con éxito!", "exito");

                const modal = document.getElementById('modalPublicacion'); 
                if (modal) {
                    modal.style.display = 'none';
                }

            } else {
                mostrarAlertaAnimada("Error en el servidor al intentar publicar.");
            }
        } catch (error) {
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
        postsCargados = posts; 
        renderizarPostsEnMuro();
    } catch (error) { console.error("Error cargando posts:", error); }
}

function renderizarPostsEnMuro() {
    const usuarioActual = obtenerNombreUsuario(); 
    const rol = obtenerRol();
    const postsDiv = document.getElementById('posts'); 
    if (!postsDiv) return;
    
    postsDiv.innerHTML = ""; 
    
    let postsAVisualizar = [...postsCargados].reverse();

    if (typeof categoriaActual !== 'undefined' && categoriaActual !== "todas") {
        postsAVisualizar = postsAVisualizar.filter(post => post.categoria === categoriaActual);
    }

    if (typeof window.estadoFiltroActual !== 'undefined' && window.estadoFiltroActual !== "") {
        postsAVisualizar = postsAVisualizar.filter(post => {
            const estadoDelPost = (post.estado || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const estadoBuscado = window.estadoFiltroActual.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return estadoDelPost.includes(estadoBuscado); 
        });
    }

    if (typeof window.municipioFiltroActual !== 'undefined' && window.municipioFiltroActual !== "") {
        postsAVisualizar = postsAVisualizar.filter(post => {
            const muniDelPost = (post.municipio || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const muniBuscado = window.municipioFiltroActual.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return muniDelPost.includes(muniBuscado); 
        });
    }

    if (postsAVisualizar.length === 0) {
        postsDiv.innerHTML = `<p style="text-align:center; color:#64748b; margin-top:40px; font-size:1.1rem; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">No hay publicaciones con estos filtros aún. 🕵️‍♂️</p>`;
        return;
    }

    postsAVisualizar.forEach(post => {
        const esDuenioPost = (post.autor === usuarioActual);
        const esMod = (rol === 'moderador' || rol === 'admin_server');
        const estadoActual = (post.estado_venta || 'disponible').toLowerCase();
        let claseEstado = estadoActual === 'vendido' ? 'vendido' : (estadoActual === 'en trato' ? 'en-trato' : 'disponible');
        let textoEstado = estadoActual === 'vendido' ? 'VENDIDO' : (estadoActual === 'en trato' ? 'En Trato' : 'Disponible');

        let menuHtml = '';
        if (esDuenioPost || esMod) {
            menuHtml = `
            <div class="menu-container" style="position: absolute; right: 20px; top: 20px; z-index: 10;">
                <button class="btn-menu-trigger" onclick="toggleMenu(event, ${post.id})" style="font-size: 1.5rem; background: transparent; border: none; cursor: pointer; color: #64748b;">⋮</button>
                <div class="menu-dropdown" id="menu-${post.id}" style="position: absolute; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; min-width: 160px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    ${esDuenioPost ? `
                        <button onclick="prepararEdicion(${post.id})" style="width: 100%; text-align: left; padding: 8px; border: none; background: none; cursor: pointer; color: #334155; border-radius: 4px;">✏️ Editar</button>
                        <hr style="margin: 4px 0; border: none; border-top: 1px solid #e2e8f0;">
                        ${estadoActual !== 'disponible' ? `<button onclick="cambiarEstado(${post.id}, 'disponible')" style="width: 100%; text-align: left; padding: 8px; border: none; background: none; cursor: pointer; color: #334155;">✅ Disponible</button>` : ''}
                        ${estadoActual !== 'en trato' ? `<button onclick="cambiarEstado(${post.id}, 'en trato')" style="width: 100%; text-align: left; padding: 8px; border: none; background: none; cursor: pointer; color: #334155;">🤝 En trato</button>` : ''}
                        ${estadoActual !== 'vendido' ? `<button onclick="cambiarEstado(${post.id}, 'vendido')" style="width: 100%; text-align: left; padding: 8px; border: none; background: none; cursor: pointer; color: #334155;">❌ Vendido</button>` : ''}
                        <hr style="margin: 4px 0; border: none; border-top: 1px solid #e2e8f0;">
                    ` : ''}
                    <button onclick="borrarPost(${post.id}, '${post.autor}')" style="width: 100%; text-align: left; padding: 8px; border: none; background: none; cursor: pointer; color: #ef4444; border-radius: 4px;">🗑️ Borrar</button>
                </div>
            </div>`;
        }

        let htmlImagenes = '';
        if (post.imagenes?.length === 1) {
            htmlImagenes = `<img src="${post.imagenes[0]}" class="img-unica" onclick="abrirVisor(${post.id}, 0)" style="max-height: 400px; object-fit: cover; width: 100%; border-radius: 12px; cursor: pointer; margin-top: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">`;
        } else if (post.imagenes?.length > 1) {
            htmlImagenes = `<div class="post-images-grid" id="grid-${post.id}" style="margin-top: 15px; border-radius: 12px; overflow: hidden;">`;
            post.imagenes.slice(0, 4).forEach((url, i) => {
                if (i === 3 && post.imagenes.length > 4) {
                    htmlImagenes += `
                        <div style="position: relative; cursor: pointer;" onclick="abrirVisor(${post.id}, ${i})">
                            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
                            <div class="more-photos-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.5); color:white; display:flex; align-items:center; justify-content:center; font-size: 1.5rem; font-weight: bold;">+${post.imagenes.length - 4}</div>
                        </div>`;
                } else {
                    htmlImagenes += `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="abrirVisor(${post.id}, ${i})">`;
                }
            });
            htmlImagenes += `</div>`;
        }

        let htmlComentarios = '<div class="seccion-comentarios-preview" style="margin-top: 15px;">';
        const comentarios = post.comentarios || [];
        
        comentarios.slice(0, 2).forEach(c => {
            htmlComentarios += `<div style="font-size: 0.95rem; margin-bottom: 8px; color: #334155; background: #f8fafc; padding: 8px 12px; border-radius: 8px;">
                <strong onclick="verPerfil('${c.autor}')" style="color: #0f172a; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${c.autor}</strong>: ${c.texto}
            </div>`;
        });

        if (comentarios.length > 2) {
            htmlComentarios += `<button class="btn-ver-mas-comentarios" onclick="abrirVisor(${post.id}, 0)" style="background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0; font-size: 0.95rem; margin-top: 5px; font-weight: 500;">Ver los ${comentarios.length} comentarios</button>`;
        } else {
            htmlComentarios += `<button class="btn-ver-mas-comentarios" onclick="abrirVisor(${post.id}, 0)" style="background: none; border: none; color: #64748b; cursor: pointer; padding: 0; font-size: 0.95rem; margin-top: 5px; font-weight: 500;">💬 Agregar un comentario...</button>`;
        }
        htmlComentarios += '</div>';

        const tiempoPost = post.fecha || "";
        const etiquetaCategoria = post.categoria ? `<span style="background: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 16px; font-size: 0.8rem; font-weight: 600; border: 1px solid #e2e8f0;">🏷️ ${post.categoria}</span>` : '';

        let iconoCondicion = '';
        if(post.condicion === 'Nuevo') iconoCondicion = '✨ ';
        if(post.condicion === 'Buen estado') iconoCondicion = '👍 ';
        if(post.condicion === 'Usado') iconoCondicion = '📦 ';
        const etiquetaCondicion = post.condicion ? `<span style="background: #fef9c3; color: #a16207; padding: 4px 12px; border-radius: 16px; font-size: 0.8rem; font-weight: 600; border: 1px solid #fef08a;">${iconoCondicion}${post.condicion.replace('✨ ', '').replace('👍 ', '').replace('📦 ', '')}</span>` : '';

        postsDiv.innerHTML += `
            <div class="post ${estadoActual === 'vendido' ? 'post-vendido' : ''}" style="position: relative; padding: 24px; border: 1px solid #f1f5f9; background: white; margin-bottom: 24px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.04);">
                ${menuHtml}
                
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                    <div style="width: 42px; height: 42px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-right: 12px;">👤</div>
                    <div>
                        <div onclick="verPerfil('${post.autor}')" style="font-weight: 700; color: #1e293b; font-size: 1.05rem; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${post.autor}</div>
                        <div style="color: #94a3b8; font-size: 0.85rem;">${tiempoPost}</div>
                    </div>
                </div>

                ${post.precio ? `<div style="font-size: 1.6rem; color: #10b981; font-weight: 900; margin-bottom: 4px;">$${post.precio}</div>` : ''}
                ${post.titulo ? `<h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 1.25rem; font-weight: 700;">${post.titulo}</h3>` : ''}

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                    <span class="badge ${claseEstado}" style="padding: 4px 12px; font-size: 0.8rem;">${textoEstado}</span>
                    ${etiquetaCategoria}
                    ${etiquetaCondicion}
                </div>

                ${post.municipio && post.estado ? `<div style="color: #64748b; font-size: 0.9rem; margin-bottom: 16px; display: flex; align-items: center;">📍 ${post.municipio}, ${post.estado}</div>` : ''}
                
                <p style="margin: 0 0 16px 0; color: #475569; line-height: 1.6; font-size: 1rem;">${post.texto}</p>
                
                ${htmlImagenes}

                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;">

                ${htmlComentarios}
            </div>`;
    });
}

// ==========================================================================
// 4. ACCIONES GLOBALES (Estados y Borrado)
// ==========================================================================
window.cambiarEstado = async (postId, nuevoEstado) => {
    await fetch('/cambiar-estado', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ id: postId, estado_venta: nuevoEstado }) 
    });
    cargarPosts(); 
};

window.borrarPost = async (postId, autorPost) => {
    AgoraModals.confirm("Borrar Publicación", "¿Seguro que deseas borrar esta publicación? Esta acción no se puede deshacer.", "Borrar Publicación", async () => {
        await fetch('/borrar-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, role: obtenerRol() })
        });
        cargarPosts();
    });
};

window.toggleMenu = (event, postId) => {
    event.stopPropagation();
    document.querySelectorAll('.menu-dropdown').forEach(m => m.id !== `menu-${postId}` && m.classList.remove('show'));
    document.getElementById(`menu-${postId}`)?.classList.toggle('show');
};

document.addEventListener('click', () => document.querySelectorAll('.menu-dropdown').forEach(m => m.classList.remove('show')));
window.verPerfil = (nombreUsuario) => {
    window.location.href = `/perfil.html?usuario=${encodeURIComponent(nombreUsuario)}`;
};

// ==========================================================================
// 5. VISOR DE IMÁGENES Y COMENTARIOS (FB MODAL)
// ==========================================================================
let currentPostIdVisor = null;
let currentIndexVisor = 0;

const fbModal = document.getElementById('fb-modal');
const fbModalImg = document.getElementById('fb-modal-img');
const fbCloseBtn = document.getElementById('fb-close-btn');

window.abrirVisor = (postId, indexClick) => {
    const post = postsCargados.find(p => p.id === postId);
    if (!post) return;

    currentPostIdVisor = postId;
    currentIndexVisor = indexClick || 0;
    
    actualizarVistaModal(post);
    if(fbModal) fbModal.classList.add('show');
};

function actualizarVistaModal(post) {
    if (post.imagenes && post.imagenes.length > 0) {
        fbModalImg.src = post.imagenes[currentIndexVisor];
    }
    
    const commentsDiv = document.getElementById('fb-sidebar-comments');
    if (!commentsDiv) return;
    
    commentsDiv.innerHTML = '';
    const comentarios = post.comentarios || [];
    
    if (comentarios.length === 0) {
        commentsDiv.innerHTML = '<p style="color: #64748b; font-size: 0.9rem; text-align: center; margin-top: 20px;">Sin comentarios aún. ¡Sé el primero!</p>';
    } else {
        comentarios.forEach((c, index) => {
            const esMio = c.autor === obtenerNombreUsuario();
            const tiempoComentario = c.fecha || "";
            
            let htmlAcciones = '';
            if (esMio) {
                htmlAcciones = `
                    <div style="font-size: 0.75rem; margin-top: 3px; display:flex; gap: 8px;">
                        <button onclick="editarComentario(${post.id}, ${index}, '${c.texto.replace(/'/g, "\\'")}')" style="background:none; border:none; color:#3b82f6; cursor:pointer; padding:0;">Editar</button>
                        <button onclick="borrarComentario(${post.id}, ${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:0;">Borrar</button>
                    </div>
                `;
            }

            commentsDiv.innerHTML += `
                <div style="margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                    <strong style="color: #0f172a; font-size: 0.9rem;">${c.autor}</strong> 
                    <span style="color: #94a3b8; font-size: 0.75rem; margin-left: 5px;">${tiempoComentario}</span>
                    <p style="margin: 3px 0; font-size: 0.9rem; color: #334155;">${c.texto}</p>
                    ${htmlAcciones}
                </div>
            `;
        });
    }
}

function navegarVisor(direccion) {
    const post = postsCargados.find(p => p.id === currentPostIdVisor);
    if (!post || !post.imagenes || post.imagenes.length <= 1) return;
    
    currentIndexVisor = (currentIndexVisor + direccion + post.imagenes.length) % post.imagenes.length;
    actualizarVistaModal(post);
}

document.getElementById('fb-btn-prev')?.addEventListener('click', (e) => { e.stopPropagation(); navegarVisor(-1); });
document.getElementById('fb-btn-next')?.addEventListener('click', (e) => { e.stopPropagation(); navegarVisor(1); });

const cerrarVisor = () => {
    fbModal?.classList.remove('show');
    setTimeout(() => { if(fbModalImg) fbModalImg.src = ''; }, 200);
    currentPostIdVisor = null;
};

fbCloseBtn?.addEventListener('click', cerrarVisor);
fbModal?.addEventListener('click', (e) => {
    if (e.target === fbModal || e.target.classList.contains('fb-modal-image-section')) {
        cerrarVisor();
    }
});

document.addEventListener('keydown', (e) => {
    if (!fbModal?.classList.contains('show')) return;
    if (e.key === 'Escape') cerrarVisor();
    else if (e.key === 'ArrowRight') navegarVisor(1);
    else if (e.key === 'ArrowLeft') navegarVisor(-1);
});

document.getElementById('fb-comment-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('fb-comment-input');
    const texto = input.value.trim();
    if (!texto || !currentPostIdVisor) return;

    try {
        const res = await fetch('/comentar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postId: currentPostIdVisor,
                textoComentario: texto,
                autor: obtenerNombreUsuario(),
                fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
            })
        });

        if (res.ok) {
            input.value = ''; 
            await cargarPosts(); 
            const postActualizado = postsCargados.find(p => p.id === currentPostIdVisor);
            actualizarVistaModal(postActualizado); 
        }
    } catch(e) { console.error("Error al comentar", e); }
});

window.borrarComentario = (postId, indexComentario) => {
    AgoraModals.confirm("Borrar comentario", "¿Seguro que deseas borrar este comentario? Esta acción no se puede deshacer.", "Borrar", async () => {
        try {
            const res = await fetch('/borrar-comentario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, indexComentario })
            });
            if(res.ok) {
                await cargarPosts();
                actualizarVistaModal(postsCargados.find(p => p.id === postId));
            }
        } catch(e) {}
    });
};

window.editarComentario = (postId, indexComentario, textoViejo) => {
    AgoraModals.prompt("Edita tu comentario:", textoViejo, async (nuevoTexto) => {
        if(!nuevoTexto || nuevoTexto === textoViejo) return;
        try {
            const res = await fetch('/editar-comentario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, indexComentario, nuevoTexto })
            });
            if(res.ok) {
                await cargarPosts();
                actualizarVistaModal(postsCargados.find(p => p.id === postId));
            }
        } catch(e) {}
    });
};


// ==========================================================================
// 6. MODAL PARA EDITAR PUBLICACIÓN 
// ==========================================================================
const modalEditar = document.getElementById('modal-editar');
const editPostId = document.getElementById('edit-post-id');
const editPostTitle = document.getElementById('edit-post-title');
const editPostPrice = document.getElementById('edit-post-price');
const editPostStatus = document.getElementById('edit-post-status');
const editPostContent = document.getElementById('edit-post-content');

const editPostCategoria = document.getElementById('edit-post-categoria');
const editPostEstadoLocalidad = document.getElementById('edit-post-estado');
const editPostMunicipio = document.getElementById('edit-post-municipio');
const editPostCondicion = document.getElementById('edit-post-condicion');

const editPostImagesInput = document.getElementById('edit-post-images');
const previewExistentes = document.getElementById('edit-preview-existentes');
const previewNuevas = document.getElementById('edit-preview-nuevas');

let imagenesQueSeQuedan = [];
let nuevasImagenesEditar = [];

if (editPostEstadoLocalidad && typeof datosUbicacion !== 'undefined') {
    editPostEstadoLocalidad.innerHTML = '<option value="">Selecciona un Estado...</option>';
    Object.keys(datosUbicacion).forEach(estado => {
        const option = document.createElement('option');
        option.value = estado;
        option.textContent = estado;
        editPostEstadoLocalidad.appendChild(option);
    });
}

if (editPostEstadoLocalidad && editPostMunicipio) {
    editPostEstadoLocalidad.addEventListener('change', (e) => {
        const estado = e.target.value;
        editPostMunicipio.innerHTML = '<option value="">Selecciona un Municipio...</option>';
        editPostMunicipio.disabled = !estado; 

        if (estado && typeof datosUbicacion !== 'undefined' && datosUbicacion[estado]) {
            datosUbicacion[estado].forEach(mun => {
                const option = document.createElement('option');
                option.value = mun;
                option.textContent = mun;
                editPostMunicipio.appendChild(option);
            });
        }
    });
}

function limpiarErroresModal() {
    const inputs = modalEditar.querySelectorAll('input, select, textarea');
    inputs.forEach(input => input.classList.remove('input-error'));
    const errors = modalEditar.querySelectorAll('.error-text');
    errors.forEach(error => error.style.display = 'none');
}

window.prepararEdicion = (postId) => {
    limpiarErroresModal();

    const post = postsCargados.find(p => p.id === postId);
    if(!post) return;

    editPostId.value = post.id;
    editPostTitle.value = post.titulo || "";
    editPostPrice.value = post.precio || "";
    editPostStatus.value = post.estado_venta || "disponible";
    editPostContent.value = post.texto || "";

    if(editPostCategoria) editPostCategoria.value = post.categoria || "";
    if(editPostCondicion) editPostCondicion.value = post.condicion || "";
    
    if(editPostEstadoLocalidad && post.estado) {
        editPostEstadoLocalidad.value = post.estado;
        const eventoChange = new Event('change');
        editPostEstadoLocalidad.dispatchEvent(eventoChange);
        
        if(editPostMunicipio && post.municipio) {
            setTimeout(() => {
                editPostMunicipio.value = post.municipio;
            }, 50);
        }
    }

    imagenesQueSeQuedan = [...(post.imagenes || [])];
    nuevasImagenesEditar = [];
    if(editPostImagesInput) editPostImagesInput.value = "";
    
    renderizarImagenesExistentes();
    renderizarImagenesNuevas();

    modalEditar.classList.add('show');
};

function renderizarImagenesExistentes() {
    if(!previewExistentes) return;
    previewExistentes.innerHTML = "";
    imagenesQueSeQuedan.forEach((url, index) => {
        const div = document.createElement('div');
        div.style.cssText = "position: relative; width: 65px; height: 65px;";
        div.innerHTML = `
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">
            <button type="button" onclick="eliminarImagenExistente(${index})" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">×</button>
        `;
        previewExistentes.appendChild(div);
    });
}

window.eliminarImagenExistente = (index) => {
    imagenesQueSeQuedan.splice(index, 1);
    renderizarImagenesExistentes();
};

if(editPostImagesInput) {
    editPostImagesInput.addEventListener('change', (e) => {
        const archivos = Array.from(e.target.files);
        const maxPermitidas = 5 - imagenesQueSeQuedan.length;
        
        if (nuevasImagenesEditar.length + archivos.length > maxPermitidas) {
            mostrarAlertaAnimada('⚠️ Solo puedes tener un máximo de 5 imágenes combinadas.');
            editPostImagesInput.value = "";
            return;
        }
        
        archivos.forEach(file => nuevasImagenesEditar.push(file));
        renderizarImagenesNuevas();
        editPostImagesInput.value = ""; 
    });
}

function renderizarImagenesNuevas() {
    if(!previewNuevas) return;
    previewNuevas.innerHTML = "";
    nuevasImagenesEditar.forEach((file, index) => {
        const reader = new FileReader();
        const div = document.createElement('div');
        div.style.cssText = "position: relative; width: 65px; height: 65px;";
        previewNuevas.appendChild(div);

        reader.onload = (e) => {
            div.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 2px solid #10b981;">
                <button type="button" onclick="eliminarImagenNueva(${index})" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">×</button>
            `;
        };
        reader.readAsDataURL(file);
    });
}

window.eliminarImagenNueva = (index) => {
    nuevasImagenesEditar.splice(index, 1);
    renderizarImagenesNuevas();
};

document.getElementById('btn-cancelar-edicion')?.addEventListener('click', () => {
    modalEditar.classList.remove('show');
});

document.getElementById('btn-guardar-edicion')?.addEventListener('click', async () => {
    limpiarErroresModal();
    let esValido = true;

    const camposObligatorios = [
        { id: 'edit-post-title', errorId: 'err-title-edit' },
        { id: 'edit-post-content', errorId: 'err-content-edit' },
        { id: 'edit-post-categoria', errorId: 'err-categoria-edit' },
        { id: 'edit-post-condicion', errorId: 'err-condicion-edit' },
        { id: 'edit-post-estado', errorId: 'err-estado-edit' },
        { id: 'edit-post-municipio', errorId: 'err-municipio-edit' }
    ];

    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo.id);
        const errorSpan = document.getElementById(campo.errorId);
        if (input && (!input.value || input.value.trim() === "")) {
            input.classList.add('input-error');
            if (errorSpan) errorSpan.style.display = 'block';
            esValido = false;
        }
    });

    const precio = parseFloat(editPostPrice.value);
    const precioInput = document.getElementById('edit-post-price');
    
    if (!editPostPrice.value || editPostPrice.value.trim() === "") {
        if (precioInput) precioInput.classList.add('input-error');
        esValido = false;
    } else if (isNaN(precio) || precio <= 0) {
        mostrarAlertaAnimada("⚠️ ¡Ey! El precio debe ser un número mayor a 0.");
        if (precioInput) precioInput.classList.add('input-error');
        return; 
    }

    if (!esValido) {
        return; 
    }

    const formData = new FormData();
    formData.append('postId', editPostId.value);
    formData.append('titulo', editPostTitle.value.trim());
    formData.append('precio', editPostPrice.value);
    formData.append('estado_venta', editPostStatus.value);
    formData.append('texto', editPostContent.value.trim());
    
    formData.append('categoria', editPostCategoria.value);
    formData.append('condicion', editPostCondicion.value);
    formData.append('estado', editPostEstadoLocalidad.value);
    formData.append('municipio', editPostMunicipio.value);

    if (typeof obtenerNombreUsuario === 'function') formData.append('nombreUsuario', obtenerNombreUsuario());
    if (typeof obtenerRol === 'function') formData.append('role', obtenerRol());

    imagenesQueSeQuedan.forEach(url => formData.append('imagenesRestantes', url));
    nuevasImagenesEditar.forEach(file => formData.append('imagenes', file));

    try {
        const res = await fetch('/editar-post', { method: 'POST', body: formData });
        if(res.ok) {
            modalEditar.classList.remove('show');
            if (typeof cargarPosts === 'function') cargarPosts(); 
            mostrarAlertaAnimada("¡Publicación actualizada con éxito!");
        } else {
            mostrarAlertaAnimada("Error en el servidor al actualizar.");
        }
    } catch(e) {
        mostrarAlertaAnimada("No se pudo conectar con el servidor.");
    }
}); 
// ==========================================================================
    // 7. LÓGICA DE FILTRADO POR UBICACIÓN (MODAL Y BOTÓN)
    // ==========================================================================
    const btnUbicacion = document.getElementById('btnUbicacion');
    const modalUbicacion = document.getElementById('modalUbicacion');
    const btnCerrarModalUbi = document.getElementById('btnCerrarModalUbi');
    const btnGuardarUbicacion = document.getElementById('btnGuardarUbicacion');

    const inputEstadoModal = document.getElementById('inputEstado'); 
    const inputMunicipioModal = document.getElementById('inputMunicipio');
    const contenedorMunicipio = document.getElementById('contenedorMunicipio');

    const municipiosPorEstado = {
        "Aguascalientes": ["Aguascalientes", "Asientos", "Calvillo", "Jesús María", "Pabellón de Arteaga", "Rincón de Romos"],
        "Baja California": ["Ensenada", "Mexicali", "Tecate", "Tijuana", "Playas de Rosarito", "San Quintín"],
        "Baja California Sur": ["Comondú", "Mulegé", "La Paz", "Los Cabos", "Loreto"],
        "Campeche": ["Campeche", "Carmen", "Champotón", "Escárcega", "Calkiní"],
        "Chiapas": ["Tuxtla Gutiérrez", "San Cristóbal de las Casas", "Tapachula", "Palenque", "Comitán", "Chiapa de Corzo"],
        "Chihuahua": ["Chihuahua", "Ciudad Juárez", "Cuauhtémoc", "Delicias", "Hidalgo del Parral", "Nuevo Casas Grandes"],
        "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"],
        "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña", "Ramos Arizpe"],
        "Colima": ["Armería", "Colima", "Comala", "Coquimatlán", "Cuauhtémoc", "Ixtlahuacán", "Manzanillo", "Minatitlán", "Tecomán", "Villa de Álvarez"],
        "Durango": ["Durango", "Gómez Palacio", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro"],
        "Estado de México": ["Toluca", "Ecatepec", "Nezahualcóyotl", "Naucalpan", "Tlalnepantla", "Chimalhuacán", "Cuautitlán Izcalli", "Atizapán", "Metepec", "Chalco", "Valle de Chalco", "Ixtapaluca"],
        "Guanajuato": ["León", "Irapuato", "Celaya", "Salamanca", "Guanajuato", "Silao", "San Miguel de Allende"],
        "Guerrero": ["Acapulco", "Chilpancingo", "Iguala", "Taxco", "Zihuatanejo", "Tlapa"],
        "Hidalgo": ["Pachuca", "Tulancingo", "Tula de Allende", "Mineral de la Reforma", "Ixmiquilpan", "Tizayuca"],
        "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Puerto Vallarta", "Tlajomulco de Zúñiga", "Lagos de Moreno", "Tepatitlán"],
        "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas", "Zitácuaro", "Apatzingán", "Pátzcuaro"],
        "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco", "Yautepec", "Jojutla"],
        "Nayarit": ["Tepic", "Bahía de Banderas", "Santiago Ixcuintla", "Compostela", "San Blas", "Xalisco"],
        "Nuevo León": ["Monterrey", "Guadalupe", "Apodaca", "San Nicolás de los Garza", "General Escobedo", "Santa Catarina", "San Pedro Garza García", "García"],
        "Oaxaca": ["Oaxaca de Juárez", "San Juan Bautista Tuxtepec", "Salina Cruz", "Juchitán", "Santa Cruz Xoxocotlán", "Huajuapan"],
        "Puebla": ["Puebla", "Tehuacán", "San Martín Texmelucan", "Atlixco", "Cholula", "Amozoc"],
        "Querétaro": ["Querétaro", "San Juan del Río", "Corregidora", "El Marqués", "Tequisquiapan", "Huimilpan"],
        "Quintana Roo": ["Cancún (Benito Juárez)", "Playa del Carmen (Solidaridad)", "Chetumal (Othón P. Blanco)", "Cozumel", "Tulum", "Isla Mujeres"],
        "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles", "Matehuala", "Rioverde"],
        "Sinaloa": ["Culiacán", "Mazatlán", "Ahome", "Guasave", "Navolato", "Salvador Alvarado"],
        "Sonora": ["Hermosillo", "Ciudad Obregón (Cajeme)", "Nogales", "San Luis Río Colorado", "Navojoa", "Guaymas", "Agua Prieta"],
        "Tabasco": ["Villahermosa (Centro)", "Cárdenas", "Comalcalco", "Macuspana", "Huimanguillo", "Cunduacán"],
        "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Tampico", "Ciudad Victoria", "Ciudad Madero", "Altamira"],
        "Tlaxcala": ["Tlaxcala", "Apizaco", "Huamantla", "Chiautempan", "Zacatelco", "San Pablo del Monte"],
        "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica", "Orizaba", "Boca del Río", "Minatitlán"],
        "Yucatán": ["Mérida", "Kanasín", "Valladolid", "Tizimín", "Progreso", "Umán"],
        "Zacatecas": ["Zacatecas", "Guadalupe", "Fresnillo", "Jerez", "Río Grande", "Sombrerete"]
    };

    if (btnUbicacion && modalUbicacion) {
        btnUbicacion.addEventListener('click', () => {
            modalUbicacion.style.display = 'flex'; 
        });
    }

    if (btnCerrarModalUbi && modalUbicacion) {
        btnCerrarModalUbi.addEventListener('click', () => {
            modalUbicacion.style.display = 'none';
        });
    }

    if (inputEstadoModal && inputMunicipioModal && contenedorMunicipio) {
        inputEstadoModal.addEventListener('change', () => {
            const estadoSeleccionado = inputEstadoModal.value;

            inputMunicipioModal.innerHTML = '<option value="">-- Todos los municipios --</option>';

            if (estadoSeleccionado === "") {
                contenedorMunicipio.style.display = 'none';
            } else {
                contenedorMunicipio.style.display = 'block';

                const listaMunicipios = municipiosPorEstado[estadoSeleccionado] || [];
                listaMunicipios.forEach(mun => {
                    inputMunicipioModal.innerHTML += `<option value="${mun}">${mun}</option>`;
                });
            }
        });
    }

    if (btnGuardarUbicacion && inputEstadoModal && modalUbicacion) {
        btnGuardarUbicacion.addEventListener('click', () => {
            const estadoSeleccionado = inputEstadoModal.value;
            const municipioSeleccionado = inputMunicipioModal ? inputMunicipioModal.value : "";

            if (estadoSeleccionado === "") {
                window.estadoFiltroActual = ""; 
                window.municipioFiltroActual = ""; 
                btnUbicacion.innerHTML = "📍 Seleccionar Ubicación"; 
            } else {
                window.estadoFiltroActual = estadoSeleccionado; 
                window.municipioFiltroActual = municipioSeleccionado; 
                
                if (municipioSeleccionado === "") {
                    btnUbicacion.innerHTML = `📍 ${estadoSeleccionado} (Todos)`; 
                } else {
                    btnUbicacion.innerHTML = `📍 ${municipioSeleccionado}, ${estadoSeleccionado}`; 
                }
            }

            renderizarPostsEnMuro(); 

            modalUbicacion.style.display = 'none';
        });
    }
    cargarPosts();

// ==========================================
// AVISO ESTILO CAPTURA DE PANTALLA COMPLETADO
// ==========================================
function mostrarAlertaCerrarSesion() {
    let modalLogout = document.getElementById('modal-logout-confirm');

    if (!modalLogout) {
        modalLogout = document.createElement('div');
        modalLogout.id = 'modal-logout-confirm';
        modalLogout.className = 'alerta-overlay'; 
        
        modalLogout.classList.add('activo');
        modalLogout.style.display = 'flex'; 

        modalLogout.innerHTML = `
            <div class="alerta-box" style="text-align: center; padding: 25px; border-radius: 15px;">
                <div class="alerta-icono" style="font-size: 3rem; margin-bottom: 15px;">🚪</div>
                <p style="margin-bottom: 25px; font-size: 1.1rem; color: #334155;">¿Estás seguro de que deseas cerrar tu sesión?</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="btn-cancelar-logout" style="background: #cbd5e1; color: #334155; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s;">Cancelar</button>
                    <button id="btn-confirmar-logout" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s;">Cerrar Sesión</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalLogout);

        document.getElementById('btn-cancelar-logout').addEventListener('click', () => {
            modalLogout.classList.remove('activo');
            setTimeout(() => modalLogout.remove(), 300);
        });

        document.getElementById('btn-confirmar-logout').addEventListener('click', () => {
            localStorage.removeItem('nombreUsuario');
            localStorage.removeItem('userRole');
            window.location.href = '/index.html';
        });
    }
}
// =========================================
//   FILTRO Y BARRA DE BÚSQUEDA (EMA / MEJORADO)
// =========================================

const buscador = document.getElementById('inputBuscador');
const sugerenciasDiv = document.getElementById('listaSugerencias');
const contenedorPosts = document.getElementById('contenedor-publicaciones') || document.getElementById('posts'); 

function confirmarBusqueda() {
    const texto = buscador.value.toLowerCase().trim();
    const publicaciones = document.querySelectorAll('.post'); 
    let resultadosEncontrados = 0;

    if(contenedorPosts) contenedorPosts.style.opacity = '0.3';

    setTimeout(() => {
        publicaciones.forEach(post => {
            const contenido = post.innerText.toLowerCase();
            
            if (contenido.includes(texto) || texto === "") {
                post.style.display = '';
                resultadosEncontrados++;
            } else {
                post.style.display = 'none';
            }
        });
        let msjVacio = document.getElementById('mensaje-sin-resultados');
        if (!msjVacio) {
            msjVacio = document.createElement('div');
            msjVacio.id = 'mensaje-sin-resultados';
            msjVacio.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; color: #666; width: 100%;">
                    <span style="font-size: 4rem; display: block; margin-bottom: 10px;">🕵️‍♂️</span>
                    <h3 style="margin: 0; color: #613DB7; font-size: 1.5rem;">¡Ups! No encontramos coincidencias</h3>
                    <p style="margin-top: 10px; font-size: 1rem;">No hay productos ni usuarios que coincidan con "<strong>${texto}</strong>".<br>Intenta buscar con otras palabras.</p>
                </div>
            `;
            msjVacio.style.display = 'none';

            if(contenedorPosts) contenedorPosts.appendChild(msjVacio);
        }

        const strongText = msjVacio.querySelector('strong');
        if (strongText) strongText.innerText = texto;

        if (resultadosEncontrados === 0 && texto !== "") {
            msjVacio.style.display = 'block';
        } else {
            msjVacio.style.display = 'none';
        }

        sugerenciasDiv.style.display = 'none'; 
        buscador.blur();                       
        if(contenedorPosts) contenedorPosts.style.opacity = '1';  
    }, 150);
}

buscador.addEventListener('input', () => {
    const texto = buscador.value.toLowerCase().trim();
    const publicaciones = document.querySelectorAll('.post');
    sugerenciasDiv.innerHTML = ""; 

    if (texto.length >= 1) { 
        let encontradas = new Set();
        publicaciones.forEach(post => {
            const contenido = post.innerText.toLowerCase();
            const palabras = contenido.split(/\s+/); 

            palabras.forEach(palabra => {
                const palabraLimpia = palabra.replace(/[.,:;()]/g, '');
                
                if (palabraLimpia.startsWith(texto) && palabraLimpia.length > 0) {
                    encontradas.add(palabraLimpia);
                }
            });
        });

        if (encontradas.size > 0) {
            sugerenciasDiv.style.display = 'block';
            encontradas.forEach(palabra => {
                const item = document.createElement('div');
                item.className = 'sugerencia-item';
                item.innerHTML = `<span>🔍</span> ${palabra}`;
                
                item.onclick = () => {
                    buscador.value = palabra; 
                    confirmarBusqueda();      
                };
                sugerenciasDiv.appendChild(item);
            });
        } else {
            sugerenciasDiv.style.display = 'none';
        }
    } else {
        sugerenciasDiv.style.display = 'none';
        confirmarBusqueda(); 
    }
});

buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        confirmarBusqueda();
    }
});
// =========================================
//   MODAL DE CREAR PUBLICACIÓN
// =========================================

const btnAbrirModalPub = document.getElementById('btnAbrirModalPublicar');
const modalPublicacion = document.getElementById('modalPublicacion');
const btnCerrarModalPub = document.getElementById('btnCerrarModalPublicar');

if (btnAbrirModalPub) {
    btnAbrirModalPub.addEventListener('click', () => {
        modalPublicacion.style.display = 'flex'; 
    });
}
if (btnCerrarModalPub) {
    btnCerrarModalPub.addEventListener('click', () => {
        modalPublicacion.style.display = 'none';
    });
}
window.addEventListener('click', (e) => {
    if (e.target === modalPublicacion) {
        modalPublicacion.style.display = 'none';
    }
});