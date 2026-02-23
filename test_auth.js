import fetch from 'node-fetch';

async function testSignup() {
    console.log('Testing Signup for Banned User...');
    try {
        const response = await fetch('http://localhost:3001/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                email: 'whatisup223@gmail.com',
                password: 'password123'
            })
        });

        const data = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

async function testForgotPassword() {
    console.log('\nTesting Forgot Password for Banned User...');
    try {
        const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'whatisup223@gmail.com'
            })
        });

        const data = await response.json();
        console.log('Status Code:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testSignup().then(testForgotPassword);
