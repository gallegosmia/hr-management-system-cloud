const fs = require('fs');
let content = fs.readFileSync('app/leave/page.tsx', 'utf8');

const originalContent = content;

// Remove the header
content = content.replace(
    /<div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>[\s\S]*?<button onClick={\(\) => setViewingRequest\(null\)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×<\/button>\s*<\/div>/m,
    '{/* Removed header */}'
);

// Update zIndex and alignment
content = content.replace(
    /zIndex: 1000,[\s\S]*?display: 'flex', alignItems: 'center'/m,
    "zIndex: 9999,\n                    display: 'flex', alignItems: 'flex-start', paddingTop: '5rem'"
);

// Add the Close button at the bottom
content = content.replace(
    /Request ID: #\{viewingRequest\.id\}\s*<\/div>\s*<div style={{ fontSize: '0\.75rem', color: '#94a3b8', fontWeight: 500 }}>\s*Filed on \{safeDate\(viewingRequest\.created_at, 'MMM d, yyyy'\)\}\s*<\/div>\s*<\/div>/m,
    `Request ID: #{viewingRequest.id} &nbsp;|&nbsp; Filed on {safeDate(viewingRequest.created_at, 'MMM d, yyyy')}
                                </div>
                                <button 
                                    onClick={() => setViewingRequest(null)}
                                    style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>`
);

fs.writeFileSync('app/leave/page.tsx', content);

console.log('File updated successfully:', content !== originalContent);
