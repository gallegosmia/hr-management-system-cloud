/**
 * Fix Superadmin Account - Set to Active
 * 
 * This script activates the superadmin account
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

async function fixSuperadminAccount() {
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
        console.log('🔧 Fixing superadmin account...\n');

        // Check current status
        const checkResult = await pool.query(`
            SELECT id, username, is_active, status, role, hr_approval_status
            FROM users 
            WHERE username = 'superadmin'
        `);

        if (checkResult.rows.length === 0) {
            console.log('❌ Superadmin account not found!');
            console.log('💡 Please run: node create-super-admin.js');
            return;
        }

        const admin = checkResult.rows[0];
        console.log('📊 Current Status:');
        console.log(`   Username:           ${admin.username}`);
        console.log(`   is_active:          ${admin.is_active}`);
        console.log(`   status:             ${admin.status}`);
        console.log(`   role:               ${admin.role}`);
        console.log(`   hr_approval_status: ${admin.hr_approval_status || 'NULL'}`);
        console.log('');

        // Fix the account
        console.log('🔄 Updating account to ACTIVE...\n');

        await pool.query(`
            UPDATE users 
            SET 
                is_active = 1,
                status = 'ACTIVE',
                hr_approval_status = NULL
            WHERE username = 'superadmin'
        `);

        // Verify
        const verifyResult = await pool.query(`
            SELECT id, username, is_active, status, hr_approval_status
            FROM users 
            WHERE username = 'superadmin'
        `);

        const updated = verifyResult.rows[0];

        console.log('═'.repeat(60));
        console.log('✅ SUPERADMIN ACCOUNT FIXED!');
        console.log('═'.repeat(60));
        console.log('');
        console.log('📊 Updated Status:');
        console.log(`   Username:           ${updated.username}`);
        console.log(`   is_active:          ${updated.is_active} ✅`);
        console.log(`   status:             ${updated.status} ✅`);
        console.log(`   hr_approval_status: ${updated.hr_approval_status || 'NULL'} ✅`);
        console.log('');
        console.log('═'.repeat(60));
        console.log('');
        console.log('✅ You can now login with:');
        console.log('   Username: superadmin');
        console.log('   Password: superadmin123');
        console.log('');
        console.log('═'.repeat(60));

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

    const adminIndex = db.users.findIndex(u => u.username === 'superadmin');

    if (adminIndex === -1) {
        console.log('❌ Superadmin account not found!');
        console.log('💡 Please run: node create-super-admin.js');
        return;
    }

    const admin = db.users[adminIndex];

    console.log('📊 Current Status:');
    console.log(`   Username:           ${admin.username}`);
    console.log(`   is_active:          ${admin.is_active}`);
    console.log(`   status:             ${admin.status}`);
    console.log(`   hr_approval_status: ${admin.hr_approval_status || 'NULL'}`);
    console.log('');

    // Fix the account
    console.log('🔄 Updating account to ACTIVE...\n');

    db.users[adminIndex].is_active = 1;
    db.users[adminIndex].status = 'ACTIVE';
    db.users[adminIndex].hr_approval_status = null;

    // Save
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    console.log('═'.repeat(60));
    console.log('✅ SUPERADMIN ACCOUNT FIXED!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📊 Updated Status:');
    console.log(`   Username:           ${db.users[adminIndex].username}`);
    console.log(`   is_active:          ${db.users[adminIndex].is_active} ✅`);
    console.log(`   status:             ${db.users[adminIndex].status} ✅`);
    console.log(`   hr_approval_status: ${db.users[adminIndex].hr_approval_status || 'NULL'} ✅`);
    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.log('✅ You can now login with:');
    console.log('   Username: superadmin');
    console.log('   Password: superadmin123');
    console.log('');
    console.log('═'.repeat(60));
}

// Run
if (require.main === module) {
    fixSuperadminAccount()
        .then(() => {
            console.log('\n✅ Fix completed successfully!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Fix failed:', error.message);
            process.exit(1);
        });
}
