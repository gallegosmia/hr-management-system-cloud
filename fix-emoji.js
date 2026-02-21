const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'attendance', 'page.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace the line containing the warning - remove ALL non-ASCII characters before WARNING
content = content.replace(
    /{latesCount >= 5 && <span style={{ marginLeft: '0\.5rem', background: '#fee2e2', color: '#dc2626', padding: '0\.1rem 0\.3rem', borderRadius: '4px', fontSize: '0\.7rem' }}>.*?WARNING: Excessive<\/span>}/g,
    '{latesCount >= 5 && <span style={{ marginLeft: \'0.5rem\', background: \'#fee2e2\', color: \'#dc2626\', padding: \'0.1rem 0.3rem\', borderRadius: \'4px\', fontSize: \'0.7rem\' }}>⚠ WARNING: Excessive</span>}'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Cleaned up warning text - removed all corrupted characters');
