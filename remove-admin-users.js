/**
 * Remove Admin and Admin2 Users
 * 
 * This script removes the legacy admin and admin2 user accounts
 * from the database.
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

async function removeUsers() {
    const dbUrl = getDatabaseUrl();

    if (!dbUrl) {
        console.log('⚠️  No DATABASE_URL found. Updating local JSON database...');
        removeUsersFromLocal();
        return;
    }

    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🗑️  Removing admin and admin2 users from PostgreSQL...\n');

        // Get user IDs first
        const users = await pool.query(`
            SELECT id, username, role 
            FROM users 
            WHERE username IN ('admin', 'admin2')
        `);

        if (users.rows.length === 0) {
            console.log('ℹ️  No users named "admin" or "admin2" found.');
            return;
        }

        console.log('Found users to delete:');
        users.rows.forEach(user => {
            console.log(`  - ${user.username} (${user.role}) [ID: ${user.id}]`);
        });
        console.log('');

        // Delete users (CASCADE will handle related sessions, etc.)
        const deleteResult = await pool.query(`
            DELETE FROM users 
            WHERE username IN ('admin', 'admin2')
            RETURNING username, role
        `);

        if (deleteResult.rowCount > 0) {
            console.log(`✅ Successfully deleted ${deleteResult.rowCount} user(s):`);
            deleteResult.rows.forEach(user => {
                console.log(`   - ${user.username} (${user.role})`);
            });
        }

        console.log('\n✨ Cleanup complete!\n');

    } catch (error) {
        console.error('❌ Error removing users:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// For local JSON database
function removeUsersFromLocal() {
    const dbPath = path.join(process.cwd(), 'data', 'database.json');

    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file not found');
        return;
    }

    console.log('📝 Updating local JSON database...\n');

    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    // Find users to delete
    const usersToDelete = db.users.filter(u => u.username === 'admin' || u.username === 'admin2');

    if (usersToDelete.length === 0) {
        console.log('ℹ️  No users named "admin" or "admin2" found.');
        return;
    }

    console.log('Found users to delete:');
    usersToDelete.forEach(user => {
        console.log(`  - ${user.username} (${user.role}) [ID: ${user.id}]`);
    });
    console.log('');

    // Get user IDs for cascade deletion
    const userIds = usersToDelete.map(u => u.id);

    // Delete from users array
    db.users = db.users.filter(u => u.username !== 'admin' && u.username !== 'admin2');

    // Delete related sessions
    if (db.sessions) {
        const sessionsBefore = db.sessions.length;
        db.sessions = db.sessions.filter(s => !userIds.includes(s.user_id));
        const sessionsDeleted = sessionsBefore - db.sessions.length;
        if (sessionsDeleted > 0) {
            console.log(`🗑️  Removed ${sessionsDeleted} related session(s)`);
        }
    }

    // Delete from approval queue if exists
    if (db.admin_approval_queue) {
        const queueBefore = db.admin_approval_queue.length;
        db.admin_approval_queue = db.admin_approval_queue.filter(q => !userIds.includes(q.user_id));
        const queueDeleted = queueBefore - db.admin_approval_queue.length;
        if (queueDeleted > 0) {
            console.log(`🗑️  Removed ${queueDeleted} approval queue item(s)`);
        }
    }

    // Save updated database
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    console.log(`\n✅ Successfully deleted ${usersToDelete.length} user(s):`);
    usersToDelete.forEach(user => {
        console.log(`   - ${user.username} (${user.role})`);
    });

    console.log('\n✨ Cleanup complete!\n');

    // Show remaining users
    console.log('📊 Remaining users:');
    db.users.forEach(user => {
        const badge = user.role === 'President' || user.role === 'Vice President' ? '👑' :
            user.role === 'HR' ? '💼' : '👤';
        console.log(`   ${badge} ${user.username} (${user.role}) - Branch: ${user.assigned_branch || 'ALL'}`);
    });
    console.log('');
}

// Run deletion
if (require.main === module) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('   REMOVE ADMIN AND ADMIN2 USERS');
    console.log('═'.repeat(60));
    console.log('');

    removeUsers()
        .then(() => {
            console.log('═'.repeat(60));
            console.log('DELETION COMPLETED SUCCESSFULLY');
            console.log('═'.repeat(60));
            console.log('');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Deletion failed:', error.message);
            process.exit(1);
        });
}

module.exports = { removeUsers, removeUsersFromLocal };
