const pool = require('../config/database');

// Obtener todos los productos
exports.getAll = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const [productos] = await connection.query(`
      SELECT 
        p.ID_Producto,
        p.Nombre,
        p.Descripción,
        p.Unidad_de_Medida,
        p.Precio_Venta,
        c.Nombre as Categoria,
        COALESCE(i.Cantidad_Actual, 0) as Stock,
        f.URL_Foto
      FROM Producto p
      LEFT JOIN Categoría c ON p.ID_Categoría = c.ID_Categoría
      LEFT JOIN Inventario i ON p.ID_Producto = i.ID_Producto
      LEFT JOIN Foto f ON p.ID_Producto = f.ID_Producto
      ORDER BY p.Nombre
    `);

    res.json(productos);
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Obtener producto por ID
exports.getById = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [productos] = await connection.query(`
      SELECT 
        p.*,
        c.Nombre as Categoria,
        COALESCE(i.Cantidad_Actual, 0) as Stock,
        f.URL_Foto
      FROM Producto p
      LEFT JOIN Categoría c ON p.ID_Categoría = c.ID_Categoría
      LEFT JOIN Inventario i ON p.ID_Producto = i.ID_Producto
      LEFT JOIN Foto f ON p.ID_Producto = f.ID_Producto
      WHERE p.ID_Producto = ?
    `, [id]);

    if (productos.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: `No existe un producto con ID ${id}`
      });
    }

    res.json(productos[0]);
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Crear producto
exports.create = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { nombre, descripcion, categoria_id, unidad_medida, precio_venta, stock_inicial, url_foto } = req.body;

    // Validaciones
    if (!nombre || !precio_venta) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre y precio son requeridos'
      });
    }

    if (precio_venta <= 0) {
      return res.status(400).json({
        error: 'Precio inválido',
        message: 'El precio debe ser mayor a 0'
      });
    }

    // Insertar producto
    const [result] = await connection.query(
      `INSERT INTO Producto (Nombre, Descripción, ID_Categoría, Unidad_de_Medida, Precio_Venta) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, descripcion, categoria_id, unidad_medida || 'Pieza', precio_venta]
    );

    const productoId = result.insertId;

    // Crear inventario inicial
    if (stock_inicial && stock_inicial > 0) {
      await connection.query(
        `INSERT INTO Inventario (ID_Producto, Cantidad_Actual, Cantidad_Reservada, Ultima_Actualización) 
         VALUES (?, ?, 0, NOW())`,
        [productoId, stock_inicial]
      );

      // Registrar movimiento de entrada
      await connection.query(
        `INSERT INTO Movimiento_Entrada (ID_Producto, Fecha, Cantidad) 
         VALUES (?, NOW(), ?)`,
        [productoId, stock_inicial]
      );
    }

    // Agregar foto si se proporciona
    if (url_foto) {
      await connection.query(
        'INSERT INTO Foto (ID_Producto, URL_Foto) VALUES (?, ?)',
        [productoId, url_foto]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Producto creado exitosamente',
      productoId
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Actualizar producto
exports.update = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria_id, unidad_medida, precio_venta, url_foto } = req.body;

    // Verificar que el producto existe
    const [existing] = await connection.query(
      'SELECT ID_Producto FROM Producto WHERE ID_Producto = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: `No existe un producto con ID ${id}`
      });
    }

    // Actualizar producto
    await connection.query(
      `UPDATE Producto 
       SET Nombre = ?, Descripción = ?, ID_Categoría = ?, 
           Unidad_de_Medida = ?, Precio_Venta = ?
       WHERE ID_Producto = ?`,
      [nombre, descripcion, categoria_id, unidad_medida, precio_venta, id]
    );

    // Actualizar foto si se proporciona
    if (url_foto) {
      const [fotoExist] = await connection.query(
        'SELECT ID_Foto FROM Foto WHERE ID_Producto = ?',
        [id]
      );

      if (fotoExist.length > 0) {
        await connection.query(
          'UPDATE Foto SET URL_Foto = ? WHERE ID_Producto = ?',
          [url_foto, id]
        );
      } else {
        await connection.query(
          'INSERT INTO Foto (ID_Producto, URL_Foto) VALUES (?, ?)',
          [id, url_foto]
        );
      }
    }

    res.json({ message: 'Producto actualizado exitosamente' });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Eliminar producto
exports.delete = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Verificar que el producto existe
    const [existing] = await connection.query(
      'SELECT ID_Producto FROM Producto WHERE ID_Producto = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: `No existe un producto con ID ${id}`
      });
    }

    // Eliminar producto (las claves foráneas deberían manejar las dependencias)
    await connection.query('DELETE FROM Producto WHERE ID_Producto = ?', [id]);

    res.json({ message: 'Producto eliminado exitosamente' });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: 'No se puede eliminar',
        message: 'El producto tiene registros asociados (pedidos, inventario, etc.)'
      });
    }
    next(error);
  } finally {
    connection.release();
  }
};

// Obtener productos de temporada (Halloween/Día de Muertos)
exports.getTemporada = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const [productos] = await connection.query(`
      SELECT 
        p.ID_Producto,
        p.Nombre,
        p.Descripción,
        p.Precio_Venta,
        COALESCE(i.Cantidad_Actual, 0) as Stock,
        f.URL_Foto
      FROM Producto p
      LEFT JOIN Categoría c ON p.ID_Categoría = c.ID_Categoría
      LEFT JOIN Inventario i ON p.ID_Producto = i.ID_Producto
      LEFT JOIN Foto f ON p.ID_Producto = f.ID_Producto
      WHERE c.Nombre LIKE '%temporada%' 
         OR c.Nombre LIKE '%halloween%' 
         OR c.Nombre LIKE '%muertos%'
         OR p.Nombre LIKE '%calaver%'
         OR p.Nombre LIKE '%muerto%'
         OR p.Nombre LIKE '%halloween%'
      ORDER BY p.Nombre
    `);

    res.json(productos);
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};