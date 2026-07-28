const express = require('express');
const { bookAppointment, listAppointments, updateAppointmentStatus } = require('../controllers/appointmentController');
const router = express.Router();

router.get('/', listAppointments);
router.post('/', bookAppointment);
router.patch('/:id/status', updateAppointmentStatus);

module.exports = router;
