// saknew_frontend/utils/directApiTest.ts
import axios from 'axios';

/**
 * Tests direct API connectivity to multiple IP addresses
 * This helps identify which IP address works for your setup
 */
export const testMultipleIps = async () => {
  console.log('=== TESTING MULTIPLE IP ADDRESSES ===');
  
  // List of possible IP addresses to test
  const ipAddresses = [
    'http://192.168.8.100:8000', // Your actual IP from ipconfig
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://10.0.2.2:8000',     // Android emulator special IP
    'http://192.168.8.102:8000' // Previously used IP
  ];
  
  // Test each IP address
  for (const ip of ipAddresses) {
    try {
      console.log(`Testing connection to: ${ip}`);
      const response = await axios.get(`${ip}/`, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      console.log(`✅ SUCCESS: ${ip} responded with status ${response.status}`);
    } catch (error) {
      console.log(`❌ FAILED: ${ip} - ${error.message}`);
    }
  }
  
  console.log('=== IP ADDRESS TESTING COMPLETE ===');
};

// Run the test immediately
testMultipleIps();