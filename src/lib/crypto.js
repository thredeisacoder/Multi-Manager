'use client';

// =================== AES-256-GCM ENCRYPTION ===================
// Uses Web Crypto API — no external dependencies needed.
// The user's PIN is used to derive a 256-bit encryption key via PBKDF2.

const SALT = 'multi_manager_v1_salt'; // Fixed salt for key derivation
const ITERATIONS = 100000;

/**
 * Derive a CryptoKey from a plaintext PIN using PBKDF2.
 */
async function deriveKey(pin) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string → returns a Base64 string containing IV + ciphertext.
 */
export async function encrypt(plaintext, pin) {
  if (!plaintext || !pin) return plaintext;
  try {
    const key = await deriveKey(pin);
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    // Combine IV + ciphertext into one buffer, then Base64 encode
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return 'ENC:' + btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption failed:', err);
    return plaintext; // Fallback: return unencrypted
  }
}

/**
 * Decrypt a Base64 string (IV + ciphertext) → returns plaintext.
 */
export async function decrypt(encryptedStr, pin) {
  if (!encryptedStr || !pin) return encryptedStr;
  if (!encryptedStr.startsWith('ENC:')) return encryptedStr; // Not encrypted, return as-is
  try {
    const key = await deriveKey(pin);
    const raw = atob(encryptedStr.slice(4)); // Remove 'ENC:' prefix
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    // Suppress console error for decryption failures (common when PIN is wrong)
    // console.error('Decryption failed:', err); 
    return '[Decryption Failed]';
  }
}

/**
 * Fields that are considered sensitive and must be encrypted.
 */
export const SENSITIVE_FIELDS = [
  'password', 'password_etsy', 'password_mail',
  'ssn', 'dob',
  'twofa', 'twofa_etsy', 'twofa_mail',
  'recovery_code', 'recovery_code_etsy', 'recovery_code_mail',
  'bank_number', 'bank_routing_number',
  'full_name', 'address', 'phone',
  'mail', 'mail_recovery',
  'proxy',
];

/**
 * Check if a field key is sensitive.
 * Uses exact match against SENSITIVE_FIELDS list, plus keyword-based partial matching.
 */
export function isSensitiveField(key) {
  if (!key) return false;
  const lk = key.toLowerCase();
  
  // 1. Exact matches
  if (SENSITIVE_FIELDS.includes(lk)) return true;
  
  // 2. Keyword partial matches (more aggressive)
  const keywords = [
    'password', 'pass', 'pwd', 
    'ssn', 'dob', 'birth',
    'twofa', '2fa', 'otp', 'auth', 
    'recovery', 'code', 'backup',
    'bank', 'card', 'number', 'routing', 'account', 'iban',
    'secret', 'token', 'key', 'private',
    'proxy', 'ip',
    'mail', 'email',
    'address', 'phone', 'mobile',
    'name', 'fullname'
  ];
  
  const isMatch = keywords.some(kw => lk.includes(kw));
  return isMatch;
}

/**
 * Encrypt all sensitive fields in an account's data object.
 */
export async function encryptAccountData(data, pin) {
  if (!data || !pin) return data;
  const encrypted = { ...data };
  for (const key of Object.keys(encrypted)) {
    if (isSensitiveField(key) && encrypted[key] && !String(encrypted[key]).startsWith('ENC:')) {
      encrypted[key] = await encrypt(String(encrypted[key]), pin);
    }
  }
  return encrypted;
}

/**
 * Decrypt all sensitive fields in an account's data object.
 */
export async function decryptAccountData(data, pin) {
  if (!data || !pin) return data;
  const decrypted = { ...data };
  for (const key of Object.keys(decrypted)) {
    if (String(decrypted[key]).startsWith('ENC:')) {
      decrypted[key] = await decrypt(String(decrypted[key]), pin);
    }
  }
  return decrypted;
}

/**
 * Verify if the provided PIN is correct for the encrypted data using a 'canary' check.
 */
export async function verifyMasterKey(encryptedCheck, pin) {
  if (!encryptedCheck || !pin) return false;
  const decrypted = await decrypt(encryptedCheck, pin);
  return decrypted === 'OK';
}

/**
 * Get the current PIN from localStorage.
 */
export function getPin() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('app_pin');
}

export const MASTER_CHECK_KEY = 'encryption_check';
