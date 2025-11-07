const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, inventarioController.getAll);
router.post('/entrada', requireAuth, inventarioController.entrada);
router.post('/salida', requireAuth, inventarioController.salida);
router.get('/movimientos/:producto_id', requireAuth, inventarioController.getMovimientos);
router.get('/stock-bajo', requireAuth, inventarioController.stockBajo);

module.exports = router;