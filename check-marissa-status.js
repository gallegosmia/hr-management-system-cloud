/**
 * Check Marissa's Account Status
 * 
 * This script checks the current status of Marissa's account
 * to diagnose why it's still showing as pending.
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

async function checkMarissaStatus() {
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
        console.log('🔍 Checking Marissa\'s account status in PostgreSQL...\n');

        // Find Marissa
        const result = await pool.query(`
            SELECT 
                id, 
                username, 
                role, 
                is_active, 
                status,
                assigned_branch,
                hr_approval_status,
                hr_approved_by,
                hr_approved_at,
                created_at,
                last_login
            FROM users 
            WHERE username ILIKE '%marissa%' OR email ILIKE '%marissa%'
        `);

        if (result.rows.length === 0) {
            console.log('❌ No user found matching "marissa"');
            return;
        }

        result.rows.forEach((user, index) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`USER ${index + 1}: ${user.username}`);
            console.log('='.repeat(60));
            console.log(`📋 ID:                 ${user.id}`);
            console.log(`👤 Username:           ${user.username}`);
            console.log(`💼 Role:               ${user.role}`);
            console.log(`🏢 Assigned Branch:    ${user.assigned_branch || 'NOT SET'}`);
            console.log(`\n📊 ACCOUNT STATUS:`);
            console.log(`   is_active:          ${user.is_active} ${getActiveStatusText(user.is_active)}`);
            console.log(`   status:             ${user.status}`);

            if (user.role === 'HR') {
                console.log(`\n🔐 HR APPROVAL STATUS:`);
                console.log(`   hr_approval_status: ${user.hr_approval_status || 'NULL (Not HR or not required)'}`);
                console.log(`   hr_approved_by:     ${user.hr_approved_by || 'NULL'}`);
                console.log(`   hr_approved_at:     ${user.hr_approved_at || 'NULL'}`);

                if (user.hr_approval_status === 'PENDING') {
                    console.log('\n⚠️  HR APPROVAL REQUIRED!');
                    console.log('   This HR user needs Super Admin approval before they can login.');
                }
            }

            console.log(`\n📅 TIMESTAMPS:`);
            console.log(`   Created:            ${user.created_at}`);
            console.log(`   Last Login:         ${user.last_login || 'Never'}`);
            console.log('='.repeat(60));

            // Diagnosis
            console.log('\n🔍 DIAGNOSIS:');
            if (user.is_active === 0) {
                console.log('   ❌ Account is PENDING APPROVAL (is_active = 0)');
                console.log('   ✅ FIX: Set is_active to 1 in User Management');
            } else if (user.is_active === 1) {
                console.log('   ✅ Account is ACTIVE (is_active = 1)');
            } else if (user.is_active === -1) {
                console.log('   ❌ Account is REJECTED (is_active = -1)');
            }

            if (user.role === 'HR' && user.hr_approval_status === 'PENDING') {
                console.log('   ❌ HR APPROVAL is PENDING');
                console.log('   ✅ FIX: Approve HR access in HR Approvals module');
                console.log('   📝 NOTE: HR users need BOTH account approval AND HR approval');
            } else if (user.role === 'HR' && user.hr_approval_status === 'APPROVED') {
                console.log('   ✅ HR APPROVAL is APPROVED');
            }

            console.log('\n');
        });

        console.log('\n💡 NEXT STEPS:');
        const marissa = result.rows[0];
        if (marissa.is_active === 0) {
            console.log('   1. Go to User Management');
            console.log('   2. Click the green checkmark (✅) to approve Marissa\'s account');
            console.log('   3. This will set is_active to 1');
        }

        if (marissa.role === 'HR' && marissa.hr_approval_status === 'PENDING') {
            console.log('   1. Go to HR Approvals module (when built)');
            console.log('   2. Approve Marissa\'s HR access');
            console.log('   OR');
            console.log('   3. Run: UPDATE users SET hr_approval_status = \'APPROVED\' WHERE id = ' + marissa.id);
        }

    } catch (error) {
        console.error('❌ Error checking status:', error);
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

    const marissa = db.users.find(u =>
        u.username?.toLowerCase().includes('marissa') ||
        u.email?.toLowerCase().includes('marissa')
    );

    if (!marissa) {
        console.log('❌ No user found matching "marissa"');
        return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`USER: ${marissa.username}`);
    console.log('='.repeat(60));
    console.log(`📋 ID:                 ${marissa.id}`);
    console.log(`👤 Username:           ${marissa.username}`);
    console.log(`💼 Role:               ${marissa.role}`);
    console.log(`🏢 Assigned Branch:    ${marissa.assigned_branch || 'NOT SET'}`);
    console.log(`\n📊 ACCOUNT STATUS:`);
    console.log(`   is_active:          ${marissa.is_active} ${getActiveStatusText(marissa.is_active)}`);
    console.log(`   status:             ${marissa.status}`);

    if (marissa.role === 'HR') {
        console.log(`\n🔐 HR APPROVAL STATUS:`);
        console.log(`   hr_approval_status: ${marissa.hr_approval_status || 'NULL'}`);
        console.log(`   hr_approved_by:     ${marissa.hr_approved_by || 'NULL'}`);
        console.log(`   hr_approved_at:     ${marissa.hr_approved_at || 'NULL'}`);
    }

    console.log('='.repeat(60));
}

function getActiveStatusText(is_active) {
    switch (is_active) {
        case 1: return '(✅ ACTIVE)';
        case 0: return '(⏳ PENDING)';
        case -1: return '(❌ REJECTED)';
        case -2: return '(🗑️ DELETED)';
        default: return '(❓ UNKNOWN)';
    }
}

// Run check
if (require.main === module) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('   MARISSA ACCOUNT STATUS CHECK');
    console.log('═'.repeat(60));
    console.log('');

    checkMarissaStatus()
        .then(() => {
            console.log('═'.repeat(60));
            console.log('CHECK COMPLETED');
            console.log('═'.repeat(60));
            console.log('');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Check failed:', error.message);
            process.exit(1);
        });
}

module.exports = { checkMarissaStatus };
