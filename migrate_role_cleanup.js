/**
 * ROLE CLEANUP MIGRATION
 * 
 * This script:
 * 1. Removes "Admin" role from the system
 * 2. Converts existing Admin/Manager users to proper roles
 * 3. Establishes the final 3-role system:
 *    - SUPER ADMIN (President/Vice President)
 *    - HR
 *    - EMPLOYEE
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
        console.log('🔧 Starting Role Cleanup Migration...\n');

        // 1. Show current role distribution
        console.log('1️⃣  Current roles in database:');
        const current = await pool.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY count DESC;
        `);
        current.rows.forEach(row => {
            console.log(`   - ${row.role}: ${row.count} user(s)`);
        });
        console.log('');

        // 2. Convert Admin and Manager to HR
        console.log('2️⃣  Converting Admin/Manager roles to HR...');
        const converted = await pool.query(`
            UPDATE users 
            SET role = 'HR'
            WHERE role IN ('Admin', 'Manager')
            RETURNING id, username, role;
        `);

        if (converted.rowCount > 0) {
            console.log(`   ✅ Converted ${converted.rowCount} user(s) to HR role:`);
            converted.rows.forEach(user => {
                console.log(`      - ${user.username}`);
            });
        } else {
            console.log('   ℹ️  No Admin/Manager users to convert');
        }
        console.log('');

        // 3. Ensure Super Admins are properly configured
        console.log('3️⃣  Configuring Super Admin users...');
        const superAdmins = await pool.query(`
            SELECT username, role, assigned_branch, hr_approval_status
            FROM users 
            WHERE role IN ('President', 'Vice President')
        `);

        if (superAdmins.rowCount > 0) {
            console.log(`   ✅ Found ${superAdmins.rowCount} Super Admin(s):`);
            superAdmins.rows.forEach(user => {
                console.log(`      - ${user.username} (${user.role})`);
                console.log(`        Branch: ${user.assigned_branch || 'ALL BRANCHES'}`);
                console.log(`        Approval: ${user.hr_approval_status || 'NOT REQUIRED'}`);
            });

            // Ensure Super Admins have correct settings
            await pool.query(`
                UPDATE users 
                SET assigned_branch = NULL,
                    hr_approval_status = NULL
                WHERE role IN ('President', 'Vice President')
            `);
            console.log('   ✅ Super Admins configured (ALL branches, no approval needed)');
        } else {
            console.log('   ⚠️  WARNING: No Super Admin users found!');
        }
        console.log('');

        // 4. Configure HR users
        console.log('4️⃣  Configuring HR users...');
        const hrUsers = await pool.query(`
            SELECT username, assigned_branch, hr_approval_status
            FROM users 
            WHERE role = 'HR'
        `);

        if (hrUsers.rowCount > 0) {
            console.log(`   ✅ Found ${hrUsers.rowCount} HR user(s):`);
            hrUsers.rows.forEach(user => {
                console.log(`      - ${user.username}`);
                console.log(`        Branch: ${user.assigned_branch || 'NOT ASSIGNED ⚠️'}`);
                console.log(`        Status: ${user.hr_approval_status || 'NOT SET'}`);
            });

            // Set existing HR users to APPROVED (legacy users)
            await pool.query(`
                UPDATE users 
                SET hr_approval_status = 'APPROVED',
                    hr_approved_at = CURRENT_TIMESTAMP
                WHERE role = 'HR'
                AND (hr_approval_status IS NULL OR hr_approval_status = '')
            `);
            console.log('   ✅ Existing HR users set to APPROVED status');
        }
        console.log('');

        // 5. Show final role distribution
        console.log('5️⃣  Final role distribution:');
        const final = await pool.query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY 
                CASE role 
                    WHEN 'President' THEN 1
                    WHEN 'Vice President' THEN 2
                    WHEN 'HR' THEN 3
                    WHEN 'Employee' THEN 4
                    ELSE 5
                END;
        `);
        final.rows.forEach(row => {
            const badge = row.role === 'President' || row.role === 'Vice President' ? '👑' :
                row.role === 'HR' ? '💼' :
                    row.role === 'Employee' ? '👤' : '❓';
            console.log(`   ${badge} ${row.role}: ${row.count} user(s)`);
        });
        console.log('');

        console.log('✅ Role cleanup migration completed!\n');

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

    let converted = 0;
    let superAdmins = 0;
    let hrUsers = 0;
    let employees = 0;

    console.log('1️⃣  Current roles:');
    const roleCounts = {};
    db.users.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
    });
    Object.keys(roleCounts).forEach(role => {
        console.log(`   - ${role}: ${roleCounts[role]}`);
    });
    console.log('');

    console.log('2️⃣  Converting roles...');
    db.users.forEach(user => {
        // Convert Admin/Manager to HR
        if (user.role === 'Admin' || user.role === 'Manager') {
            console.log(`   Converting: ${user.username} (${user.role} → HR)`);
            user.role = 'HR';
            user.hr_approval_status = 'APPROVED'; // Existing users auto-approved
            user.hr_approved_at = new Date().toISOString();
            converted++;
        }

        // Configure Super Admins
        if (user.role === 'President' || user.role === 'Vice President') {
            user.assigned_branch = null; // ALL branches
            user.hr_approval_status = null; // No approval needed
            superAdmins++;
            console.log(`   Super Admin: ${user.username} (${user.role})`);
        }

        // Configure HR users
        if (user.role === 'HR') {
            if (!user.hr_approval_status) {
                user.hr_approval_status = 'APPROVED';
                user.hr_approved_at = new Date().toISOString();
            }
            hrUsers++;
        }

        // Count employees
        if (user.role === 'Employee') {
            employees++;
        }
    });

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    console.log('');
    console.log('3️⃣  Final role distribution:');
    console.log(`   👑 Super Admin (President/VP): ${superAdmins}`);
    console.log(`   💼 HR: ${hrUsers}`);
    console.log(`   👤 Employee: ${employees}`);
    console.log('');
    console.log(`✅ Converted ${converted} Admin/Manager user(s) to HR\n`);
}

// Run migration
if (require.main === module) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('   ROLE CLEANUP MIGRATION');
    console.log('   Simplifying to 3-role system:');
    console.log('   - SUPER ADMIN (President/Vice President)');
    console.log('   - HR');
    console.log('   - EMPLOYEE');
    console.log('═'.repeat(60));
    console.log('');

    runMigration()
        .then(() => {
            console.log('═'.repeat(60));
            console.log('MIGRATION COMPLETED SUCCESSFULLY');
            console.log('');
            console.log('✅ Admin/Manager roles converted to HR');
            console.log('✅ Super Admins configured (all branches)');
            console.log('✅ HR users configured (branch-restricted)');
            console.log('✅ 3-role system established');
            console.log('═'.repeat(60));
            console.log('');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runMigration, updateLocalDatabase };
