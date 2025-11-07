const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, pedidosController.getAll);
router.get('/:id', requireAuth, pedidosController.getById);
router.post('/', requireAuth, pedidosController.create);
router.put('/:id/estado', requireAuth, pedidosController.updateEstado);
router.get('/cliente/:cliente_id', requireAuth, pedidosController.getByCliente);
router.post('/:id/cancelar', requireAuth, pedidosController.cancelar);

module.exports = router;