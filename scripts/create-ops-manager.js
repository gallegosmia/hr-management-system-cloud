
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../data/database.json');

try {
    const rawData = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(rawData);

    // Check if user already exists
    const existingUser = db.users.find(u => u.username === 'ops_manager');
    if (existingUser) {
        console.log('User ops_manager already exists.');
        console.log('ID:', existingUser.id);
        console.log('Role:', existingUser.role);
        // Optional: Update role if incorrect
        if (existingUser.role !== 'Operations Manager') {
            existingUser.role = 'Operations Manager';
            console.log('Updated role to Operations Manager');
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        }
        process.exit(0);
    }

    // Hash password 'ops123'
    const passwordHash = bcrypt.hashSync('ops123', 10);

    // Find max ID
    const maxId = db.users.reduce((max, u) => Math.max(max, u.id || 0), 0);
    const newId = maxId + 1;

    const newUser = {
        id: newId,
        username: 'ops_manager',
        password: passwordHash,
        role: 'Operations Manager',
        email: 'ops_manager@example.com',
        employee_id: null,
        created_at: new Date().toISOString(),
        last_login: null,
        is_active: 1, // Active
        status: 'ACTIVE',
        assigned_branch: null, // Global access unless restricted
        hr_approval_status: null
    };

    db.users.push(newUser);

    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    console.log('Successfully created user: ops_manager');
    console.log('Password: ops123');
    console.log('Role: Operations Manager');
    console.log('ID:', newId);

} catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
}
