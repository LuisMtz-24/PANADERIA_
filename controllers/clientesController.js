const pool = require('../config/database');

// Obtener todos los clientes
exports.getAll = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const [clientes] = await connection.query(`
      SELECT 
        c.ID_Cliente,
        c.Nombre,
        c.Apellido,
        c.Correo,
        c.Teléfono,
        c.Avatar,
        COUNT(DISTINCT p.ID_Pedido) as Total_Pedidos,
        COALESCE(SUM(dp.Total), 0) as Total_Compras
      FROM Cliente c
      LEFT JOIN Pedido p ON c.ID_Cliente = p.ID_Cliente
      LEFT JOIN Detalle_Pago dp ON p.ID_Detalle_Pago = dp.ID_Detalle_Pago
      GROUP BY c.ID_Cliente
      ORDER BY c.Nombre, c.Apellido
    `);

    res.json(clientes);
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Obtener cliente por ID
exports.getById = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [clientes] = await connection.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT p.ID_Pedido) as Total_Pedidos,
        COALESCE(SUM(dp.Total), 0) as Total_Compras
      FROM Cliente c
      LEFT JOIN Pedido p ON c.ID_Cliente = p.ID_Cliente
      LEFT JOIN Detalle_Pago dp ON p.ID_Detalle_Pago = dp.ID_Detalle_Pago
      WHERE c.ID_Cliente = ?
      GROUP BY c.ID_Cliente
    `, [id]);

    if (clientes.length === 0) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: `No existe un cliente con ID ${id}`
      });
    }

    // Obtener direcciones del cliente
    const [direcciones] = await connection.query(
      'SELECT * FROM Dirección WHERE ID_Cliente = ?',
      [id]
    );

    const cliente = clientes[0];
    cliente.direcciones = direcciones;

    res.json(cliente);

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Crear cliente
exports.create = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { nombre, apellido, correo, telefono, avatar } = req.body;

    // Validaciones
    if (!nombre || !correo) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre y correo son requeridos'
      });
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({
        error: 'Correo inválido',
        message: 'El formato del correo electrónico no es válido'
      });
    }

    // Verificar si el correo ya existe
    const [existing] = await connection.query(
      'SELECT ID_Cliente FROM Cliente WHERE Correo = ?',
      [correo]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Cliente existente',
        message: 'El correo ya está registrado'
      });
    }

    // Insertar cliente
    const [result] = await connection.query(
      `INSERT INTO Cliente (Nombre, Apellido, Correo, Teléfono, Avatar) 
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, apellido, correo, telefono, avatar]
    );

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      clienteId: result.insertId
    });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Actualizar cliente
exports.update = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { nombre, apellido, correo, telefono, avatar } = req.body;

    // Verificar que el cliente existe
    const [existing] = await connection.query(
      'SELECT ID_Cliente FROM Cliente WHERE ID_Cliente = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: `No existe un cliente con ID ${id}`
      });
    }

    // Actualizar cliente
    await connection.query(
      `UPDATE Cliente 
       SET Nombre = ?, Apellido = ?, Correo = ?, Teléfono = ?, Avatar = ?
       WHERE ID_Cliente = ?`,
      [nombre, apellido, correo, telefono, avatar, id]
    );

    res.json({ message: 'Cliente actualizado exitosamente' });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Eliminar cliente
exports.delete = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Verificar que el cliente existe
    const [existing] = await connection.query(
      'SELECT ID_Cliente FROM Cliente WHERE ID_Cliente = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: `No existe un cliente con ID ${id}`
      });
    }

    // Eliminar cliente
    await connection.query('DELETE FROM Cliente WHERE ID_Cliente = ?', [id]);

    res.json({ message: 'Cliente eliminado exitosamente' });

  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: 'No se puede eliminar',
        message: 'El cliente tiene pedidos asociados'
      });
    }
    next(error);
  } finally {
    connection.release();
  }
};

// Agregar dirección a cliente
exports.addDireccion = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { cliente_id } = req.params;
    const { calle, ciudad, codigo_postal, pais } = req.body;

    if (!calle || !ciudad) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Calle y ciudad son requeridos'
      });
    }

    const [result] = await connection.query(
      `INSERT INTO Dirección (ID_Cliente, Calle, Ciudad, Código_Postal, País) 
       VALUES (?, ?, ?, ?, ?)`,
      [cliente_id, calle, ciudad, codigo_postal, pais]
    );

    res.status(201).json({
      message: 'Dirección agregada exitosamente',
      direccionId: result.insertId
    });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};