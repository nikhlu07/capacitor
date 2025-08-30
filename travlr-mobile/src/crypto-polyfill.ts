// Crypto polyfill for React Native using @noble/curves
// This replaces Node.js crypto dependencies with React Native compatible ones

import { p256 } from "@noble/curves/p256";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes as cryptoRandomBytes } from "expo-crypto";

// Polyfill the crypto module that SignifyTS expects
const crypto = {
  // Random bytes generation
  randomBytes(size: number): Uint8Array {
    return new Uint8Array(cryptoRandomBytes(size));
  },

  // Hash functions
  createHash(algorithm: string) {
    if (algorithm === 'sha256') {
      return {
        update(data: string | Uint8Array) {
          const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
          return {
            digest(encoding?: string) {
              const hash = sha256(input);
              if (encoding === 'hex') {
                return Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
              }
              return hash;
            }
          };
        }
      };
    }
    throw new Error(`Hash algorithm ${algorithm} not supported`);
  },

  // ECDSA signing/verification using Noble curves
  sign: {
    secp256r1: {
      sign(msgHash: Uint8Array, privateKey: Uint8Array): Uint8Array {
        const signature = p256.sign(msgHash, privateKey);
        return signature.toCompactRawBytes();
      },
      verify(msgHash: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
        try {
          return p256.verify(signature, msgHash, publicKey);
        } catch {
          return false;
        }
      },
      generateKeyPair() {
        const privateKey = p256.utils.randomPrivateKey();
        const publicKey = p256.getPublicKey(privateKey);
        return { privateKey, publicKey };
      }
    },
    
    secp256k1: {
      sign(msgHash: Uint8Array, privateKey: Uint8Array): Uint8Array {
        const signature = secp256k1.sign(msgHash, privateKey);
        return signature.toCompactRawBytes();
      },
      verify(msgHash: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
        try {
          return secp256k1.verify(signature, msgHash, publicKey);
        } catch {
          return false;
        }
      },
      generateKeyPair() {
        const privateKey = secp256k1.utils.randomPrivateKey();
        const publicKey = secp256k1.getPublicKey(privateKey);
        return { privateKey, publicKey };
      }
    }
  }
};

// Make crypto available globally for SignifyTS
(global as any).crypto = {
  ...crypto,
  getRandomValues(array: Uint8Array) {
    const randomBytes = cryptoRandomBytes(array.length);
    array.set(randomBytes);
    return array;
  }
};

// Export for direct use
export { crypto };
export { p256, secp256k1, sha256 };

console.log('✅ Crypto polyfill loaded - SignifyTS compatible crypto functions available');