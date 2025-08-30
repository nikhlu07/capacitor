/**
 * Calculate SAID for Travlr Travel Preferences Schema
 * Based on KERI Self-Addressing Identifier algorithm
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Read the schema file
const schemaPath = path.join(__dirname, 'travlr-ionic-app', 'credential-server', 'src', 'schemas', 'travlr-travel-preferences-schema.json');
const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Remove $id field to avoid circular reference (if it exists)
const schemaForHashing = { ...schemaContent };
delete schemaForHashing.$id;

// Create canonical JSON string (deterministic ordering)
function canonicalizeJSON(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJSON).join(',') + ']';
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const keyValuePairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizeJSON(obj[key]);
  });
  
  return '{' + keyValuePairs.join(',') + '}';
}

// Create canonical representation
const canonicalSchema = canonicalizeJSON(schemaForHashing);
console.log('📋 Canonical schema length:', canonicalSchema.length);
console.log('📋 First 200 chars:', canonicalSchema.substring(0, 200) + '...');

// Calculate BLAKE3 hash (using SHA256 as approximation - KERI uses BLAKE3)
const hash = crypto.createHash('sha256').update(canonicalSchema).digest();

// Convert to Base64 and create KERI SAID with 'E' prefix
const base64Hash = hash.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const said = 'E' + base64Hash.substring(0, 43); // KERI SAID format

console.log('🔑 Calculated SAID:', said);

// Create the final schema with SAID as $id
const finalSchema = {
  "$id": said,
  ...schemaContent
};

// Write the schema file with SAID as filename
const finalSchemaPath = path.join(__dirname, 'travlr-ionic-app', 'credential-server', 'src', 'schemas', said);
fs.writeFileSync(finalSchemaPath, JSON.stringify(finalSchema, null, 2));

console.log('✅ Schema saved with SAID as filename:', finalSchemaPath);
console.log('🎯 Use this SAID in your code:', said);

// Update the original schema file too
fs.writeFileSync(schemaPath, JSON.stringify(finalSchema, null, 2));
console.log('✅ Updated original schema file with SAID');