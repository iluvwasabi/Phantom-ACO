#!/usr/bin/env node

/**
 * Key Generation Utility
 * Generates secure random keys for encryption and sessions
 */

const crypto = require('crypto');

console.log('\n=== ACO Service - Key Generator ===\n');

// Generate encryption key (32 bytes for AES-256)
const encryptionKey = crypto.randomBytes(32).toString('hex').slice(0, 32);

// Generate session secret (64 bytes)
const sessionSecret = crypto.randomBytes(64).toString('hex');

console.log('Generated secure keys for your .env file:\n');

console.log('ENCRYPTION_KEY (32 characters for AES-256):');
console.log(encryptionKey);
console.log('');

console.log('SESSION_SECRET:');
console.log(sessionSecret);
console.log('');

console.log('Copy these values to your .env file!');
console.log('\nExample .env entries:');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('');

// Also generate a random API key for webhooks if needed
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('Bonus - API Key (for webhooks/API access):');
console.log(apiKey);
console.log('');

console.log('=== Key Generation Complete ===\n');
