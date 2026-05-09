'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';

interface LeaveRecord {
    id: number;
    date: string;
    status: string;
    remarks?: string;
}

interface LeaveHistoryTabProps {
    employeeId: number;
}

export default function LeaveHistoryTab({ employeeId }: LeaveHistoryTabProps) {
    const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
    const [balanceInfo, setBalanceInfo] = useState({ count: 0, limit: 5, balance: 5, year: new Date().getFullYear() });
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<LeaveRecord>>({});
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        fetchLeaves();
        fetchBalance();
    }, [employeeId]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            // Fetch all attendance for the current year
            const year = new Date().getFullYear();
            const startStr = `${year}-01-01`;
            const endStr = `${year}-12-31`;
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?employee_id=${employeeId}&start_date=${startStr}&end_date=${endStr}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter for leave and absent records
                const leaveRecords = data.filter((r: any) => {
                    const status = (r.status || '').toLowerCase();
                    return status.includes('leave') || status.includes('absent');
                });
                setLeaves(leaveRecords);
            }
        } catch (error) {
            console.error('Failed to fetch leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBalance = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/employees?id=${employeeId}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                const balance = data.leave_balance ?? 5;
                const limit = 5;
                const count = Math.max(0, limit - balance);

                setBalanceInfo({
                    count,
                    limit,
                    balance,
                    year: new Date().getFullYear()
                });
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this leave record? This will remove the attendance entry.')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });

            if (res.ok) {
                fetchLeaves();
                fetchBalance();
            } else {
                alert('Failed to delete record');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete record');
        }
    };

    const handleEdit = (record: LeaveRecord) => {
        setEditingRecord(record);
        setFormData({
            date: record.date.split('T')[0],
            status: record.status,
            remarks: record.remarks || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        setIsSaving(true);

        const payloadToSubmit = { ...formData };
        if (payloadToSubmit.date === editingRecord.date.split('T')[0]) {
            delete payloadToSubmit.date;
        }

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?id=${editingRecord.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify(payloadToSubmit)
            });

            if (res.ok) {
                setStatus({ type: 'success', msg: 'Record updated successfully!' });
                setTimeout(() => {
                    setEditingRecord(null);
                    setStatus(null);
                    fetchLeaves();
                    fetchBalance();
                }, 1500);
            } else {
                const data = await res.json();
                setStatus({ type: 'error', msg: data.error || 'Failed to update record' });
            }
        } catch (error) {
            console.error('Save error:', error);
            setStatus({ type: 'error', msg: 'Connection error. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Balance Widget */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                    { label: 'Yearly Limit', value: `${balanceInfo.limit} Days`, color: '#6b7280' },
                    { label: 'Used Leave', value: `${balanceInfo.count} Days`, color: balanceInfo.count > balanceInfo.limit ? '#ef4444' : '#f59e0b' },
                    { label: 'Remaining Balance', value: `${balanceInfo.balance} Days`, color: '#10b981' }
                ].map((item, idx) => (
                    <div key={idx} style={{
                        background: 'white',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid #f3f4f6',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>{item.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                ))}
            </div>

            {/* Attendance Driven Message */}
            <div style={{
                background: '#eff6ff',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                fontSize: '0.875rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <span>💡</span>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                    This list is automatically generated from <strong>Attendance</strong> records marked as 'Leave' or 'Absent'.
                </p>
            </div>

            {/* List */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #f3f4f6',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Remarks</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading...</td>
                            </tr>
                        ) : leaves.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No leave records found for {balanceInfo.year}.</td>
                            </tr>
                        ) : (
                            leaves.map((record) => (
                                <tr key={record.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                                        {format(new Date(record.date), 'MMMM dd, yyyy')}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                                        {record.status}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                        {record.remarks || '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEdit(record)}
                                                style={{
                                                    padding: '0.4rem',
                                                    background: '#eff6ff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: '#2563eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                style={{
                                                    padding: '0.4rem',
                                                    background: '#fef2f2',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: '#dc2626',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingRecord && typeof document !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 9999, padding: '1rem'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px', width: '100%',
                        maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb',
                            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', margin: 0 }}>
                                ✏️ Edit Leave Record
                            </h3>
                            <button
                                onClick={() => setEditingRecord(null)}
                                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.date || ''}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                    Type
                                </label>
                                <select
                                    value={formData.status || ''}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                                >
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Vacation Leave">Vacation Leave</option>
                                    <option value="Emergency Leave">Emergency Leave</option>
                                    <option value="Birthday Leave">Birthday Leave</option>
                                    <option value="On Leave">On Leave</option>
                                    <option value="Leave Without Pay">Leave Without Pay</option>
                                    <option value="Absent">Absent</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>
                                    Remarks
                                </label>
                                <textarea
                                    value={formData.remarks || ''}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' }}
                                    placeholder="Add any remarks..."
                                />
                            </div>
                        </div>
                        <div style={{
                            padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb',
                            background: '#f9fafb', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
                        }}>
                            <button
                                onClick={() => setEditingRecord(null)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                                    background: status?.type === 'success' ? '#10b981' : '#1e40af', color: 'white', cursor: 'pointer',
                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    transition: 'background-color 0.3s ease'
                                }}
                                disabled={isSaving || status?.type === 'success'}
                            >
                                {status?.type === 'success' ? (
                                    <><span>✅</span> Saved</>
                                ) : isSaving ? (
                                    <><span>⏳</span> Saving...</>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>

                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
