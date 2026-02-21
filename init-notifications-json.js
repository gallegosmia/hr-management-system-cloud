const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

try {
    if (fs.existsSync(DB_FILE)) {
        console.log('📂 Loading database.json...');
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

        if (!data.user_notifications) {
            console.log('➕ Adding user_notifications table...');
            data.user_notifications = [];

            // Add some sample notifications if needed
            // data.user_notifications.push({
            //     id: 1,
            //     user_id: 1,
            //     title: "Welcome",
            //     message: "Notification system initialized",
            //     is_read: false,
            //     created_at: new Date().toISOString()
            // });

            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            console.log('✅ user_notifications table initialized successfully');
        } else {
            console.log('ℹ️ user_notifications table already exists');
        }
    } else {
        console.error('❌ database.json not found at', DB_FILE);
    }
} catch (error) {
    console.error('❌ Error initializing database:', error);
}
