const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { requireAuth } = require('../middleware/auth');

// Rutas públicas
router.get('/', productosController.getAll);
router.get('/temporada', productosController.getTemporada);
router.get('/:id', productosController.getById);

// Rutas protegidas
router.post('/', requireAuth, productosController.create);
router.put('/:id', requireAuth, productosController.update);
router.delete('/:id', requireAuth, productosController.delete);

module.exports = router;