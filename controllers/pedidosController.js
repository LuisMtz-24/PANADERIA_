const pool = require('../config/database');

// Obtener todos los pedidos
exports.getAll = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const [pedidos] = await connection.query(`
      SELECT 
        p.ID_Pedido,
        p.Fecha,
        p.Referencia,
        c.Nombre as Cliente,
        c.Apellido,
        e.Estado as Estado_Actual,
        dp.Total,
        COUNT(det.ID_Detalle) as Total_productos
      FROM Pedido p
      INNER JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
      LEFT JOIN Seguimiento_Pedido sp ON p.ID_Pedido = sp.ID_Pedido
      LEFT JOIN CAT_Estados e ON sp.ID_Estado = e.ID_Estado
      LEFT JOIN Detalle_Pago dp ON p.ID_Detalle_Pago = dp.ID_Detalle_Pago
      LEFT JOIN Detalles_Pedido det ON p.ID_Pedido = det.ID_Pedido
      WHERE sp.ID_Seguimiento = (
        SELECT MAX(ID_Seguimiento) 
        FROM Seguimiento_Pedido 
        WHERE ID_Pedido = p.ID_Pedido
      )
      GROUP BY p.ID_Pedido
      ORDER BY p.Fecha DESC
    `);

    res.json(pedidos);
  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Obtener pedido por ID
exports.getById = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    const [pedidos] = await connection.query(`
      SELECT 
        p.*,
        c.Nombre as Cliente_Nombre,
        c.Apellido as Cliente_Apellido,
        c.Correo as Cliente_Correo,
        c.Teléfono as Cliente_Telefono,
        d.Calle,
        d.Ciudad,
        d.Código_Postal,
        d.País,
        dp.Subtotal,
        dp.Tarifas_de_Envío,
        dp.Total,
        dp.Método_Pago
      FROM Pedido p
      INNER JOIN Cliente c ON p.ID_Cliente = c.ID_Cliente
      LEFT JOIN Dirección d ON p.ID_Dirección = d.ID_Dirección
      LEFT JOIN Detalle_Pago dp ON p.ID_Detalle_Pago = dp.ID_Detalle_Pago
      WHERE p.ID_Pedido = ?
    `, [id]);

    if (pedidos.length === 0) {
      return res.status(404).json({
        error: 'Pedido no encontrado',
        message: `No existe un pedido con ID ${id}`
      });
    }

    // Obtener detalles del pedido
    const [detalles] = await connection.query(`
      SELECT 
        dp.*,
        pr.Nombre as producto,
        pr.Descripción,
        pr.Unidad_de_Medida
      FROM Detalles_Pedido dp
      INNER JOIN producto pr ON dp.idproducto = pr.idproducto
      WHERE dp.ID_Pedido = ?
    `, [id]);

    // Obtener historial de seguimiento
    const [seguimiento] = await connection.query(`
      SELECT 
        sp.*,
        e.Estado,
        e.Descripción as Estado_descripcion
      FROM Seguimiento_Pedido sp
      INNER JOIN CAT_Estados e ON sp.ID_Estado = e.ID_Estado
      WHERE sp.ID_Pedido = ?
      ORDER BY sp.Fecha DESC
    `, [id]);

    const pedido = pedidos[0];
    pedido.detalles = detalles;
    pedido.seguimiento = seguimiento;

    res.json(pedido);

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Crear pedido
exports.create = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { 
      cliente_id, 
      direccion_id, 
      productos, // Array de {producto_id, cantidad, precio_unitario}
      subtotal,
      tarifas_envio,
      total,
      metodo_pago 
    } = req.body;

    // Validaciones
    if (!cliente_id || !productos || productos.length === 0) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Cliente y productos son requeridos'
      });
    }

    // Generar referencia única
    const referencia = `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Crear detalle de pago
    const [pagoResult] = await connection.query(
      `INSERT INTO Detalle_Pago (Subtotal, Tarifas_de_Envío, Total, Método_Pago) 
       VALUES (?, ?, ?, ?)`,
      [subtotal, tarifas_envio || 0, total, metodo_pago]
    );

    const detallePagoId = pagoResult.insertId;

    // Crear pedido
    const [pedidoResult] = await connection.query(
      `INSERT INTO Pedido (ID_Cliente, ID_Detalle_Pago, ID_Dirección, Fecha, Referencia) 
       VALUES (?, ?, ?, NOW(), ?)`,
      [cliente_id, detallePagoId, direccion_id, referencia]
    );

    const pedidoId = pedidoResult.insertId;

    // Insertar detalles del pedido y actualizar inventario
    for (const item of productos) {
      const { producto_id, cantidad, precio_unitario } = item;

      // Verificar disponibilidad
      const [inventario] = await connection.query(
        'SELECT Cantidad_Actual, Cantidad_Reservada FROM inventario WHERE idproducto = ?',
        [producto_id]
      );

      if (inventario.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: 'producto sin inventario',
          message: `El producto ${producto_id} no tiene inventario registrado`
        });
      }

      const disponible = inventario[0].Cantidad_Actual - inventario[0].Cantidad_Reservada;

      if (cantidad > disponible) {
        await connection.rollback();
        return res.status(400).json({
          error: 'Stock insuficiente',
          message: `Solo hay ${disponible} unidades disponibles del producto ${producto_id}`
        });
      }

      // Insertar detalle del pedido
      await connection.query(
        `INSERT INTO Detalles_Pedido (ID_Pedido, idproducto, Cantidad, Precio_Unitario) 
         VALUES (?, ?, ?, ?)`,
        [pedidoId, producto_id, cantidad, precio_unitario]
      );

      // Actualizar inventario (reservar cantidad)
      await connection.query(
        `UPDATE inventario 
         SET Cantidad_Reservada = Cantidad_Reservada + ?,
             Ultima_Actualización = NOW()
         WHERE idproducto = ?`,
        [cantidad, producto_id]
      );
    }

    // Crear seguimiento inicial (Estado: Pendiente)
    await connection.query(
      `INSERT INTO Seguimiento_Pedido (ID_Pedido, ID_Estado, Fecha, Detalles) 
       VALUES (?, 1, NOW(), 'Pedido recibido')`,
      [pedidoId]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      pedidoId,
      referencia
    });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Actualizar estado de pedido
exports.updateEstado = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { estado_id, detalles } = req.body;

    if (!estado_id) {
      return res.status(400).json({
        error: 'Estado requerido',
        message: 'Debe proporcionar un ID de estado válido'
      });
    }

    // Verificar que el pedido existe
    const [pedido] = await connection.query(
      'SELECT ID_Pedido FROM Pedido WHERE ID_Pedido = ?',
      [id]
    );

    if (pedido.length === 0) {
      return res.status(404).json({
        error: 'Pedido no encontrado',
        message: `No existe un pedido con ID ${id}`
      });
    }

    // Si el estado es "Entregado" (ID 4), actualizar inventario
    if (estado_id == 4) {
      const [detallesPedido] = await connection.query(
        'SELECT idproducto, Cantidad FROM Detalles_Pedido WHERE ID_Pedido = ?',
        [id]
      );

      for (const detalle of detallesPedido) {
        // Desreservar y reducir cantidad actual
        await connection.query(
          `UPDATE inventario 
           SET Cantidad_Actual = Cantidad_Actual - ?,
               Cantidad_Reservada = Cantidad_Reservada - ?,
               Ultima_Actualización = NOW()
           WHERE idproducto = ?`,
          [detalle.Cantidad, detalle.Cantidad, detalle.idproducto]
        );

        // Registrar salida
        const [pedidoRef] = await connection.query(
          'SELECT Referencia FROM Pedido WHERE ID_Pedido = ?',
          [id]
        );

        await connection.query(
          `INSERT INTO Movimiento_Salida (idproducto, Fecha, Cantidad, Referencia) 
           VALUES (?, NOW(), ?, ?)`,
          [detalle.idproducto, detalle.Cantidad, pedidoRef[0].Referencia]
        );
      }
    }

    // Si el estado es "Cancelado" (ID 5), liberar inventario reservado
    if (estado_id == 5) {
      const [detallesPedido] = await connection.query(
        'SELECT idproducto, Cantidad FROM Detalles_Pedido WHERE ID_Pedido = ?',
        [id]
      );

      for (const detalle of detallesPedido) {
        // Liberar cantidad reservada
        await connection.query(
          `UPDATE inventario 
           SET Cantidad_Reservada = Cantidad_Reservada - ?,
               Ultima_Actualización = NOW()
           WHERE idproducto = ?`,
          [detalle.Cantidad, detalle.idproducto]
        );
      }
    }

    // Insertar nuevo seguimiento
    await connection.query(
      `INSERT INTO Seguimiento_Pedido (ID_Pedido, ID_Estado, Fecha, Detalles) 
       VALUES (?, ?, NOW(), ?)`,
      [id, estado_id, detalles]
    );

    await connection.commit();

    res.json({ message: 'Estado del pedido actualizado exitosamente' });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// Obtener pedidos por cliente
exports.getByCliente = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { cliente_id } = req.params;

    const [pedidos] = await connection.query(`
      SELECT 
        p.ID_Pedido,
        p.Fecha,
        p.Referencia,
        e.Estado,
        dp.Total
      FROM Pedido p
      LEFT JOIN Seguimiento_Pedido sp ON p.ID_Pedido = sp.ID_Pedido
      LEFT JOIN CAT_Estados e ON sp.ID_Estado = e.ID_Estado
      LEFT JOIN Detalle_Pago dp ON p.ID_Detalle_Pago = dp.ID_Detalle_Pago
      WHERE p.ID_Cliente = ?
        AND sp.ID_Seguimiento = (
          SELECT MAX(ID_Seguimiento) 
          FROM Seguimiento_Pedido 
          WHERE ID_Pedido = p.ID_Pedido
        )
      ORDER BY p.Fecha DESC
    `, [cliente_id]);

    res.json(pedidos);

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Cancelar pedido
exports.cancelar = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar estado actual
    const [seguimiento] = await connection.query(`
      SELECT sp.ID_Estado, e.Estado
      FROM Seguimiento_Pedido sp
      INNER JOIN CAT_Estados e ON sp.ID_Estado = e.ID_Estado
      WHERE sp.ID_Pedido = ?
      ORDER BY sp.Fecha DESC
      LIMIT 1
    `, [id]);

    if (seguimiento.length === 0) {
      return res.status(404).json({
        error: 'Pedido no encontrado',
        message: `No existe un pedido con ID ${id}`
      });
    }

    // No se puede cancelar si ya está entregado
    if (seguimiento[0].ID_Estado == 4) {
      return res.status(400).json({
        error: 'No se puede cancelar',
        message: 'El pedido ya ha sido entregado'
      });
    }

    // Liberar inventario reservado
    const [detallesPedido] = await connection.query(
      'SELECT idproducto, Cantidad FROM Detalles_Pedido WHERE ID_Pedido = ?',
      [id]
    );

    for (const detalle of detallesPedido) {
      await connection.query(
        `UPDATE inventario 
         SET Cantidad_Reservada = Cantidad_Reservada - ?,
             Ultima_Actualización = NOW()
         WHERE idproducto = ?`,
        [detalle.Cantidad, detalle.idproducto]
      );
    }

    // Insertar seguimiento de cancelación (Estado: Cancelado = 5)
    await connection.query(
      `INSERT INTO Seguimiento_Pedido (ID_Pedido, ID_Estado, Fecha, Detalles) 
       VALUES (?, 5, NOW(), ?)`,
      [id, motivo || 'Pedido cancelado por el cliente']
    );

    await connection.commit();

    res.json({ message: 'Pedido cancelado exitosamente' });

  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};