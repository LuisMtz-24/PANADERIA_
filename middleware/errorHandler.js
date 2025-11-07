const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de base de datos
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      error: 'Error de base de datos',
      message: 'Hubo un problema al procesar su solicitud',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: err.message,
      details: err.errors
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    message: 'Ocurrió un error inesperado',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;