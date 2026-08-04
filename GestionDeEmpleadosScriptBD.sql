-- =========================================================
-- Sistema de Fichaje con QR y Geolocalización
-- Script de creación de base de datos y tablas
-- =========================================================

CREATE DATABASE IF NOT exists sistema_fichaje
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_fichaje;

-- ---------------------------------------------------------
-- 1. LOCALES
-- Cada local con su ubicación, para validar geolocalización
-- ---------------------------------------------------------
CREATE TABLE locales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,     -- identificador que va en la URL del QR
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(200),
  latitud DECIMAL(10,7) NOT NULL,
  longitud DECIMAL(10,7) NOT NULL,
  radio_metros INT DEFAULT 100,
  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. USUARIOS
-- Un solo lugar para los 3 roles: super_admin, admin, empleado.
-- - super_admin / admin: se identifican con email + contraseña.
-- - empleado: se identifica con DNI + PIN al escanear el QR.
-- Los campos que no correspondan a un rol quedan en NULL.
-- ---------------------------------------------------------
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rol ENUM('super_admin', 'admin', 'empleado') NOT NULL,
  nombre VARCHAR(100) NOT NULL,

  -- login de super_admin / admin
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255),

  -- login de empleado (fichaje por QR)
  dni VARCHAR(20) UNIQUE,
  pin_hash VARCHAR(255),

  -- a qué local pertenece (NULL para super_admin, que ve todos)
  local_id INT NULL,

  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (local_id) REFERENCES locales(id)
);

-- ---------------------------------------------------------
-- 3. TURNOS
-- Horario esperado de cada empleado, por día de la semana
-- ---------------------------------------------------------
CREATE TABLE turnos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                -- empleado (usuarios.rol = 'empleado')
  dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ---------------------------------------------------------
-- 4. FICHAJES
-- Cada marca individual de entrada/salida por QR (evento crudo)
-- ---------------------------------------------------------
CREATE TABLE fichajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                -- empleado que fichó
  local_id INT NOT NULL,
  tipo ENUM('entrada','salida') NOT NULL,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  dentro_del_radio BOOLEAN DEFAULT TRUE,  -- si pasó la validación de geolocalización

  -- borrado lógico
  eliminado BOOLEAN DEFAULT FALSE,
  eliminado_en DATETIME NULL,
  eliminado_por INT NULL,                 -- usuario (admin/super_admin) que lo borró

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (local_id) REFERENCES locales(id),
  FOREIGN KEY (eliminado_por) REFERENCES usuarios(id)
);

-- ---------------------------------------------------------
-- 5. ASISTENCIA
-- Resumen diario por empleado (se calcula a partir de fichajes),
-- útil para reportes: presente, tarde, ausente, etc.
-- ---------------------------------------------------------
CREATE TABLE asistencia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  local_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME NULL,
  hora_salida TIME NULL,
  horas_trabajadas DECIMAL(5,2) NULL,
  estado ENUM('presente','tarde','ausente','falta_justificada') NOT NULL DEFAULT 'presente',

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (local_id) REFERENCES locales(id),
  UNIQUE KEY unico_usuario_fecha (usuario_id, fecha)  -- un solo resumen por empleado y día
);

-- ---------------------------------------------------------
-- 6. AUSENCIAS
-- Vacaciones, licencias y faltas justificadas/injustificadas
-- ---------------------------------------------------------
CREATE TABLE ausencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo ENUM('vacaciones','licencia_medica','falta_justificada','falta_injustificada') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  observaciones TEXT,
  creado_por INT NULL,                    -- admin/super_admin que la cargó

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);