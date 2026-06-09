// =========================================
//   LÓGICA DEL PERFIL DINÁMICO
// =========================================

const urlParams = new URLSearchParams(window.location.search);
const nombrePerfil = urlParams.get('usuario') || urlParams.get('user') || localStorage.getItem('nombreUsuario');
const usuarioLogueado = localStorage.getItem('nombreUsuario');

const localidadesMexico = {
    "Aguascalientes": ["Aguascalientes", "Asientos", "Calvillo", "Cosío", "Jesús María", "Pabellón de Arteaga", "Rincón de Romos", "San José de Gracia", "Tepezalá", "El Llano", "San Francisco de los Romo"],
    "Baja California": ["Ensenada", "Mexicali", "Playas de Rosarito", "Tecate", "Tijuana", "San Quintín"],
    "Baja California Sur": ["Comondú", "Mulegé", "La Paz", "Los Cabos", "Loreto"],
    "Campeche": ["Campeche", "Calkiní", "Carmen", "Champotón", "Hecelchakán", "Hopelchén", "Palizada", "Tenabo", "Escárcega", "Calakmul", "Candelaria"],
    "Chiapas": ["Tuxtla Gutiérrez", "Tapachula", "San Cristóbal de las Casas", "Comitán de Domínguez", "Chiapa de Corzo", "Palenque"],
    "Chihuahua": ["Chihuahua", "Juárez", "Cuauhtémoc", "Delicias", "Hidalgo del Parral", "Nuevo Casas Grandes", "Camargo"],
    "Ciudad de México": ["Álvaro Obregón", "Azcapotzalco", "Benito Juárez", "Coyoacán", "Cuajimalpa de Morelos", "Cuauhtémoc", "Gustavo A. Madero", "Iztacalco", "Iztapalapa", "Magdalena Contreras", "Miguel Hidalgo", "Milpa Alta", "Tláhuac", "Tlalpan", "Venustiano Carranza", "Xochimilco"],
    "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras", "Acuña", "Matamoros", "San Pedro"],
    "Colima": ["Colima", "Manzanillo", "Tecomán", "Villa de Álvarez", "Armería", "Comala", "Coquimatlán", "Cuauhtémoc", "Ixtlahuacán", "Minatitlán"],
    "Durango": ["Durango", "Gómez Palacio", "Lerdo", "Pueblo Nuevo", "Santiago Papasquiaro"],
    "Estado de México": ["Toluca", "Ecatepec", "Nezahualcóyotl", "Naucalpan", "Tlalnepantla", "Chimalhuacán", "Cuautitlán Izcalli", "Huixquilucan", "Metepec"],
    "Guanajuato": ["León", "Irapuato", "Celaya", "Salamanca", "Guanajuato", "Silao", "San Miguel de Allende"],
    "Guerrero": ["Acapulco de Juárez", "Chilpancingo de los Bravo", "Iguala de la Independencia", "Zihuatanejo de Azueta", "Taxco de Alarcón"],
    "Hidalgo": ["Pachuca de Soto", "Tulancingo de Bravo", "Tula de Allende", "Mineral de la Reforma", "Huejutla de Reyes"],
    "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá", "Puerto Vallarta", "Tlajomulco de Zúñiga", "Lagos de Moreno", "Tepatitlán"],
    "Michoacán": ["Morelia", "Uruapan", "Lázaro Cárdenas", "Zamora", "Apatzingán", "Pátzcuaro", "Zitácuaro", "La Piedad"],
    "Morelos": ["Cuernavaca", "Jiutepec", "Cuautla", "Temixco", "Yautepec"],
    "Nayarit": ["Tepic", "Bahía de Banderas", "Compostela", "Santiago Ixcuintla", "Xalisco"],
    "Nuevo León": ["Monterrey", "Guadalupe", "Apodaca", "San Nicolás de los Garza", "General Escobedo", "Santa Catarina", "San Pedro Garza García"],
    "Oaxaca": ["Oaxaca de Juárez", "San Juan Bautista Tuxtepec", "Salina Cruz", "Juchitán de Zaragoza", "Santa Cruz Xoxocotlán"],
    "Puebla": ["Puebla", "Tehuacán", "San Martín Texmelucan", "Cholula de Rivadavia", "Atlixco"],
    "Querétaro": ["Querétaro", "San Juan del Río", "El Marqués", "Corregidora"],
    "Quintana Roo": ["Cancún (Benito Juárez)", "Cozumel", "Isla Mujeres", "Chetumal (Othón P. Blanco)", "Playa del Carmen (Solidaridad)", "Tulum"],
    "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles", "Matehuala", "Río Verde"],
    "Sinaloa": ["Culiacán", "Mazatlán", "Ahome", "Guasave", "Navolato", "Salvador Alvarado"],
    "Sonora": ["Hermosillo", "Ciudad Obregón (Cajeme)", "Nogales", "San Luis Río Colorado", "Navojoa", "Guaymas"],
    "Tabasco": ["Villahermosa (Centro)", "Cárdenas", "Comalcalco", "Huimanguillo", "Macuspana"],
    "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Ciudad Victoria", "Tampico", "Ciudad Madero", "Altamira"],
    "Tlaxcala": ["Tlaxcala", "Huamantla", "Apizaco", "Chiautempan"],
    "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Poza Rica de Hidalgo", "Orizaba", "Minatitlán", "Boca del Río"],
    "Yucatán": ["Mérida", "Kanasín", "Valladolid", "Tizimín", "Progreso"],
    "Zacatecas": ["Zacatecas", "Fresnillo", "Guadalupe", "Jerez", "Rio Grande"]
};

let imagenVisualPreview = null; 
let archivoFotoFisico = null; 

document.addEventListener('DOMContentLoaded', () => {
    if (!nombrePerfil) {
        alert("No se pudo identificar el perfil.");
        window.location.href = "publicaciones.html"; 
        return;
    }

    cargarDatosPerfil();
    configurarEventosEdicion();
    cargarPublicacionesUsuario();
});

// --- 1. CARGAR DATOS DEL USUARIO ---
async function cargarDatosPerfil() {
    try {
        const response = await fetch(`/api/perfil/${nombrePerfil}`);
        if (!response.ok) throw new Error("Usuario no encontrado");
        
        const usuario = await response.json();

        document.getElementById('vista-nombre').innerText = usuario.nombre;
        document.getElementById('vista-bio').innerText = usuario.bio;
        document.getElementById('avatar-img').src = usuario.foto_perfil || '/icons/AgoralCON.jpeg';
        document.getElementById('vista-ubicacion').innerText = `${usuario.estado || 'Estado'}, ${usuario.municipio || 'Municipio'}`;

        document.getElementById('edit-nombre').value = usuario.nombre;
        document.getElementById('edit-bio').value = usuario.bio;
        
        const selectEstado = document.getElementById('select-estado');
        if(usuario.estado && usuario.estado !== "No especificado") {
            selectEstado.value = usuario.estado; 
            actualizarMunicipios(); 
            document.getElementById('select-municipio').value = usuario.municipio;
        }

        const esMiPerfil = (usuarioLogueado === nombrePerfil);
        const btnEditar = document.getElementById('btn-editar-perfil');
        const btnChatear = document.getElementById('btn-chatear');

        if (esMiPerfil) {
            btnEditar.style.display = "inline-block";
            btnChatear.style.display = "none";
        } else {
            btnEditar.style.display = "none";
            btnChatear.style.display = "inline-block";

            // ¡NUEVO CÓDIGO DEL BOTÓN DE CHAT! 🚀
            btnChatear.onclick = () => {
                // Redirige a chat.html pasándole el nombre del usuario por la URL
                window.location.href = `chat.html?usuario=${encodeURIComponent(nombrePerfil)}`;
            };
        }

    } catch (error) {
        console.error("Error al cargar perfil:", error);
    }
}

// --- 2. CONFIGURAR EVENTOS DE EDICIÓN Y FOTO ---
function configurarEventosEdicion() {
    const btnEditar = document.getElementById('btn-editar-perfil');
    const btnGuardar = document.getElementById('btn-guardar-cambios');
    const btnLapicito = document.getElementById('btn-lapicito');
    const fotoInput = document.getElementById('foto-input');
    const avatarImg = document.getElementById('avatar-img');
    const selectEstado = document.getElementById('select-estado');
    
    if (selectEstado) {
        selectEstado.addEventListener('change', actualizarMunicipios);
    }

    const vistaNombre = document.getElementById('vista-nombre');
    const vistaBio = document.getElementById('vista-bio');
    const vistaUbi = document.getElementById('vista-ubicacion');

    const editNombre = document.getElementById('edit-nombre');
    const editBio = document.getElementById('edit-bio');
    const editUbi = document.getElementById('edit-ubicacion');

    btnEditar.addEventListener('click', () => {
        vistaNombre.style.display = 'none';
        vistaBio.style.display = 'none';
        vistaUbi.style.display = 'none';
        btnEditar.style.display = 'none';

        editNombre.style.display = 'block';
        editBio.style.display = 'block';

        editUbi.style.display = 'flex';
        
        btnGuardar.innerText = "💾 Guardar Cambios"; 
        btnGuardar.style.display = 'inline-block';
        btnLapicito.style.display = 'block';

        btnGuardar.onclick = guardarCambiosPerfil; 
    });

    if (fotoInput) {
        fotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            archivoFotoFisico = file; 

            const reader = new FileReader();
            reader.onload = function(evento) {
                imagenVisualPreview = evento.target.result; 

                avatarImg.classList.add('imagen-fade-out');
                setTimeout(() => {
                    avatarImg.src = imagenVisualPreview;
                    avatarImg.classList.remove('imagen-fade-out');
                }, 300); 
            }
            reader.readAsDataURL(file);
        });
    }
}

// --- 3. GUARDAR TODOS LOS CAMBIOS AL SERVIDOR ---
async function guardarCambiosPerfil() {
    const nuevoNombre = document.getElementById('edit-nombre').value.trim();
    const nuevaBio = document.getElementById('edit-bio').value;
    const nuevoEstado = document.getElementById('select-estado').value;
    const nuevoMunicipio = document.getElementById('select-municipio').value || "Por definir";

    if (nuevoNombre === "") {
        if (typeof AgoraModals !== 'undefined') {
            AgoraModals.confirm("⚠️ Atención", "INGRESA UN NOMBRE VÁLIDO", "Entendido", () => {}); 
        } else {
            alert("INGRESA UN NOMBRE VÁLIDO");
        }
        return;
    }

    try {
        const responseTexto = await fetch('/api/actualizar-perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombrePerfil, 
                nuevoNombre: nuevoNombre, 
                bio: nuevaBio,
                estado: nuevoEstado,
                municipio: nuevoMunicipio
            })
        });

        if (!responseTexto.ok) {
            const errorData = await responseTexto.text(); 
            throw new Error(`Error en textos: ${errorData}`);
        }
        if (archivoFotoFisico) {
            const formData = new FormData();
            formData.append('fotoPerfil', archivoFotoFisico);
            formData.append('nombreUsuario', nombrePerfil); 

            const responseFoto = await fetch('/api/actualizar-foto-perfil', {
                method: 'POST',
                body: formData 
            });

            if (!responseFoto.ok) {
                const errorServer = await responseFoto.json();
                throw new Error(errorServer.message || "Error al subir la imagen");
            }
            
            const dataFoto = await responseFoto.json();

            document.getElementById('avatar-img').src = dataFoto.nuevaRuta;
            archivoFotoFisico = null; 
        }

        document.getElementById('vista-nombre').innerText = nuevoNombre;
        document.getElementById('vista-bio').innerText = nuevaBio;
        document.getElementById('vista-ubicacion').innerText = `${nuevoEstado}, ${nuevoMunicipio}`;

        document.getElementById('edit-nombre').style.display = 'none';
        document.getElementById('edit-bio').style.display = 'none';
        document.getElementById('edit-ubicacion').style.display = 'none';
        document.getElementById('btn-guardar-cambios').style.display = 'none';
        document.getElementById('btn-lapicito').style.display = 'none';

        document.getElementById('vista-nombre').style.display = 'block';
        document.getElementById('vista-bio').style.display = 'block';
        document.getElementById('vista-ubicacion').style.display = 'inline-block';
        document.getElementById('btn-editar-perfil').style.display = 'inline-block';

        if (nuevoNombre !== nombrePerfil) {
            localStorage.setItem('nombreUsuario', nuevoNombre);
            window.location.href = `/perfil.html?usuario=${encodeURIComponent(nuevoNombre)}`;
            return; 
        }

    } catch (error) {
        console.error("Detalle del error:", error);
        alert("Hubo un error al guardar los cambios. Revisa la consola para más detalles.");
    }
}

// Variable global para controlar qué imagen se está viendo en el perfil
let indexVisorPerfil = 0;
let imagenesActualesPerfil = [];

// --- 4. CARGAR LAS PUBLICACIONES DEL USUARIO Y MANEJO DE MODAL ---
async function cargarPublicacionesUsuario() {
    try {
        const response = await fetch(`/api/publicaciones/usuario/${nombrePerfil}`);
        const posts = await response.json();
        
        const contenedor = document.getElementById('contenedor-publicaciones-perfil');
        contenedor.innerHTML = ""; 

        if (posts.length === 0) {
            contenedor.innerHTML = `<p style="text-align:center; color:gray; grid-column: 1 / -1; padding: 2rem;">${nombrePerfil} aún no tiene publicaciones.</p>`;
            return;
        }

        posts.forEach(post => {
            const imagenPrincipal = (post.imagenes && post.imagenes.length > 0) 
                ? post.imagenes[0] 
                : 'https://via.placeholder.com/400x300/e2e8f0/64748b?text=Sin+Imagen';

            // --- CORRECCIÓN DE TARJETAS (TITULO, PRECIO, DESCRIPCIÓN) ---
            const titulo = post.titulo || 'Sin título';
            const precio = post.precio ? `$${post.precio}` : '';
            // Cortamos la descripción a 40 caracteres
            const descCorta = post.texto ? (post.texto.substring(0, 40) + (post.texto.length > 40 ? '...' : '')) : 'Sin descripción';

            const card = document.createElement('div');
            // Estructura de la tarjeta ajustada a lo que pediste
            card.innerHTML = `
                <img src="${imagenPrincipal}" alt="Publicación" style="width: 100%; object-fit: cover; border-radius: 8px 8px 0 0;">
                <div style="padding: 10px; text-align: center;">
                    <h3 style="font-size: 1.1rem; font-weight: bold; margin: 5px 0; color: #1e293b;">${titulo}</h3>
                    <p style="font-size: 1.2rem; font-weight: bold; color: #10b981; margin: 0 0 10px 0;">${precio}</p>
                    <p style="font-size: 0.9rem; color: #64748b; margin: 0 0 15px 0;">${descCorta}</p>
                </div>
                <button class="btn-detalles" style="width: 90%; margin: 0 auto 10px auto; display: block;">Ver publicación</button>
            `;

            // EVENTO CLICK DEL BOTÓN
            const btnVerPublicacion = card.querySelector('.btn-detalles');
            btnVerPublicacion.onclick = () => {
                abrirModalPublicacionPerfil(post);
            };

            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar posts:", error);
    }
}

// FUNCIÓN PARA ABRIR LA MODAL EN EL PERFIL
function abrirModalPublicacionPerfil(post) {
    const modal = document.getElementById('modal-publicacion-perfil');
    const imgModal = document.getElementById('perfil-modal-img');
    
    if (!modal) return;

    // Configurar imágenes del visor
    imagenesActualesPerfil = post.imagenes || [];
    indexVisorPerfil = 0;

    if (imagenesActualesPerfil.length > 0) {
        imgModal.src = imagenesActualesPerfil[indexVisorPerfil];
    } else {
        imgModal.src = 'https://via.placeholder.com/400x300/e2e8f0/64748b?text=Sin+Imagen';
    }

    // Configurar flechas si hay más de una imagen
    const btnPrev = document.getElementById('btn-prev-perfil');
    const btnNext = document.getElementById('btn-next-perfil');
    if (imagenesActualesPerfil.length > 1) {
        btnPrev.style.display = 'block';
        btnNext.style.display = 'block';
        
        btnPrev.onclick = () => cambarImagenPerfil(-1);
        btnNext.onclick = () => cambarImagenPerfil(1);
    } else {
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
    }

    // Renderizar la información del post y comentarios en el sidebar de perfil
    renderizarSidebarPerfil(post);

    // Mostrar la modal en pantalla
    modal.style.display = 'flex';
}

// FUNCIÓN PARA RENDERIZAR LA INFORMACIÓN INTERNA (IGUAL QUE EN TU MURO)
function renderizarSidebarPerfil(post) {
    const sidebarDiv = document.getElementById('perfil-sidebar-comments');
    if (!sidebarDiv) return;

    sidebarDiv.innerHTML = '';

    // --- 1. ENCABEZADO DE COMENTARIOS ---
    const navyHeaderHtml = `
        <div style="background-color: #001a4d; color: white; padding: 12px 16px; width: 100%; box-sizing: border-box; text-align: left !important; display: flex; align-items: center; justify-content: flex-start;">
            <h4 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: white; font-family: sans-serif;">Comentarios</h4>
        </div>
    `;
    sidebarDiv.innerHTML += navyHeaderHtml;

    // --- 2. INFO PUBLICACIÓN ---
    const tiempoPost = obtenerTiempoTranscurrido(post.fecha_publicacion);
    
    // --- CORRECCIÓN DE UNDEFINED (AUTOR) ---
    // Si post.autor no existe, intentará post.usuario, y si no, usa el nombre del perfil actual
    const nombreAutor = post.autor || post.usuario || nombrePerfil;

    let htmlInfoPost = `
        <div style="background-color: #e6f7ff; border: 1px solid #b3e0ff; padding: 16px; width: 100%; box-sizing: border-box; border-top: none; margin-bottom: 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; border: 1px solid #e2e8f0;">👤</div>
                <div style="display: flex; flex-direction: column; line-height: 1.3;">
                    <span style="font-weight: 700; color: #0f172a; font-size: 0.95rem; font-family: sans-serif;">${nombreAutor}</span>
                    <span style="color: #64748b; font-size: 0.8rem;">· ${tiempoPost}</span>
                </div>
            </div>
            <div style="color: #334155; font-family: sans-serif; text-align: left;">
                ${post.precio ? `<div style="font-size: 1.25rem; color: #10b981; font-weight: 900; margin-bottom: 4px;">$${post.precio}</div>` : ''}
                ${post.titulo ? `<div style="margin: 0 0 6px 0; color: #0f172a; font-size: 1.05rem; font-weight: 700;">${post.titulo}</div>` : ''}
                <div style="margin: 0; color: #475569; line-height: 1.5; font-size: 0.95rem; white-space: pre-wrap;">${post.texto}</div>
            </div>
        </div>
    `;
    sidebarDiv.innerHTML += htmlInfoPost;

    // --- 3. COMENTARIOS ---
    const contenedorInternoComentarios = document.createElement('div');
    contenedorInternoComentarios.style.cssText = "width: 100%; box-sizing: border-box; padding: 16px; display: block;";
    sidebarDiv.appendChild(contenedorInternoComentarios);

    const comentarios = post.comentarios || [];
    
    if (comentarios.length === 0) {
        contenedorInternoComentarios.innerHTML = '<p style="color: #94a3b8; font-size: 0.9rem; margin: 0; font-family: sans-serif;">Sin comentarios aún. ¡Sé el primero!</p>';
    } else {
        comentarios.forEach((c, index) => {
            const esMio = c.autor === (localStorage.getItem('nombreUsuario'));
            const tiempoComentario = obtenerTiempoTranscurrido(c.fecha); 
            
            let htmlAcciones = '';
            if (esMio) {
                // El mismo menú flotante a la derecha con float: right
                htmlAcciones = `
                    <div style="position: relative; float: right;">
                        <button onclick="toggleMenuComentarioPerfil(${index})" style="background: transparent; border: none; cursor: pointer; color: #64748b; font-size: 1.3rem; padding: 0 4px; font-weight: bold; outline: none;">⋮</button>
                        
                        <div id="menu-comentario-perfil-${index}" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10; width: 110px; margin-top: 2px;">
                            <button onclick="alert('Funcionalidad de editar comentario')" style="width: 100%; text-align: left; background: none; border: none; padding: 8px 12px; cursor: pointer; color: #334155; font-size: 0.85rem; border-bottom: 1px solid #f1f5f9;">✏️ Editar</button>
                            <button onclick="alert('Funcionalidad de borrar comentario')" style="width: 100%; text-align: left; background: none; border: none; padding: 8px 12px; cursor: pointer; color: #ef4444; font-size: 0.85rem;">🗑️ Borrar</button>
                        </div>
                    </div>
                `;
            }

            contenedorInternoComentarios.innerHTML += `
                <div style="margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; font-family: sans-serif; clear: both;">
                    <div style="margin-bottom: 4px;">
                        ${htmlAcciones}
                        <span style="font-weight: 700; color: #0f172a; font-size: 0.9rem; margin-right: 6px;">${c.autor}</span> 
                        <span style="color: #94a3b8; font-size: 0.75rem;">· ${tiempoComentario}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem; color: #334155; line-height: 1.4; word-break: break-word;">${c.texto}</p>
                </div>
            `;
        });
    }
}

// UTILERÍAS EXCLUSIVAS DE LA MODAL DEL PERFIL
function cerrarModalPerfil() {
    document.getElementById('modal-publicacion-perfil').style.display = 'none';
}

function cambarImagenPerfil(direccion) {
    indexVisorPerfil += direccion;
    if (indexVisorPerfil < 0) indexVisorPerfil = imagenesActualesPerfil.length - 1;
    if (indexVisorPerfil >= imagenesActualesPerfil.length) indexVisorPerfil = 0;
    document.getElementById('perfil-modal-img').src = imagenesActualesPerfil[indexVisorPerfil];
}

function toggleMenuComentarioPerfil(index) {
    const menu = document.getElementById(`menu-comentario-perfil-${index}`);
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// Función auxiliar de tiempo por si no está compartida globalmente
function obtenerTiempoTranscurrido(fechaStr) {
    if (!fechaStr) return "Hace un momento";
    const ahora = new Date();
    const pasada = new Date(fechaStr);
    const difMs = ahora - pasada;
    const difMin = Math.floor(difMs / 60000);
    if (difMin < 1) return "Ahora mismo";
    if (difMin < 60) return `Hace ${difMin} min`;
    const difHoras = Math.floor(difMin / 60);
    if (difHoras < 24) return `Hace ${difHoras} h`;
    const difDias = Math.floor(difHoras / 24);
    return `Hace ${difDias} d`;
}

// --- 5. FUNCIÓN PARA ACTUALIZAR MUNICIPIOS EN CASCADA ---
function actualizarMunicipios() {
    const estadoSeleccionado = document.getElementById('select-estado').value;
    const selectMunicipio = document.getElementById('select-municipio');

    selectMunicipio.innerHTML = '<option value="">Selecciona un municipio</option>';

    if (estadoSeleccionado && localidadesMexico[estadoSeleccionado]) {
        selectMunicipio.disabled = false;
        localidadesMexico[estadoSeleccionado].forEach(municipio => {
            const option = document.createElement('option');
            option.value = municipio;
            option.textContent = municipio;
            selectMunicipio.appendChild(option);
        });
    } else {
        selectMunicipio.disabled = true;
    }
}