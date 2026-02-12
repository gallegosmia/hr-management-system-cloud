const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/payroll',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        // We need to simulate a session ID. I'll look for one in the database.json or simulate a login.
        // For now, I'll just try without and see if I get 401, which confirms the server is running and auth is working.
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
