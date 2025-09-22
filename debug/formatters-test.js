// Import the formatters (simulate since we're testing in Node.js)
const formatPrice = (price) => {
  const numPrice = price ? Number(price) : 0;
  if (isNaN(numPrice)) {
    return 'Harga tidak tersedia';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numPrice);
};

const formatStock = (stock) => {
  const numStock = stock ? Number(stock) : 0;
  return isNaN(numStock) ? 0 : numStock;
};

const formatImageUrl = (imageUrl, fallbackUrl) => {
  if (!imageUrl || imageUrl.trim() === '') {
    return fallbackUrl || 'https://via.placeholder.com/400x300/E5E7EB/9CA3AF?text=No+Image';
  }
  
  try {
    new URL(imageUrl);
    return imageUrl;
  } catch {
    return fallbackUrl || 'https://via.placeholder.com/400x300/E5E7EB/9CA3AF?text=No+Image';
  }
};

const calculateSubtotal = (price, quantity) => {
  const numPrice = price ? Number(price) : 0;
  const numQuantity = quantity ? Number(quantity) : 0;
  
  if (isNaN(numPrice) || isNaN(numQuantity)) {
    return 0;
  }
  
  return numPrice * numQuantity;
};

// Test cases dari debug sebelumnya
const testCases = [
  {
    name: "Normal data",
    data: { harga: 5000000, stok: 10, gambar_url: "https://example.com/image.jpg" }
  },
  {
    name: "String numbers",
    data: { harga: "8000000", stok: "5", gambar_url: "https://example.com/laptop.jpg" }
  },
  {
    name: "Null/undefined",
    data: { harga: null, stok: undefined, gambar_url: null }
  },
  {
    name: "Invalid values",
    data: { harga: "invalid", stok: [], gambar_url: "not-a-url" }
  },
  {
    name: "Zero values",
    data: { harga: 0, stok: 0, gambar_url: "" }
  }
];

console.log('=== Testing Formatter Functions ===\n');

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log('Input:', JSON.stringify(testCase.data));
  
  console.log('Results:');
  console.log(`  formatPrice: ${formatPrice(testCase.data.harga)}`);
  console.log(`  formatStock: ${formatStock(testCase.data.stok)}`);
  console.log(`  formatImageUrl: ${formatImageUrl(testCase.data.gambar_url)}`);
  console.log(`  calculateSubtotal(harga, 2): ${calculateSubtotal(testCase.data.harga, 2)}`);
  
  console.log('');
});

console.log('=== Additional Edge Cases ===\n');

// Test additional edge cases
const edgeCases = [
  { input: "", expected: "should handle empty string" },
  { input: "0", expected: "should handle string zero" },
  { input: "0.00", expected: "should handle decimal string zero" },
  { input: true, expected: "should handle boolean true" },
  { input: false, expected: "should handle boolean false" },
  { input: {}, expected: "should handle empty object" },
  { input: [], expected: "should handle empty array" },
  { input: "123.45", expected: "should handle decimal string" },
  { input: -100, expected: "should handle negative number" },
];

edgeCases.forEach((testCase, index) => {
  console.log(`Edge case ${index + 1}: ${testCase.expected}`);
  console.log(`  Input: ${JSON.stringify(testCase.input)} (${typeof testCase.input})`);
  console.log(`  formatPrice: ${formatPrice(testCase.input)}`);
  console.log(`  formatStock: ${formatStock(testCase.input)}`);
  console.log(`  calculateSubtotal(input, 1): ${calculateSubtotal(testCase.input, 1)}`);
  console.log('');
});
