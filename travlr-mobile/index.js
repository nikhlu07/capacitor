import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './TravlrApp';

// Register the main application component
AppRegistry.registerComponent('main', () => App);

// For web platform
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  AppRegistry.runApplication('main', {
    initialProps: {},
    rootTag: document.getElementById('root') || document.getElementById('main')
  });
}
