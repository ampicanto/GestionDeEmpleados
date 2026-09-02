-- =========================================================
-- Sistema de Fichaje con QR y Geolocalización
-- Script COMPLETO de creación de base de datos y tablas
-- =========================================================

-- Si ya existía una versión anterior de la base (por ejemplo de
-- una prueba previa), la elimina para arrancar limpio. CUIDADO:
-- esto borra TODOS los datos que hubiera cargados.
DROP DATABASE IF EXISTS sistema_fichaje;

CREATE DATABASE IF NOT exists sistema_fichaje
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_fichaje;

-- ===========================================================
-- 1. LOCALES
-- Cada local con su ubicación, para validar geolocalización.
-- ===========================================================
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

-- ===========================================================
-- 2. ROLES
-- Define QUÉ PUEDE HACER un usuario dentro del sistema
-- (permisos/acceso: qué panel ve, qué acciones puede hacer).
-- No tiene relación con el trabajo real que hace la persona
-- en el local — eso es PUESTOS (más abajo).
-- ===========================================================
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Nombre único del rol: 'super_admin', 'admin', 'empleado', ...
  -- Se pueden agregar más adelante sin modificar la estructura.
  nombre VARCHAR(50) UNIQUE NOT NULL,

  descripcion VARCHAR(200),

  -- Permite "desactivar" un rol sin borrarlo ni romper el
  -- historial de usuarios que ya lo tenían asignado.
  activo BOOLEAN DEFAULT TRUE,

  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre, descripcion) VALUES
  ('super_admin', 'Acceso total, ve todos los locales'),
  ('admin', 'Administra un local'),
  ('empleado', 'Ficha entrada/salida por QR');

-- ===========================================================
-- 3. PUESTOS
-- Define QUÉ TRABAJO HACE la persona en la práctica
-- (limpieza, obra, ventas, etc). No tiene relación con el
-- acceso al sistema — eso es ROLES (arriba).
-- De acá sale el turno que le corresponde y cómo se le paga.
-- ===========================================================
CREATE TABLE puestos (
  id INT AUTO_INCREMENT PRIMARY KEY,

  nombre VARCHAR(80) UNIQUE NOT NULL,     -- 'limpieza', 'obra', 'ventas', ...

  descripcion VARCHAR(200),

  -- Cómo se calcula el pago para alguien con este puesto:
  --   'mensual'  -> monto fijo por mes (ver tabla salarios)
  --   'por_hora' -> según las horas que efectivamente trabajó
  --   'jornal'   -> monto fijo por día trabajado (típico en obra)
  tipo_liquidacion ENUM('mensual','por_hora','jornal') NOT NULL DEFAULT 'mensual',

  activo BOOLEAN DEFAULT TRUE
);

-- ===========================================================
-- 4. USUARIOS
-- Un solo lugar para los 3 roles: super_admin, admin, empleado.
-- - super_admin / admin: se identifican con email + contraseña.
-- - empleado: se identifica con DNI + PIN al escanear el QR.
-- Los campos que no correspondan a un rol quedan en NULL.
-- ===========================================================
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Nivel de acceso al sistema (qué panel ve, qué puede hacer).
  rol_id INT NOT NULL,

  -- Trabajo real que hace en el local. NULL para super_admin/admin
  -- que no tienen un puesto operativo.
  puesto_id INT NULL,

  nombre VARCHAR(100) NOT NULL,

  -- login de super_admin / admin
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255),

  -- login de empleado (fichaje por QR)
  dni VARCHAR(20) UNIQUE,
  pin_hash VARCHAR(255),

  foto_perfil LONGTEXT,
  foto_dni LONGTEXT,

  -- a qué local pertenece (NULL para super_admin, que ve todos)
  local_id INT NULL,

  activo BOOLEAN DEFAULT TRUE,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (rol_id) REFERENCES roles(id),
  FOREIGN KEY (puesto_id) REFERENCES puestos(id),
  FOREIGN KEY (local_id) REFERENCES locales(id)
);

-- ===========================================================
-- 5. TURNOS
-- Horario esperado, por día de la semana.
-- Se puede definir a nivel de PUESTO (plantilla que heredan
-- todos los empleados de ese puesto, ej. "limpieza") o a nivel
-- de USUARIO (excepción puntual para un empleado). Exactamente
-- uno de los dos debe estar cargado por fila.
-- ===========================================================
CREATE TABLE turnos (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Si el turno es una plantilla para todo un puesto, va acá.
  puesto_id INT NULL,

  -- Si es una excepción puntual para un empleado, va acá.
  usuario_id INT NULL,

  dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,

  FOREIGN KEY (puesto_id) REFERENCES puestos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),

  -- Regla de negocio: cada fila pertenece a un puesto O a un
  -- usuario, nunca a los dos ni a ninguno.
  CONSTRAINT chk_turno_origen CHECK (
    (puesto_id IS NOT NULL AND usuario_id IS NULL) OR
    (puesto_id IS NULL AND usuario_id IS NOT NULL)
  )
);

-- Para saber el turno efectivo de un empleado un día dado, la
-- app tiene que buscar en este orden:
-- 1) turnos WHERE usuario_id = ?        (excepción individual, prioridad)
-- 2) si no hay, turnos WHERE puesto_id = (puesto del empleado)

-- ===========================================================
-- 6. FICHAJES
-- Cada marca individual de entrada/salida por QR (evento crudo).
-- ===========================================================
CREATE TABLE fichajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,                -- empleado que fichó
  local_id INT NOT NULL,
  tipo ENUM('entrada','salida') NOT NULL,
  fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
  latitud DECIMAL(10,7),
  longitud DECIMAL(10,7),
  dentro_del_radio BOOLEAN DEFAULT TRUE,  -- si pasó la validación de geolocalización

  -- Foto tomada al momento de fichar, como segunda verificación
  -- además de la geolocalización (evita que alguien fiche "por"
  -- otro compañero). Se guarda solo la ruta/URL, no la imagen.
  foto_url VARCHAR(255) NULL,

  -- borrado lógico
  eliminado BOOLEAN DEFAULT FALSE,
  eliminado_en DATETIME NULL,
  eliminado_por INT NULL,                 -- usuario (admin/super_admin) que lo borró

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (local_id) REFERENCES locales(id),
  FOREIGN KEY (eliminado_por) REFERENCES usuarios(id)
);

-- ===========================================================
-- 7. ASISTENCIA
-- Resumen diario por empleado (se calcula a partir de fichajes),
-- útil para reportes: presente, tarde, ausente, etc.
-- ===========================================================
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

-- ===========================================================
-- 8. AUSENCIAS
-- Vacaciones, licencias y faltas justificadas/injustificadas.
-- ===========================================================
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

-- ===========================================================
-- 9. SALARIOS
-- Historial de sueldo de cada empleado. Se guarda un registro
-- NUEVO cada vez que cambia el salario (no se pisa el anterior),
-- para poder saber "cuánto cobraba en marzo" aunque hoy cobre
-- otra cosa.
-- ===========================================================
CREATE TABLE salarios (
  id INT AUTO_INCREMENT PRIMARY KEY,

  usuario_id INT NOT NULL,

  -- Valor del salario para este período. Si tipo='por_hora' es
  -- el valor de la hora; si es 'mensual' es el sueldo del mes.
  monto DECIMAL(12,2) NOT NULL,

  tipo ENUM('mensual','quincenal','por_hora') NOT NULL DEFAULT 'mensual',

  fecha_desde DATE NOT NULL,              -- desde cuándo rige este monto

  -- NULL significa que este es el salario VIGENTE ahora mismo.
  fecha_hasta DATE NULL,

  -- Por qué se cargó este registro: 'ingreso', 'aumento',
  -- 'ajuste convenio', etc. Solo para referencia humana.
  motivo VARCHAR(200),

  creado_por INT NULL,                    -- admin/super_admin que cargó el cambio
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- Para consultar rápido el salario vigente de cada empleado:
-- SELECT * FROM salarios WHERE usuario_id = ? AND fecha_hasta IS NULL;

-- ===========================================================
-- 10. LIQUIDACIONES
-- El resultado final: cuánto hay que pagarle a cada empleado
-- en un período. Se arma combinando las horas trabajadas de
-- verdad (asistencia) con la tarifa correspondiente (salarios),
-- según cómo se le paga (tipo_liquidacion del puesto).
-- ===========================================================
CREATE TABLE liquidaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,

  usuario_id INT NOT NULL,

  periodo_desde DATE NOT NULL,            -- rango de fechas que cubre esta liquidación
  periodo_hasta DATE NOT NULL,

  horas_trabajadas DECIMAL(6,2) NOT NULL DEFAULT 0,  -- suma de asistencia del período
  horas_extra DECIMAL(6,2) NOT NULL DEFAULT 0,       -- horas por encima de lo pactado en el turno

  monto_base DECIMAL(12,2) NOT NULL DEFAULT 0,   -- por horas/jornal/mes normal
  monto_extra DECIMAL(12,2) NOT NULL DEFAULT 0,  -- adicional por horas extra
  monto_total DECIMAL(12,2) NOT NULL DEFAULT 0,  -- monto_base + monto_extra

  -- Etapa de la liquidación:
  --   'borrador'   -> calculada pero se puede corregir todavía
  --   'confirmada' -> revisada y aprobada
  --   'pagada'     -> ya se le pagó al empleado
  estado ENUM('borrador','confirmada','pagada') NOT NULL DEFAULT 'borrador',

  generado_por INT NULL,                  -- admin/super_admin que la generó
  generado_en DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (generado_por) REFERENCES usuarios(id),

  -- Evita cargar dos liquidaciones para el mismo empleado y el
  -- mismo período exacto.
  UNIQUE KEY unico_usuario_periodo (usuario_id, periodo_desde, periodo_hasta)
);

-- Cómo se calculan los montos (lógica de la aplicación, no de
-- la base de datos):
-- horas_trabajadas = SUM(asistencia.horas_trabajadas) del período
-- monto_base = horas_trabajadas * tarifa   (si puesto.tipo_liquidacion = 'por_hora')
--            = salarios.monto vigente      (si puesto.tipo_liquidacion = 'mensual')

-- ===========================================================
-- 11. EXPORTACIONES (opcional)
-- Registro de cada exportación a Excel generada, para saber
-- quién exportó qué y cuándo. No hace falta para que la
-- exportación funcione — es solo historial/auditoría, se puede
-- omitir si no les interesa llevarlo.
-- ===========================================================
CREATE TABLE exportaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- De qué empleado es la exportación. NULL si fue general
  -- (todos los empleados juntos).
  usuario_id INT NULL,

  tipo ENUM('asistencia','liquidacion','fichajes') NOT NULL,

  periodo_desde DATE NOT NULL,
  periodo_hasta DATE NOT NULL,

  generado_por INT NOT NULL,              -- quién pidió la exportación
  generado_en DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  FOREIGN KEY (generado_por) REFERENCES usuarios(id)
);
