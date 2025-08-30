import 'react-native-get-random-values';

export class CryptoService {
  // Generate random bytes
  static getRandomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  // Generate UUID
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Simple hash (placeholder)
  static async sha256(data: string): Promise<string> {
    // Basic hash for React Native compatibility
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Simple base64 encoding
  static async encrypt(data: string, key: string): Promise<string> {
    return btoa(data);
  }

  static async decrypt(encryptedData: string, key: string): Promise<string> {
    return atob(encryptedData);
  }
}
