const assert = require('assert');
const { createProperty } = require('../controllers/propertyController');
const { addReview } = require('../controllers/reviewController');

async function run() {
  const propertyReq = {
    body: { title: 'Mongo Test Property', description: 'Saved in the database', price: 250000 },
  };
  const propertyRes = {
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

  await createProperty(propertyReq, propertyRes);
  assert.strictEqual(propertyRes.statusCode, 201, 'Property create should return 201');
  assert.ok(propertyRes.body && propertyRes.body.property, 'Property create response should include a property payload');

  const reviewReq = {
    body: { rating: 5, comment: 'Mongo-backed review saved successfully' },
  };
  const reviewRes = {
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

  await addReview(reviewReq, reviewRes);
  assert.strictEqual(reviewRes.statusCode, 201, 'Review create should return 201');
  assert.ok(reviewRes.body && reviewRes.body.review, 'Review create response should include a review payload');

  console.log('Persistence flow smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
