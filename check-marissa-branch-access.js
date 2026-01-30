/**
 * Check Marissa's Branch Access
 * 
 * This script checks Marissa's assigned branch and lists Naval employees
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load database URL
function getDatabaseUrl() {
    if (fs.existsSync(path.join(process.cwd(), '.env'))) {
        const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
        const match = env.match(/^DATABASE_URL=(.+)$/m);
        if (match) return match[1].trim();
    }
    return null;
}

async function checkMarissaBranchAccess() {
    const dbUrl = getDatabaseUrl();

    if (!dbUrl) {
        console.log('⚠️  No DATABASE_URL found. Checking local JSON database...\n');
        checkLocalDatabase();
        return;
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 Checking Marissa\'s branch access...\n');

        // Check Marissa's details
        const marissaResult = await pool.query(`
            SELECT id, username, role, assigned_branch, is_active, hr_approval_status
            FROM users 
            WHERE username = 'marissa'
        `);

        if (marissaResult.rows.length === 0) {
            console.log('❌ Marissa account not found!');
            return;
        }

        const marissa = marissaResult.rows[0];

        console.log('═'.repeat(70));
        console.log('👤 MARISSA\'S ACCOUNT');
        console.log('═'.repeat(70));
        console.log(`   Username:           ${marissa.username}`);
        console.log(`   Role:               ${marissa.role}`);
        console.log(`   Assigned Branch:    ${marissa.assigned_branch || '❌ NOT SET'}`);
        console.log(`   Is Active:          ${marissa.is_active === 1 ? '✅ Active' : '❌ Pending/Inactive'}`);
        console.log(`   HR Approval:        ${marissa.hr_approval_status || 'N/A'}`);
        console.log('═'.repeat(70));
        console.log('');

        if (!marissa.assigned_branch) {
            console.log('⚠️  WARNING: Marissa has NO assigned branch!');
            console.log('   She will not see any employees.');
            console.log('');
            console.log('💡 FIX: Set assigned_branch to "Naval"');
            console.log('   Run: UPDATE users SET assigned_branch = \'Naval\' WHERE username = \'marissa\'');
            console.log('');
        } else {
            // Check employees in Marissa's branch
            const cleanBranch = marissa.assigned_branch.replace(' Branch', '').trim();

            const employeesResult = await pool.query(`
                SELECT id, employee_id, first_name, last_name, position, department, branch
                FROM employees 
                WHERE branch ILIKE $1 OR branch ILIKE $2
                ORDER BY last_name, first_name
            `, [cleanBranch, cleanBranch + ' Branch']);

            console.log('📋 EMPLOYEES MARISSA CAN ACCESS:');
            console.log('═'.repeat(70));
            console.log(`   Branch Filter: ${marissa.assigned_branch}`);
            console.log(`   Total Employees: ${employeesResult.rows.length}`);
            console.log('═'.repeat(70));
            console.log('');

            if (employeesResult.rows.length === 0) {
                console.log('❌ No employees found in Naval branch!');
                console.log('   Either:');
                console.log('   1. No employees registered yet');
                console.log('   2. Employees have different branch name (check spelling)');
            } else {
                employeesResult.rows.forEach((emp, index) => {
                    console.log(`${index + 1}. ${emp.last_name}, ${emp.first_name}`);
                    console.log(`   ID: ${emp.employee_id} | Position: ${emp.position || 'N/A'}`);
                    console.log(`   Department: ${emp.department || 'N/A'} | Branch: ${emp.branch}`);
                    console.log('');
                });
            }
        }

        // Check all branches in system
        const branchesResult = await pool.query(`
            SELECT DISTINCT branch, COUNT(*) as count
            FROM employees
            WHERE branch IS NOT NULL
            GROUP BY branch
            ORDER BY branch
        `);

        console.log('═'.repeat(70));
        console.log('🏢 ALL BRANCHES IN SYSTEM:');
        console.log('═'.repeat(70));
        branchesResult.rows.forEach(branch => {
            console.log(`   ${branch.branch}: ${branch.count} employee(s)`);
        });
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

function checkLocalDatabase() {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');

    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file not found');
        return;
    }

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    const marissa = db.users.find(u => u.username === 'marissa');

    if (!marissa) {
        console.log('❌ Marissa account not found!');
        return;
    }

    console.log('═'.repeat(70));
    console.log('👤 MARISSA\'S ACCOUNT');
    console.log('═'.repeat(70));
    console.log(`   Username:           ${marissa.username}`);
    console.log(`   Role:               ${marissa.role}`);
    console.log(`   Assigned Branch:    ${marissa.assigned_branch || '❌ NOT SET'}`);
    console.log(`   Is Active:          ${marissa.is_active === 1 ? '✅ Active' : '❌ Pending/Inactive'}`);
    console.log('═'.repeat(70));
    console.log('');

    if (!marissa.assigned_branch) {
        console.log('⚠️  WARNING: Marissa has NO assigned branch!');
        console.log('   She will not see any employees.');
        console.log('');
        console.log('💡 FIX: Edit database.json and set assigned_branch to "Naval"');
        console.log('');
    } else {
        // Check employees in Marissa's branch
        const cleanBranch = marissa.assigned_branch.replace(' Branch', '').trim();

        const employees = db.employees.filter(emp =>
            emp.branch && emp.branch.toLowerCase().includes(cleanBranch.toLowerCase())
        );

        console.log('📋 EMPLOYEES MARISSA CAN ACCESS:');
        console.log('═'.repeat(70));
        console.log(`   Branch Filter: ${marissa.assigned_branch}`);
        console.log(`   Total Employees: ${employees.length}`);
        console.log('═'.repeat(70));
        console.log('');

        if (employees.length === 0) {
            console.log('❌ No employees found in Naval branch!');
        } else {
            employees.forEach((emp, index) => {
                console.log(`${index + 1}. ${emp.last_name}, ${emp.first_name}`);
                console.log(`   ID: ${emp.employee_id} | Position: ${emp.position || 'N/A'}`);
                console.log(`   Branch: ${emp.branch}`);
                console.log('');
            });
        }
    }

    // Check all branches
    const branches = {};
    db.employees.forEach(emp => {
        if (emp.branch) {
            branches[emp.branch] = (branches[emp.branch] || 0) + 1;
        }
    });

    console.log('═'.repeat(70));
    console.log('🏢 ALL BRANCHES IN SYSTEM:');
    console.log('═'.repeat(70));
    Object.entries(branches).forEach(([branch, count]) => {
        console.log(`   ${branch}: ${count} employee(s)`);
    });
    console.log('═'.repeat(70));
}

// Run
if (require.main === module) {
    checkMarissaBranchAccess()
        .then(() => {
            console.log('\n✅ Check completed!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Check failed:', error.message);
            process.exit(1);
        });
}
