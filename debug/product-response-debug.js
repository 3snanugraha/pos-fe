// Debug script untuk mengecek actual response dari API backend
// Jalankan: node debug/product-response-debug.js

const API_URL = 'http://192.168.100.36:8000/api';

async function testProductAPI() {
  try {
    console.log('🔍 Testing Product API Response Structure...\n');
    
    // Test login first to get token
    const loginResponse = await fetch(`${API_URL}/customer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: 'customer@example.com', // Ganti dengan email customer yang valid
        password: 'password123', // Ganti dengan password yang valid
        device_name: 'debug-script',
      }),
    });

    const loginResult = await loginResponse.json();
    console.log('🔑 Login Response:');
    console.log(JSON.stringify(loginResult, null, 2));
    
    if (!loginResult.success || !loginResult.data?.token) {
      console.log('❌ Login failed, cannot continue');
      return;
    }
    
    const token = loginResult.data.token;
    console.log('\n✅ Login successful, token obtained\n');
    
    // Test products list
    console.log('📋 Testing Products List API...');
    const productsResponse = await fetch(`${API_URL}/customer/products?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    const productsResult = await productsResponse.json();
    console.log('Products List Response:');
    console.log(JSON.stringify(productsResult, null, 2));
    
    if (productsResult.success && productsResult.data?.data?.length > 0) {
      const firstProduct = productsResult.data.data[0];
      const productId = firstProduct.id;
      
      console.log(`\n🔍 Testing Product Detail API for ID: ${productId}...`);
      
      // Test product detail
      const detailResponse = await fetch(`${API_URL}/customer/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      
      const detailResult = await detailResponse.json();
      console.log('Product Detail Response:');
      console.log(JSON.stringify(detailResult, null, 2));
      
      // Analyze the response structure
      console.log('\n📊 Analysis:');
      console.log('- Product has harga_jual_from_variants:', detailResult.data?.harga_jual_from_variants !== undefined);
      console.log('- Product has stokProduk:', detailResult.data?.stokProduk !== undefined);
      console.log('- Product has stok_tersedia attribute:', detailResult.data?.stok_tersedia !== undefined);
      console.log('- Product has varian array:', Array.isArray(detailResult.data?.varian));
      console.log('- Product has gambar array:', Array.isArray(detailResult.data?.gambar));
      
      if (detailResult.data?.stokProduk) {
        console.log('- StokProduk structure:', Object.keys(detailResult.data.stokProduk));
      }
      
      if (detailResult.data?.varian?.length > 0) {
        console.log('- First Varian structure:', Object.keys(detailResult.data.varian[0]));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProductAPI();