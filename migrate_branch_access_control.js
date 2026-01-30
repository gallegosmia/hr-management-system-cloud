/**
 * Migration Script: Branch-Based Access Control
 * 
 * This script adds the necessary database schema changes to support
 * branch-based access control in the HR Management System.
 * 
 * Changes:
 * 1. Add assigned_branch column to users table
 * 2. Add selected_branch column to sessions table
 * 3. Create access_logs table for security auditing
 * 4. Update existing users with default branch assignments
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
        console.log('⚠️  No DATABASE_URL found. Skipping PostgreSQL migration.');
        console.log('   If using local JSON database, branch filtering will be implemented at application level.');
        return;
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Starting Branch Access Control Migration...\n');

        // 1. Add assigned_branch to users table
        console.log('1️⃣  Adding assigned_branch column to users table...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS assigned_branch VARCHAR(100);
        `);
        console.log('   ✅ Column added successfully\n');

        // 2. Add selected_branch to sessions table
        console.log('2️⃣  Adding selected_branch column to sessions table...');
        await pool.query(`
            ALTER TABLE sessions 
            ADD COLUMN IF NOT EXISTS selected_branch VARCHAR(100);
        `);
        console.log('   ✅ Column added successfully\n');

        // 3. Create access_logs table
        console.log('3️⃣  Creating access_logs table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                attempted_action TEXT NOT NULL,
                attempted_branch VARCHAR(100),
                user_branch VARCHAR(100),
                status VARCHAR(50),
                reason TEXT,
                ip_address VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('   ✅ Table created successfully\n');

        // 4. Check existing users
        console.log('4️⃣  Analyzing existing users...');
        const usersResult = await pool.query('SELECT id, username, role, assigned_branch FROM users');
        const users = usersResult.rows;

        console.log(`   Found ${users.length} users\n`);

        // 5. Update Super Admin users (President, Vice President) - they get NULL (all branches)
        console.log('5️⃣  Configuring Super Admin access...');
        const superAdminResult = await pool.query(`
            UPDATE users 
            SET assigned_branch = NULL 
            WHERE role IN ('President', 'Vice President')
            RETURNING username, role;
        `);

        if (superAdminResult.rowCount > 0) {
            console.log(`   ✅ ${superAdminResult.rowCount} Super Admin(s) configured for all-branch access:`);
            superAdminResult.rows.forEach(user => {
                console.log(`      - ${user.username} (${user.role})`);
            });
        } else {
            console.log('   ℹ️  No Super Admin users found');
        }
        console.log('');

        // 6. Report users without assigned branch
        console.log('6️⃣  Checking for users without assigned branch...');
        const unassignedResult = await pool.query(`
            SELECT id, username, role, assigned_branch 
            FROM users 
            WHERE role NOT IN ('President', 'Vice President') 
            AND (assigned_branch IS NULL OR assigned_branch = '');
        `);

        if (unassignedResult.rowCount > 0) {
            console.log(`   ⚠️  ${unassignedResult.rowCount} user(s) need branch assignment:\n`);
            unassignedResult.rows.forEach(user => {
                console.log(`      - ${user.username} (${user.role})`);
            });
            console.log('\n   📝 Action Required: Please assign branches to these users via User Management.');
        } else {
            console.log('   ✅ All non-Super Admin users have assigned branches');
        }
        console.log('');

        // 7. Display current configuration
        console.log('7️⃣  Current Branch Configuration Summary:');
        const branchSummary = await pool.query(`
            SELECT 
                assigned_branch,
                COUNT(*) as user_count,
                STRING_AGG(username, ', ') as users
            FROM users
            GROUP BY assigned_branch
            ORDER BY assigned_branch NULLS FIRST;
        `);

        console.log('');
        branchSummary.rows.forEach(row => {
            const branch = row.assigned_branch || 'ALL BRANCHES (Super Admin)';
            console.log(`   📍 ${branch}: ${row.user_count} user(s)`);
            console.log(`      Users: ${row.users}`);
        });
        console.log('');

        console.log('✅ Migration completed successfully!\n');
        console.log('═'.repeat(60));
        console.log('NEXT STEPS:');
        console.log('1. Assign branches to users without assigned_branch');
        console.log('2. Update API endpoints to enforce branch filtering');
        console.log('3. Update login flow to include branch selection');
        console.log('4. Test branch access controls thoroughly');
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// For local JSON database support
function updateLocalSchema() {
    const schemaPath = path.join(process.cwd(), 'data', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        console.log('⚠️  schema.sql not found, skipping schema file update');
        return;
    }

    console.log('📝 Updating schema.sql file with branch access control fields...');

    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

    // Check if already updated
    if (schemaContent.includes('assigned_branch')) {
        console.log('   ℹ️  Schema file already contains branch access control fields');
        return;
    }

    // Add comment about branch access control
    const branchComment = `
-- Branch Access Control Fields (Added for Multi-Branch Support)
-- Super Admins (President, Vice President): assigned_branch = NULL (access all branches)
-- Branch Admins/Employees: assigned_branch = specific branch (e.g., 'Naval', 'Ormoc')
`;

    // Insert assigned_branch into users table definition
    const updatedSchema = schemaContent.replace(
        /(\s+is_active INTEGER DEFAULT 0,)/,
        `$1\n    assigned_branch VARCHAR(100), -- Branch assignment for access control`
    ).replace(
        /(CREATE TABLE IF NOT EXISTS sessions \([\s\S]*?expires_at TIMESTAMP)/,
        `$1,\n    selected_branch VARCHAR(100) -- Runtime branch context`
    );

    fs.writeFileSync(schemaPath, updatedSchema);
    console.log('   ✅ Schema file updated\n');
}

// Run migration
if (require.main === module) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('   BRANCH ACCESS CONTROL MIGRATION');
    console.log('═'.repeat(60));
    console.log('');

    runMigration()
        .then(() => {
            updateLocalSchema();
            console.log('\n✅ All migration tasks completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runMigration, updateLocalSchema };
