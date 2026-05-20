<?php
header('Content-Type: application/json');

// Jalamos tu archivo de conexión recién rescatado
require 'conexion.php'; 

$accion = $_GET['accion'] ?? '';

// --- ACCIÓN: GUARDAR BORRADOR ---
if ($accion === 'guardar') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $usuario_id = $data['usuario_id'] ?? null;
    $titulo = $data['titulo'] ?? '';
    $precio = empty($data['precio']) ? null : $data['precio']; 
    $estado = $data['estado'] ?? '';
    $municipio = $data['municipio'] ?? '';
    $categoria = $data['categoria'] ?? '';
    $condicion = $data['condicion'] ?? '';
    $descripcion = $data['descripcion'] ?? '';

    if (!$usuario_id) {
        echo json_encode(['success' => false, 'error' => 'No se detectó ID de usuario']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO borradores (usuario_id, titulo, precio, estado_republica, municipio, categoria, condicion, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssss", $usuario_id, $titulo, $precio, $estado, $municipio, $categoria, $condicion, $descripcion);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'mensaje' => 'Borrador guardado exitosamente']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error en MySQL: ' . $stmt->error]);
    }
    $stmt->close();
}

// --- ACCIÓN: OBTENER BORRADORES ---
elseif ($accion === 'obtener') {
    $usuario_id = $_GET['usuario_id'] ?? 0;
    
    $stmt = $conn->prepare("SELECT * FROM borradores WHERE usuario_id = ? ORDER BY fecha_guardado DESC");
    $stmt->bind_param("i", $usuario_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $borradores = [];
    while ($row = $result->fetch_assoc()) {
        $borradores[] = $row;
    }
    
    echo json_encode(['success' => true, 'borradores' => $borradores]);
    $stmt->close();
}

// --- ACCIÓN: ELIMINAR BORRADOR ---
elseif ($accion === 'eliminar') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id_borrador = $data['id'] ?? 0;
    
    $stmt = $conn->prepare("DELETE FROM borradores WHERE id = ?");
    $stmt->bind_param("i", $id_borrador);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'No se pudo eliminar de la BD']);
    }
    $stmt->close();
}

if (isset($conn)) {
    $conn->close();
}
?>