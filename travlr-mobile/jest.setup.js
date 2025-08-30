// Jest setup file

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {},
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock crypto modules for testing
global.crypto = {
  getRandomValues: jest.fn(() => new Uint8Array(32)),
  subtle: {
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
  },
};

// Mock react-native components
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  NativeModules: {},
  Platform: { OS: 'ios' },
}));