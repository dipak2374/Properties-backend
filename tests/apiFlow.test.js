const assert = require('assert');
const { bookAppointment } = require('../controllers/appointmentController');
const { sendMessage } = require('../controllers/messageController');

async function run() {
  const req = {
    body: { date: '2026-08-01T10:00:00.000Z', property: '64c000000000000000000001' },
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

  await bookAppointment(req, res);
  assert.strictEqual(res.statusCode, 201, 'Appointment should return 201 on success');
  assert.ok(res.body && res.body.appointment, 'Appointment response should contain an appointment payload');

  const msgReq = { body: { content: 'Hello from the API flow test', sender: '64c000000000000000000002' } };
  const msgRes = {
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

  await sendMessage(msgReq, msgRes);
  assert.strictEqual(msgRes.statusCode, 201, 'Message should return 201 on success');
  assert.ok(msgRes.body && msgRes.body.message, 'Message response should contain a message payload');
  console.log('API flow smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
