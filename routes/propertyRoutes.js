const express = require('express');
const { listProperties, getPropertyById, createProperty } = require('../controllers/propertyController');
const router = express.Router();

router.get('/', listProperties);
router.get('/:id', getPropertyById);
router.post('/', createProperty);

module.exports = router;
