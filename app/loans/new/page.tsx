
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';

export default function NewLoanPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        employee_id: '',
        category: 'Medical – Employee',
        requested_amount: '',
        reason: '',
        filing_date: new Date().toISOString().split('T')[0]
    });

    const [eligibility, setEligibility] = useState({
        maxAllowable: 30000,
        currentBalance: 0,
        remaining: 30000
    });
    const [overrideLimit, setOverrideLimit] = useState(false);
    const [overrideJustification, setOverrideJustification] = useState('');

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
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            if (parsed.role === 'Employee' && parsed.employee_id) {
                setFormData(prev => ({ ...prev, employee_id: parsed.employee_id.toString() }));
                fetchEmployeeDetail(parsed.employee_id);
            }
        }
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (selectedEmployee) {
            const globalMax = selectedEmployee.loan_config?.max_total_company_loan || 30000;
            const balance = Number(selectedEmployee.ledger_balance || 0);
            setEligibility({
                maxAllowable: globalMax,
                currentBalance: balance,
                remaining: Math.max(0, globalMax - balance)
            });
        }
    }, [selectedEmployee]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/employees', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await res.json();
            setEmployees(Array.isArray(data) ? data.filter((emp: any) => !['Resigned', 'Terminated', 'AWOL'].includes(emp.employment_status)) : []);
        } catch (error) {
            console.error('Fetch employees error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployeeDetail = async (id: number) => {
        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/employees?id=${id}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await res.json();
            setSelectedEmployee(data);
        } catch (error) {
            console.error('Fetch employee detail error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDeduction = (amount: number) => {
        if (amount < 1000) return 0;
        if (amount <= 10000) return 500;
        if (amount <= 15000) return 600;
        if (amount <= 20000) return 800;
        if (amount <= 25000) return 900;
        if (amount <= 30000) return 1000;
        return 1200; // Multi-step deduction if very high
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const amount = Number(formData.requested_amount);
        const isExceeded = amount > eligibility.remaining;

        if (isExceeded && !overrideLimit) {
            alert(`Requested amount (₱${amount.toLocaleString()}) exceeds available company loan limit (₱${eligibility.remaining.toLocaleString()}).`);
            return;
        }

        if (isExceeded && !overrideJustification.trim()) {
            alert('Please provide a justification for overriding the loan limit.');
            return;
        }

        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    ...formData,
                    requested_amount: amount,
                    employee_id: parseInt(formData.employee_id),
                    deduction_amount: getDeduction(amount),
                    status: 'Submitted',
                    current_approval_level: 1,
                    approvals: [],
                    attachments: [],
                    metadata: {
                        limit_override: overrideLimit,
                        override_justification: overrideJustification,
                        global_max_at_filing: eligibility.maxAllowable,
                        ledger_balance_at_filing: eligibility.currentBalance
                    }
                })
            });

            if (res.ok) {
                alert('Emergency Loan request filed successfully!');
                router.push('/loans');
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to file loan request');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('An error occurred during submission.');
        } finally {
            setLoading(false);
        }
    };

    const isEmployee = user?.role === 'Employee';

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>File Emergency Loan</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Submit a new request for financial assistance</p>
                </div>

                <div style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Select Employee</label>
                                <select
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none', background: isEmployee ? '#f8fafc' : 'white' }}
                                    value={formData.employee_id}
                                    onChange={(e) => {
                                        setFormData({ ...formData, employee_id: e.target.value });
                                        if (e.target.value) fetchEmployeeDetail(parseInt(e.target.value));
                                        else setSelectedEmployee(null);
                                    }}
                                    disabled={isEmployee}
                                    required
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.last_name}, {emp.first_name} (#{emp.employee_id})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Filing Date</label>
                                <input
                                    type="date"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none' }}
                                    value={formData.filing_date}
                                    onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
                                    readOnly={!['Admin', 'HR', 'President', 'Vice President'].includes(user?.role)}
                                />
                            </div>
                        </div>

                        {selectedEmployee && (
                            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>ID Number</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedEmployee.employee_id}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Position</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedEmployee.position}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Branch / Dept</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedEmployee.branch} / {selectedEmployee.department}</div>
                                    </div>
                                </div>
                            </div>
                        )}

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

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Requested Amount</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>₱</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem 0.75rem 2rem',
                                            borderRadius: '10px',
                                            border: '2px solid #e2e8f0',
                                            outline: 'none',
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            background: eligibility.remaining <= 0 && !overrideLimit ? '#f1f5f9' : 'white'
                                        }}
                                        value={formData.requested_amount}
                                        onChange={(e) => setFormData({ ...formData, requested_amount: e.target.value })}
                                        disabled={eligibility.remaining <= 0 && !overrideLimit}
                                        required
                                    />
                                </div>
                                {eligibility.remaining <= 0 && !overrideLimit && (
                                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                                        ⚠️ Employee has reached maximum company loan limit.
                                    </div>
                                )}
                                {Number(formData.requested_amount) > eligibility.remaining && !overrideLimit && eligibility.remaining > 0 && (
                                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                                        ❌ Requested amount exceeds available company loan limit.
                                    </div>
                                )}
                                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                    Estimated Deduction: <span style={{ color: '#10b981' }}>₱{getDeduction(Number(formData.requested_amount)).toLocaleString()}</span> per payday
                                </div>
                            </div>

                            <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '14px', border: '1px solid #bae6fd' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Max Allowable</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0c4a6e' }}>₱{eligibility.maxAllowable.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Current Balance</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748b' }}>₱{eligibility.currentBalance.toLocaleString()}</span>
                                </div>
                                <div style={{ height: '1px', background: '#bae6fd', margin: '8px 0' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase' }}>Available Limit</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 900, color: eligibility.remaining > 0 ? '#16a34a' : '#ef4444' }}>₱{eligibility.remaining.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Override Section */}
                        {Number(formData.requested_amount) > eligibility.remaining && (['Admin', 'HR', 'President', 'Vice President'].includes(user?.role)) && (
                            <div style={{ background: '#fff7ed', padding: '1.5rem', borderRadius: '14px', border: '1px solid #fed7aa', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        id="override-limit"
                                        style={{ width: '18px', height: '18px' }}
                                        checked={overrideLimit}
                                        onChange={(e) => setOverrideLimit(e.target.checked)}
                                    />
                                    <label htmlFor="override-limit" style={{ fontWeight: 800, color: '#9a3412', fontSize: '0.875rem' }}>
                                        ⚠️ OVERRIDE COMPANY LOAN LIMIT
                                    </label>
                                </div>
                                {overrideLimit && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', marginBottom: '8px' }}>Justification for Override (Required)</label>
                                        <textarea
                                            placeholder="Explain why this employee is allowed to exceed the P30,000 global exposure limit..."
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fdba74', outline: 'none', fontSize: '0.875rem', minHeight: '80px' }}
                                            value={overrideJustification}
                                            onChange={(e) => setOverrideJustification(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Reason for Loan</label>
                            <textarea
                                placeholder="State the urgency and details of the emergency..."
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', minHeight: '120px', resize: 'vertical' }}
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Supporting Documents (Optional)</label>
                            <div style={{ border: '2px dashed #e2e8f0', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                                <input
                                    type="file"
                                    multiple
                                    id="loan-files"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        // Simple placeholder for file handling
                                        console.log(e.target.files);
                                    }}
                                />
                                <label htmlFor="loan-files" style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: 700 }}>
                                    📁 Click to upload or drag and drop
                                </label>
                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px' }}>PDF, JPG, PNG up to 10MB</p>
                            </div>
                        </div>

                        {(() => {
                            const isInvalid =
                                loading ||
                                !selectedEmployee ||
                                !formData.requested_amount ||
                                !formData.reason ||
                                Number(formData.requested_amount) <= 0 ||
                                (Number(formData.requested_amount) > eligibility.remaining && !overrideLimit) ||
                                (overrideLimit && !overrideJustification.trim());

                            return (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Discard
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isInvalid}
                                        style={{
                                            flex: 2,
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: isInvalid ? '#cbd5e1' : '#1e3a8a',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            cursor: isInvalid ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 6px rgba(30, 58, 138, 0.2)'
                                        }}
                                    >
                                        {loading ? 'Processing...' : 'Submit Loan Request'}
                                    </button>
                                </div>
                            );
                        })()}
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
