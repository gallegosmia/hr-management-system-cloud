/**
 * Assign Branch to Users Script
 * 
 * This script helps you assign branches to existing users
 * so they can access their branch's data.
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.json');

if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found!');
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('\n📋 Current Users:\n');
db.users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} (${user.role}) - Current Branch: ${user.assigned_branch || 'NOT SET'}`);
});

console.log('\n\n🔧 ASSIGNING BRANCHES...\n');

// Find admin users and assign them based on their role
db.users.forEach(user => {
    // Super Admins (President, Vice President) get NULL (access all branches)
    if (['President', 'Vice President', 'Executive'].includes(user.role)) {
        user.assigned_branch = null;
        console.log(`✅ ${user.username} (${user.role}) → ALL BRANCHES (Super Admin)`);
    }
    // Other admins - you can customize this logic
    else if (user.role === 'Admin' || user.role === 'Manager') {
        // Assign first admin to Naval, second to Ormoc (you can change this)
        if (!user.assigned_branch) {
            // For now, let's assign based on username pattern or just ask
            // Default: assign to Ormoc Branch
            user.assigned_branch = 'Ormoc Branch';
            console.log(`✅ ${user.username} (${user.role}) → Ormoc Branch`);
        }
    }
    // Employees get assigned based on their employee record
    else if (user.role === 'Employee' && user.employee_id) {
        const employee = db.employees.find(e => e.id === user.employee_id);
        if (employee && employee.branch) {
            user.assigned_branch = employee.branch;
            console.log(`✅ ${user.username} (${user.role}) → ${employee.branch}`);
        }
    }
});

// Save updated database
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log('\n✅ Branch assignments completed!\n');

console.log('📊 Summary:\n');
const branchSummary = {};
db.users.forEach(user => {
    const branch = user.assigned_branch || 'ALL BRANCHES';
    branchSummary[branch] = (branchSummary[branch] || 0) + 1;
});

Object.keys(branchSummary).forEach(branch => {
    console.log(`   ${branch}: ${branchSummary[branch]} user(s)`);
});

console.log('\n🔄 IMPORTANT: Please log out and log back in for changes to take effect!\n');
