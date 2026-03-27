'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

export default function EditLoanPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '', // Display only
        category: '',
        requested_amount: '',
        reason: '',
        filing_date: ''
    });

    // Eligibility check for edits (optional, but good to show context)
    const [eligibility, setEligibility] = useState({
        maxAllowable: 30000,
        currentBalance: 0,
        remaining: 30000
    });

    const loanLimits: Record<string, number> = {
        'Medical – Employee': 10000,
        'Medical – Spouse/Children': 20000,
        'Medical – Parents/In-laws': 20000,
        'House Repair': 30000,
        'Vehicle Repair': 30000,
        'Bereavement': 25000,
        'Education': 25000,
        'Other Emergency': 15000
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        fetchLoan();
    }, []);

    const fetchLoan = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/loans/${params.id}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();

                // Allow edit only if Draft or Submitted
                if (data.status !== 'Draft' && data.status !== 'Submitted') {
                    alert('Cannot edit a loan that is already under review or approved.');
                    router.push('/loans');
                    return;
                }

                setFormData({
                    employee_id: data.employee_id,
                    employee_name: data.employee_name,
                    category: data.category,
                    requested_amount: data.requested_amount,
                    reason: data.reason,
                    filing_date: data.filing_date ? data.filing_date.split('T')[0] : ''
                });

                // Fetch eligibility/employee details to show limits
                fetchEmployeeDetail(data.employee_id);
            } else {
                router.push('/loans');
            }
        } catch (error) {
            console.error('Fetch loan error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployeeDetail = async (id: number) => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/employees?id=${id}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await res.json();
            if (data) {
                const globalMax = data.loan_config?.max_total_company_loan || 30000;
                const balance = Number(data.ledger_balance || 0);
                setEligibility({
                    maxAllowable: globalMax,
                    currentBalance: balance,
                    remaining: Math.max(0, globalMax - balance)
                });
            }
        } catch (error) {
            console.error('Fetch employee detail error:', error);
        }
    };

    const getDeduction = (amount: number) => {
        if (amount < 1000) return 0;
        if (amount <= 10000) return 500;
        if (amount <= 15000) return 600;
        if (amount <= 20000) return 800;
        if (amount <= 25000) return 900;
        if (amount <= 30000) return 1000;
        return 1200;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/loans/${params.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    category: formData.category,
                    requested_amount: Number(formData.requested_amount),
                    reason: formData.reason,
                    deduction_amount: getDeduction(Number(formData.requested_amount)),
                    updated_at: new Date().toISOString()
                })
            });

            if (res.ok) {
                alert('Loan request updated successfully!');
                router.push('/loans');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to update request');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('An error occurred during update.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <DashboardLayout><div className="p-8 text-center text-gray-500">Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Edit Loan Request #{params.id}</h1>
                </div>

                <div style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                    <form onSubmit={handleSubmit}>
                        {/* Read-only Info */}
                        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Employee</div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>{formData.employee_name}</div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Filing Date: {formData.filing_date}</div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Loan Category</label>
                            <select
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none' }}
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {Object.keys(loanLimits).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Requested Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>₱</span>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2rem', borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '1.25rem', fontWeight: 800 }}
                                    value={formData.requested_amount}
                                    onChange={(e) => setFormData({ ...formData, requested_amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                Available Limit: <span style={{ color: eligibility.remaining > 0 ? '#16a34a' : '#ef4444' }}>₱{eligibility.remaining.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Reason for Loan</label>
                            <textarea
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', minHeight: '120px', resize: 'vertical' }}
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    flex: 2,
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: '#1e3a8a',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 6px rgba(30, 58, 138, 0.2)'
                                }}
                            >
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
