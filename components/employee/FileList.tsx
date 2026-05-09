import React, { useState, useEffect } from 'react';

function FileList({ employeeId, showAlert, showConfirm, refreshTrigger }: {
    employeeId: string;
    showAlert: (msg: string) => void;
    showConfirm: (msg: string, onConfirmAction: () => void) => void;
    refreshTrigger?: number;
}) {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadCategory, setUploadCategory] = useState('Employment');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    useEffect(() => {
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

    const handleUpload = async () => {
        if (!selectedFile) {
            showAlert('Please select a file to upload.');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('employeeId', employeeId);
            formData.append('documentType', uploadCategory);

            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/employees/documents', {
                method: 'POST',
                headers: { 'x-session-id': sessionId || '' },
                body: formData
            });

            if (res.ok) {
                showAlert('Document uploaded successfully.');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchFiles();
            } else {
                const data = await res.json();
                showAlert(data.error || 'Failed to upload document.');
            }
        } catch (err) {
            console.error('Upload Error:', err);
            showAlert('An error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

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

    return (
        <div>
            {/* Upload Section */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Document Category</label>
                        <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                            disabled={isUploading}
                        >
                            <option value="Resume">Resume / CV</option>
                            <option value="Contract">Employment Contract</option>
                            <option value="Medical">Medical Certificate</option>
                            <option value="NBI">NBI Clearance</option>
                            <option value="SSS">SSS Form</option>
                            <option value="PhilHealth">PhilHealth Form</option>
                            <option value="Pag-IBIG">Pag-IBIG Form</option>
                            <option value="TIN">TIN / BIR Form</option>
                            <option value="Training">Training Certificate</option>
                            <option value="Disciplinary">Disciplinary Action</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div style={{ flex: 2, minWidth: '250px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.25rem' }}>Select File</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                style={{ flex: 1, padding: '0.4rem', background: 'white', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                                disabled={isUploading}
                            />
                            <button
                                onClick={handleUpload}
                                disabled={!selectedFile || isUploading}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: (!selectedFile || isUploading) ? '#94a3b8' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '0.875rem',
                                    cursor: (!selectedFile || isUploading) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {isUploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

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
                {filteredFiles.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No documents uploaded yet.</p>
                ) : filteredFiles.map((file) => (
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
