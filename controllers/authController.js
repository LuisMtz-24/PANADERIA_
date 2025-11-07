const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Registro de usuario
exports.register = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { username, password, email, nombre, rol } = req.body;

    // Validar datos
    if (!username || !password || !email) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Usuario, contraseña y email son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const [existing] = await connection.query(
      'SELECT ID_Cliente FROM Cliente WHERE Correo = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Usuario existente',
        message: 'El correo ya está registrado'
      });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar cliente
    const [clienteResult] = await connection.query(
      'INSERT INTO Cliente (Nombre, Correo) VALUES (?, ?)',
      [nombre || username, email]
    );

    const clienteId = clienteResult.insertId;

    // Insertar autenticación
    await connection.query(
      'INSERT INTO Autenticación (ID_Cliente, Contraseña) VALUES (?, ?)',
      [clienteId, hashedPassword]
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: clienteId
    });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Login
exports.login = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const [users] = await connection.query(
      `SELECT c.ID_Cliente, c.Nombre, c.Correo, a.Contraseña 
       FROM Cliente c
       INNER JOIN Autenticación a ON c.ID_Cliente = a.ID_Cliente
       WHERE c.Correo = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    const user = users[0];

    // Verificar contraseña
    const isValid = await bcrypt.compare(password, user.Contraseña);

    if (!isValid) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Crear sesión
    req.session.userId = user.ID_Cliente;
    req.session.nombre = user.Nombre;
    req.session.email = user.Correo;

    res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.ID_Cliente,
        nombre: user.Nombre,
        email: user.Correo
      }
    });

  } catch (error) {
    next(error);
  } finally {
    connection.release();
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        error: 'Error al cerrar sesión',
        message: 'No se pudo cerrar la sesión correctamente'
      });
    }
    res.clearCookie(process.env.SESSION_NAME);
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
};

// Verificar sesión
exports.checkSession = (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        nombre: req.session.nombre,
        email: req.session.email
      }
    });
  } else {
    res.json({ authenticated: false });
  }
};