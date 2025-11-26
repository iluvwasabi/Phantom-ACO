const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this-immediately';

if (ENCRYPTION_KEY === 'default-key-change-this-immediately') {
  console.warn('WARNING: Using default encryption key. Please set ENCRYPTION_KEY in .env file!');
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted text
 */
const encrypt = (text) => {
  if (!text) return null;
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text
 * @returns {string} Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Hash data (one-way, for verification)
 * @param {string} text - Text to hash
 * @returns {string} Hashed text
 */
const hash = (text) => {
  return CryptoJS.SHA256(text).toString();
};

module.exports = {
  encrypt,
  decrypt,
  hash
};
