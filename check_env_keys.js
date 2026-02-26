const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const keys = env.split('\n').map(l => l.split('=')[0].trim()).filter(k => k && !k.startsWith('#'));
    console.log('ENV Keys:', keys);
} else {
    console.log('.env not found');
}
