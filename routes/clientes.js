const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, clientesController.getAll);
router.get('/:id', requireAuth, clientesController.getById);
router.post('/', requireAuth, clientesController.create);
router.put('/:id', requireAuth, clientesController.update);
router.delete('/:id', requireAuth, clientesController.delete);
router.post('/:cliente_id/direccion', requireAuth, clientesController.addDireccion);

module.exports = router;