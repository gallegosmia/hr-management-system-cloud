
'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

interface EmergencyLoan {
    id: number;
    employee_id: number;
    employee_name: string;
    requested_amount: number;
    approved_amount?: number;
    reason: string;
    category: string;
    status: string;
    filing_date: string;
    created_at: string;
}

export default function LoansPage() {
    const [loans, setLoans] = useState<EmergencyLoan[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const parsedUser = JSON.parse(userData);

            let url = '/api/loans';
            if (parsedUser.role === 'Employee' && parsedUser.employee_id) {
                url += `?employee_id=${parsedUser.employee_id}`;
            }

            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(url, {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();
            setLoans(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch loans:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this loan request?')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/loans/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });

            if (res.ok) {
                // Remove from list immediately
                setLoans(prev => prev.filter(l => l.id !== id));
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete loan');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete loan');
        }
    };

    const getStatusStyles = (status: string) => {
        if (!status) return { background: '#fff7ed', color: '#9a3412' };
        if (status === 'Approved') return { background: '#eff6ff', color: '#1e40af' }; // Blue
        if (status === 'Disapproved') return { background: '#fef2f2', color: '#991b1b' };
        if (status === 'Fully Released') return { background: '#ecfdf5', color: '#065f46' }; // Green
        if (status === 'Partially Released') return { background: '#fef9c3', color: '#854d0e' }; // Yellow
        if (status === 'Released') return { background: '#ecfdf5', color: '#065f46' }; // Treat legacy 'Released' as Green
        if (status === 'Closed') return { background: '#f8fafc', color: '#64748b' };
        if (status === 'Draft') return { background: '#f3f4f6', color: '#374151' };
        if (status.includes('Vice President')) return { background: '#fef9c3', color: '#854d0e' }; // Yellow for VP Review
        return { background: '#fff7ed', color: '#9a3412' }; // Submitted / Under Review (Orange)
    };

    const filteredLoans = loans
        .filter(loan => loan.status !== 'Deleted') // Exclude 'Deleted' loans
        .filter(loan => filterStatus === 'All' || loan.status === filterStatus);

    return (
        <DashboardLayout>
            <div style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>Emergency Loan Management</h1>
                        <p style={{ opacity: 0.8, margin: '0.5rem 0 0' }}>Filing, approval, and tracking of emergency financial assistance</p>
                    </div>
                    <Link href="/loans/new" style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '10px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                        + File Loan Request
                    </Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Requests', value: loans.length, color: '#3b82f6' },
                    { label: 'Pending Approval', value: loans.filter(l => l.status === 'Submitted' || l.status?.includes('Under Review')).length, color: '#f59e0b' },
                    { label: 'Approved & Released', value: loans.filter(l => l.status === 'Approved' || l.status?.includes('Released')).length, color: '#10b981' },
                    { label: 'Closed/Settled', value: loans.filter(l => l.status === 'Closed').length, color: '#64748b' }
                ].map((stat, i) => (
                    <div key={i} style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{stat.label}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, marginTop: '4px' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                {['All', 'Submitted', 'Under Review', 'Approved', 'Disapproved', 'Partially Released', 'Fully Released', 'Closed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            border: '1px solid ' + (filterStatus === status ? '#3b82f6' : '#e2e8f0'),
                            background: filterStatus === status ? '#3b82f6' : 'white',
                            color: filterStatus === status ? 'white' : '#64748b',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Loans Table */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                        <tr>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Employee</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Category</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Amount</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Date Filed</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading loan records...</td></tr>
                        ) : filteredLoans.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No loan requests found.</td></tr>
                        ) : (
                            filteredLoans.map(loan => (
                                <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{loan.employee_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {loan.employee_id}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#444' }}>{loan.category}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: '#1e293b' }}>₱ {Number(loan.requested_amount).toLocaleString()}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                                        {format(parseISO(loan.filing_date), 'MMM dd, yyyy')}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            ...getStatusStyles(loan.status)
                                        }}>
                                            {loan.status === 'Submitted' ? 'For Branch Manager Review' : (
                                                loan.status === 'Under Review' ? 'For Branch Manager Review' : (
                                                    loan.status === 'Under Review - Vice President' ? 'For VP Approval' : loan.status
                                                )
                                            )}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>

                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {(loan.status === 'Draft' || loan.status === 'Submitted') && (
                                                <Link href={`/loans/${loan.id}/edit`} style={{
                                                    color: '#0f172a',
                                                    background: '#f1f5f9',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }} title="Edit Loan">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                </Link>
                                            )}

                                            <button
                                                onClick={() => handleDelete(loan.id)}
                                                style={{
                                                    color: '#ef4444',
                                                    background: '#fee2e2',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Delete Loan"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>

                                            <Link href={`/loans/${loan.id}`} style={{
                                                color: '#3b82f6',
                                                fontWeight: 700,
                                                fontSize: '0.75rem',
                                                textDecoration: 'none',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                background: '#eff6ff',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                View
                                            </Link>
                                        </div>

                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
