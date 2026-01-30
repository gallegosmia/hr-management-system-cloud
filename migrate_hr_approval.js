/**
 * Migration Script: HR Approval System
 * 
 * Adds fields to support HR role approval workflow:
 * - hr_approval_status (PENDING, APPROVED, REJECTED)
 * - hr_approved_by (user_id of approving admin)
 * - hr_approved_at (timestamp)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load database URL
function getDatabaseUrl() {
    if (fs.existsSync(path.join(process.cwd(), '.env'))) {
        const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
        const match = env.match(/^DATABASE_URL=(.+)$/m);
        if (match) return match[1].trim();
    }
    return null;
}

async function runMigration() {
    const dbUrl = getDatabaseUrl();

    if (!dbUrl) {
        console.log('⚠️  No DATABASE_URL found. Updating local JSON database...');
        updateLocalDatabase();
        return;
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Starting HR Approval Migration...\n');

        // 1. Add HR approval fields to users table
        console.log('1️⃣  Adding HR approval fields to users table...');

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS hr_approval_status VARCHAR(50) DEFAULT 'APPROVED';
        `);

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS hr_approved_by INTEGER REFERENCES users(id);
        `);

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMP WITH TIME ZONE;
        `);

        console.log('   ✅ HR approval fields added\n');

        // 2. Set existing HR users to APPROVED status
        console.log('2️⃣  Setting existing HR users to APPROVED status...');

        const result = await pool.query(`
            UPDATE users 
            SET hr_approval_status = 'APPROVED',
                hr_approved_at = CURRENT_TIMESTAMP
            WHERE role IN ('Admin', 'Manager', 'HR')
            AND (hr_approval_status IS NULL OR hr_approval_status = '')
            RETURNING username, role;
        `);

        if (result.rowCount > 0) {
            console.log(`   ✅ Updated ${result.rowCount} existing HR user(s):`);
            result.rows.forEach(user => {
                console.log(`      - ${user.username} (${user.role})`);
            });
        } else {
            console.log('   ℹ️  No existing HR users to update');
        }
        console.log('');

        // 3. Super admins don't need approval
        console.log('3️⃣  Configuring Super Admin users...');

        const superAdminResult = await pool.query(`
            UPDATE users 
            SET hr_approval_status = NULL
            WHERE role IN ('President', 'Vice President')
            RETURNING username, role;
        `);

        if (superAdminResult.rowCount > 0) {
            console.log(`   ✅ ${superAdminResult.rowCount} Super Admin(s) configured (no approval needed):`);
            superAdminResult.rows.forEach(user => {
                console.log(`      - ${user.username} (${user.role})`);
            });
        }
        console.log('');

        console.log('✅ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// For local JSON database
function updateLocalDatabase() {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');

    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file not found');
        return;
    }

    console.log('📝 Updating local JSON database...\n');

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    let updated = 0;
    db.users.forEach(user => {
        // Add fields if they don't exist
        if (!user.hasOwnProperty('hr_approval_status')) {
            // Super Admins don't need approval
            if (['President', 'Vice President'].includes(user.role)) {
                user.hr_approval_status = null;
            }
            // Existing HR users are auto-approved
            else if (['Admin', 'Manager', 'HR'].includes(user.role)) {
                user.hr_approval_status = 'APPROVED';
                user.hr_approved_at = new Date().toISOString();
                user.hr_approved_by = null;
                updated++;
                console.log(`✅ ${user.username} (${user.role}) → APPROVED`);
            }
            // Employees don't need approval
            else {
                user.hr_approval_status = null;
            }
        }
    });

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    console.log(`\n✅ Updated ${updated} HR user(s) in local database\n`);
}

// Update schema file
function updateSchemaFile() {
    const schemaPath = path.join(process.cwd(), 'data', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        console.log('⚠️  schema.sql not found, skipping schema update');
        return;
    }

    console.log('📝 Updating schema.sql file...');

    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Check if already updated
    if (schemaContent.includes('hr_approval_status')) {
        console.log('   ℹ️  Schema file already contains HR approval fields');
        return;
    }

    // Add HR approval fields after assigned_branch
    const updatedSchema = schemaContent.replace(
        /(assigned_branch VARCHAR\(100\),)/,
        `$1\n    hr_approval_status VARCHAR(50), -- PENDING, APPROVED, REJECTED (for HR roles)\n    hr_approved_by INTEGER REFERENCES users(id),\n    hr_approved_at TIMESTAMP WITH TIME ZONE,`
    );

    fs.writeFileSync(schemaPath, updatedSchema);
    console.log('   ✅ Schema file updated\n');
}

// Run migration
if (require.main === module) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('   HR APPROVAL SYSTEM MIGRATION');
    console.log('═'.repeat(60));
    console.log('');

    runMigration()
        .then(() => {
            updateSchemaFile();
            console.log('═'.repeat(60));
            console.log('MIGRATION SUMMARY:');
            console.log('- HR approval fields added to users table');
            console.log('- Existing HR users set to APPROVED status');
            console.log('- Super Admins configured (no approval needed)');
            console.log('- New HR registrations will be PENDING by default');
            console.log('═'.repeat(60));
            console.log('');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runMigration, updateLocalDatabase, updateSchemaFile };
