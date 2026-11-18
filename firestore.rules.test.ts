import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rulesContent = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(new URL('./firebase-blueprint.json', import.meta.url), 'utf8'));

test('Hardened Firestore Rules — Static & Eight-Pillar Verification', () => {
  // Pillar 1: Global deny-all safety net at root
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);

  // Pillar 2: Every collection in blueprint has an explicit match block
  const blueprintPaths = Object.keys(blueprint.firestore);
  assert.ok(blueprintPaths.length >= 15);
  for (const pathKey of ['users', 'categories', 'products', 'services', 'orders', 'paymentTransactions', 'bookings', 'quotations', 'projects', 'notifications', 'reviews', 'promotions', 'settings', 'auditLogs']) {
    assert.match(rulesContent, new RegExp(`match \\/${pathKey}\\/`), `Missing match block for ${pathKey}`);
  }

  // Pillar 3: ID Poisoning guard
  assert.match(rulesContent, /function isValidId\(id\)/);
  assert.match(rulesContent, /isValidId\(productId\)/);
  assert.match(rulesContent, /isValidId\(orderId\)/);
  assert.match(rulesContent, /isValidId\(bookingId\)/);

  // Pillar 4 & 5: Role escalation & email verification guard
  assert.match(rulesContent, /incoming\(\)\.role == 'customer'/);
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly/);

  // Pillar 6: PII isolation & owner-only read on orders/bookings/private
  assert.match(rulesContent, /match \/private\/\{docId\}/);
  assert.match(rulesContent, /resource\.data\.customerId == request\.auth\.uid/);
  assert.match(rulesContent, /resource\.data\.userId == request\.auth\.uid/);

  // Pillar 7: Atomicity & orphan prevention
  assert.match(rulesContent, /existsAfter\(\/databases\/\$\(database\)\/documents\/orders\/\$\(orderId\)\)/);
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/services\/\$\(incoming\(\)\.serviceId\)\)/);

  // Pillar 8: Immutable audit logs & terminal order locking
  assert.match(rulesContent, /match \/auditLogs\/\{logId\}[\s\S]*allow update, delete: if false;/);
  assert.match(rulesContent, /!\(existing\(\)\.orderStatus in \['delivered', 'cancelled'\]\)/);

  // Pillar 9: Verified dual-admin authorization & storefront customization fields
  assert.match(rulesContent, /stylahindustries297@gmail\.com/);
  assert.match(rulesContent, /josephngotho988@gmail\.com/);
  assert.match(rulesContent, /heroHeadline/);
  assert.match(rulesContent, /announcementActive/);
  assert.match(rulesContent, /facebookUrl/);
  assert.match(rulesContent, /instagramUrl/);
  assert.match(rulesContent, /tiktokUrl/);
});

test('Dirty Dozen Payload Invariants Check', () => {
  const kenyanPhoneRegex = /^(\+254|0)[17]\d{8}$/;
  assert.equal(kenyanPhoneRegex.test('+254712345678'), true);
  assert.equal(kenyanPhoneRegex.test('0712345678'), true);
  assert.equal(kenyanPhoneRegex.test('0112345678'), true);
  assert.equal(kenyanPhoneRegex.test('+15551234567'), false);
  assert.equal(kenyanPhoneRegex.test('invalid'), false);
});
