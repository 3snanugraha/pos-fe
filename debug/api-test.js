const BASE_URL = 'http://10.215.191.61:8000/api';

// Test function untuk mengecek response API
async function testAPI() {
  console.log('=== Testing API Endpoints ===\n');

  // Test 1: Get Products List
  try {
    console.log('1. Testing fetchProducts...');
    const productsResponse = await fetch(`${BASE_URL}/customer/products?per_page=5`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const productsData = await productsResponse.json();
    console.log('Products Response Status:', productsResponse.status);
    console.log('Products Response Structure:');
    console.log(JSON.stringify(productsData, null, 2));
    
    if (productsData.data && productsData.data.length > 0) {
      console.log('\nFirst Product Structure:');
      console.log(JSON.stringify(productsData.data[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error testing fetchProducts:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Get Specific Product Detail
  try {
    console.log('2. Testing fetchProduct detail...');
    // Ambil ID dari produk pertama atau gunakan ID contoh
    const productId = 1; // Bisa diganti dengan ID yang valid
    
    const productResponse = await fetch(`${BASE_URL}/customer/products/${productId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const productData = await productResponse.json();
    console.log('Product Detail Response Status:', productResponse.status);
    console.log('Product Detail Response Structure:');
    console.log(JSON.stringify(productData, null, 2));
    
  } catch (error) {
    console.error('Error testing fetchProduct detail:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Get Categories
  try {
    console.log('3. Testing fetchProductCategories...');
    const categoriesResponse = await fetch(`${BASE_URL}/customer/product-categories`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const categoriesData = await categoriesResponse.json();
    console.log('Categories Response Status:', categoriesResponse.status);
    console.log('Categories Response Structure:');
    console.log(JSON.stringify(categoriesData, null, 2));
    
  } catch (error) {
    console.error('Error testing fetchProductCategories:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Get Banners
  try {
    console.log('4. Testing fetchBanners...');
    const bannersResponse = await fetch(`${BASE_URL}/customer/banners`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    const bannersData = await bannersResponse.json();
    console.log('Banners Response Status:', bannersResponse.status);
    console.log('Banners Response Structure:');
    console.log(JSON.stringify(bannersData, null, 2));
    
  } catch (error) {
    console.error('Error testing fetchBanners:', error);
  }
}

// Jalankan test
testAPI();
