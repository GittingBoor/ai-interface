import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const SALT_BYTES = 16
const KEY_BYTES = 32
const PREFIX = 'scrypt'

export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_BYTES)
  return `${PREFIX}$${salt.toString('hex')}$${scryptSync(pin, salt, KEY_BYTES).toString('hex')}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [prefix, saltHex, hashHex] = stored.split('$')
  if (prefix !== PREFIX || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  // Kaputter Hash (falsche Länge) darf nie „passt“ ergeben – scrypt mit Länge 0 wäre sonst immer gleich.
  if (expected.length !== KEY_BYTES) return false
  const actual = scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
