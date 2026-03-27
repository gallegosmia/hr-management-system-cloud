async function runTestAPI() {
    try {
        const res = await fetch('http://localhost:3001/api/payroll/runs/2:1', {
            headers: {
                'x-session-id': 'b3a32f6b-1934-4537-83eb-5edfb348ee74' // Random or missing is fine, might just give 401/403 but let's see
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e: any) {
        console.error('Fetch error:', e.message);
    }
}
runTestAPI();
export {};
