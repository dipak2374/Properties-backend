const assert = require('assert');
const Property = require('../models/Property');
const { deleteProperty } = require('../controllers/propertyController');

async function run() {
  const originalFindByIdAndDelete = Property.findByIdAndDelete;
  Property.findByIdAndDelete = async () => null;

  try {
    const req = {
      params: { id: '64c000000000000000000001' },
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

    await deleteProperty(req, res);

    assert.strictEqual(res.statusCode, 404, 'Missing property should return 404');
    assert.ok(res.body && res.body.message, 'Delete response should include a message');
    console.log('Property deletion test passed');
  } finally {
    Property.findByIdAndDelete = originalFindByIdAndDelete;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
