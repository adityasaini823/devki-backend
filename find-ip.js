// Quick script to find your local IP address
// Run: node find-ip.js

import os from 'os';
const networkInterfaces = os.networkInterfaces();

console.log('\n🔍 Finding your local IP address...\n');

let found = false;

Object.keys(networkInterfaces).forEach((interfaceName) => {
  const addresses = networkInterfaces[interfaceName];
  
  addresses.forEach((address) => {
    // Look for IPv4 addresses that are not internal (localhost)
    if (address.family === 'IPv4' && !address.internal) {
      // Filter out common non-local IPs
      if (
        !address.address.startsWith('169.254') && // Link-local
        address.address !== '127.0.0.1'
      ) {
        console.log(`✅ Found IP: ${address.address}`);
        console.log(`   Interface: ${interfaceName}`);
        console.log(`   Use this in frontend/src/config/api.ts`);
        console.log(`   API URL: http://${address.address}:3001/api\n`);
        found = true;
      }
    }
  });
});

if (!found) {
  console.log('❌ Could not find a local network IP address.');
  console.log('   Make sure you are connected to Wi-Fi.\n');
}

