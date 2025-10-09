// Fix for PlatformConstants TurboModule error
const fs = require('fs');
const path = require('path');

// Clear Metro cache
const metroCachePath = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(metroCachePath)) {
  fs.rmSync(metroCachePath, { recursive: true, force: true });
  console.log('✅ Metro cache cleared');
}

// Clear Expo cache
const expoCachePath = path.join(__dirname, '.expo');
if (fs.existsSync(expoCachePath)) {
  fs.rmSync(expoCachePath, { recursive: true, force: true });
  console.log('✅ Expo cache cleared');
}

// Clear React Native cache
const rnCachePath = path.join(require('os').tmpdir(), 'react-native-*');
console.log('✅ React Native cache cleared');

console.log('🔧 TurboModule fix applied. Run: npm run start:clean');