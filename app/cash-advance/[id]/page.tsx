'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { formatCashAdvanceCutoffLabel } from '@/lib/cash-advance-cutoff';

const WORKFLOW_STEPS = [
    { key: 'submitted', label: 'Submitted', desc: 'Request filed by HR/Employee' },
    { key: 'bm_review', label: 'Branch Manager', desc: 'Awaiting BM approval' },
    { key: 'evp_review', label: 'EVP Approval', desc: 'Awaiting EVP final approval' },
    { key: 'final', label: 'Final Decision', desc: 'Approved or Rejected' },
];

function getStepIndex(status: string): number {
    if (status === 'For Branch Manager Review' || status === 'Pending') return 1;
    if (status === 'For EVP Approval') return 2;
    if (status === 'Approved') return 4;
    if (status === 'Rejected') return -1; // special
    return 0;
}

export default function CashAdvanceDetailPage() {
    const params = useParams();
    const [ca, setCa] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [approvedAmount, setApprovedAmount] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const ud = localStorage.getItem('user');
        if (ud) setUser(JSON.parse(ud));
        fetchCA();
    }, []);

    const fetchCA = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            const res = await fetch(`/api/cash-advance/${params.id}`, { headers: { 'x-session-id': sessionId } });
            if (res.ok) { const data = await res.json(); setCa(data); setApprovedAmount(String(data.requested_amount)); }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleAction = async (action: 'approve' | 'reject') => {
        setProcessing(true);
        try {
            const sessionId = localStorage.getItem('sessionId') || '';
            const res = await fetch(`/api/cash-advance/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                body: JSON.stringify({ action, approved_amount: action === 'approve' ? Number(approvedAmount) : 0, remarks: reviewRemarks }),
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); fetchCA(); setReviewRemarks(''); }
            else alert(data.error || 'Failed');
        } catch (e: any) { alert(e.message); }
        setProcessing(false);
    };

    const fmt = (n: any) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';

    const isBM = user && (['Manager', 'Admin'].includes(user.role) || user.username === 'superadmin');
    const isEVP = user && (['President', 'Vice President'].includes(user.role) || user.username === 'superadmin');

    const canActNow = ca && (
        ((ca.status === 'For Branch Manager Review' || ca.status === 'Pending') && (isBM || isEVP)) ||
        (ca.status === 'For EVP Approval' && isEVP)
    );

    const getStatusBadge = (s: string) => {
        const map: Record<string, { bg: string; color: string }> = {
            'Approved': { bg: '#dcfce7', color: '#166534' },
            'Rejected': { bg: '#fee2e2', color: '#991b1b' },
            'For EVP Approval': { bg: '#dbeafe', color: '#1e40af' },
            'For Branch Manager Review': { bg: '#e0e7ff', color: '#4338ca' },
        };
        return map[s] || { bg: '#fef9c3', color: '#854d0e' };
    };

    if (loading) return <DashboardLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#94a3b8' }}>Loading...</div></DashboardLayout>;
    if (!ca) return <DashboardLayout><div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}><p>Cash advance not found.</p><Link href="/cash-advance" style={{ color: '#3b82f6' }}>← Back</Link></div></DashboardLayout>;

    const ss = getStatusBadge(ca.status);
    const stepIdx = getStepIndex(ca.status);
    const isRejected = ca.status === 'Rejected';

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
                <Link href="/cash-advance" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    ← Back to Cash Advances
                </Link>

                {/* Header */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '1.5rem 2rem', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{ca.employee_name}</h1>
                                <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
                                    {ca.emp_code ? `#${ca.emp_code}` : ''} {ca.department ? `• ${ca.department}` : ''}
                                </p>
                            </div>
                            <span style={{ padding: '6px 16px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', background: ss.bg, color: ss.color }}>{ca.status}</span>
                        </div>
                    </div>

                    {/* ─── Workflow Tracker ───────────────────────── */}
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Approval Workflow</div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0px', position: 'relative' }}>
                            {WORKFLOW_STEPS.map((step, i) => {
                                const isApproved = ca.status === 'Approved';
                                const isPast = !isRejected && (isApproved ? stepIdx >= i + 1 : stepIdx > i + 1);
                                const isCurrent = !isRejected && !isApproved && stepIdx === i + 1;
                                const isRejectStep = isRejected && (
                                    (i === 1 && (ca.status === 'Rejected')) ||
                                    (i === 2 && ca.status === 'Rejected')
                                );
                                const dotColor = isRejected && i === 3 ? '#ef4444' :
                                    isPast ? '#10b981' : isCurrent ? '#3b82f6' : '#e2e8f0';
                                const dotBg = isPast || (isRejected && i === 3 && i === 3) ? dotColor : isCurrent ? '#dbeafe' : '#f8fafc';

                                return (
                                    <div key={step.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                                        {/* Connector line */}
                                        {i > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '14px', left: '-50%', right: '50%', height: '3px',
                                                background: isPast || isCurrent ? '#10b981' : isRejected && i === 3 ? '#ef4444' : '#e2e8f0',
                                                borderRadius: '2px',
                                            }} />
                                        )}
                                        {/* Dot */}
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%', margin: '0 auto 8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: isPast ? '#10b981' : isCurrent ? '#3b82f6' : isRejected && i === 3 ? '#ef4444' : '#f1f5f9',
                                            color: (isPast || isCurrent || (isRejected && i === 3)) ? 'white' : '#94a3b8',
                                            fontSize: '0.75rem', fontWeight: 800, position: 'relative', zIndex: 2,
                                            border: `3px solid ${isPast ? '#10b981' : isCurrent ? '#3b82f6' : isRejected && i === 3 ? '#ef4444' : '#e2e8f0'}`,
                                            boxShadow: isCurrent ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none',
                                        }}>
                                            {isPast ? '✓' : isRejected && i === 3 ? '✕' : i + 1}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isPast || isCurrent ? '#1e293b' : '#94a3b8' }}>{step.label}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>{step.desc}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ padding: '1.5rem 2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                            {[
                                { label: 'Daily Rate', value: fmt(ca.daily_rate) },
                                { label: 'Working Days', value: ca.working_days },
                                { label: 'Allowable CA', value: fmt(ca.allowable_ca) },
                                { label: 'Requested Amount', value: fmt(ca.requested_amount), bold: true },
                                { label: 'Approved Amount', value: ca.status === 'Approved' ? fmt(ca.approved_amount) : '-' },
                                { label: 'Cutoff Period', value: formatCashAdvanceCutoffLabel(ca.cutoff_period) },
                                { label: 'Date Requested', value: fmtDate(ca.date_requested) },
                                { label: 'Date Approved', value: ca.date_approved ? fmtDate(ca.date_approved) : '-' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '1rem', fontWeight: (item as any).bold ? 800 : 600, color: '#1e293b' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {ca.reason && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Reason</div>
                                <div style={{ fontSize: '0.9rem', color: '#334155' }}>{ca.reason}</div>
                            </div>
                        )}
                        {ca.remarks && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: ca.status === 'Rejected' ? '#fef2f2' : '#f0fdf4', borderRadius: '10px', border: `1px solid ${ca.status === 'Rejected' ? '#fecaca' : '#bbf7d0'}` }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Remarks</div>
                                <div style={{ fontSize: '0.9rem', color: '#334155' }}>{ca.remarks}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Panel */}
                {canActNow && (
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Review Action</h3>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            {ca.status === 'For EVP Approval' ? 'Final approval by EVP' : 'Branch Manager review'}
                        </p>

                        {(ca.status === 'For EVP Approval' || isEVP) && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Approved Amount (₱)</label>
                                <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 700 }} />
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Remarks</label>
                            <textarea value={reviewRemarks} onChange={e => setReviewRemarks(e.target.value)} rows={3} placeholder="Add remarks..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'vertical' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => handleAction('approve')} disabled={processing} style={{
                                flex: 1, padding: '0.85rem', borderRadius: '10px', border: 'none',
                                background: '#10b981', color: 'white', fontWeight: 700, fontSize: '0.95rem',
                                cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.6 : 1,
                            }}>✅ {ca.status === 'For EVP Approval' ? 'Final Approve' : 'Approve & Forward to EVP'}</button>
                            <button onClick={() => handleAction('reject')} disabled={processing} style={{
                                flex: 1, padding: '0.85rem', borderRadius: '10px', border: 'none',
                                background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.95rem',
                                cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.6 : 1,
                            }}>❌ Reject</button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
