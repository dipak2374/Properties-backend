const express = require('express');
const { listProperties, getPropertyById, createProperty, deleteProperty } = require('../controllers/propertyController');
const router = express.Router();

router.get('/', listProperties);
router.get('/:id', getPropertyById);
router.post('/', createProperty);
router.delete('/:id', deleteProperty);

module.exports = router;
