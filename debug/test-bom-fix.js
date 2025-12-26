// Test BOM Fix for API Connection
const https = require('https');

function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`https://gudangperabot.com/api${endpoint}`);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
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
                    // Remove BOM character if present (like in the mobile app fix)
                    const cleanedResponse = responseData.replace(/^\uFEFF/, '');
                    const parsed = JSON.parse(cleanedResponse);
                    
                    resolve({
                        statusCode: res.statusCode,
                        data: parsed,
                        rawLength: responseData.length,
                        cleanedLength: cleanedResponse.length,
                        hadBOM: responseData.length !== cleanedResponse.length
                    });
                } catch (error) {
                    reject(new Error(`JSON Parse Error: ${error.message}. Raw response: ${responseData.substring(0, 100)}`));
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

async function testLogin() {
    console.log('🧪 Testing Login with BOM handling fix...\n');
    
    const testCredentials = [
        { email: 'john@example.com', password: 'password' },
        { email: 'jane@example.com', password: 'password' }
    ];
    
    for (const credentials of testCredentials) {
        console.log(`📧 Testing login: ${credentials.email}`);
        
        try {
            const result = await makeRequest('POST', '/customer/login', {
                ...credentials,
                device_name: 'test-fix'
            });
            
            console.log(`📊 Status: ${result.statusCode}`);
            console.log(`🔧 Had BOM: ${result.hadBOM ? 'YES' : 'NO'}`);
            console.log(`📏 Raw length: ${result.rawLength}, Cleaned: ${result.cleanedLength}`);
            
            if (result.statusCode === 200 && result.data.success) {
                console.log('✅ LOGIN SUCCESS!');
                console.log(`🔑 Token: ${result.data.data.token.substring(0, 30)}...`);
                return result.data.data.token;
            } else {
                console.log('❌ Login failed:', result.data.message);
            }
        } catch (error) {
            console.log('💥 Error:', error.message);
        }
        
        console.log(''); // Empty line between tests
    }
    
    return null;
}

async function testPublicEndpoint() {
    console.log('🌐 Testing public endpoint with BOM handling...\n');
    
    try {
        const result = await makeRequest('GET', '/public/banners');
        
        console.log(`📊 Status: ${result.statusCode}`);
        console.log(`🔧 Had BOM: ${result.hadBOM ? 'YES' : 'NO'}`);
        console.log(`📏 Raw length: ${result.rawLength}, Cleaned: ${result.cleanedLength}`);
        
        if (result.statusCode === 200) {
            console.log('✅ PUBLIC ENDPOINT SUCCESS!');
            console.log(`📦 Data type: ${typeof result.data}`);
            if (result.data.data && Array.isArray(result.data.data)) {
                console.log(`📊 Banners count: ${result.data.data.length}`);
            }
        } else {
            console.log('❌ Public endpoint failed');
        }
    } catch (error) {
        console.log('💥 Error:', error.message);
    }
}

async function runTest() {
    console.log('🚀 Testing BOM Character Fix\n');
    
    await testPublicEndpoint();
    console.log('\n' + '='.repeat(50) + '\n');
    const token = await testLogin();
    
    if (token) {
        console.log('\n🎉 BOM fix working! Login successful!');
        console.log('📱 Mobile app should now work properly');
    } else {
        console.log('\n⚠️  Login still failing. Check if customer data exists in database');
    }
}

runTest().catch(console.error);
