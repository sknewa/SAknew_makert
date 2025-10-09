// Clear expired tokens
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearTokens = async () => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
  console.log('✅ Tokens cleared');
};

clearTokens();