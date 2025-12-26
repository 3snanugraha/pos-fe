const BASE_URL = 'http://127.0.0.1:8000/api';

// Simple test untuk API checkout
async function testCheckoutAPI() {
  console.log('=== Testing Checkout API dengan localhost ===\n');

  // Test 1: Get Payment Methods (public API)
  try {
    console.log('1. Testing Payment Methods...');
    const response = await fetch(`${BASE_URL}/customer/payment-methods`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('✅ Payment Methods API works!\n');
    
  } catch (error) {
    console.error('❌ Payment Methods Error:', error.message);
  }

  console.log('='.repeat(50) + '\n');

  // Test 2: Get Products (to get valid product IDs)
  try {
    console.log('2. Testing Products API...');
    const response = await fetch(`${BASE_URL}/customer/products?per_page=3`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Available Products:');
    
    if (data.data && data.data.length > 0) {
      data.data.forEach(product => {
        console.log(`- ID: ${product.id}, Name: ${product.nama_produk}, Price: ${product.harga}`);
      });
      console.log('✅ Products API works!\n');
    } else {
      console.log('❌ No products found');
    }
    
  } catch (error) {
    console.error('❌ Products Error:', error.message);
  }

  console.log('='.repeat(50) + '\n');

  // Test 3: Try Customer Login
  try {
    console.log('3. Testing Customer Login...');
    const response = await fetch(`${BASE_URL}/customer/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'trisnanugraha87@gmail.com',
        password: '123456',
        device_name: 'Debug Test Device'
      })
    });
    
    const data = await response.json();
    console.log('Login Status:', response.status);
    console.log('Login Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data && data.data.token) {
      const token = data.data.token;
      console.log('✅ Login successful! Token obtained.\n');
      
      // Test 4: Get Customer Addresses
      console.log('4. Testing Customer Addresses...');
      const addressResponse = await fetch(`${BASE_URL}/customer/addresses`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const addressData = await addressResponse.json();
      console.log('Addresses Status:', addressResponse.status);
      console.log('Addresses Response:', JSON.stringify(addressData, null, 2));
      console.log('✅ Customer Addresses API works!\n');

      console.log('='.repeat(50) + '\n');

      // Test 5: Create Test Order (CHECKOUT)
      console.log('5. Testing CREATE ORDER (CHECKOUT)...');
      const orderData = {
        items: [
          {
            produk_id: 1,
            varian_id: 1,
            jumlah: 1
          }
        ],
        metode_pembayaran_id: 1,
        alamat_pengiriman: "Jl. Test Checkout No. 123, Jakarta Pusat, DKI Jakarta 10001",
        catatan: "Test order dari debug script - API checkout test",
        promo_code: null,
        poin_digunakan: 0
      };
      
      console.log('Sending Order Data:');
      console.log(JSON.stringify(orderData, null, 2));
      
      const checkoutResponse = await fetch(`${BASE_URL}/customer/orders`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      
      const checkoutResult = await checkoutResponse.json();
      console.log('Checkout Status:', checkoutResponse.status);
      console.log('Checkout Response:', JSON.stringify(checkoutResult, null, 2));
      
      if (checkoutResult.success) {
        console.log('\n🎉 CHECKOUT API BERHASIL!');
        console.log('✅ Order Number:', checkoutResult.data.nomor_transaksi);
        console.log('✅ Total Amount:', checkoutResult.data.total_bayar);
        console.log('✅ Status:', checkoutResult.data.status);
        console.log('✅ Payment Method:', checkoutResult.data.metode_pembayaran);
      } else {
        console.log('\n❌ CHECKOUT FAILED');
        if (checkoutResult.errors) {
          console.log('Validation Errors:', checkoutResult.errors);
        }
      }
      
    } else {
      console.log('❌ Login failed - cannot test authenticated endpoints');
    }
    
  } catch (error) {
    console.error('❌ Login/Checkout Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Checkout API Test Complete!');
}

// Jalankan test
testCheckoutAPI();
