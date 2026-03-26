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
        document.getElementById('avatar-img').src = usuario.fotoPerfil;
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

            btnChatear.onclick = () => {
                alert("¡Próximamente! Aquí se abrirá el chat con " + nombrePerfil + " que está programando mi compañero.");
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

// --- 4. CARGAR LAS PUBLICACIONES DEL USUARIO ---
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

            const tituloCorto = post.texto.substring(0, 30) + (post.texto.length > 30 ? '...' : '');

            const card = document.createElement('div');
            card.innerHTML = `
                <img src="${imagenPrincipal}" alt="Publicación">
                <span style="display:block; font-weight:bold; margin-top:5px;">${post.estado || 'Disponible'}</span>
                <p style="margin: 5px 0;">${tituloCorto || 'Publicación'}</p>
                <button class="btn-detalles" onclick="alert('Aquí podrías abrir el post completo')">Ver publicación</button>
            `;
            contenedor.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar posts:", error);
    }
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