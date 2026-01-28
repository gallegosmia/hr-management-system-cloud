'use client';

import React, { useEffect, useState } from 'react';
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
            const res = await fetch(`/api/attendance?employee_id=${employeeId}&start_date=${startStr}&end_date=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                // Filter for leave records
                const leaveRecords = data.filter((r: any) => r.status.toLowerCase().includes('leave'));
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
            const res = await fetch(`/api/employees/${employeeId}/leave-balance`);
            if (res.ok) {
                const data = await res.json();
                setBalanceInfo(data);
            }
        } catch (error) {
            console.error('Failed to fetch balance:', error);
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
                <p style={{ margin: 0 }}>This list is automatically generated from <b>Attendance</b> records marked as 'Leave'.</p>
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
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading...</td>
                            </tr>
                        ) : leaves.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No leave records found for {balanceInfo.year}.</td>
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
