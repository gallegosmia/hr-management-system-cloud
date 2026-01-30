/**
 * Fix Marissa's HR Approval Status
 * 
 * This script checks and fixes Marissa's account to set HR approval to APPROVED
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

async function fixMarissaAccount() {
    const dbUrl = getDatabaseUrl();

    if (!dbUrl) {
        console.log('⚠️  No DATABASE_URL found. Checking local JSON database...\n');
        fixLocalDatabase();
        return;
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Fixing Marissa\'s account...\n');

        // Check current status
        const checkResult = await pool.query(`
            SELECT id, username, is_active, status, role, hr_approval_status, assigned_branch
            FROM users 
            WHERE username = 'marissa'
        `);

        if (checkResult.rows.length === 0) {
            console.log('❌ Marissa account not found!');
            return;
        }

        const marissa = checkResult.rows[0];
        console.log('📊 Current Status:');
        console.log(`   Username:           ${marissa.username}`);
        console.log(`   Role:               ${marissa.role}`);
        console.log(`   is_active:          ${marissa.is_active}`);
        console.log(`   status:             ${marissa.status}`);
        console.log(`   hr_approval_status: ${marissa.hr_approval_status || 'NULL'}`);
        console.log(`   assigned_branch:    ${marissa.assigned_branch || 'NOT SET'}`);
        console.log('');

        // Fix the account
        console.log('🔄 Updating account to FULLY APPROVED...\n');

        // Get superadmin ID
        const superadminResult = await pool.query(`
            SELECT id FROM users WHERE username = 'superadmin'
        `);
        const superadminId = superadminResult.rows[0]?.id || 1;

        await pool.query(`
            UPDATE users 
            SET 
                is_active = 1,
                status = 'ACTIVE',
                hr_approval_status = 'APPROVED',
                hr_approved_by = $1,
                hr_approved_at = $2
            WHERE username = 'marissa'
        `, [superadminId, new Date().toISOString()]);

        // Verify
        const verifyResult = await pool.query(`
            SELECT id, username, is_active, status, hr_approval_status, hr_approved_by, hr_approved_at
            FROM users 
            WHERE username = 'marissa'
        `);

        const updated = verifyResult.rows[0];

        console.log('═'.repeat(70));
        console.log('✅ MARISSA ACCOUNT FULLY APPROVED!');
        console.log('═'.repeat(70));
        console.log('');
        console.log('📊 Updated Status:');
        console.log(`   Username:           ${updated.username}`);
        console.log(`   is_active:          ${updated.is_active} ✅ (ACTIVE)`);
        console.log(`   status:             ${updated.status} ✅`);
        console.log(`   hr_approval_status: ${updated.hr_approval_status} ✅ (APPROVED)`);
        console.log(`   hr_approved_by:     ${updated.hr_approved_by} (Superadmin ID)`);
        console.log(`   hr_approved_at:     ${updated.hr_approved_at}`);
        console.log('');
        console.log('═'.repeat(70));
        console.log('');
        console.log('✅ Marissa can now login!');
        console.log('   - Account is ACTIVE (is_active = 1)');
        console.log('   - HR access is APPROVED');
        console.log('');
        console.log('═'.repeat(70));

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

function fixLocalDatabase() {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');

    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file not found');
        return;
    }

    console.log('📝 Updating local JSON database...\n');

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    const marissaIndex = db.users.findIndex(u => u.username === 'marissa');

    if (marissaIndex === -1) {
        console.log('❌ Marissa account not found!');
        return;
    }

    const marissa = db.users[marissaIndex];
    const superadmin = db.users.find(u => u.username === 'superadmin');
    const superadminId = superadmin?.id || 1;

    console.log('📊 Current Status:');
    console.log(`   Username:           ${marissa.username}`);
    console.log(`   Role:               ${marissa.role}`);
    console.log(`   is_active:          ${marissa.is_active}`);
    console.log(`   status:             ${marissa.status}`);
    console.log(`   hr_approval_status: ${marissa.hr_approval_status || 'NULL'}`);
    console.log(`   assigned_branch:    ${marissa.assigned_branch || 'NOT SET'}`);
    console.log('');

    // Fix the account
    console.log('🔄 Updating account to FULLY APPROVED...\n');

    db.users[marissaIndex].is_active = 1;
    db.users[marissaIndex].status = 'ACTIVE';
    db.users[marissaIndex].hr_approval_status = 'APPROVED';
    db.users[marissaIndex].hr_approved_by = superadminId;
    db.users[marissaIndex].hr_approved_at = new Date().toISOString();

    // Save
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    console.log('═'.repeat(70));
    console.log('✅ MARISSA ACCOUNT FULLY APPROVED!');
    console.log('═'.repeat(70));
    console.log('');
    console.log('📊 Updated Status:');
    console.log(`   Username:           ${db.users[marissaIndex].username}`);
    console.log(`   is_active:          ${db.users[marissaIndex].is_active} ✅ (ACTIVE)`);
    console.log(`   status:             ${db.users[marissaIndex].status} ✅`);
    console.log(`   hr_approval_status: ${db.users[marissaIndex].hr_approval_status} ✅ (APPROVED)`);
    console.log(`   hr_approved_by:     ${db.users[marissaIndex].hr_approved_by} (Superadmin ID)`);
    console.log(`   hr_approved_at:     ${db.users[marissaIndex].hr_approved_at}`);
    console.log('');
    console.log('═'.repeat(70));
    console.log('');
    console.log('✅ Marissa can now login!');
    console.log('   - Account is ACTIVE (is_active = 1)');
    console.log('   - HR access is APPROVED');
    console.log('');
    console.log('═'.repeat(70));
}

// Run
if (require.main === module) {
    fixMarissaAccount()
        .then(() => {
            console.log('\n✅ Fix completed successfully!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Fix failed:', error.message);
            process.exit(1);
        });
}
