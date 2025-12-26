const BASE_URL = 'http://10.215.191.61:8000/api';

// Test function untuk mengecek response API Checkout
async function testCheckoutAPI() {
  console.log('=== Testing Checkout API Endpoints ===\n');

  // First, let's get a valid auth token for customer ID 4
  let authToken = null;

  // Test 1: Login to get auth token
  try {
    console.log('1. Getting auth token for customer...');
    const loginResponse = await fetch(`${BASE_URL}/customer/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'trisnanugraha87@gmail.com', // Customer yang sudah ada di database
        password: 'password123'             // Asumsi password default
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login Response Status:', loginResponse.status);
    console.log('Login Response:', JSON.stringify(loginData, null, 2));
    
    if (loginData.success && loginData.data.token) {
      authToken = loginData.data.token;
      console.log('Auth token obtained successfully!');
    } else {
      console.log('Failed to get auth token, will test without authentication');
    }
    
  } catch (error) {
    console.error('Error getting auth token:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Get Payment Methods
  try {
    console.log('2. Testing fetchPaymentMethods...');
    const paymentResponse = await fetch(`${BASE_URL}/customer/payment-methods`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });
    
    const paymentData = await paymentResponse.json();
    console.log('Payment Methods Response Status:', paymentResponse.status);
    console.log('Payment Methods Response:');
    console.log(JSON.stringify(paymentData, null, 2));
    
  } catch (error) {
    console.error('Error testing fetchPaymentMethods:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Get Customer Addresses (requires auth)
  if (authToken) {
    try {
      console.log('3. Testing fetchCustomerAddresses...');
      const addressResponse = await fetch(`${BASE_URL}/customer/addresses`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const addressData = await addressResponse.json();
      console.log('Customer Addresses Response Status:', addressResponse.status);
      console.log('Customer Addresses Response:');
      console.log(JSON.stringify(addressData, null, 2));
      
    } catch (error) {
      console.error('Error testing fetchCustomerAddresses:', error);
    }
  } else {
    console.log('3. Skipping fetchCustomerAddresses - no auth token');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Test Promo Code Validation (requires auth)
  if (authToken) {
    try {
      console.log('4. Testing promo code validation...');
      const promoResponse = await fetch(`${BASE_URL}/customer/promotions/validate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          kode_promo: 'DISKON10',
          total_belanja: 100000
        })
      });
      
      const promoData = await promoResponse.json();
      console.log('Promo Validation Response Status:', promoResponse.status);
      console.log('Promo Validation Response:');
      console.log(JSON.stringify(promoData, null, 2));
      
    } catch (error) {
      console.error('Error testing promo validation:', error);
    }
  } else {
    console.log('4. Skipping promo validation - no auth token');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Create Customer Order (requires auth)
  if (authToken) {
    try {
      console.log('5. Testing createCustomerOrder...');
      
      // Sample order data
      const orderData = {
        items: [
          {
            produk_id: 1,
            varian_id: 1,
            jumlah: 2
          },
          {
            produk_id: 2,
            varian_id: null,
            jumlah: 1
          }
        ],
        metode_pembayaran_id: 1,
        alamat_pengiriman: "Jl. Test No. 123, Jakarta Selatan, DKI Jakarta 12345",
        catatan: "Test order dari debug script",
        promo_code: null,
        poin_digunakan: 0
      };
      
      console.log('Order data to be sent:');
      console.log(JSON.stringify(orderData, null, 2));
      
      const orderResponse = await fetch(`${BASE_URL}/customer/orders`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(orderData)
      });
      
      const orderResult = await orderResponse.json();
      console.log('Create Order Response Status:', orderResponse.status);
      console.log('Create Order Response:');
      console.log(JSON.stringify(orderResult, null, 2));
      
      if (orderResult.success) {
        console.log('\n✅ ORDER CREATED SUCCESSFULLY!');
        console.log('Order Number:', orderResult.data.nomor_transaksi);
        console.log('Total Amount:', orderResult.data.total_bayar);
        console.log('Status:', orderResult.data.status);
      } else {
        console.log('\n❌ ORDER CREATION FAILED');
        if (orderResult.errors) {
          console.log('Validation Errors:', orderResult.errors);
        }
      }
      
    } catch (error) {
      console.error('Error testing createCustomerOrder:', error);
    }
  } else {
    console.log('5. Skipping createCustomerOrder - no auth token');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Get Customer Orders (requires auth)
  if (authToken) {
    try {
      console.log('6. Testing fetchCustomerOrders...');
      const ordersResponse = await fetch(`${BASE_URL}/customer/orders?per_page=5`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const ordersData = await ordersResponse.json();
      console.log('Customer Orders Response Status:', ordersResponse.status);
      console.log('Customer Orders Response:');
      console.log(JSON.stringify(ordersData, null, 2));
      
    } catch (error) {
      console.error('Error testing fetchCustomerOrders:', error);
    }
  } else {
    console.log('6. Skipping fetchCustomerOrders - no auth token');
  }

  console.log('\n=== Checkout API Testing Complete ===');
}

// Helper function to test with existing customer credentials
async function testWithKnownCredentials() {
  console.log('=== Testing with predefined test credentials ===\n');
  
  // Try testing with customer ID 4 that we know exists
  try {
    console.log('Testing direct order creation with sample data...');
    
    const orderData = {
      items: [
        {
          produk_id: 1,
          varian_id: 1,
          jumlah: 1
        }
      ],
      metode_pembayaran_id: 1,
      alamat_pengiriman: "Jl. Test Debug No. 999, Jakarta, Indonesia",
      catatan: "Test order dari debug - tanpa auth"
    };
    
    console.log('Sending order data:', JSON.stringify(orderData, null, 2));
    
    const response = await fetch(`${BASE_URL}/customer/orders`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error in direct test:', error);
  }
}

// Jalankan test
console.log('Starting Checkout API Tests...\n');
testCheckoutAPI().then(() => {
  console.log('\n' + '='.repeat(60) + '\n');
  return testWithKnownCredentials();
});
