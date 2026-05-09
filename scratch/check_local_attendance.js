const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const attendance = db.attendance || [];
    
    console.log(`Total attendance records in local JSON: ${attendance.length}`);
    
    const marchGap = attendance.filter(r => {
        const d = r.date;
        return d && (d.startsWith('2026-03-24') || d.startsWith('2026-03-25') || d.startsWith('2026-03-26'));
    });
    
    console.log(`Found ${marchGap.length} records in local JSON for March 24-26.`);
    if (marchGap.length > 0) {
        console.log('Sample records:');
        console.log(JSON.stringify(marchGap.slice(0, 5), null, 2));
    }

} catch (e) {
    console.error(e.message);
}
