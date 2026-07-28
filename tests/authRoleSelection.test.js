const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole, isDemoAdminCredentials } = require('../controllers/authController');

test('normalizeRole keeps seller selection intact', () => {
  assert.equal(normalizeRole('seller'), 'seller');
});

test('normalizeRole falls back to user for unsupported roles', () => {
  assert.equal(normalizeRole('admin'), 'user');
  assert.equal(normalizeRole(undefined), 'user');
});

test('demo admin credentials are recognized', () => {
  assert.equal(isDemoAdminCredentials('admin@propertyhub.com', 'Admin@123'), true);
  assert.equal(isDemoAdminCredentials('admin@propertyhub.com', 'wrong-password'), false);
});
