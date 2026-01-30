/**
 * Create Super Admin User
 * 
 * This script creates a Super Admin user with access to ALL branches
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(process.cwd(), 'data', 'database.json');

if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found!');
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Super Admin details
const superAdmin = {
    username: 'superadmin',
    password: bcrypt.hashSync('superadmin123', 10), // Password: superadmin123
    role: 'President', // Super Admin role
    email: 'superadmin@melanninvestor.com',
    employee_id: null,
    created_at: new Date().toISOString(),
    last_login: null,
    is_active: 1, // Active immediately
    status: 'ACTIVE',
    assigned_branch: null, // NULL = Access to ALL branches
    reset_otp: null,
    reset_otp_expires_at: null
};

// Get next ID
const maxId = db.users.reduce((max, user) => Math.max(max, user.id || 0), 0);
superAdmin.id = maxId + 1;

// Check if superadmin already exists
const existingSuperAdmin = db.users.find(u => u.username === 'superadmin');
if (existingSuperAdmin) {
    console.log('⚠️  Super Admin user already exists!');
    console.log('\n📝 Updating existing Super Admin...');

    // Update existing user to Super Admin
    existingSuperAdmin.role = 'President';
    existingSuperAdmin.assigned_branch = null;
    existingSuperAdmin.is_active = 1;
    existingSuperAdmin.password = superAdmin.password; // Reset password

    console.log('✅ Updated existing superadmin user');
} else {
    // Add new super admin
    db.users.push(superAdmin);
    console.log('✅ Created new Super Admin user');
}

// Save database
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('\n═══════════════════════════════════════════');
console.log('🎉 SUPER ADMIN USER CREATED/UPDATED');
console.log('═══════════════════════════════════════════');
console.log('\nLogin Credentials:');
console.log('  Username: superadmin');
console.log('  Password: superadmin123');
console.log('  Role:     President (Super Admin)');
console.log('  Access:   ALL BRANCHES ✅');
console.log('\n⚠️  IMPORTANT: Change this password after first login!');
console.log('\n📋 Next Steps:');
console.log('  1. Log out from current session');
console.log('  2. Log in as: superadmin / superadmin123');
console.log('  3. You will see ALL employees from ALL branches');
console.log('═══════════════════════════════════════════\n');
