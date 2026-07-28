const assert = require('assert');
const { updateAppointmentStatus } = require('../controllers/appointmentController');
const { addEntry } = require('../utils/inMemoryStore');

async function run() {
  const appointmentId = 'test-status-appointment';
  const appointment = addEntry('appointments', {
    _id: appointmentId,
    date: new Date().toISOString(),
    property: '64c000000000000000000001',
    user: '64c000000000000000000002',
    status: 'Pending',
    notes: '',
  });

  const req = {
    params: { id: appointmentId },
    body: { status: 'Confirmed' },
  };

  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  await updateAppointmentStatus(req, res);

  assert.strictEqual(res.statusCode, 200, 'Status update should return 200 on success');
  assert.ok(res.body && res.body.appointment, 'Status update response should contain an appointment payload');
  assert.strictEqual(res.body.appointment.status, 'Confirmed', 'Appointment status should be updated');
  assert.strictEqual(appointment.status, 'Confirmed', 'In-memory appointment status should be updated');

  console.log('Appointment status update test passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
