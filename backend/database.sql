-- Base de datos inicial para GestionDeEmpleados.
-- Compatible con el backend actual: usa ingenio_constructora y conserva
-- la forma de projects que consume controllers/projects.js.

CREATE DATABASE IF NOT EXISTS ingenio_constructora
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ingenio_constructora;

CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(200) NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, nombre, descripcion) VALUES
  (1, 'super_admin', 'Acceso total a todos los locales'),
  (2, 'admin', 'Administra un local y su equipo'),
  (3, 'empleado', 'Ficha entrada y salida mediante selfie y ubicación')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion);

CREATE TABLE IF NOT EXISTS locales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  direccion VARCHAR(200) NULL,
  latitud DECIMAL(10,7) NOT NULL,
  longitud DECIMAL(10,7) NOT NULL,
  radio_metros INT UNSIGNED NOT NULL DEFAULT 100,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_local_latitud CHECK (latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_local_longitud CHECK (longitud BETWEEN -180 AND 180),
  CONSTRAINT chk_local_radio CHECK (radio_metros > 0)
);

CREATE TABLE IF NOT EXISTS puestos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  descripcion VARCHAR(200) NULL,
  tipo_liquidacion ENUM('mensual', 'por_hora', 'jornal') NOT NULL DEFAULT 'mensual',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id TINYINT UNSIGNED NOT NULL,
  puesto_id INT UNSIGNED NULL,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  dni VARCHAR(20) NULL UNIQUE,
  pin_hash VARCHAR(255) NULL,
  foto_perfil LONGTEXT NULL,
  foto_dni LONGTEXT NULL,
  local_id INT UNSIGNED NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
  CONSTRAINT fk_usuario_puesto FOREIGN KEY (puesto_id) REFERENCES puestos(id),
  CONSTRAINT fk_usuario_local FOREIGN KEY (local_id) REFERENCES locales(id),
  CONSTRAINT chk_usuario_identidad CHECK (
    (rol_id IN (1, 2) AND email IS NOT NULL AND password_hash IS NOT NULL AND dni IS NULL AND pin_hash IS NULL)
    OR
    (rol_id = 3 AND email IS NOT NULL AND dni IS NOT NULL AND pin_hash IS NOT NULL AND password_hash IS NULL)
  ),
  CONSTRAINT chk_usuario_alcance CHECK (
    (rol_id = 1 AND local_id IS NULL AND puesto_id IS NULL)
    OR
    (rol_id = 2 AND puesto_id IS NULL)
    OR
    (rol_id = 3)
  ),
  INDEX idx_usuarios_local_activo (local_id, activo),
  INDEX idx_usuarios_puesto (puesto_id)
);

CREATE TABLE IF NOT EXISTS turnos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  puesto_id INT UNSIGNED NULL,
  usuario_id INT UNSIGNED NULL,
  dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  cruza_medianoche BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_turno_puesto FOREIGN KEY (puesto_id) REFERENCES puestos(id),
  CONSTRAINT fk_turno_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT chk_turno_origen CHECK (
    (puesto_id IS NOT NULL AND usuario_id IS NULL)
    OR (puesto_id IS NULL AND usuario_id IS NOT NULL)
  ),
  CONSTRAINT chk_turno_horario CHECK (
    cruza_medianoche = TRUE OR hora_salida > hora_entrada
  ),
  UNIQUE KEY uq_turno_puesto_dia (puesto_id, dia_semana),
  UNIQUE KEY uq_turno_usuario_dia (usuario_id, dia_semana)
);

CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  assigned_employees TEXT NULL,
  jornada VARCHAR(255) NOT NULL DEFAULT '',
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  radius_m INT UNSIGNED NOT NULL DEFAULT 50,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_project_coordinates CHECK (
    (lat IS NULL AND lng IS NULL) OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
  ),
  CONSTRAINT chk_project_radius CHECK (radius_m > 0)
);

CREATE TABLE IF NOT EXISTS fichajes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  local_id INT UNSIGNED NULL,
  tipo ENUM('entrada', 'salida') NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitud DECIMAL(10,7) NULL,
  longitud DECIMAL(10,7) NULL,
  dentro_del_radio BOOLEAN NOT NULL DEFAULT TRUE,
  foto_url VARCHAR(255) NULL,
  foto_data MEDIUMTEXT NULL,
  eliminado BOOLEAN NOT NULL DEFAULT FALSE,
  eliminado_en DATETIME NULL,
  eliminado_por INT UNSIGNED NULL,
  CONSTRAINT fk_fichaje_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_fichaje_local FOREIGN KEY (local_id) REFERENCES locales(id),
  CONSTRAINT fk_fichaje_eliminado_por FOREIGN KEY (eliminado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_fichaje_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  CONSTRAINT chk_fichaje_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
  INDEX idx_fichajes_usuario_fecha (usuario_id, fecha_hora),
  INDEX idx_fichajes_local_fecha (local_id, fecha_hora),
  INDEX idx_fichajes_activos (eliminado, fecha_hora)
);

CREATE TABLE IF NOT EXISTS asistencia (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  local_id INT UNSIGNED NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME NULL,
  hora_salida TIME NULL,
  horas_trabajadas DECIMAL(6,2) NULL,
  estado ENUM('presente', 'tarde', 'ausente', 'falta_justificada') NOT NULL DEFAULT 'presente',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (local_id) REFERENCES locales(id),
  UNIQUE KEY uq_asistencia_usuario_fecha (usuario_id, fecha),
  INDEX idx_asistencia_fecha_local (fecha, local_id)
);

CREATE TABLE IF NOT EXISTS ausencias (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('vacaciones', 'licencia_medica', 'falta_justificada', 'falta_injustificada') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  observaciones TEXT NULL,
  creado_por INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_ausencia_fechas CHECK (fecha_fin >= fecha_inicio),
  INDEX idx_ausencias_usuario_fechas (usuario_id, fecha_inicio, fecha_fin)
);

CREATE TABLE IF NOT EXISTS salarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  monto DECIMAL(12,2) NOT NULL,
  tipo ENUM('mensual', 'quincenal', 'por_hora', 'jornal') NOT NULL DEFAULT 'mensual',
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NULL,
  motivo VARCHAR(200) NULL,
  creado_por INT UNSIGNED NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_salario_monto CHECK (monto >= 0),
  CONSTRAINT chk_salario_fechas CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde),
  INDEX idx_salarios_usuario_vigencia (usuario_id, fecha_desde, fecha_hasta)
);

CREATE TABLE IF NOT EXISTS liquidaciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  horas_trabajadas DECIMAL(6,2) NOT NULL DEFAULT 0,
  horas_extra DECIMAL(6,2) NOT NULL DEFAULT 0,
  monto_base DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_extra DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado ENUM('borrador', 'confirmada', 'pagada') NOT NULL DEFAULT 'borrador',
  generado_por INT UNSIGNED NULL,
  generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (generado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_liquidacion_periodo CHECK (periodo_hasta >= periodo_desde),
  CONSTRAINT chk_liquidacion_montos CHECK (monto_total = monto_base + monto_extra),
  UNIQUE KEY uq_liquidacion_usuario_periodo (usuario_id, periodo_desde, periodo_hasta),
  INDEX idx_liquidaciones_periodo (periodo_desde, periodo_hasta)
);

CREATE TABLE IF NOT EXISTS exportaciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NULL,
  tipo ENUM('asistencia', 'liquidacion', 'fichajes') NOT NULL,
  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,
  generado_por INT UNSIGNED NOT NULL,
  generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (generado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_exportacion_periodo CHECK (periodo_hasta >= periodo_desde)
);

-- Catálogos mínimos para poder crear empleados desde el panel.
INSERT INTO puestos (nombre, descripcion, tipo_liquidacion) VALUES
  ('operario', 'Personal operativo de obra', 'por_hora'),
  ('supervisor', 'Supervisión y coordinación de obra', 'mensual')
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion),
  tipo_liquidacion = VALUES(tipo_liquidacion);

-- Usuario inicial SOLO para desarrollo local.
-- Email: admin@ingenio.local | Contraseña: Admin123!
-- Reemplazar o eliminar este registro antes de publicar el sistema.
INSERT INTO usuarios (
  rol_id, puesto_id, nombre, email, password_hash, dni, pin_hash, local_id, activo
) VALUES (
  1, NULL, 'Administrador inicial', 'admin@ingenio.local',
  '$2b$10$R5so9/JdszeABfmoqJ2yPOXVbtWZif76V.8mfL/GZUDsD7Ex49jaS',
  NULL, NULL, NULL, TRUE
)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  activo = TRUE;
