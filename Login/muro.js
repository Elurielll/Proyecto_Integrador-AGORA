const btnPublish = document.getElementById('btnPublish');
const postContent = document.getElementById('postContent');
const postsDiv = document.getElementById('posts');

// Función para obtener publicaciones del servidor
async function cargarPosts() {
    try {
        const response = await fetch('/get-posts');
        const posts = await response.json();
        
        postsDiv.innerHTML = ""; // Limpiar antes de cargar
        
        // Los mostramos del más nuevo al más viejo
        posts.reverse().forEach(post => {
            postsDiv.innerHTML += `
                <div class="post">
                    <div class="post-header">Usuario de Agora dice:</div>
                    <div class="post-body">${post.texto}</div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error cargando posts:", error);
    }
}

// Evento para publicar
btnPublish.addEventListener('click', async () => {
    const texto = postContent.value;
    if (!texto.trim()) return alert("El mensaje no puede estar vacío");

    try {
        await fetch('/publicar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto })
        });
        
        postContent.value = ""; // Limpiar el cuadro
        cargarPosts(); // Refrescar el muro
    } catch (error) {
        alert("Error al publicar");
    }
});

// Cargar posts al abrir laa página
cargarPosts();