<?php
$host = 'localhost';
$user = 'root';
$pass = ''; 
$db   = 'agora_db'; // Asegúrate de que este sea el nombre de tu base de datos

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Para que acepte eñes, acentos y emojis sin romperse
$conn->set_charset("utf8mb4"); 
?>