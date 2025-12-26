// Script untuk membuat customer test di production
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
                    // Remove BOM character if present
                    const cleanedResponse = responseData.replace(/^\uFEFF/, '');
                    const parsed = JSON.parse(cleanedResponse);
                    
                    resolve({
                        statusCode: res.statusCode,
                        data: parsed
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

async function createTestCustomer() {
    console.log('👤 Creating test customer...\n');
    
    const customerData = {
        nama_pelanggan: 'Test User',
        telepon: '081234567890',
        email: 'test@example.com',
        password: 'password123',
        alamat: 'Jl. Test No. 123, Jakarta'
    };
    
    try {
        const result = await makeRequest('POST', '/customer/register', customerData);
        
        console.log(`📊 Status: ${result.statusCode}`);
        
        if (result.statusCode === 201 && result.data.success) {
            console.log('✅ CUSTOMER CREATED SUCCESSFULLY!');
            console.log(`👤 Name: ${result.data.data.customer.nama_pelanggan}`);
            console.log(`📧 Email: ${result.data.data.customer.email}`);
            console.log(`🔑 Token: ${result.data.data.token.substring(0, 30)}...`);
            
            // Test login with new customer
            console.log('\n🔐 Testing login with new customer...');
            const loginResult = await makeRequest('POST', '/customer/login', {
                email: customerData.email,
                password: customerData.password,
                device_name: 'test-script'
            });
            
            console.log(`📊 Login Status: ${loginResult.statusCode}`);
            
            if (loginResult.statusCode === 200 && loginResult.data.success) {
                console.log('✅ LOGIN TEST SUCCESSFUL!');
                console.log('📱 Mobile app can now use these credentials:');
                console.log(`   Email: ${customerData.email}`);
                console.log(`   Password: ${customerData.password}`);
            } else {
                console.log('❌ Login test failed:', loginResult.data.message);
            }
            
            return true;
        } else {
            console.log('❌ Customer creation failed:', result.data.message);
            if (result.data.errors) {
                console.log('Validation errors:');
                for (const [field, errors] of Object.entries(result.data.errors)) {
                    console.log(`  ${field}: ${errors.join(', ')}`);
                }
            }
        }
    } catch (error) {
        console.log('💥 Error:', error.message);
    }
    
    return false;
}

async function runCreateCustomer() {
    console.log('🚀 Customer Creation Script\n');
    
    const success = await createTestCustomer();
    
    if (success) {
        console.log('\n🎉 Test customer created and verified!');
        console.log('📱 You can now test the mobile app with the credentials above');
    } else {
        console.log('\n⚠️  Failed to create test customer');
        console.log('💡 Check if email is already registered or API requirements');
    }
}

runCreateCustomer().catch(console.error);
