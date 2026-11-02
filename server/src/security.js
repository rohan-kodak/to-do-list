import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const fallbackSecret = 'local-development-secret-change-this-before-deployment-2026';
const tokenSecret = () => process.env.AUTH_SECRET || fallbackSecret;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !/^[a-f0-9]{128}$/i.test(hash || '')) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createToken(userId, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), exp: Math.floor(now / 1000) + 60 * 60 * 24 * 7 })).toString('base64url');
  const signature = createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', tokenSecret()).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof decoded.sub !== 'string' || decoded.exp <= Math.floor(now / 1000)) return null;
    return decoded.sub;
  } catch { return null; }
}
