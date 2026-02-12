'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { format, parseISO } from 'date-fns';

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

const safeDate = (dateStr: string | undefined | null, formatStr: string = 'yyyy-MM-dd') => {
    if (!dateStr) return '--';
    try {
        return format(parseISO(dateStr), formatStr);
    } catch (e) {
        return '--';
    }
};

export default function LeaveDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [loan, setLoan] = useState<LeaveRequest | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchLeave();
    }, [id]);

    const fetchLeave = async () => {
        try {
            const res = await fetch(`/api/leave?id=${id}`);
            const data = await res.json();
            // The API returns an array if we use getLeaveRequests, let's see
            const item = Array.isArray(data) ? data.find((l: any) => l.id === parseInt(id as string)) : data;
            setLoan(item);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;
    if (!loan) return <DashboardLayout><div>Request not found</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    ← Back to Tracker
                </button>

                <div style={{ background: 'white', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference No</div>
                            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#1e3a8a' }}>LEAVE-{loan.id.toString().padStart(6, '0')}</h1>
                        </div>
                        <div style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '12px',
                            background: loan.status === 'Approved' ? '#dcfce7' : loan.status === 'Rejected' ? '#fee2e2' : '#fef9c3',
                            color: loan.status === 'Approved' ? '#166534' : loan.status === 'Rejected' ? '#991b1b' : '#854d0e',
                            fontWeight: 700,
                            fontSize: '0.875rem'
                        }}>
                            {loan.status}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Employee Name</div>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{loan.employee_name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Leave Type</div>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{loan.leave_type}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Coverage Dates</div>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                                {safeDate(loan.start_date, 'MMMM dd, yyyy')} - {safeDate(loan.end_date, 'MMMM dd, yyyy')}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Days</div>
                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{loan.days_count} business days</div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', marginBottom: '2.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reason</div>
                        <div style={{ color: '#334155', lineHeight: 1.6 }}>{loan.reason}</div>
                    </div>

                    {loan.remarks && (
                        <div style={{ borderLeft: '4px solid #3b82f6', padding: '1rem 1.5rem', background: '#eff6ff', borderRadius: '0 12px 12px 0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Latest Remark</div>
                            <div style={{ color: '#1e40af', fontWeight: 500 }}>{loan.remarks}</div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
