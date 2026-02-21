
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

function search(obj, path = '') {
    if (typeof obj === 'string') {
        if (obj.toLowerCase().includes('state')) {
            console.log(`Found string match at ${path}: "${obj}"`);
            // Print parent object if possible (hard in recursion without passing it)
        }
        if (obj === 'EC') {
            console.log(`Found string match at ${path}: "${obj}"`);
        }
    } else if (typeof obj === 'number') {
        if (obj === 450) {
            // console.log(`Found number match at ${path}: ${obj}`); // Too noisy usually if IDs match
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            search(item, `${path}[${index}]`);
            // Check if item has amount 450 and note 'EC' or similar
            if (item && typeof item === 'object') {
                if (item.amount === 450) {
                    console.log(`Found object with amount 450 at ${path}[${index}]:`, JSON.stringify(item));
                }
                if (item.note && item.note.includes('State')) {
                    console.log(`Found object with note 'State' at ${path}[${index}]:`, JSON.stringify(item));
                }
            }
        });
    } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
            search(obj[key], `${path}.${key}`);
        });
        // Check properties
        if (obj.amount === 450) {
            console.log(`Found object with amount 450 at ${path}:`, JSON.stringify(obj));
        }
    }
}

console.log('Searching database for "State" or amount 450...');
search(db);
console.log('Search complete.');
