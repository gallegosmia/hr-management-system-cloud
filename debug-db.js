const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

console.log('Keys in DB:', Object.keys(db));

if (db.attendance) {
    console.log('attendance count:', db.attendance.length);
    if (db.attendance.length > 0) console.log('First attendance:', db.attendance[0]);
} else {
    console.log('No "attendance" key');
}

if (db.attendance_records) {
    console.log('attendance_records count:', db.attendance_records.length);
    if (db.attendance_records.length > 0) console.log('First attendance_records:', db.attendance_records[0]);
} else {
    console.log('No "attendance_records" key');
}
