import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
console.log(db.users.map(u => ({ id: u.id, username: u.username, role: u.role, is_active: u.is_active })));
