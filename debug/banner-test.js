// Test script to verify banner API endpoint
const API_URL = 'http://10.215.191.61:8000/api';

async function testBannerAPI() {
  console.log('Testing banner API...');
  
  try {
    const response = await fetch(`${API_URL}/public/banners`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Banner API Response:');
    console.log('Success:', data.success);
    console.log('Data length:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('First banner:', data.data[0]);
    }
    
    return data;
  } catch (error) {
    console.error('Error testing banner API:', error);
    throw error;
  }
}

// For Node.js testing - uncomment if needed
// testBannerAPI().then(() => console.log('Test completed')).catch(console.error);

module.exports = { testBannerAPI };
