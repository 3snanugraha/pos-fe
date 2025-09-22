// Simulasi data product yang mungkin datang dari API
const mockProductResponses = [
  // Kemungkinan 1: Data lengkap normal
  {
    scenario: "Data lengkap normal",
    data: {
      id: 1,
      nama_produk: "Smartphone Samsung Galaxy",
      deskripsi: "Smartphone terbaru dengan fitur canggih",
      harga: 5000000,
      stok: 10,
      kategori_id: 1,
      kategori_nama: "Elektronik",
      gambar_url: "https://example.com/image.jpg",
      status: "aktif"
    }
  },
  
  // Kemungkinan 2: Data dengan nilai string (bisa menyebabkan NaN)
  {
    scenario: "Harga dan stok sebagai string",
    data: {
      id: 2,
      nama_produk: "Laptop Gaming",
      deskripsi: "Laptop untuk gaming",
      harga: "8000000", // String
      stok: "5", // String
      kategori_id: 2,
      kategori_nama: "Elektronik",
      gambar_url: "https://example.com/laptop.jpg",
      status: "aktif"
    }
  },
  
  // Kemungkinan 3: Data dengan null/undefined
  {
    scenario: "Data dengan nilai null/undefined",
    data: {
      id: 3,
      nama_produk: "Mouse Gaming",
      deskripsi: "Mouse untuk gaming",
      harga: null,
      stok: undefined,
      kategori_id: 3,
      kategori_nama: null,
      gambar_url: null,
      status: "aktif"
    }
  },
  
  // Kemungkinan 4: Data dengan properti berbeda (snake_case vs camelCase)
  {
    scenario: "Properti dengan format berbeda",
    data: {
      id: 4,
      product_name: "Keyboard Mechanical", // Beda format
      description: "Keyboard mechanical RGB",
      price: 1500000, // Beda format
      stock: 3, // Beda format
      category_id: 4,
      category_name: "Aksesoris", // Beda format
      image_url: "https://example.com/keyboard.jpg", // Beda format
      status: "active"
    }
  }
];

// Test function untuk format harga
const formatPrice = (price) => {
  console.log(`Input price: ${price} (type: ${typeof price})`);
  
  // Convert to number first
  const numPrice = Number(price);
  console.log(`Converted to number: ${numPrice}`);
  
  if (isNaN(numPrice)) {
    console.log("Result: NaN - akan menyebabkan masalah!");
    return "Harga tidak tersedia";
  }
  
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numPrice);
  
  console.log(`Formatted result: ${formatted}`);
  return formatted;
};

// Test function untuk operasi matematika
const calculateSubtotal = (price, quantity) => {
  console.log(`Calculating subtotal: ${price} x ${quantity}`);
  
  const numPrice = Number(price);
  const numQuantity = Number(quantity);
  
  console.log(`Converted: ${numPrice} x ${numQuantity}`);
  
  if (isNaN(numPrice) || isNaN(numQuantity)) {
    console.log("Result: NaN - akan menyebabkan masalah!");
    return 0;
  }
  
  const result = numPrice * numQuantity;
  console.log(`Subtotal result: ${result}`);
  return result;
};

// Test semua skenario
console.log('=== Testing Product Data Scenarios ===\n');

mockProductResponses.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.scenario}`);
  console.log('Raw data:', JSON.stringify(scenario.data, null, 2));
  
  console.log('\n--- Testing formatPrice ---');
  formatPrice(scenario.data.harga || scenario.data.price);
  
  console.log('\n--- Testing calculateSubtotal ---');
  calculateSubtotal(scenario.data.harga || scenario.data.price, 2);
  
  console.log('\n--- Testing stok value ---');
  const stok = scenario.data.stok || scenario.data.stock;
  console.log(`Stok value: ${stok} (type: ${typeof stok})`);
  console.log(`Is valid number: ${!isNaN(Number(stok))}`);
  
  console.log('\n--- Testing gambar_url ---');
  const gambarUrl = scenario.data.gambar_url || scenario.data.image_url;
  console.log(`Image URL: ${gambarUrl}`);
  console.log(`Is valid URL: ${gambarUrl && gambarUrl.length > 0}`);
  
  console.log('\n' + '='.repeat(60) + '\n');
});

// Test edge cases
console.log('=== Testing Edge Cases ===\n');

console.log('1. Testing dengan nilai 0:');
formatPrice(0);
calculateSubtotal(0, 1);

console.log('\n2. Testing dengan string kosong:');
formatPrice('');
calculateSubtotal('', 1);

console.log('\n3. Testing dengan boolean:');
formatPrice(true);
calculateSubtotal(false, 1);

console.log('\n4. Testing dengan array/object:');
formatPrice([]);
calculateSubtotal({}, 1);
