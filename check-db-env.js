
const fs = require('fs');
const path = require('path');

console.log('Checking environment...');

try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        console.log('.env file FOUND');
        const content = fs.readFileSync(envPath, 'utf-8');
        console.log('Content preview:', content.substring(0, 50) + '...');

        if (content.includes('DATABASE_URL=')) {
            console.log('DATABASE_URL is defined in .env');
        } else {
            console.log('DATABASE_URL is NOT in .env');
        }
    } else {
        console.log('.env file NOT found');
    }
} catch (e) {
    console.error('Error checking .env:', e);
}

console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');
