async function test() {
    try {
        const res = await fetch('http://localhost:3001/api/payroll/runs/2:1', {
            headers: {
                'x-session-id': 'b3a32f6b-1934-4537-83eb-5edfb348ee74'
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}
test();
