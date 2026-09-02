const ExcelJS = require('exceljs');
const dbConfig = require('../config/db');

// Detectar automáticamente el objeto correcto de conexión con soporte para promesas
const pool = (dbConfig.promise ? dbConfig.promise() : null) || dbConfig.pool || dbConfig;

async function exportarEmpleadosExcel(req, res) {
  try {
    const [empleados] = await pool.query(`
      SELECT 
        id,
        nombre,
        email,
        COALESCE(dni, '-') AS dni,
        IF(activo, 'Activo', 'Inactivo') AS estado,
        DATE_FORMAT(creado_en, '%d/%m/%Y %H:%i') AS fecha_registro
      FROM usuarios
      WHERE rol_id = 3 OR rol_id = 2
      ORDER BY id DESC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ingenio Constructora';
    const worksheet = workbook.addWorksheet('Empleados');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Nombre Completo', key: 'nombre', width: 30 },
      { header: 'DNI', key: 'dni', width: 16 },
      { header: 'Correo Electrónico', key: 'email', width: 30 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Fecha de Registro', key: 'fecha_registro', width: 22 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF198754' },
    };
    headerRow.height = 25;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    empleados.forEach((emp) => {
      worksheet.addRow(emp);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Nomina_Empleados_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error detallado en exportarEmpleadosExcel:', error);
    res.status(500).json({ ok: false, message: error.message || 'Error al generar el archivo Excel' });
  }
}

async function exportarAsistenciasExcel(req, res) {
  try {
    const [asistencias] = await pool.query(`
      SELECT 
        a.id,
        u.nombre AS empleado,
        u.dni,
        DATE_FORMAT(a.fecha, '%d/%m/%Y') AS fecha,
        COALESCE(TIME_FORMAT(a.hora_entrada, '%H:%i'), '-') AS entrada,
        COALESCE(TIME_FORMAT(a.hora_salida, '%H:%i'), '-') AS salida,
        a.estado
      FROM asistencia a
      JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.id DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencias');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Empleado', key: 'empleado', width: 28 },
      { header: 'DNI', key: 'dni', width: 16 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Entrada', key: 'entrada', width: 12 },
      { header: 'Salida', key: 'salida', width: 12 },
      { header: 'Estado', key: 'estado', width: 16 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF198754' },
    };

    asistencias.forEach((row) => worksheet.addRow(row));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Reporte_Asistencias_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error detallado en exportarAsistenciasExcel:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = {
  exportarEmpleadosExcel,
  exportarAsistenciasExcel,
};