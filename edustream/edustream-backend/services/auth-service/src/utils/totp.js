import crypto from 'crypto';

// RFC 4648 Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 encoded secret key (20 bytes = 160 bits, standard for TOTP)
 */
export const generateTotpSecret = (length = 20) => {
  const buffer = crypto.randomBytes(length);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

/**
 * Decode Base32 string to Buffer
 */
const base32ToBuffer = (base32Str) => {
  const cleaned = base32Str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue; // Skip invalid characters
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

/**
 * Calculate TOTP token for a given counter and secret (RFC 6238 / RFC 4226)
 */
const generateHOTP = (secretBase32, counter) => {
  const key = base32ToBuffer(secretBase32);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
};

/**
 * Verify a TOTP code against a secret with a +/- 1 step window (30-second drift allowance)
 */
export const verifyTotpCode = (token, secretBase32, window = 1) => {
  if (!token || !secretBase32) return false;
  const currentCounter = Math.floor(Date.now() / 1000 / 30);

  for (let i = -window; i <= window; i++) {
    const generated = generateHOTP(secretBase32, currentCounter + i);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(generated))) {
      return true;
    }
  }

  return false;
};

/**
 * Build OTP Auth URI for scanning into Google Authenticator, Authy, etc.
 */
export const buildOtpAuthUri = (email, secret, issuer = 'EduStream') => {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
};

/**
 * Generate 8 human-friendly emergency backup recovery codes (e.g., "A3F8-9BC1")
 * and return both plain codes and SHA-256 hashed records for database storage.
 */
export const generateRecoveryCodes = (count = 8) => {
  const plainCodes = [];
  const hashedRecords = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');

    plainCodes.push(formatted);
    hashedRecords.push({ codeHash: hash, used: false });
  }

  return { plainCodes, hashedRecords };
};

/**
 * Verify a recovery code against stored recovery records
 */
export const verifyRecoveryCode = (enteredCode, storedRecords) => {
  if (!enteredCode || !Array.isArray(storedRecords)) return { valid: false, index: -1 };
  const normalized = enteredCode.trim().toUpperCase();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');

  const index = storedRecords.findIndex((r) => !r.used && r.codeHash === hash);
  return { valid: index !== -1, index };
};
