const pool = require('../config/database');

// Obtener todos los productos
exports.getAll = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const [productos] = await connection.query(`
      SELECT 
        p.idproducto,
        p.Nombre,
        p.Descripción,
        p.Unidad_de_Medida,
        p.precio_venta,
        c.Nombre as Categoria,
        COALESCE(i.Cantidad_Actual, 0) as Stock,
        f.URL_foto
      FROM producto p
      LEFT JOIN categoria c ON p.ID_categoria = c.ID_categoria
      LEFT JOIN inventario i ON p.idproducto = i.idproducto
      LEFT JOIN foto f ON p.idproducto = f.idproducto
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
        f.URL_foto
      FROM producto p
      LEFT JOIN categoria c ON p.ID_categoria = c.ID_categoria
      LEFT JOIN inventario i ON p.idproducto = i.idproducto
      LEFT JOIN foto f ON p.idproducto = f.idproducto
      WHERE p.idproducto = ?
    `, [id]);

    if (productos.length === 0) {
      return res.status(404).json({
        error: 'producto no encontrado',
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
      `INSERT INTO producto (Nombre, Descripción, ID_categoria, Unidad_de_Medida, precio_venta) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, descripcion, categoria_id, unidad_medida || 'Pieza', precio_venta]
    );

    const productoId = result.insertId;

    // Crear inventario inicial
    if (stock_inicial && stock_inicial > 0) {
      await connection.query(
        `INSERT INTO inventario (idproducto, Cantidad_Actual, Cantidad_Reservada, Ultima_Actualización) 
         VALUES (?, ?, 0, NOW())`,
        [productoId, stock_inicial]
      );

      // Registrar movimiento de entrada
      await connection.query(
        `INSERT INTO Movimiento_Entrada (idproducto, Fecha, Cantidad) 
         VALUES (?, NOW(), ?)`,
        [productoId, stock_inicial]
      );
    }

    // Agregar foto si se proporciona
    if (url_foto) {
      await connection.query(
        'INSERT INTO foto (idproducto, URL_foto) VALUES (?, ?)',
        [productoId, url_foto]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'producto creado exitosamente',
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
      'SELECT idproducto FROM producto WHERE idproducto = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'producto no encontrado',
        message: `No existe un producto con ID ${id}`
      });
    }

    // Actualizar producto
    await connection.query(
      `UPDATE producto 
       SET Nombre = ?, Descripción = ?, ID_categoria = ?, 
           Unidad_de_Medida = ?, precio_venta = ?
       WHERE idproducto = ?`,
      [nombre, descripcion, categoria_id, unidad_medida, precio_venta, id]
    );

    // Actualizar foto si se proporciona
    if (url_foto) {
      const [fotoExist] = await connection.query(
        'SELECT ID_foto FROM foto WHERE idproducto = ?',
        [id]
      );

      if (fotoExist.length > 0) {
        await connection.query(
          'UPDATE foto SET URL_foto = ? WHERE idproducto = ?',
          [url_foto, id]
        );
      } else {
        await connection.query(
          'INSERT INTO foto (idproducto, URL_foto) VALUES (?, ?)',
          [id, url_foto]
        );
      }
    }

    res.json({ message: 'producto actualizado exitosamente' });

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
      'SELECT idproducto FROM producto WHERE idproducto = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'producto no encontrado',
        message: `No existe un producto con ID ${id}`
      });
    }

    // Eliminar producto (las claves foráneas deberían manejar las dependencias)
    await connection.query('DELETE FROM producto WHERE idproducto = ?', [id]);

    res.json({ message: 'producto eliminado exitosamente' });

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
        p.idproducto,
        p.Nombre,
        p.Descripción,
        p.precio_venta,
        COALESCE(i.Cantidad_Actual, 0) as Stock,
        f.URL_foto
      FROM producto p
      LEFT JOIN categoria c ON p.ID_categoria = c.ID_categoria
      LEFT JOIN inventario i ON p.idproducto = i.idproducto
      LEFT JOIN foto f ON p.idproducto = f.idproducto
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