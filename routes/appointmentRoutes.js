const express = require('express');
const { bookAppointment, listAppointments } = require('../controllers/appointmentController');
const router = express.Router();

router.get('/', listAppointments);
router.post('/', bookAppointment);

module.exports = router;
