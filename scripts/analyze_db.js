const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

try {
    const dbRaw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(dbRaw);

    console.log('Database Size Analysis:');
    let calculatedTotal = 0;
    const sizes = [];

    for (const key in db) {
        const value = db[key];
        const str = JSON.stringify(value);
        const size = str.length;
        calculatedTotal += size;
        sizes.push({ key, size, count: Array.isArray(value) ? value.length : (typeof value === 'object' ? Object.keys(value).length : 1) });
    }

    sizes.sort((a, b) => b.size - a.size);

    sizes.forEach(item => {
        console.log(`${item.key}: ${(item.size / 1024 / 1024).toFixed(2)} MB (${item.count} items)`);
    });

    console.log(`\nTotal Calculated Size: ${(calculatedTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Actual File Size: ${(fs.statSync(DB_FILE).size / 1024 / 1024).toFixed(2)} MB`);

} catch (error) {
    console.error('Analysis failed:', error);
}
