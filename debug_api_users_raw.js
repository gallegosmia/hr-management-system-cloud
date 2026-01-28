const { GET } = require('./app/api/users/route');
const { NextRequest } = require('next/server');

async function debug() {
    console.log("Simulating /api/users GET request...");
    try {
        // Mock a request
        const req = {
            url: 'http://localhost:3000/api/users',
            nextUrl: new URL('http://localhost:3000/api/users')
        };

        const response = await GET(req);
        const data = await response.json();

        console.log("Response Type:", typeof data);
        console.log("Is Array:", Array.isArray(data));
        if (Array.isArray(data)) {
            console.log("User Count:", data.length);
            if (data.length > 0) {
                console.log("First User:", JSON.stringify(data[0], null, 2));
            }
        } else {
            console.log("Error Response:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Debug Error:", err);
    }
}

debug();
