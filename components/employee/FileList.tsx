
import { useState, useEffect } from 'react';

function FileList({ employeeId, showAlert, showConfirm, refreshTrigger }: {
    employeeId: string;
    showAlert: (msg: string) => void;
    showConfirm: (msg: string, onConfirmAction: () => void) => void;
    refreshTrigger?: number;
}) {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const sessionId = localStorage.getItem('sessionId');
                const res = await fetch(`/api/employees/documents?employeeId=${employeeId}`, {
                    headers: { 'x-session-id': sessionId || '' }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFiles(data);
                }
            } catch (err) {
                console.error('Failed to fetch files:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [employeeId, refreshTrigger]);

    const tabs = ['All', 'Medical', 'Legal', 'Identification', 'Employment', 'Other'];

    const getCategory = (type: string) => {
        if (['Medical'].includes(type)) return 'Medical';
        if (['NBI'].includes(type)) return 'Legal';
        if (['SSS', 'PhilHealth', 'Pag-IBIG', 'TIN'].includes(type)) return 'Identification';
        if (['Contract', 'Resume', 'Training', 'Disciplinary'].includes(type)) return 'Employment';
        return 'Other';
    };

    const filteredFiles = files.filter(f => activeTab === 'All' || getCategory(f.type) === activeTab);

    const handleDelete = (filename: string) => {
        showConfirm('Are you sure you want to delete this file?', async () => {
            try {
                const sessionId = localStorage.getItem('sessionId');
                const res = await fetch(`/api/employees/documents?employeeId=${employeeId}&filename=${filename}`, {
                    method: 'DELETE',
                    headers: { 'x-session-id': sessionId || '' }
                });
                if (res.ok) {
                    setFiles(prev => prev.filter(f => f.filename !== filename));
                    showAlert('File deleted successfully');
                } else {
                    showAlert('Failed to delete file');
                }
            } catch (err) {
                console.error('Delete error:', err);
                showAlert('An error occurred');
            }
        });
    };

    if (loading) return <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Loading files...</p>;
    if (files.length === 0) return <p style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>No documents uploaded yet.</p>;

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            border: 'none',
                            background: activeTab === tab ? '#3b82f6' : '#f3f4f6',
                            color: activeTab === tab ? 'white' : '#6b7280',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {filteredFiles.map((file) => (
                    <div
                        key={file.filename}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                                {file.type} - {file.filename.split('_').slice(2).join('_')}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <a
                                href={`${file.url}&view=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    background: 'white',
                                    textDecoration: 'none',
                                    color: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                👁️ View
                            </a>
                            <a
                                href={file.url}
                                download
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    background: 'white',
                                    textDecoration: 'none',
                                    color: '#374151',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                ⬇️ Download
                            </a>
                            <button
                                onClick={() => handleDelete(file.filename)}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.75rem',
                                    background: 'white',
                                    color: '#ef4444',
                                    border: '1px solid #ef4444',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default FileList;
