'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Violation {
    id: number;
    violation_type: string;
    severity: string;
    incident_date: string;
    description: string;
    action_taken: string;
    action_date: string;
    issued_by: number;
    issued_by_name: string;
    acknowledged_by_employee: boolean;
    acknowledged_at: string;
    status: string;
    remarks: string;
}

interface Warning {
    id: number;
    violation_id: number;
    warning_type: string;
    warning_date: string;
    reason: string;
    duration_days: number;
    issued_by: number;
    issued_by_name: string;
    acknowledged: boolean;
    acknowledged_at: string;
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

export default function ViolationsTab({ employeeId }: Props) {
    const [violations, setViolations] = useState<Violation[]>([]);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'violations' | 'warnings'>('violations');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Violation | Warning | null>(null);
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
            const [violationsRes, warningsRes] = await Promise.all([
                fetch(`/api/employees/violations?employee_id=${employeeId}&type=violations`),
                fetch(`/api/employees/violations?employee_id=${employeeId}&type=warnings`)
            ]);

            if (violationsRes.ok) {
                setViolations(await violationsRes.json());
            }
            if (warningsRes.ok) {
                setWarnings(await warningsRes.json());
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const isEditing = !!editingItem;
            const endpoint = '/api/employees/violations';
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                employee_id: employeeId,
                type: activeSection === 'warnings' ? 'warning' : 'violation',
                id: isEditing ? (editingItem as any).id : undefined,
                issued_by: user?.employee_id_ref || null
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
            const res = await fetch(`/api/employees/violations?id=${id}&type=${type}`, {
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

    const openEditModal = (item: Violation | Warning) => {
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

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'Minor':
                return { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' };
            case 'Major':
                return { bg: '#fed7aa', color: '#c2410c', border: '#fb923c' };
            case 'Serious':
                return { bg: '#fecaca', color: '#b91c1c', border: '#f87171' };
            case 'Grave':
                return { bg: '#fee2e2', color: '#7f1d1d', border: '#ef4444' };
            default:
                return { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
        }
    };

    const getWarningColor = (type: string) => {
        switch (type) {
            case 'Verbal':
                return { bg: '#dbeafe', color: '#1e40af' };
            case 'Written':
                return { bg: '#fef3c7', color: '#92400e' };
            case 'Final':
                return { bg: '#fee2e2', color: '#991b1b' };
            case 'Suspension Notice':
                return { bg: '#f3e8ff', color: '#6b21a8' };
            default:
                return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active':
                return { bg: '#fee2e2', color: '#991b1b' };
            case 'Resolved':
                return { bg: '#dcfce7', color: '#166534' };
            case 'Served':
                return { bg: '#dbeafe', color: '#1e40af' };
            case 'Lifted':
                return { bg: '#dcfce7', color: '#166534' };
            case 'Appealed':
                return { bg: '#fef3c7', color: '#92400e' };
            default:
                return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    if (loading) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    Loading violations and warnings...
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
                            onClick={() => setActiveSection('violations')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: activeSection === 'violations' ? 'linear-gradient(135deg, #b91c1c, #dc2626)' : '#f3f4f6',
                                color: activeSection === 'violations' ? 'white' : '#4b5563',
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
                            ⚠️ Violations ({violations.length})
                        </button>
                        <button
                            onClick={() => setActiveSection('warnings')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: activeSection === 'warnings' ? 'linear-gradient(135deg, #b91c1c, #dc2626)' : '#f3f4f6',
                                color: activeSection === 'warnings' ? 'white' : '#4b5563',
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
                            📋 Warnings ({warnings.length})
                        </button>
                    </div>

                    {user && user.role !== 'Employee' && (
                        <button
                            onClick={openAddModal}
                            style={{
                                padding: '0.75rem 1.25rem',
                                background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
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
                            ➕ Add {activeSection === 'violations' ? 'Violation' : 'Warning'}
                        </button>
                    )}
                </div>
            </Card>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <Card style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', borderColor: '#fecaca' }}>
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, marginBottom: '0.25rem' }}>Active Violations</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7f1d1d' }}>{violations.filter(v => v.status === 'Active').length}</div>
                </Card>
                <Card style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderColor: '#fcd34d' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600, marginBottom: '0.25rem' }}>Active Warnings</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#78350f' }}>{warnings.filter(w => w.status === 'Active').length}</div>
                </Card>
                <Card style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', borderColor: '#86efac' }}>
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, marginBottom: '0.25rem' }}>Resolved</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#14532d' }}>{violations.filter(v => v.status === 'Resolved').length}</div>
                </Card>
                <Card style={{ background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)', borderColor: '#d1d5db' }}>
                    <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 600, marginBottom: '0.25rem' }}>Total Records</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1f2937' }}>{violations.length + warnings.length}</div>
                </Card>
            </div>

            {/* Violations List */}
            {activeSection === 'violations' && (
                <Card>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚠️ Policy Violations
                    </h3>

                    {violations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                            <p style={{ fontWeight: 600 }}>No violations on record</p>
                            <p style={{ fontSize: '0.85rem' }}>This employee has a clean record!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {violations.map(violation => (
                                <div
                                    key={violation.id}
                                    style={{
                                        background: '#fefce8',
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        border: `2px solid ${getSeverityColor(violation.severity).border}`,
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '99px',
                                            fontSize: '0.65rem',
                                            fontWeight: 800,
                                            background: getSeverityColor(violation.severity).bg,
                                            color: getSeverityColor(violation.severity).color,
                                            textTransform: 'uppercase'
                                        }}>
                                            {violation.severity}
                                        </span>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '99px',
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            background: getStatusColor(violation.status).bg,
                                            color: getStatusColor(violation.status).color
                                        }}>
                                            {violation.status}
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '0.5rem', paddingRight: '150px' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#292524' }}>{violation.violation_type}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#57534e', marginBottom: '0.75rem' }}>
                                        {violation.description}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem', color: '#78716c' }}>
                                        <span>📅 {formatDate(violation.incident_date)}</span>
                                        {violation.action_taken && <span>⚡ {violation.action_taken}</span>}
                                        {violation.issued_by_name && <span>👤 Issued by: {violation.issued_by_name}</span>}
                                    </div>
                                    {violation.remarks && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#a8a29e', fontStyle: 'italic' }}>
                                            {violation.remarks}
                                        </div>
                                    )}
                                    {user && user.role !== 'Employee' && (
                                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEditModal(violation)}
                                                style={{ padding: '0.4rem 0.75rem', background: '#dbeafe', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >✏️ Edit</button>
                                            <button
                                                onClick={() => handleDelete(violation.id, 'violation')}
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

            {/* Warnings List */}
            {activeSection === 'warnings' && (
                <Card>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📋 Disciplinary Warnings
                    </h3>

                    {warnings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                            <p style={{ fontWeight: 600 }}>No warnings issued</p>
                            <p style={{ fontSize: '0.85rem' }}>This employee has no disciplinary warnings!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {warnings.map(warning => (
                                <div
                                    key={warning.id}
                                    style={{
                                        background: '#f9fafb',
                                        borderRadius: '12px',
                                        padding: '1.25rem',
                                        border: '1px solid #e5e7eb',
                                        borderLeft: `4px solid ${getWarningColor(warning.warning_type).color}`
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '99px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                background: getWarningColor(warning.warning_type).bg,
                                                color: getWarningColor(warning.warning_type).color
                                            }}>
                                                {warning.warning_type} Warning
                                            </span>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '99px',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                background: getStatusColor(warning.status).bg,
                                                color: getStatusColor(warning.status).color
                                            }}>
                                                {warning.status}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                            {formatDate(warning.warning_date)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.5rem' }}>
                                        {warning.reason}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                        {warning.duration_days && <span>⏱️ {warning.duration_days} days suspension</span>}
                                        {warning.issued_by_name && <span>👤 {warning.issued_by_name}</span>}
                                        {warning.acknowledged && <span style={{ color: '#16a34a' }}>✅ Acknowledged</span>}
                                    </div>
                                    {user && user.role !== 'Employee' && (
                                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openEditModal(warning)}
                                                style={{ padding: '0.4rem 0.75rem', background: '#dbeafe', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >✏️ Edit</button>
                                            <button
                                                onClick={() => handleDelete(warning.id, 'warning')}
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
                        padding: '1rem'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddModal(false);
                            setEditingItem(null);
                            setFormData({});
                        }
                    }}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginBottom: '1.5rem', marginTop: 0 }}>
                            {editingItem ? 'Edit' : 'Add'} {activeSection === 'violations' ? 'Violation' : 'Warning'}
                        </h3>


                        {activeSection === 'violations' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Violation Type *
                                        </label>
                                        <select
                                            value={formData.violation_type || ''}
                                            onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="">Select type</option>
                                            <option value="Tardiness">Tardiness</option>
                                            <option value="Absence">Absence</option>
                                            <option value="Misconduct">Misconduct</option>
                                            <option value="Policy Violation">Policy Violation</option>
                                            <option value="Insubordination">Insubordination</option>
                                            <option value="Negligence">Negligence</option>
                                            <option value="Harassment">Harassment</option>
                                            <option value="Theft">Theft</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Severity *
                                        </label>
                                        <select
                                            value={formData.severity || 'Minor'}
                                            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="Minor">Minor</option>
                                            <option value="Major">Major</option>
                                            <option value="Serious">Serious</option>
                                            <option value="Grave">Grave</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                        Incident Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.incident_date || ''}
                                        onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                        Description *
                                    </label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '100px' }}
                                        placeholder="Describe the incident in detail..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Action Taken
                                        </label>
                                        <select
                                            value={formData.action_taken || ''}
                                            onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="">Select action</option>
                                            <option value="Verbal Warning">Verbal Warning</option>
                                            <option value="Written Warning">Written Warning</option>
                                            <option value="Final Warning">Final Warning</option>
                                            <option value="Suspension">Suspension</option>
                                            <option value="Termination">Termination</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Status
                                        </label>
                                        <select
                                            value={formData.status || 'Active'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Appealed">Appealed</option>
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
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '80px' }}
                                        placeholder="Additional notes..."
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Warning Type *
                                        </label>
                                        <select
                                            value={formData.warning_type || ''}
                                            onChange={(e) => setFormData({ ...formData, warning_type: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="">Select type</option>
                                            <option value="Verbal">Verbal Warning</option>
                                            <option value="Written">Written Warning</option>
                                            <option value="Final">Final Warning</option>
                                            <option value="Suspension Notice">Suspension Notice</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.warning_date || ''}
                                            onChange={(e) => setFormData({ ...formData, warning_date: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                        Reason *
                                    </label>
                                    <textarea
                                        value={formData.reason || ''}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '100px' }}
                                        placeholder="Reason for the warning..."
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Suspension Days (if applicable)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.duration_days || ''}
                                            onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                            placeholder="e.g., 3"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                            Status
                                        </label>
                                        <select
                                            value={formData.status || 'Active'}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Served">Served</option>
                                            <option value="Lifted">Lifted</option>
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
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '80px' }}
                                        placeholder="Additional notes..."
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => { setShowAddModal(false); setEditingItem(null); setFormData({}); }}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#f3f4f6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
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
