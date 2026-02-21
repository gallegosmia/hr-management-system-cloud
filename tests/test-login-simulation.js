
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load DB
const DB_FILE = path.join(__dirname, '../data/database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

// Find a user to test (e.g. 'superadmin')
const username = 'ann'; // Using 'ann' as she is Vice President and active
const user = db.users.find(u => u.username === username);

if (!user) {
    console.error(`User ${username} not found!`);
    process.exit(1);
}

console.log('Testing User:', user.username);
console.log('Role:', user.role);
console.log('Active Status:', user.is_active);

// Verify Fields needed for Session
const requiredFields = ['id', 'username', 'role', 'is_active'];
const missing = requiredFields.filter(f => user[f] === undefined);

if (missing.length > 0) {
    console.error('Missing required fields:', missing);
} else {
    console.log('All required fields present.');
}

// Check if password hash is valid bcrypt
if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
    console.log('Password hash format appears valid.');
} else {
    console.error('Password hash format invalid:', user.password);
}

// Simulate Session Creation Data
const sessionData = {
    id: user.id,
    username: user.username,
    role: user.role,
    employee_id: user.employee_id,
    is_active: user.is_active,
    assigned_branch: user.assigned_branch,
    hr_approval_status: user.hr_approval_status,
    hr_approved_by: user.hr_approved_by,
    hr_approved_at: user.hr_approved_at
};

console.log('Session Payload:', sessionData);

if (user.is_active !== 1) {
    console.warn('WARNING: User is NOT active. Login should be blocked.');
} else {
    console.log('User is active. Login allowed.');
}

console.log('Login Logic Verification Complete.');
