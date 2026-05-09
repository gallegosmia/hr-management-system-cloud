'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { formatCashAdvanceCutoffLabel } from '@/lib/cash-advance-cutoff';

interface CashAdvance {
    id: number;
    employee_id: number;
    employee_name: string;
    daily_rate: number;
    working_days: number;
    allowable_ca: number;
    requested_amount: number;
    approved_amount: number;
    status: string;
    date_requested: string;
    date_approved: string;
    reason: string;
    remarks: string;
    branch: string;
    cutoff_period: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    branch: string;
    salary_info?: any;
}

interface Summary {
    total_requests: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    total_approved_amount: number;
    total_pending_amount: number;
    current_cutoff: { label: string; display?: string; requests: number; approved_amount: number; pending_amount: number };
}

export default function CashAdvancePage() {
    const [advances, setAdvances] = useState<CashAdvance[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState<any>(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [requestAmount, setRequestAmount] = useState('');
    const [requestReason, setRequestReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [caLimit, setCaLimit] = useState<any>(null);
    const [loadingLimit, setLoadingLimit] = useState(false);

    // Review modal
    const [reviewCA, setReviewCA] = useState<CashAdvance | null>(null);
    const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | ''>('');
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [reviewAmount, setReviewAmount] = useState('');
    const [reviewing, setReviewing] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const sessionId = localStorage.getItem('sessionId') || '';
        const headers = { 'x-session-id': sessionId };
        try {
            const [caRes, sumRes] = await Promise.all([
                fetch('/api/cash-advance', { headers }),
                fetch('/api/cash-advance/summary', { headers }),
            ]);
            const caData = await caRes.json();
            const sumData = await sumRes.json();
            setAdvances(Array.isArray(caData) ? caData : []);
            setSummary(sumData.total_requests !== undefined ? sumData : null);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchEmployees = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            const res = await fetch('/api/employees', { headers: { 'x-session-id': sessionId } });
            const data = await res.json();
            
            // Filter out inactive employees
            const activeEmployees = Array.isArray(data) 
                ? data.filter(emp => !['Resigned', 'Terminated', 'AWOL'].includes(emp.employment_status))
                : [];
            
            setEmployees(activeEmployees);
        } catch (e) { console.error(e); }
    };

    const openRequestModal = () => {
        setSubmitError('');
        setRequestAmount('');
        setRequestReason('');
        setSelectedEmployee('');
        setCaLimit(null);
        fetchEmployees();
        if (user?.role === 'Employee' && user.employee_id) fetchLimit(user.employee_id);
        setShowModal(true);
    };

    const fetchLimit = async (empId: number | string) => {
        setLoadingLimit(true);
        setCaLimit(null);
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            const res = await fetch(`/api/cash-advance/limit?employee_id=${empId}`, { headers: { 'x-session-id': sessionId } });
            if (res.ok) setCaLimit(await res.json());
        } catch (e) { console.error(e); }
        setLoadingLimit(false);
    };

    const onEmployeeSelect = (val: string) => {
        setSelectedEmployee(val);
        setCaLimit(null);
        if (val) fetchLimit(val);
    };

    const handleSubmitRequest = async () => {
        setSubmitError('');
        const empId = user?.role === 'Employee' ? user.employee_id : parseInt(selectedEmployee);
        if (!empId) { setSubmitError('Please select an employee.'); return; }
        if (!requestAmount || Number(requestAmount) <= 0) { setSubmitError('Enter a valid amount.'); return; }

        setSubmitting(true);
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            const res = await fetch('/api/cash-advance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                body: JSON.stringify({ employee_id: empId, requested_amount: Number(requestAmount), reason: requestReason }),
            });
            const data = await res.json();
            if (!res.ok) {
                const msg = data.error || 'Failed to submit';
                const details = data.details;
                if (details && typeof details === 'object') {
                    setSubmitError(`${msg}\n\nDaily Rate: ₱${Number(details.daily_rate).toLocaleString()}\nWorking Days: ${details.working_days}\nAllowable CA: ₱${Number(details.allowable_ca).toLocaleString()}\nAlready Used: ₱${Number(details.already_used).toLocaleString()}\nRemaining: ₱${Number(details.remaining).toLocaleString()}`);
                } else {
                    setSubmitError(msg);
                }
                return;
            }
            setShowModal(false);
            fetchData();
            alert(data.message || 'Request submitted!');
        } catch (e: any) { setSubmitError(e.message); }
        finally { setSubmitting(false); }
    };

    const openReview = (ca: CashAdvance, action: 'Approved' | 'Rejected') => {
        setReviewCA(ca);
        setReviewAction(action);
        setReviewRemarks('');
        setReviewAmount(String(ca.requested_amount));
    };

    const isBranchManager = user && (['Manager', 'Admin'].includes(user.role) || user.username === 'superadmin');
    const isEVP = user && (['President', 'Vice President'].includes(user.role) || user.username === 'superadmin');

    const handleReview = async () => {
        if (!reviewCA) return;
        setReviewing(true);
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            const res = await fetch(`/api/cash-advance/${reviewCA.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                body: JSON.stringify({
                    action: reviewAction === 'Approved' ? 'approve' : 'reject',
                    approved_amount: reviewAction === 'Approved' ? Number(reviewAmount) : 0,
                    remarks: reviewRemarks,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setReviewCA(null);
                fetchData();
            } else {
                alert(data.error || 'Failed');
            }
        } catch (e: any) { alert(e.message); }
        finally { setReviewing(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this cash advance request?')) return;
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            await fetch(`/api/cash-advance/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId },
            });
            fetchData();
        } catch (e) { console.error(e); }
    };

    const isAdmin = user && (
        ['HR', 'Admin', 'President', 'Vice President', 'Manager', 'Operations Manager'].includes(user.role) ||
        user.username === 'superadmin'
    );

    const filtered = advances
        .filter(ca => filterStatus === 'All' || ca.status === filterStatus)
        .filter(ca => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (ca.employee_name || '').toLowerCase().includes(q);
        });

    const formatDate = (d: string) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const formatCurrency = (n: any) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getStatusStyle = (s: string) => {
        if (s === 'Approved') return { bg: '#dcfce7', color: '#166534', dot: '#22c55e' };
        if (s === 'Rejected') return { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' };
        if (s === 'For EVP Approval') return { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' };
        if (s === 'For Branch Manager Review') return { bg: '#e0e7ff', color: '#4338ca', dot: '#6366f1' };
        return { bg: '#fef9c3', color: '#854d0e', dot: '#eab308' };
    };

    return (
        <DashboardLayout>
            {/* Hero Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                padding: '2rem 2.5rem', borderRadius: '16px', marginBottom: '1.5rem',
                color: 'white', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-40px', right: '-20px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '-60px', right: '80px', width: '160px', height: '160px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>💵 Cash Advance</h1>
                        <p style={{ opacity: 0.85, margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
                            Request, review, and track employee cash advances
                        </p>
                    </div>
                    <button onClick={openRequestModal} style={{
                        background: 'white', color: '#047857', border: 'none', padding: '0.75rem 1.5rem',
                        borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>+</span> Request Cash Advance
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Requests', value: summary?.total_requests || 0, color: '#3b82f6', icon: '📋' },
                    { label: 'Pending Approval', value: summary?.pending_count || 0, color: '#f59e0b', icon: '⏳' },
                    { label: 'Approved Amount', value: formatCurrency(summary?.total_approved_amount), color: '#10b981', icon: '✅' },
                    { label: 'This Cutoff', value: formatCurrency((summary?.current_cutoff?.approved_amount || 0) + (summary?.current_cutoff?.pending_amount || 0)), color: '#8b5cf6', icon: '📅' },
                ].map((stat, i) => (
                    <div key={i} style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
                            <span style={{ fontSize: '1.3rem' }}>{stat.icon}</span>
                        </div>
                        <div style={{ fontSize: typeof stat.value === 'string' ? '1.25rem' : '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                {['All', 'For Branch Manager Review', 'For EVP Approval', 'Approved', 'Rejected'].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{
                        padding: '0.5rem 1rem', borderRadius: '20px',
                        border: `1px solid ${filterStatus === s ? '#10b981' : '#e2e8f0'}`,
                        background: filterStatus === s ? '#10b981' : 'white',
                        color: filterStatus === s ? 'white' : '#64748b',
                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>{s === 'For Branch Manager Review' ? 'BM Review' : s === 'For EVP Approval' ? 'EVP Review' : s}</button>
                ))}
                <div style={{ flex: 1, minWidth: '200px', marginLeft: 'auto' }}>
                    <input type="text" placeholder="Search employee..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none' }} />
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                {['Employee', 'Daily Rate', 'Days', 'Allowable', 'Requested', 'Status', 'Date', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '1rem 1.25rem', textAlign: h === 'Actions' ? 'center' : 'left', color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading cash advances...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No cash advance records found.</td></tr>
                            ) : filtered.map(ca => {
                                const ss = getStatusStyle(ca.status);
                                return (
                                    <tr key={ca.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{ca.employee_name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{ca.branch || '-'} • {formatCashAdvanceCutoffLabel(ca.cutoff_period)}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{formatCurrency(ca.daily_rate)}</td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{ca.working_days}</td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{formatCurrency(ca.allowable_ca)}</td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(ca.requested_amount)}</td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 12px', borderRadius: '9999px', fontSize: '0.7rem',
                                                fontWeight: 700, textTransform: 'uppercase',
                                                background: ss.bg, color: ss.color,
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ss.dot }} />
                                                {ca.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#64748b' }}>{formatDate(ca.date_requested)}</td>
                                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {/* Branch Manager can act on BM Review items */}
                                                {(ca.status === 'For Branch Manager Review' || ca.status === 'Pending') && isBranchManager && (
                                                    <>
                                                        <button onClick={() => openReview(ca, 'Approved')} style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                                                        <button onClick={() => openReview(ca, 'Rejected')} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                                                    </>
                                                )}
                                                {/* EVP can act on EVP Approval items (or skip from BM stage) */}
                                                {(ca.status === 'For EVP Approval' || ((ca.status === 'For Branch Manager Review' || ca.status === 'Pending') && isEVP && !isBranchManager)) && isEVP && (
                                                    <>
                                                        <button onClick={() => openReview(ca, 'Approved')} style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                                                        <button onClick={() => openReview(ca, 'Rejected')} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                                                    </>
                                                )}
                                                <Link href={`/cash-advance/${ca.id}`} style={{ background: '#eff6ff', color: '#3b82f6', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>View</Link>
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(ca.id)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>🗑</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#94a3b8' }}>
                    Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* ─── Request Modal ──────────────────────────────────── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '480px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)', animation: 'slideUp .3s ease',
                    }}>
                        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>💵 Request Cash Advance</h2>

                        {user?.role !== 'Employee' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Employee</label>
                                <select value={selectedEmployee} onChange={e => onEmployeeSelect(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                    <option value="">Select employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* CA Limit Info Box */}
                        {loadingLimit && (
                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                Calculating limit...
                            </div>
                        )}
                        {caLimit && (
                            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>📊</span> Cash Advance Limit ({caLimit.cutoff_display || formatCashAdvanceCutoffLabel(caLimit.cutoff)})
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Daily Rate</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>₱{Number(caLimit.daily_rate).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Working Days</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>{caLimit.working_days} days</div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Max Allowable</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>₱{Number(caLimit.allowable_ca).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                    </div>
                                    <div style={{ background: 'white', borderRadius: '8px', padding: '8px 10px', border: '1px solid #dcfce7' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Already Used</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: caLimit.already_used > 0 ? '#dc2626' : '#1e293b' }}>₱{Number(caLimit.already_used).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '10px', background: '#166534', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#bbf7d0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remaining Limit</div>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'white' }}>₱{Number(caLimit.remaining).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                </div>
                                {caLimit.daily_rate <= 0 && (
                                    <div style={{ marginTop: '8px', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>
                                        ⚠️ No daily rate configured for this employee
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Amount (₱)</label>
                            <input type="number" value={requestAmount} onChange={e => setRequestAmount(e.target.value)} placeholder="0.00"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 700 }} />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Reason (Optional)</label>
                            <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} rows={3} placeholder="Purpose of cash advance..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical' }} />
                        </div>

                        {submitError && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', color: '#991b1b', fontSize: '0.85rem', whiteSpace: 'pre-line', fontWeight: 500 }}>
                                ⚠️ {submitError}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                            <button onClick={handleSubmitRequest} disabled={submitting} style={{
                                flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
                                background: submitting ? '#94a3b8' : '#10b981', color: 'white', fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                            }}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Review Modal ──────────────────────────────────── */}
            {reviewCA && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    onClick={() => setReviewCA(null)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'white', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '460px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                    }}>
                        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                            {reviewAction === 'Approved' ? '✅ Approve' : '❌ Reject'} Cash Advance
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                            {reviewCA.employee_name} — {formatCurrency(reviewCA.requested_amount)}
                        </p>

                        {reviewAction === 'Approved' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Approved Amount (₱)</label>
                                <input type="number" value={reviewAmount} onChange={e => setReviewAmount(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 700 }} />
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Remarks</label>
                            <textarea value={reviewRemarks} onChange={e => setReviewRemarks(e.target.value)} rows={3} placeholder="Add remarks..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setReviewCA(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleReview} disabled={reviewing} style={{
                                flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
                                background: reviewing ? '#94a3b8' : reviewAction === 'Approved' ? '#10b981' : '#ef4444',
                                color: 'white', fontWeight: 700, cursor: reviewing ? 'not-allowed' : 'pointer',
                            }}>{reviewing ? 'Processing...' : reviewAction === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection'}</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DashboardLayout>
    );
}
