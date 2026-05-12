const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Usuario conectado: ' + socket.id);

    
    socket.on('enviar-mensaje', (data) => {
       
        io.emit('mostrar-mensaje', {
            texto: data.texto,
            id: socket.id,
            hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log('====================================');
    console.log('Servidor corriendo en http://localhost:' + PORT);
    console.log('====================================');
});