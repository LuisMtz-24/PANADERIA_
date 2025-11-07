const pool = require('../config/database');

// Obtener inventario completo
exports.getAll = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const [inventario] = await connection.query(`
      SELECT 
        i.ID_Inventario,
        i.ID_Producto,
        p.Nombre as Producto,
        i.Cantidad_Actual,
        i.Cantidad_Reservada,
        i.Ultima_Actualización,
        (i.Cantidad_Actual - i.Cantidad_Reservada) as Disponible
      FROM Inventario i
      INNER JOIN Producto p ON i.ID_Producto = p.ID_Producto
      ORDER BY p.Nombre
    `);

    res.json(inventario);
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Registrar entrada de inventario
exports.entrada = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { producto_id, cantidad, motivo } = req.body;

    if (!producto_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'ID de producto y cantidad válida son requeridos'
      });
    }

    // Registrar movimiento de entrada
    await connection.query(
      'INSERT INTO Movimiento_Entrada (ID_Producto, Fecha, Cantidad) VALUES (?, NOW(), ?)',
      [producto_id, cantidad]
    );

    // Actualizar inventario
    const [inventario] = await connection.query(
      'SELECT ID_Inventario FROM Inventario WHERE ID_Producto = ?',
      [producto_id]
    );

    if (inventario.length > 0) {
      await connection.query(
        `UPDATE Inventario 
         SET Cantidad_Actual = Cantidad_Actual + ?, 
             Ultima_Actualización = NOW() 
         WHERE ID_Producto = ?`,
        [cantidad, producto_id]
      );
    } else {
      await connection.query(
        `INSERT INTO Inventario (ID_Producto, Cantidad_Actual, Cantidad_Reservada, Ultima_Actualización) 
         VALUES (?, ?, 0, NOW())`,
        [producto_id, cantidad]
      );
    }

    await connection.commit();

    res.json({
      message: 'Entrada de inventario registrada exitosamente',
      cantidad,
      producto_id
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Registrar salida de inventario
exports.salida = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { producto_id, cantidad, referencia, motivo } = req.body;

    if (!producto_id || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'ID de producto y cantidad válida son requeridos'
      });
    }

    // Verificar disponibilidad
    const [inventario] = await connection.query(
      'SELECT Cantidad_Actual, Cantidad_Reservada FROM Inventario WHERE ID_Producto = ?',
      [producto_id]
    );

    if (inventario.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: 'No existe inventario para este producto'
      });
    }

    const disponible = inventario[0].Cantidad_Actual - inventario[0].Cantidad_Reservada;

    if (cantidad > disponible) {
      return res.status(400).json({
        error: 'Stock insuficiente',
        message: `Solo hay ${disponible} unidades disponibles`
      });
    }

    // Registrar movimiento de salida
    await connection.query(
      'INSERT INTO Movimiento_Salida (ID_Producto, Fecha, Cantidad, Referencia) VALUES (?, NOW(), ?, ?)',
      [producto_id, cantidad, referencia]
    );

    // Actualizar inventario
    await connection.query(
      `UPDATE Inventario 
       SET Cantidad_Actual = Cantidad_Actual - ?, 
           Ultima_Actualización = NOW() 
       WHERE ID_Producto = ?`,
      [cantidad, producto_id]
    );

    await connection.commit();

    res.json({
      message: 'Salida de inventario registrada exitosamente',
      cantidad,
      producto_id
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Obtener movimientos de un producto
exports.getMovimientos = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { producto_id } = req.params;

    const [entradas] = await connection.query(
      `SELECT 'Entrada' as Tipo, Fecha, Cantidad, NULL as Referencia 
       FROM Movimiento_Entrada 
       WHERE ID_Producto = ?`,
      [producto_id]
    );

    const [salidas] = await connection.query(
      `SELECT 'Salida' as Tipo, Fecha, Cantidad, Referencia 
       FROM Movimiento_Salida 
       WHERE ID_Producto = ?`,
      [producto_id]
    );

    const movimientos = [...entradas, ...salidas]
      .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

    res.json(movimientos);

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Productos con stock bajo
exports.stockBajo = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const limite = req.query.limite || 10;

    const [productos] = await connection.query(`
      SELECT 
        p.ID_Producto,
        p.Nombre,
        i.Cantidad_Actual,
        i.Cantidad_Reservada,
        (i.Cantidad_Actual - i.Cantidad_Reservada) as Disponible
      FROM Producto p
      INNER JOIN Inventario i ON p.ID_Producto = i.ID_Producto
      WHERE (i.Cantidad_Actual - i.Cantidad_Reservada) < ?
      ORDER BY Disponible ASC
    `, [limite]);

    res.json(productos);

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};