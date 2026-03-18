const { chromium } = require('playwright-core');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log('Navigating to login...');
        await page.goto('http://localhost:3001/login');

        // Login
        await page.fill('#username', 'admindb');
        await page.fill('#password', 'dbadmin_777');
        await page.click('button[type="submit"]');

        // Wait for dashboard to load
        console.log('Waiting for login...');
        await page.waitForTimeout(5000);

        console.log('Getting sessionId...');
        const sessionId = await page.evaluate(() => localStorage.getItem('sessionId'));
        console.log('Session ID:', sessionId);

        if (sessionId) {
            console.log('Calling Payroll API...');
            const response = await page.request.post('http://localhost:3001/api/payroll/runs', {
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                data: {
                    branch: 'Ormoc',
                    periodStart: '2026-02-01',
                    periodEnd: '2026-02-15',
                    cutoffDay: 15
                }
            });
            console.log('Status:', response.status());
            const resBody = await response.json();
            console.log('Response:', JSON.stringify(resBody, null, 2));
        } else {
            console.log('Login failed, no session ID found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await browser.close();
    }
})();
