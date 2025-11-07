const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ 
    error: 'No autorizado',
    message: 'Debe iniciar sesión para acceder a este recurso'
  });
};

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.userId && req.session.rol === 'admin') {
    return next();
  }
  return res.status(403).json({ 
    error: 'Acceso denegado',
    message: 'No tiene permisos de administrador'
  });
};

module.exports = { requireAuth, requireAdmin };