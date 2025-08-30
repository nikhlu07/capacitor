// Real X25519 Encryption Service using LibSodium
// Replaces mock encryption with actual cryptographic operations

import { Alert } from 'react-native';

interface EncryptionResult {
  encryptedData: string;
  nonce: string;
  publicKey: string;
  algorithm: string;
  timestamp: string;
}

interface DecryptionParams {
  encryptedData: string;
  nonce: string;
  publicKey: string;
  privateKey: string;
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
  created: string;
}

export class RealEncryptionService {
  private sodium: any = null;
  private initialized: boolean = false;

  // Initialize LibSodium
  async initialize(): Promise<boolean> {
    try {
      console.log('🔐 Initializing LibSodium for real X25519 encryption...');
      
      // Try react-native-libsodium first
      try {
        const { Sodium } = await import('react-native-libsodium');
        await Sodium.ready;
        this.sodium = Sodium;
        console.log('✅ Using react-native-libsodium');
      } catch (libsodiumError) {
        console.log('⚠️ react-native-libsodium not available, trying react-native-sodium...');
        
        // Fallback to react-native-sodium
        try {
          const sodium = await import('react-native-sodium');
          this.sodium = sodium;
          console.log('✅ Using react-native-sodium');
        } catch (sodiumError) {
          console.error('❌ No sodium library available:', sodiumError);
          return false;
        }
      }
      
      this.initialized = true;
      console.log('✅ Real encryption service initialized with LibSodium');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize encryption service:', error);
      return false;
    }
  }

  // Generate X25519 key pair for encryption
  async generateKeyPair(): Promise<KeyPair> {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      console.log('🔑 Generating real X25519 key pair...');

      // Generate X25519 key pair using LibSodium
      let keyPair;
      
      if (this.sodium.crypto_box_keypair) {
        // react-native-libsodium API
        keyPair = this.sodium.crypto_box_keypair();
      } else if (this.sodium.crypto_box_curve25519xsalsa20poly1305_keypair) {
        // react-native-sodium API
        keyPair = this.sodium.crypto_box_curve25519xsalsa20poly1305_keypair();
      } else {
        throw new Error('No X25519 key generation available');
      }

      const result = {
        publicKey: this.sodium.to_base64(keyPair.publicKey),
        privateKey: this.sodium.to_base64(keyPair.privateKey),
        algorithm: 'X25519-XSalsa20-Poly1305',
        created: new Date().toISOString()
      };

      console.log('✅ Real X25519 key pair generated');
      return result;

    } catch (error) {
      console.error('❌ Failed to generate key pair:', error);
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }

  // Encrypt data using X25519 public key encryption
  async encryptData(
    data: string, 
    recipientPublicKey: string,
    senderPrivateKey?: string
  ): Promise<EncryptionResult> {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      console.log('🔐 Encrypting data with real X25519...');

      // Convert inputs from base64
      const publicKey = this.sodium.from_base64(recipientPublicKey);
      let privateKey;

      if (senderPrivateKey) {
        privateKey = this.sodium.from_base64(senderPrivateKey);
      } else {
        // Generate ephemeral key pair for this encryption
        const ephemeralKeyPair = await this.generateKeyPair();
        privateKey = this.sodium.from_base64(ephemeralKeyPair.privateKey);
      }

      // Generate random nonce
      const nonce = this.sodium.randombytes_buf(this.sodium.crypto_box_NONCEBYTES);

      // Encrypt using X25519
      const message = new TextEncoder().encode(data);
      
      let ciphertext;
      if (this.sodium.crypto_box_easy) {
        // react-native-libsodium API
        ciphertext = this.sodium.crypto_box_easy(message, nonce, publicKey, privateKey);
      } else if (this.sodium.crypto_box_curve25519xsalsa20poly1305) {
        // react-native-sodium API
        ciphertext = this.sodium.crypto_box_curve25519xsalsa20poly1305(
          message, nonce, publicKey, privateKey
        );
      } else {
        throw new Error('No encryption function available');
      }

      const result = {
        encryptedData: this.sodium.to_base64(ciphertext),
        nonce: this.sodium.to_base64(nonce),
        publicKey: recipientPublicKey,
        algorithm: 'X25519-XSalsa20-Poly1305',
        timestamp: new Date().toISOString()
      };

      console.log('✅ Data encrypted with real X25519');
      return result;

    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  // Decrypt data using X25519 private key
  async decryptData(params: DecryptionParams): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      console.log('🔓 Decrypting data with real X25519...');

      // Convert from base64
      const ciphertext = this.sodium.from_base64(params.encryptedData);
      const nonce = this.sodium.from_base64(params.nonce);
      const publicKey = this.sodium.from_base64(params.publicKey);
      const privateKey = this.sodium.from_base64(params.privateKey);

      // Decrypt using X25519
      let plaintext;
      if (this.sodium.crypto_box_open_easy) {
        // react-native-libsodium API
        plaintext = this.sodium.crypto_box_open_easy(ciphertext, nonce, publicKey, privateKey);
      } else if (this.sodium.crypto_box_curve25519xsalsa20poly1305_open) {
        // react-native-sodium API
        plaintext = this.sodium.crypto_box_curve25519xsalsa20poly1305_open(
          ciphertext, nonce, publicKey, privateKey
        );
      } else {
        throw new Error('No decryption function available');
      }

      if (!plaintext) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      const result = new TextDecoder().decode(plaintext);
      console.log('✅ Data decrypted with real X25519');
      return result;

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Encrypt master card data (employee's complete travel profile)
  async encryptMasterCard(
    travelData: any,
    employeeKeyPair: KeyPair
  ): Promise<{
    encryptedData: string;
    metadata: any;
    dataHash: string;
  }> {
    try {
      console.log('🏷️ Encrypting master card with real X25519...');

      const dataString = JSON.stringify(travelData);
      
      // Self-encrypt with employee's own keys for zero-trust storage
      const encryption = await this.encryptData(
        dataString,
        employeeKeyPair.publicKey,
        employeeKeyPair.privateKey
      );

      const metadata = {
        algorithm: encryption.algorithm,
        version: '1.0.0',
        encryptedFor: 'employee_self',
        encryptionMethod: 'X25519_self_encryption',
        timestamp: encryption.timestamp,
        nonce: encryption.nonce,
        keyFingerprint: this.calculateKeyFingerprint(employeeKeyPair.publicKey)
      };

      // Calculate hash of encrypted data for integrity
      const dataHash = await this.calculateDataHash(encryption.encryptedData);

      console.log('✅ Master card encrypted with real cryptography');

      return {
        encryptedData: encryption.encryptedData,
        metadata,
        dataHash
      };

    } catch (error) {
      console.error('❌ Master card encryption failed:', error);
      throw new Error(`Master card encryption failed: ${error.message}`);
    }
  }

  // Encrypt context card for company (selective data sharing)
  async encryptContextCard(
    selectedData: any,
    companyPublicKey: string,
    employeePrivateKey: string,
    sharedFields: string[]
  ): Promise<{
    encryptedData: string;
    metadata: any;
    dataHash: string;
  }> {
    try {
      console.log('🏢 Encrypting context card for company with real X25519...');

      // Create context card with only selected fields
      const contextCard = {
        sharedFields,
        data: selectedData,
        sharedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const dataString = JSON.stringify(contextCard);
      
      // Encrypt for company using their public key
      const encryption = await this.encryptData(
        dataString,
        companyPublicKey,
        employeePrivateKey
      );

      const metadata = {
        algorithm: encryption.algorithm,
        version: '1.0.0',
        encryptedFor: 'company',
        encryptionMethod: 'X25519_company_encryption',
        timestamp: encryption.timestamp,
        nonce: encryption.nonce,
        sharedFields,
        keyFingerprint: this.calculateKeyFingerprint(companyPublicKey)
      };

      const dataHash = await this.calculateDataHash(encryption.encryptedData);

      console.log('✅ Context card encrypted for company with real cryptography');

      return {
        encryptedData: encryption.encryptedData,
        metadata,
        dataHash
      };

    } catch (error) {
      console.error('❌ Context card encryption failed:', error);
      throw new Error(`Context card encryption failed: ${error.message}`);
    }
  }

  // Calculate key fingerprint for verification
  private calculateKeyFingerprint(publicKey: string): string {
    try {
      // Use SHA-256 hash of public key as fingerprint
      const hash = this.sodium.crypto_hash_sha256(this.sodium.from_base64(publicKey));
      return this.sodium.to_base64(hash).substring(0, 16); // First 16 chars
    } catch (error) {
      console.warn('Failed to calculate key fingerprint:', error);
      return 'unknown';
    }
  }

  // Calculate data hash for integrity verification
  private async calculateDataHash(data: string): Promise<string> {
    try {
      const hash = this.sodium.crypto_hash_sha256(new TextEncoder().encode(data));
      return this.sodium.to_base64(hash);
    } catch (error) {
      console.warn('Failed to calculate data hash:', error);
      return 'unknown';
    }
  }

  // Verify encryption service is working
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          details: { error: 'Not initialized' }
        };
      }

      // Test encryption/decryption cycle
      const testData = 'Hello X25519 encryption!';
      const keyPair = await this.generateKeyPair();
      
      const encrypted = await this.encryptData(testData, keyPair.publicKey, keyPair.privateKey);
      const decrypted = await this.decryptData({
        encryptedData: encrypted.encryptedData,
        nonce: encrypted.nonce,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      });

      const isWorking = decrypted === testData;

      return {
        status: isWorking ? 'healthy' : 'unhealthy',
        details: {
          initialized: this.initialized,
          libraryAvailable: !!this.sodium,
          encryptionTest: isWorking,
          algorithm: 'X25519-XSalsa20-Poly1305'
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const realEncryptionService = new RealEncryptionService();
export default realEncryptionService;