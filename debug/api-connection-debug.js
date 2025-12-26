// Debug Script untuk Test API Connection
// Run dengan: node debug/api-connection-debug.js

const https = require('https');

// Konfigurasi API
const API_CONFIG = {
    baseUrl: 'https://gudangperabot.com/api',
    timeout: 15000
};

// Test data
const TEST_CREDENTIALS = [
    { email: 'john@example.com', password: 'password' },
    { email: 'jane@example.com', password: 'password' },
    { email: 'bob@example.com', password: 'password' }
];

async function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_CONFIG.baseUrl}${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: API_CONFIG.timeout
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
                    const parsed = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: parsed
                    });
                } catch (error) {
                    // If JSON parsing fails, return raw response
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        raw: responseData,
                        parseError: error.message
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

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

async function testAPIStatus() {
    console.log('🔍 Testing API Status...');
    try {
        const response = await makeRequest('GET', '/status');
        console.log(`✅ API Status: ${response.statusCode}`);
        console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log('❌ API Status failed:', error.message);
        return false;
    }
}

async function testCustomerLogin() {
    console.log('\n🔐 Testing Customer Login...');
    
    for (const credentials of TEST_CREDENTIALS) {
        console.log(`\n📧 Testing: ${credentials.email}`);
        
        try {
            const loginData = {
                ...credentials,
                device_name: 'debug-script'
            };
            
            const response = await makeRequest('POST', '/customer/login', loginData);
            
            console.log(`📊 Status Code: ${response.statusCode}`);
            
            if (response.parseError) {
                console.log('⚠️  JSON Parse Error:', response.parseError);
                console.log('📄 Raw Response:', response.raw);
            } else {
                console.log(`📦 Response:`, JSON.stringify(response.data, null, 2));
                
                if (response.statusCode === 200 && response.data.success) {
                    console.log('✅ Login successful!');
                    console.log(`🔑 Token: ${response.data.data.token.substring(0, 20)}...`);
                    return response.data.data.token;
                } else {
                    console.log(`❌ Login failed: ${response.data.message || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.log('❌ Request failed:', error.message);
        }
    }
    
    return null;
}

async function testPublicEndpoints() {
    console.log('\n🌍 Testing Public Endpoints...');
    
    const endpoints = [
        '/public/banners',
        '/public/products',
        '/public/product-categories'
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\n📍 Testing: ${endpoint}`);
        try {
            const response = await makeRequest('GET', endpoint);
            console.log(`📊 Status Code: ${response.statusCode}`);
            
            if (response.parseError) {
                console.log('⚠️  JSON Parse Error:', response.parseError);
                console.log('📄 Raw Response (first 200 chars):', response.raw.substring(0, 200) + '...');
            } else {
                console.log(`✅ Success - Data type: ${typeof response.data}`);
                if (Array.isArray(response.data)) {
                    console.log(`📦 Array length: ${response.data.length}`);
                } else if (typeof response.data === 'object') {
                    console.log(`📦 Object keys: ${Object.keys(response.data).join(', ')}`);
                }
            }
        } catch (error) {
            console.log('❌ Request failed:', error.message);
        }
    }
}

async function runAllTests() {
    console.log('🚀 Starting API Debug Tests...');
    console.log(`🌐 Base URL: ${API_CONFIG.baseUrl}`);
    console.log(`⏱️  Timeout: ${API_CONFIG.timeout}ms`);
    
    const statusOk = await testAPIStatus();
    if (!statusOk) {
        console.log('\n❌ API not accessible, stopping tests');
        return;
    }
    
    await testPublicEndpoints();
    const token = await testCustomerLogin();
    
    if (token) {
        console.log('\n🎉 At least one login was successful!');
        console.log('🔑 You can use this token for authenticated requests');
    } else {
        console.log('\n⚠️  All login attempts failed');
        console.log('💡 Check if customer data exists in database');
        console.log('💡 Or try different credentials');
    }
    
    console.log('\n✨ Debug tests completed!');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('💥 Unhandled Rejection:', error.message);
    process.exit(1);
});

// Run tests
runAllTests().catch(console.error);
