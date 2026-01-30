'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

interface PayslipRecord {
    id: number;
    payroll_run_id: number;
    period_start: string;
    period_end: string;
    gross_pay: number;
    net_pay: number;
    run_status: string;
}

interface PayrollHistoryTabProps {
    employeeId: number;
}

export default function PayrollHistoryTab({ employeeId }: PayrollHistoryTabProps) {
    const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayslips();
    }, [employeeId]);

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/employees/${employeeId}/payslips`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                // Filter for finalized runs if needed, but usually we show all payslips generated
                setPayslips(data);
            }
        } catch (error) {
            console.error('Failed to fetch payslips:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
                background: 'white',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid #f3f4f6',
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Payroll History</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Records of all completed payroll payments and generated payslips.</p>
            </div>

            <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #f3f4f6',
                overflow: 'hidden'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Pay Period</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Gross Pay</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Net Pay</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading...</td>
                            </tr>
                        ) : payslips.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No payroll records found.</td>
                            </tr>
                        ) : (
                            payslips.map((p) => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                                        {format(new Date(p.period_start), 'MMM dd')} - {format(new Date(p.period_end), 'MMM dd, yyyy')}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#374151' }}>
                                        ₱{p.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#059669' }}>
                                        ₱{p.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.6rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: p.run_status === 'Finalized' ? '#d1fae5' : '#fef3c7',
                                            color: p.run_status === 'Finalized' ? '#065f46' : '#92400e'
                                        }}>
                                            {p.run_status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <Link
                                                href={`/payroll/${p.payroll_run_id}?payslipId=${p.id}`}
                                                className="btn btn-sm btn-secondary"
                                                style={{ fontSize: '0.75rem', textDecoration: 'none' }}
                                            >
                                                📄 View
                                            </Link>
                                        </div>
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
