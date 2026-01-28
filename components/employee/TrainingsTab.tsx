'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Training {
    id: number;
    training_name: string;
    training_type: string;
    provider: string;
    date_started: string;
    date_completed: string;
    hours_completed: number;
    certificate_number: string;
    certificate_file: string;
    status: string;
    remarks: string;
}

interface Certificate {
    id: number;
    certificate_name: string;
    issuing_organization: string;
    issue_date: string;
    expiry_date: string;
    certificate_number: string;
    certificate_file: string;
    status: string;
    remarks: string;
}

interface Props {
    employeeId: number;
}

const Card = ({ children, style = {} }: { children: React.ReactNode, style?: React.CSSProperties }) => (
    <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        ...style
    }}>
        {children}
    </div>
);

export default function TrainingsTab({ employeeId }: Props) {
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'trainings' | 'certificates'>('trainings');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Training | Certificate | null>(null);
    const [user, setUser] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [employeeId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [trainingsRes, certsRes] = await Promise.all([
                fetch(`/api/employees/trainings?employee_id=${employeeId}&type=trainings`),
                fetch(`/api/employees/trainings?employee_id=${employeeId}&type=certificates`)
            ]);

            if (trainingsRes.ok) {
                setTrainings(await trainingsRes.json());
            }
            if (certsRes.ok) {
                setCertificates(await certsRes.json());
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        // Validate required fields
        if (activeSection === 'trainings') {
            if (!formData.training_name || formData.training_name.trim() === '') {
                alert('Training Name is required');
                return;
            }
        } else {
            if (!formData.certificate_name || formData.certificate_name.trim() === '') {
                alert('Certificate Name is required');
                return;
            }
        }

        try {
            const isEditing = !!editingItem;
            const endpoint = '/api/employees/trainings';
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                employee_id: employeeId,
                type: activeSection === 'certificates' ? 'certificate' : 'training',
                id: isEditing ? (editingItem as any).id : undefined
            };

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchData();
                setShowAddModal(false);
                setEditingItem(null);
                setFormData({});
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save');
        }
    };


    const handleDelete = async (id: number, type: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            const res = await fetch(`/api/employees/trainings?id=${id}&type=${type}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({});
        setShowAddModal(true);
    };

    const openEditModal = (item: Training | Certificate) => {
        setEditingItem(item);
        setFormData(item);
        setShowAddModal(true);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'MMM dd, yyyy');
        } catch {
            return dateStr;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed':
            case 'Active':
                return { bg: '#dcfce7', color: '#166534' };
            case 'In Progress':
                return { bg: '#dbeafe', color: '#1e40af' };
            case 'Expired':
                return { bg: '#fee2e2', color: '#991b1b' };
            case 'Planned':
                return { bg: '#fef3c7', color: '#92400e' };
            default:
                return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    if (loading) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    Loading trainings and certificates...
                </div>
            </Card>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header with Toggle */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setActiveSection('trainings')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: activeSection === 'trainings' ? 'linear-gradient(135deg, #064e3b, #059669)' : '#f3f4f6',
                                color: activeSection === 'trainings' ? 'white' : '#4b5563',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            📚 Trainings ({trainings.length})
                        </button>
                        <button
                            onClick={() => setActiveSection('certificates')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: activeSection === 'certificates' ? 'linear-gradient(135deg, #064e3b, #059669)' : '#f3f4f6',
                                color: activeSection === 'certificates' ? 'white' : '#4b5563',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            🏆 Certificates ({certificates.length})
                        </button>
                    </div>

                    {user && user.role !== 'Employee' && (
                        <button
                            onClick={openAddModal}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem'
                            }}
                        >
                            ➕ Add {activeSection === 'trainings' ? 'Training' : 'Certificate'}
                        </button>
                    )}
                </div>
            </Card>

            {/* Trainings List */}
            {activeSection === 'trainings' && (
                <Card>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#064e3b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📚 Training Programs
                    </h3>

                    {trainings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                            <p>No training records found</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {trainings.map(training => (
                                <div
                                    key={training.id}
                                    style={{
                                        background: '#f9fafb',
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        border: '1px solid #e5e7eb',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '1rem'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>{training.training_name}</span>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '99px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                background: getStatusColor(training.status).bg,
                                                color: getStatusColor(training.status).color
                                            }}>
                                                {training.status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                            {training.training_type && <span>📋 {training.training_type}</span>}
                                            {training.provider && <span>🏢 {training.provider}</span>}
                                            {training.date_completed && <span>📅 {formatDate(training.date_completed)}</span>}
                                            {training.hours_completed && <span>⏱️ {training.hours_completed} hrs</span>}
                                            {training.certificate_number && <span>🔢 {training.certificate_number}</span>}
                                        </div>
                                        {training.remarks && (
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                                {training.remarks}
                                            </div>
                                        )}
                                    </div>
                                    {user && user.role !== 'Employee' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEditModal(training)}
                                                style={{ padding: '0.5rem', background: '#dbeafe', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >✏️</button>
                                            <button
                                                onClick={() => handleDelete(training.id, 'training')}
                                                style={{ padding: '0.5rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            >🗑️</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Certificates List */}
            {activeSection === 'certificates' && (
                <Card>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#064e3b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏆 Certifications & Licenses
                    </h3>

                    {certificates.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                            <p>No certificates found</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {certificates.map(cert => (
                                <div
                                    key={cert.id}
                                    style={{
                                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        border: '2px solid #fbbf24',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '2rem' }}>🏅</div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#92400e', marginBottom: '0.5rem', paddingRight: '2rem' }}>
                                        {cert.certificate_name}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: '0.75rem' }}>
                                        {cert.issuing_organization || 'Unknown Issuer'}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#92400e' }}>
                                        {cert.issue_date && <span>📅 Issued: {formatDate(cert.issue_date)}</span>}
                                        {cert.expiry_date && <span>⏳ Expires: {formatDate(cert.expiry_date)}</span>}
                                        {cert.certificate_number && <span>🔢 {cert.certificate_number}</span>}
                                    </div>
                                    <div style={{
                                        marginTop: '0.75rem',
                                        display: 'inline-block',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '99px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        background: getStatusColor(cert.status).bg,
                                        color: getStatusColor(cert.status).color
                                    }}>
                                        {cert.status}
                                    </div>
                                    {user && user.role !== 'Employee' && (
                                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEditModal(cert)}
                                                style={{ padding: '0.4rem 0.75rem', background: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >✏️ Edit</button>
                                            <button
                                                onClick={() => handleDelete(cert.id, 'certificate')}
                                                style={{ padding: '0.4rem 0.75rem', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >🗑️ Delete</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                        overflow: 'hidden'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddModal(false);
                            setEditingItem(null);
                            setFormData({});
                        }
                    }}
                >
                    {/* Modal Container */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: 'min(90vh, 700px)',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* Fixed Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #e5e7eb',
                            background: 'linear-gradient(135deg, #064e3b, #059669)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <h3 style={{
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                color: 'white',
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {activeSection === 'trainings' ? '📚' : '🏆'} {editingItem ? 'Edit' : 'Add'} {activeSection === 'trainings' ? 'Training' : 'Certificate'}
                            </h3>
                            <button
                                onClick={() => { setShowAddModal(false); setEditingItem(null); setFormData({}); }}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '1.25rem 1.5rem',
                            minHeight: 0
                        }}>
                            {activeSection === 'trainings' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Training Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.training_name || ''}
                                            onChange={(e) => setFormData({ ...formData, training_name: e.target.value })}
                                            style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            placeholder="e.g., Leadership Development Program"
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Type
                                            </label>
                                            <select
                                                value={formData.training_type || ''}
                                                onChange={(e) => setFormData({ ...formData, training_type: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            >
                                                <option value="">Select type</option>
                                                <option value="Internal">Internal</option>
                                                <option value="External">External</option>
                                                <option value="Online">Online</option>
                                                <option value="Workshop">Workshop</option>
                                                <option value="Seminar">Seminar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Status
                                            </label>
                                            <select
                                                value={formData.status || 'Completed'}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            >
                                                <option value="Completed">Completed</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Planned">Planned</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Provider/Organization
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.provider || ''}
                                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                            style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            placeholder="e.g., HR Department, Training Institute"
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Date Started
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.date_started || ''}
                                                onChange={(e) => setFormData({ ...formData, date_started: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Date Completed
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.date_completed || ''}
                                                onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Hours Completed
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.hours_completed || ''}
                                                onChange={(e) => setFormData({ ...formData, hours_completed: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                                placeholder="e.g., 40"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Certificate Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.certificate_number || ''}
                                                onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Remarks
                                        </label>
                                        <textarea
                                            value={formData.remarks || ''}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '70px', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                                            placeholder="Additional notes..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Certificate Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.certificate_name || ''}
                                            onChange={(e) => setFormData({ ...formData, certificate_name: e.target.value })}
                                            style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            placeholder="e.g., PMP, Six Sigma, TESDA NC II"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Issuing Organization
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.issuing_organization || ''}
                                            onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                                            style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            placeholder="e.g., PMI, TESDA"
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Issue Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.issue_date || ''}
                                                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Expiry Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.expiry_date || ''}
                                                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Certificate Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.certificate_number || ''}
                                                onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                                Status
                                            </label>
                                            <select
                                                value={formData.status || 'Active'}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Expired">Expired</option>
                                                <option value="Revoked">Revoked</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Remarks
                                        </label>
                                        <textarea
                                            value={formData.remarks || ''}
                                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '70px', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }}
                                            placeholder="Additional notes..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid #e5e7eb',
                            background: '#f9fafb',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem',
                            flexShrink: 0
                        }}>
                            <button
                                onClick={() => { setShowAddModal(false); setEditingItem(null); setFormData({}); }}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    background: 'white',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '0.625rem 1.25rem',
                                    background: 'linear-gradient(135deg, #064e3b, #059669)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {editingItem ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
