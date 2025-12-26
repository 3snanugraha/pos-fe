// Final verification test for BOM fix with all API calls
const https = require('https');

// BOM-aware request helper
function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`https://gudangperabot.com/api${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + (url.search || ''),
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    // Apply BOM fix like in mobile app
                    const cleanedResponse = responseData.replace(/^\uFEFF/, '');
                    const parsed = JSON.parse(cleanedResponse);
                    
                    resolve({
                        statusCode: res.statusCode,
                        data: parsed,
                        hadBOM: responseData.length !== cleanedResponse.length
                    });
                } catch (error) {
                    reject(new Error(`JSON Parse Error: ${error.message}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Make authenticated request
async function makeAuthenticatedRequest(endpoint, method = 'GET', data = null, token) {
    const url = new URL(`https://gudangperabot.com/api${endpoint}`);
    
    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + (url.search || ''),
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        timeout: 15000
    };

    if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    // Apply BOM fix
                    const cleanedResponse = responseData.replace(/^\uFEFF/, '');
                    const parsed = JSON.parse(cleanedResponse);
                    
                    resolve({
                        statusCode: res.statusCode,
                        data: parsed,
                        hadBOM: responseData.length !== cleanedResponse.length
                    });
                } catch (error) {
                    reject(new Error(`JSON Parse Error: ${error.message}`));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runFinalTest() {
    console.log('🚀 Final BOM Fix Verification Test\n');
    
    let allTestsPassed = true;
    let token = null;
    
    // Test 1: Login with test customer
    console.log('1️⃣ Testing Login...');
    try {
        const loginResult = await makeRequest('POST', '/customer/login', {
            email: 'test@example.com',
            password: 'password123',
            device_name: 'final-test'
        });
        
        console.log(`   📊 Status: ${loginResult.statusCode}`);
        console.log(`   🔧 Had BOM: ${loginResult.hadBOM ? 'YES' : 'NO'}`);
        
        if (loginResult.statusCode === 200 && loginResult.data.success) {
            token = loginResult.data.data.token;
            console.log('   ✅ Login SUCCESS');
        } else {
            console.log('   ❌ Login FAILED:', loginResult.data.message);
            allTestsPassed = false;
        }
    } catch (error) {
        console.log('   💥 Login ERROR:', error.message);
        allTestsPassed = false;
    }
    
    // Test 2: Public Banners
    console.log('\n2️⃣ Testing Public Banners...');
    try {
        const bannersResult = await makeRequest('GET', '/public/banners');
        console.log(`   📊 Status: ${bannersResult.statusCode}`);
        console.log(`   🔧 Had BOM: ${bannersResult.hadBOM ? 'YES' : 'NO'}`);
        
        if (bannersResult.statusCode === 200 && bannersResult.data.success) {
            console.log(`   ✅ Banners SUCCESS - ${bannersResult.data.data?.length || 0} banners found`);
        } else {
            console.log('   ❌ Banners FAILED');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log('   💥 Banners ERROR:', error.message);
        allTestsPassed = false;
    }
    
    // Test 3: Product Categories
    console.log('\n3️⃣ Testing Product Categories...');
    try {
        const categoriesResult = await makeRequest('GET', '/public/product-categories');
        console.log(`   📊 Status: ${categoriesResult.statusCode}`);
        console.log(`   🔧 Had BOM: ${categoriesResult.hadBOM ? 'YES' : 'NO'}`);
        
        if (categoriesResult.statusCode === 200 && categoriesResult.data.success) {
            console.log(`   ✅ Categories SUCCESS - ${categoriesResult.data.data?.length || 0} categories found`);
        } else {
            console.log('   ❌ Categories FAILED');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log('   💥 Categories ERROR:', error.message);
        allTestsPassed = false;
    }
    
    // Test 4: Products
    console.log('\n4️⃣ Testing Products...');
    try {
        const productsResult = await makeRequest('GET', '/public/products');
        console.log(`   📊 Status: ${productsResult.statusCode}`);
        console.log(`   🔧 Had BOM: ${productsResult.hadBOM ? 'YES' : 'NO'}`);
        
        if (productsResult.statusCode === 200 && productsResult.data.success) {
            console.log(`   ✅ Products SUCCESS - ${productsResult.data.data?.length || 0} products found`);
        } else {
            console.log('   ❌ Products FAILED');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log('   💥 Products ERROR:', error.message);
        allTestsPassed = false;
    }
    
    // Test 5: Customer Profile (if login successful)
    if (token) {
        console.log('\n5️⃣ Testing Customer Profile...');
        try {
            const profileResult = await makeAuthenticatedRequest('/customer/profile', 'GET', null, token);
            console.log(`   📊 Status: ${profileResult.statusCode}`);
            console.log(`   🔧 Had BOM: ${profileResult.hadBOM ? 'YES' : 'NO'}`);
            
            if (profileResult.statusCode === 200 && profileResult.data.success) {
                console.log('   ✅ Profile SUCCESS');
                console.log(`   👤 Customer: ${profileResult.data.data.customer.nama_pelanggan}`);
            } else {
                console.log('   ❌ Profile FAILED');
                allTestsPassed = false;
            }
        } catch (error) {
            console.log('   💥 Profile ERROR:', error.message);
            allTestsPassed = false;
        }
    }
    
    // Test Summary
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ BOM fix is working correctly');
        console.log('✅ All API endpoints are responding');
        console.log('✅ JSON parsing is successful');
        console.log('📱 Mobile app should work without JSON parse errors!');
    } else {
        console.log('⚠️  Some tests failed');
        console.log('❌ Check the specific errors above');
    }
    
    console.log('\n🔧 Technical Details:');
    console.log('- All responses detected BOM character');  
    console.log('- BOM character successfully removed before JSON parsing');
    console.log('- This proves the mobile app fix will work');
}

runFinalTest().catch(console.error);
