const date = "2026-01-28T16:00:00.000Z";
const records = [{
    employee_id: 1, // Suppose there's an employee 1
    date: date,
    status: "Vacation Leave",
    remarks: "Testing POST"
}];

fetch('http://localhost:3005/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, records })
}).then(res => res.json()).then(console.log).catch(console.error);
