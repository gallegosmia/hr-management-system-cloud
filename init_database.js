const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env file');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
    console.log('🚀 Starting database initialization...\n');

    try {
        // Read the schema file
        const schemaPath = './data/schema.sql';
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Executing schema.sql...');
        await pool.query(schema);
        console.log('✅ Schema created successfully!\n');

        // Check if admin user exists
        const adminCheck = await pool.query("SELECT id FROM users WHERE username = 'admin'");

        if (adminCheck.rowCount === 0) {
            console.log('👤 Creating default admin user...');
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            await pool.query(
                `INSERT INTO users (username, password, role, email, is_active, status) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                ['admin', hashedPassword, 'Admin', 'admin@melann.com', 1, 'ACTIVE']
            );
            console.log('✅ Admin user created!');
            console.log('   Username: admin');
            console.log('   Password: admin123\n');
        } else {
            console.log('ℹ️ Admin user already exists.\n');
        }

        console.log('🎉 Database initialization complete!');
        console.log('\n📌 Next Steps:');
        console.log('   1. Update the DATABASE_URL in your Railway project settings');
        console.log('   2. Redeploy your Railway application');
        console.log('   3. Login with admin/admin123 and change the password\n');

    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

initializeDatabase();
