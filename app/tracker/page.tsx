'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface LeaveRequest {
    id: number;
    employee_id: number;
    employee_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason: string;
    status: string;
    created_at: string;
    remarks?: string;
    rejected_by?: string;
}

interface LoanRequest {
    id: number;
    employee_id: number;
    category: string;
    requested_amount: number;
    approved_amount?: number;
    status: string;
    created_at: string;
    reason: string;
    filing_date: string;
}

const safeDate = (dateStr: string | undefined | null, formatStr: string = 'yyyy-MM-dd') => {
    if (!dateStr) return '--';
    try {
        return format(parseISO(dateStr), formatStr);
    } catch (e) {
        return '--';
    }
};

export default function CombinedTrackerPage() {
    const [view, setView] = useState<'leave' | 'loan'>('leave');
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loans, setLoans] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            fetchData(parsedUser);
        }
    }, []);

    const fetchData = async (parsedUser: any) => {
        setLoading(true);
        try {
            if (!parsedUser.employee_id) {
                setLoading(false);
                return;
            }

            const sessionId = localStorage.getItem('sessionId');
            const headers = { 'x-session-id': sessionId || '' };

            // Fetch Leaves
            const leaveRes = await fetch(`/api/leave?employee_id=${parsedUser.employee_id}`, { headers });
            const leaveData = await leaveRes.json();
            setLeaves(Array.isArray(leaveData) ? leaveData : []);

            // Fetch Loans
            const loanRes = await fetch(`/api/loans?employee_id=${parsedUser.employee_id}`, { headers });
            const loanData = await loanRes.json();
            setLoans(Array.isArray(loanData) ? loanData : []);

            // Audit Log
            await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'VIEW_COMBINED_TRACKER',
                    module: 'Tracker',
                    table_name: 'requests',
                    record_id: parsedUser.employee_id
                })
            });

        } catch (error) {
            console.error('Failed to fetch tracker data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('approved') || s.includes('released'))
            return { color: '#10b981', bg: '#ecfdf5', icon: '✅', label: 'Approved' };
        if (s.includes('rejected') || s.includes('disapproved') || s.includes('cancelled'))
            return { color: '#ef4444', bg: '#fef2f2', icon: '❌', label: status };
        return { color: '#f59e0b', bg: '#fffbeb', icon: '⏳', label: 'Pending Review' };
    };

    const renderTimeline = () => {
        const data = view === 'leave' ? leaves : loans;

        if (!user?.employee_id) {
            return (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '24px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎫</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>Profile Link Required</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
                        Your user account must be linked to an employee record to track personal requests. Please contact HR to link your profile.
                    </p>
                </div>
            );
        }

        if (data.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '24px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📭</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>No {view} requests yet</h3>
                    <p style={{ color: '#64748b' }}>When you submit a {view} application, it will appear here in a professional timeline.</p>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '20px' }}>
                {/* Timeline Line */}
                <div style={{
                    position: 'absolute',
                    left: '39px',
                    top: '10px',
                    bottom: '10px',
                    width: '3px',
                    background: '#e2e8f0',
                    zIndex: 0
                }}></div>

                {data.map((item, idx) => {
                    const config = getStatusConfig(item.status);
                    const title = view === 'leave' ? (item as LeaveRequest).leave_type : (item as LoanRequest).category;
                    const amount = view === 'loan' ? `₱${(item as LoanRequest).requested_amount.toLocaleString()}` : `${(item as LeaveRequest).days_count} Days`;
                    const dateInfo = view === 'leave'
                        ? `${safeDate((item as LeaveRequest).start_date, 'MMM dd')} - ${safeDate((item as LeaveRequest).end_date, 'MMM dd, yyyy')}`
                        : `Filed on ${safeDate((item as LoanRequest).filing_date, 'MMMM dd, yyyy')}`;

                    return (
                        <div key={item.id} style={{ display: 'flex', gap: '2rem', position: 'relative', zIndex: 1 }}>
                            {/* Icon Circle */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'white',
                                border: `4px solid ${config.bg}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                                flexShrink: 0,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                            }}>
                                {config.icon}
                            </div>

                            {/* Card Content */}
                            <div
                                onClick={() => window.location.href = view === 'leave' ? `/leave/${item.id}` : `/loans/${item.id}`}
                                style={{
                                    flex: 1,
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                    border: '1px solid #f1f5f9',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '14px',
                                        background: view === 'leave' ? '#eff6ff' : '#ecfdf5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem'
                                    }}>
                                        {view === 'leave' ? '🏖️' : '💰'}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                            {view} Request #{item.id.toString().padStart(5, '0')}
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{title}</h4>
                                        <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>{dateInfo}</div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>{amount}</div>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: config.bg,
                                        color: config.color,
                                        letterSpacing: '0.05em'
                                    }}>{item.status}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
                {/* Header Header */}
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-1px' }}>Personal Tracker</h1>
                    <p style={{ color: '#64748b', fontSize: '1.125rem', marginTop: '0.5rem' }}>Monitor your leave and loan applications in real-time</p>
                </div>

                {/* View Switcher */}
                <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '6px',
                    borderRadius: '20px',
                    marginBottom: '3rem',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <button
                        onClick={() => setView('leave')}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            background: view === 'leave' ? 'white' : 'transparent',
                            color: view === 'leave' ? '#1e293b' : '#64748b',
                            boxShadow: view === 'leave' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <span>🏝️</span> Leave Requests
                    </button>
                    <button
                        onClick={() => setView('loan')}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            border: 'none',
                            borderRadius: '16px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            background: view === 'loan' ? 'white' : 'transparent',
                            color: view === 'loan' ? '#1e293b' : '#64748b',
                            boxShadow: view === 'loan' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <span>💰</span> Emergency Loans
                    </button>
                </div>

                {/* Main Content Area */}
                <div style={{ position: 'relative' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid #f1f5f9',
                                borderTopColor: '#3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto'
                            }}></div>
                            <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>Syncing your requests...</p>
                        </div>
                    ) : renderTimeline()}
                </div>

                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
