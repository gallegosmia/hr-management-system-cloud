// using global fetch

// Since we are running outside of the Next.js context for the API routes,
// this test script needs to interact with the running server.
// However, the user didn't specify the port, but usually it's 3000.
// I'll assume the server is running on localhost:3000.

const BASE_URL = 'http://localhost:3001';

async function testPayroll() {
    console.log('--- Testing Payroll Module ---');

    // 1. Calculate Payroll (Preview)
    console.log('1. Testing /api/payroll/calculate (POST)...');
    try {
        const calcRes = await fetch(`${BASE_URL}/api/payroll/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startDate: '2025-01-01',
                endDate: '2025-01-15',
                selectedDeductions: ['sss', 'philhealth'],
                branch: 'All'
            })
        });

        if (calcRes.ok) {
            const data = await calcRes.json();
            console.log('   ✅ Calculate successful. Received', data.length, 'preview items.');

            // 2. Create Payroll Run (Draft)
            if (data.length > 0) {
                console.log('2. Testing /api/payroll (POST - Draft)...');

                // Add default days_present like the UI does
                const items = data.map(item => ({
                    ...item,
                    days_present: 15, // Simulate UI default
                    double_pay_amount: 0
                }));

                const saveRes = await fetch(`${BASE_URL}/api/payroll`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        period_start: '2025-01-01',
                        period_end: '2025-01-15',
                        items: items,
                        status: 'Draft'
                    })
                });

                if (saveRes.ok) {
                    const savedData = await saveRes.json();
                    console.log('   ✅ Save Draft successful. Run ID:', savedData.id);

                    // 3. List Payroll Runs
                    console.log('3. Testing /api/payroll (GET)...');
                    const listRes = await fetch(`${BASE_URL}/api/payroll`);
                    if (listRes.ok) {
                        const listData = await listRes.json();
                        const found = listData.some(run => run.id === savedData.id);
                        if (found) {
                            console.log('   ✅ New run found in list.');
                        } else {
                            console.error('   ❌ New run NOT found in list.');
                        }
                    } else {
                        console.error('   ❌ Failed to list payroll runs.');
                    }

                } else {
                    console.error('   ❌ Failed to save draft.', await saveRes.text());
                }
            } else {
                console.log('   ⚠️ No employees found for calculation, skipping creation test.');
            }

        } else {
            console.error('   ❌ Calculate failed.', await calcRes.text());
        }
    } catch (e) {
        console.error('   ❌ Error connecting to server:', e.message);
        console.log('Note: Ensure the Next.js server is running on port 3000.');
    }
}

async function testSettings() {
    console.log('\n--- Testing Settings Module ---');
    console.log('1. Testing /api/settings (GET)...');
    try {
        const res = await fetch(`${BASE_URL}/api/settings`);
        if (res.ok) {
            const settings = await res.json();
            console.log('   ✅ Settings fetched:', settings);

            console.log('2. Testing /api/settings (POST - Update)...');
            const updateRes = await fetch(`${BASE_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_name: 'Melann HR System Test Update'
                })
            });

            if (updateRes.ok) {
                console.log('   ✅ Settings updated successfully.');
            } else {
                console.error('   ❌ Failed to update settings.');
            }

        } else {
            console.error('   ❌ Failed to fetch settings.');
        }
    } catch (e) {
        console.error('   ❌ Error connecting to server:', e.message);
    }
}

// Run tests
(async () => {
    await testPayroll();
    await testSettings();
})();
