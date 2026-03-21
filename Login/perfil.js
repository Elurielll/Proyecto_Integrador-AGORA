// =========================================
//   LÓGICA DEL PERFIL DINÁMICO
// =========================================

const urlParams = new URLSearchParams(window.location.search);
const nombrePerfil = urlParams.get('user') || localStorage.getItem('nombreUsuario');
const usuarioLogueado = localStorage.getItem('nombreUsuario');

// Diccionario de estados y municipios
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

// Variables para guardar la foto temporalmente antes de subirla al servidor
let imagenVisualPreview = null; 
let archivoFotoFisico = null; 

document.addEventListener('DOMContentLoaded', () => {
    if (!nombrePerfil) {
        alert("No se pudo identificar el perfil.");
        window.location.href = "publicaciones.html"; 
        return;
    }
    
    // Al cargar la página, traemos la info, los eventos y las publicaciones
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

        // Llenamos los textos (MODO VISTA)
        document.getElementById('vista-nombre').innerText = usuario.nombre;
        document.getElementById('vista-bio').innerText = usuario.bio;
        document.getElementById('avatar-img').src = usuario.fotoPerfil;
        document.getElementById('vista-ubicacion').innerText = `${usuario.estado || 'Estado'}, ${usuario.municipio || 'Municipio'}`;

        // Llenamos las cajas de texto por si el usuario decide editar (MODO EDICIÓN)
        document.getElementById('edit-nombre').value = usuario.nombre;
        document.getElementById('edit-bio').value = usuario.bio;
        
        const selectEstado = document.getElementById('select-estado');
        if(usuario.estado && usuario.estado !== "No especificado") {
            selectEstado.value = usuario.estado; 
            actualizarMunicipios(); 
            document.getElementById('select-municipio').value = usuario.municipio;
        }

        // --- VALIDACIÓN: ¿ES MI PERFIL O ESTOY VISITANDO A ALGUIEN? ---
        const esMiPerfil = (usuarioLogueado === nombrePerfil);
        const btnEditar = document.getElementById('btn-editar-perfil');
        const btnChatear = document.getElementById('btn-chatear'); // EL NUEVO BOTÓN FANTASMA

        if (esMiPerfil) {
            btnEditar.style.display = "inline-block"; // Muestro mi botón de Editar
            btnChatear.style.display = "none"; // No puedo chatear conmigo mismo
        } else {
            btnEditar.style.display = "none"; // No puedo editar perfiles ajenos
            btnChatear.style.display = "inline-block"; // SÍ veo el botón de chatear
            
            // Acción temporal (Dummy)
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

    // Elementos de la Vista
    const vistaNombre = document.getElementById('vista-nombre');
    const vistaBio = document.getElementById('vista-bio');
    const vistaUbi = document.getElementById('vista-ubicacion');

    // Elementos de Edición
    const editNombre = document.getElementById('edit-nombre');
    const editBio = document.getElementById('edit-bio');
    const editUbi = document.getElementById('edit-ubicacion');

    // ACTIVAR MODO EDICIÓN
    btnEditar.addEventListener('click', () => {
        vistaNombre.style.display = 'none';
        vistaBio.style.display = 'none';
        vistaUbi.style.display = 'none';
        btnEditar.style.display = 'none';

        editNombre.style.display = 'block';
        editBio.style.display = 'block';
        
        // --- AQUÍ ESTÁ EL CAMBIO CLAVE PARA QUE EL DISEÑO NO SE ROMPA ---
        editUbi.style.display = 'flex'; // ANTES DECÍA 'inline-block'
        
        btnGuardar.innerText = "💾 Guardar Cambios"; 
        btnGuardar.style.display = 'inline-block';
        btnLapicito.style.display = 'block';
        
        // Asignamos la función de guardar al botón
        btnGuardar.onclick = guardarCambiosPerfil; 
    });

    // VISTA PREVIA DE LA FOTO (Animación sin guardar en la BD aún)
    if (fotoInput) {
        fotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            archivoFotoFisico = file; 

            const reader = new FileReader();
            reader.onload = function(evento) {
                imagenVisualPreview = evento.target.result; 
                
                // Animación de transición suave
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
    const nuevoNombre = document.getElementById('edit-nombre').value;
    const nuevaBio = document.getElementById('edit-bio').value;
    const nuevoEstado = document.getElementById('select-estado').value;
    const nuevoMunicipio = document.getElementById('select-municipio').value || "Por definir";

    try {
        // 1. Enviar primero los datos de texto
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

        // 2. Si el usuario eligió una foto nueva, la enviamos ahora
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
            
            // Actualizamos la imagen final con la ruta que nos dio el servidor
            document.getElementById('avatar-img').src = dataFoto.nuevaRuta;
            archivoFotoFisico = null; 
        }

        // 3. Reflejar los cambios en el Modo Vista
        document.getElementById('vista-nombre').innerText = nuevoNombre;
        document.getElementById('vista-bio').innerText = nuevaBio;
        document.getElementById('vista-ubicacion').innerText = `${nuevoEstado}, ${nuevoMunicipio}`;

        // Ocultar inputs
        document.getElementById('edit-nombre').style.display = 'none';
        document.getElementById('edit-bio').style.display = 'none';
        document.getElementById('edit-ubicacion').style.display = 'none';
        document.getElementById('btn-guardar-cambios').style.display = 'none';
        document.getElementById('btn-lapicito').style.display = 'none';

        // Mostrar vista normal
        document.getElementById('vista-nombre').style.display = 'block';
        document.getElementById('vista-bio').style.display = 'block';
        document.getElementById('vista-ubicacion').style.display = 'inline-block';
        document.getElementById('btn-editar-perfil').style.display = 'inline-block';

        if (nuevoNombre !== nombrePerfil) {
            localStorage.setItem('nombreUsuario', nuevoNombre);
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
    
    // Limpiamos las opciones actuales
    selectMunicipio.innerHTML = '<option value="">Selecciona un municipio</option>';
    
    // Si el estado existe en nuestro diccionario de arriba
    if (estadoSeleccionado && localidadesMexico[estadoSeleccionado]) {
        selectMunicipio.disabled = false; // Habilitamos el selector
        localidadesMexico[estadoSeleccionado].forEach(municipio => {
            const option = document.createElement('option');
            option.value = municipio;
            option.textContent = municipio;
            selectMunicipio.appendChild(option);
        });
    } else {
        // Si no hay estado seleccionado, deshabilitamos el de municipios
        selectMunicipio.disabled = true;
    }
}