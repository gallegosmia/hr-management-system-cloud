const { getSession } = require('./lib/auth');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const DB_FILE = path.join(process.cwd(), 'data', 'database.json');
        if (fs.existsSync(DB_FILE)) {
            const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            if (db.sessions && db.sessions.length > 0) {
                const sid = db.sessions[0].id;
                console.log('Testing session:', sid);
                const session = await getSession(sid);
                console.log('Session result:', session);
            } else {
                console.log('No sessions in database.json');
            }
        } else {
            console.log('data/database.json not found');
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
