// Debug script to test address API call
const API_BASE_URL = 'http://192.168.1.3:8000/api';

// Simulate getToken function
async function getStoredToken() {
  // You'll need to replace this with actual token from your app
  // Check your AsyncStorage or wherever tokens are stored
  console.log('=== NOTE: Replace this with your actual auth token ===');
  return 'YOUR_AUTH_TOKEN_HERE';
}

async function testAddressAPI() {
  try {
    const token = await getStoredToken();
    
    if (!token || token === 'YOUR_AUTH_TOKEN_HERE') {
      console.error('❌ Please set a valid auth token in the script');
      return;
    }
    
    const url = `${API_BASE_URL}/customer/addresses`;
    
    console.log('🔍 Testing API call to:', url);
    console.log('🔑 Using token:', token.substring(0, 20) + '...');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response statusText:', response.statusText);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API Response received');
    console.log('📦 Full response:', JSON.stringify(result, null, 2));
    
    // Analyze response structure
    console.log('\n=== RESPONSE ANALYSIS ===');
    console.log('Response keys:', Object.keys(result));
    console.log('Data type:', typeof result.data);
    console.log('Data is array:', Array.isArray(result.data));
    
    if (result.data && Array.isArray(result.data)) {
      console.log('Data length:', result.data.length);
      if (result.data.length > 0) {
        console.log('First item keys:', Object.keys(result.data[0]));
        console.log('First item sample:', result.data[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Network or other error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAddressAPI();
