import test from 'node:test';
import assert from 'node:assert/strict';
import { createToken, hashPassword, readToken, verifyPassword } from '../src/security.js';

test('password is stored as a salted hash and verifies only the right password', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  assert.notEqual(first, 'correct horse battery staple');
  assert.notEqual(first, second, 'each password hash should use its own salt');
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('signed session tokens verify, reject tampering, and expire', () => {
  const now = Date.UTC(2026, 10, 1);
  const token = createToken('user-123', now);
  assert.equal(readToken(token, now), 'user-123');
  assert.equal(readToken(`${token}x`, now), null);
  assert.equal(readToken(token, now + 8 * 24 * 60 * 60 * 1000), null);
});
