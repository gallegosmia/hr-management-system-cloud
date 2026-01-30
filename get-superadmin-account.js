/**
 * Get Superadmin Account Details
 * 
 * This script retrieves the superadmin account information
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

async function getSuperadminAccount() {
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
        console.log('🔍 Retrieving superadmin account details...\n');

        const result = await pool.query(`
            SELECT 
                id, 
                username, 
                password,
                role, 
                email,
                is_active,
                created_at,
                last_login
            FROM users 
            WHERE username = 'superadmin'
        `);

        if (result.rows.length === 0) {
            console.log('❌ Superadmin account not found!');
            console.log('\n💡 You may need to run: node create-super-admin.js');
            return;
        }

        const admin = result.rows[0];

        console.log('═'.repeat(70));
        console.log('  🔐 SUPERADMIN ACCOUNT CREDENTIALS');
        console.log('═'.repeat(70));
        console.log('');
        console.log('  📋 Account ID:        ' + admin.id);
        console.log('  👤 Username:          ' + admin.username);
        console.log('  🔑 Password:          superadmin123');
        console.log('  📧 Email:             ' + (admin.email || 'Not set'));
        console.log('  💼 Role:              ' + admin.role);
        console.log('  ✅ Status:            ' + (admin.is_active === 1 ? 'Active' : 'Inactive'));
        console.log('  📅 Created:           ' + admin.created_at);
        console.log('  🕒 Last Login:        ' + (admin.last_login || 'Never'));
        console.log('');
        console.log('═'.repeat(70));
        console.log('');
        console.log('📝 LOGIN INSTRUCTIONS:');
        console.log('');
        console.log('  1. Go to: http://localhost:3000 (or your app URL)');
        console.log('  2. Username: superadmin');
        console.log('  3. Password: superadmin123');
        console.log('');
        console.log('💡 TIP: If you\'ve changed the password, it\'s stored as a hash:');
        console.log('    ' + admin.password.substring(0, 50) + '...');
        console.log('');
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

    const admin = db.users.find(u => u.username === 'superadmin');

    if (!admin) {
        console.log('❌ Superadmin account not found!');
        console.log('\n💡 You may need to run: node create-super-admin.js');
        return;
    }

    console.log('═'.repeat(70));
    console.log('  🔐 SUPERADMIN ACCOUNT CREDENTIALS');
    console.log('═'.repeat(70));
    console.log('');
    console.log('  📋 Account ID:        ' + admin.id);
    console.log('  👤 Username:          ' + admin.username);
    console.log('  🔑 Password:          superadmin123');
    console.log('  📧 Email:             ' + (admin.email || 'Not set'));
    console.log('  💼 Role:              ' + admin.role);
    console.log('  ✅ Status:            ' + (admin.is_active === 1 ? 'Active' : 'Inactive'));
    console.log('  📅 Created:           ' + admin.created_at);
    console.log('  🕒 Last Login:        ' + (admin.last_login || 'Never'));
    console.log('');
    console.log('═'.repeat(70));
    console.log('');
    console.log('📝 LOGIN INSTRUCTIONS:');
    console.log('');
    console.log('  1. Go to: http://localhost:3000 (or your app URL)');
    console.log('  2. Username: superadmin');
    console.log('  3. Password: superadmin123');
    console.log('');
    console.log('═'.repeat(70));
}

// Run
if (require.main === module) {
    getSuperadminAccount()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('\n❌ Failed:', error.message);
            process.exit(1);
        });
}
