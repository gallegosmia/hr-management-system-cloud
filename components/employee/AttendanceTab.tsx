'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface AttendanceRecord {
    id: number;
    date: string;
    time_in?: string;
    time_out?: string;
    status: string;
    remarks?: string;
}

interface AttendanceTabProps {
    employeeId: number;
}

export default function AttendanceTab({ employeeId }: AttendanceTabProps) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchAttendance();
    }, [employeeId, startDate, endDate]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data);
            }
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('present') || s.includes('on time')) return '#10b981'; // Green
        if (s.includes('late')) return '#f59e0b'; // Amber
        if (s.includes('absent')) return '#ef4444'; // Red
        if (s.includes('leave')) return '#3b82f6'; // Blue
        return '#6b7280'; // Gray
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Filter Header */}
            <div style={{
                background: 'white',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Attendance Records</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
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
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Time In</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Time Out</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading attendance...</td>
                            </tr>
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No attendance records found for this period.</td>
                            </tr>
                        ) : (
                            records.map((record) => (
                                <tr key={record.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                                        {format(new Date(record.date), 'MMM dd, yyyy')}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                                        {record.time_in || '--:--'}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                                        {record.time_out || '--:--'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.6rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: `${getStatusColor(record.status)}15`,
                                            color: getStatusColor(record.status)
                                        }}>
                                            {record.status}
                                        </span>
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
