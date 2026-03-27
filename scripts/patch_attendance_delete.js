const fs = require('fs');
const path = require('path');

// 1. Patch page.tsx
const pageFile = path.join(__dirname, '../app/attendance/page.tsx');
let pageContent = fs.readFileSync(pageFile, 'utf8');

const listButtonRegex = /<td style=\{\{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' \}\}>\s*<button\s*onClick=\{[^}]*\}\s*style=\{\{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' \}\}\s*>\s*✏️\s*<\/button>\s*<\/td>/;

const newListButton = `<td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button
                                                        onClick={() => { setEditingRecord({ ...record }); setIsEditModalOpen(true); }}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    {user?.role !== 'Employee' && (
                                                        <button
                                                            onClick={() => handleDelete(record.id)}
                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </td>`;

pageContent = pageContent.replace(listButtonRegex, newListButton);

const gridButtonRegex = /<button onClick=\{[^>]*\} style=\{\{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' \}\}>⋮<\/button>/;
const newGridButton = `<div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { setEditingRecord({ ...record }); setIsEditModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }} title="Edit">✏️</button>
                                            {user?.role !== 'Employee' && (
                                                <button onClick={() => handleDelete(record.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete">🗑️</button>
                                            )}
                                        </div>`;

pageContent = pageContent.replace(gridButtonRegex, newGridButton);

fs.writeFileSync(pageFile, pageContent);

// 2. Patch API route.ts
const apiFile = path.join(__dirname, '../app/api/attendance/route.ts');
let apiContent = fs.readFileSync(apiFile, 'utf8');

const oldDeleteRegex = /await query\("DELETE FROM attendance WHERE id = \$1", \[parseInt\(id\)\]\);/;
const newDeleteLogic = `
        const recordRes = await query("SELECT * FROM attendance WHERE id = $1", [parseInt(id)]);
        const record = recordRes.rows[0];

        if (record) {
            let hrUser = 'System';
            try {
                // Try grabbing session data using auth middleware natively to get real user if possible
                const authResult = await requireBranchAuth(request);
                if (!(authResult instanceof NextResponse)) {
                     hrUser = authResult[0].first_name + ' ' + authResult[0].last_name;
                }
            } catch(e) {}

            try {
                await query(\`
                    INSERT INTO audit_logs (hr_user, employee_id, action, details, previous_credits, new_credits)
                    VALUES ($1, $2, $3, $4, $5, $6)
                \`, [hrUser, record.employee_id, 'ATTENDANCE_DELETED', \`Deleted \${record.status} record for \${new Date(record.date).toISOString().split('T')[0]}\`, 0, 0]);
            } catch (auditError) {
                console.warn("Audit Log insert failed, table might not exist:", auditError);
            }
        }

        await query("DELETE FROM attendance WHERE id = $1", [parseInt(id)]);`;

apiContent = apiContent.replace(oldDeleteRegex, newDeleteLogic);
fs.writeFileSync(apiFile, apiContent);

console.log('Patch complete.');
