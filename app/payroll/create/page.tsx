/**
 * Create Payroll Wizard
 * Multi-step form for creating new payroll runs
 * Optimized for 1366×768 screens
 */

'use client';

// ... (imports remain the same, adding calculations)
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { computePayslip, formatCurrency } from '@/lib/payroll-calculations';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    branch: string;
    salary_info: any; // Added for calculations
}

export default function CreatePayrollPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [accessibleBranches, setAccessibleBranches] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        branch: '',
        periodStart: '',
        periodEnd: '',
        cutoffDay: 15,
        employeeSelection: 'all' as 'all' | 'specific',
        selectedEmployees: [] as number[]
    });

    useEffect(() => {
        fetchPermissions();
    }, []);

    useEffect(() => {
        // Auto-fetch employees when entering Step 2 (Employees)
        if (formData.branch && (step === 2 || step === 3)) { // Ensure employees are loaded for review too
            if (employees.length === 0) fetchEmployees();
        }
    }, [formData.branch, step]);

    useEffect(() => {
        // Auto-detect cutoff day based on end date
        if (formData.periodEnd) {
            const day = new Date(formData.periodEnd).getDate();
            // detailed logic: if day is <= 15, set to 15. If > 15, set to 30/31
            setFormData(prev => ({ ...prev, cutoffDay: day <= 15 ? 15 : 30 }));
        }
    }, [formData.periodEnd]);

    const fetchPermissions = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/auth/me', {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
            const data = await response.json();
            if (data.user) {
                // User said: "choosing branch, it should only be applicable to superadmin"
                // So only Super Admin roles get multiple options. Everyone else gets their assigned branch.
                const isSuperAdmin = ['Super Admin', 'President', 'Vice President'].includes(data.user.role);

                // Use consistent branch names: 'Ormoc', 'Naval' (removed 'Branch' suffix for consistency)
                // Also strip ' Branch' from assigned_branch if it exists, to match DB
                const assignedBranch = data.user.assigned_branch ? data.user.assigned_branch.replace(/\s+Branch$/i, '').trim() : '';

                const branches = isSuperAdmin
                    ? ['Ormoc', 'Naval']
                    : [assignedBranch];

                setAccessibleBranches(branches);

                // Auto-select if only one branch is available
                if (branches.length === 1) {
                    setFormData(prev => ({ ...prev, branch: branches[0] }));
                }
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/employees?branch=${formData.branch}&payroll_eligible=true&period_end=${formData.periodEnd}`, {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
            const data = await response.json();
            if (response.ok) {
                // API returns array directly
                const empList = Array.isArray(data) ? data : [];
                setEmployees(empList);

                if (empList.length === 0) {
                    setError('No active employees found for the selected branch and payroll period.');
                } else {
                    setError(null);
                }
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const validateStep = () => {
        switch (step) {
            case 1: // Details Step (Branch, Period)
                if (!formData.branch) {
                    alert('Please select a branch');
                    return false;
                }
                if (!formData.periodStart || !formData.periodEnd) {
                    alert('Please select both start and end dates');
                    return false;
                }
                if (new Date(formData.periodStart) >= new Date(formData.periodEnd)) {
                    alert('Period start must be before period end');
                    return false;
                }
                return true;

            case 2: // Employees Step
                if (employees.length === 0) {
                    alert('No active employees found. Cannot proceed.');
                    return false;
                }
                if (formData.employeeSelection === 'specific' && formData.selectedEmployees.length === 0) {
                    alert('Please select at least one employee');
                    return false;
                }
                return true;

            case 3: // Review Step
                return true;

            default:
                return true;
        }
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/payroll/runs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    branch: formData.branch,
                    periodStart: formData.periodStart,
                    periodEnd: formData.periodEnd,
                    cutoffDay: formData.cutoffDay,
                    employeeIds: formData.employeeSelection === 'specific' ? formData.selectedEmployees : undefined
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Payroll run created successfully! ${data.payslipsCreated} payslips generated.`);
                router.push(`/payroll/${data.payrollRun.id}`);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error creating payroll:', error);
            alert('Failed to create payroll run');
        } finally {
            setLoading(false);
        }
    };

    const toggleEmployee = (employeeId: number) => {
        setFormData(prev => ({
            ...prev,
            selectedEmployees: prev.selectedEmployees.includes(employeeId)
                ? prev.selectedEmployees.filter(id => id !== employeeId)
                : [...prev.selectedEmployees, employeeId]
        }));
    };

    // Calculate Estimates for Review Step
    const estimates = useMemo(() => {
        if (step !== 3) return { totalGross: 0, totalDeductions: 0, totalNet: 0, count: 0 };

        const selectedEmps = formData.employeeSelection === 'all'
            ? employees
            : employees.filter(e => formData.selectedEmployees.includes(e.id));

        // 15th/30th Cutoff Logic
        const cutoff = formData.cutoffDay; // 15 or 30/31

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        selectedEmps.forEach(emp => {
            // Helper to handle both string/object salary_info
            let sInfo = emp.salary_info;
            if (typeof sInfo === 'string') {
                try { sInfo = JSON.parse(sInfo); } catch (e) { sInfo = {}; }
            }
            if (!sInfo) sInfo = {};

            const monthlySalary = parseFloat(sInfo.monthly_salary || sInfo.basic_salary) || 0;

            // Standard Calculation (Same as Backend)
            const dailyRate = Math.round((monthlySalary / 30) * 100) / 100;
            const payrollDays = 15.00; // Fixed for estimation
            const basicPay = Math.round((dailyRate * payrollDays) * 100) / 100;

            // Allowances
            const regularAllowance = parseFloat(sInfo.allowances?.regular || 0);
            const specialAllowance = parseFloat(sInfo.allowances?.special || 0);

            const grossPay = basicPay + regularAllowance + specialAllowance;

            // Deductions
            const deductionsInfo = sInfo.deductions || {};

            let phic = 0, pagibig = 0, pagibigLoan = 0, companyFunds = 0;
            let sss = 0, sssLoan = 0;

            // Common
            const companyLoan = parseFloat(deductionsInfo.company_loan?.amortization || 0);
            const cashAdvance = parseFloat(deductionsInfo.cash_advance || 0);
            let otherDeductions = 0;
            if (Array.isArray(deductionsInfo.other_deductions)) {
                otherDeductions = deductionsInfo.other_deductions.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
            }

            if (cutoff === 15) {
                phic = parseFloat(deductionsInfo.philhealth_contribution || 0);
                pagibig = parseFloat(deductionsInfo.pagibig_contribution || 0);
                pagibigLoan = parseFloat(deductionsInfo.pagibig_loan?.amortization || 0);
                companyFunds = parseFloat(deductionsInfo.company_funds || deductionsInfo.company_cash_fund || 0);
            } else {
                sss = parseFloat(deductionsInfo.sss_contribution || 0);
                sssLoan = parseFloat(deductionsInfo.sss_loan?.amortization || 0);
            }

            const empDeductions = phic + pagibig + pagibigLoan + companyFunds + sss + sssLoan + companyLoan + cashAdvance + otherDeductions;
            const empNet = grossPay - empDeductions;

            totalGross += grossPay;
            totalDeductions += empDeductions;
            totalNet += empNet;
        });

        return {
            totalGross,
            totalDeductions,
            totalNet,
            count: selectedEmps.length
        };

    }, [step, employees, formData.employeeSelection, formData.selectedEmployees, formData.cutoffDay]);


    return (
        <DashboardLayout>
            <div className="compact-page-wrapper" style={{ maxWidth: '800px', margin: '0 auto', background: '#fcfdfd' }}>
                {/* Header Back Button & Title */}
                <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>
                        ‹
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>Create New Payroll</h1>
                </div>

                {/* Stepper */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px', padding: '0 40px' }}>
                    {[
                        { num: 1, label: 'Details' },
                        { num: 2, label: 'Employees' },
                        { num: 3, label: 'Review' }
                    ].map((s, idx, arr) => (
                        <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: idx !== arr.length - 1 ? 1 : 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: step >= s.num ? '#10b981' : '#fff',
                                    border: step >= s.num ? 'none' : '1px solid #e5e7eb',
                                    color: step >= s.num ? '#fff' : '#6b7280',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '600', fontSize: '14px', marginBottom: '4px'
                                }}>
                                    {step > s.num ? '✓' : s.num}
                                </div>
                                <span style={{
                                    fontSize: '12px',
                                    color: step >= s.num ? '#10b981' : '#9ca3af',
                                    fontWeight: step >= s.num ? '600' : '400'
                                }}>{s.label}</span>
                            </div>
                            {idx !== arr.length - 1 && (
                                <div style={{
                                    height: '2px',
                                    background: step > s.num ? '#10b981' : '#e5e7eb',
                                    flex: 1, margin: '0 10px',
                                    transform: 'translateY(-10px)'
                                }} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="compact-card" style={{ padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f3f4f6', background: 'white' }}>

                    {/* STEP 1: Details */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Branch Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    Branch Selection
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={formData.branch}
                                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                        className="compact-input"
                                        style={{
                                            width: '100%', padding: '12px 16px', fontSize: '14px',
                                            background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px',
                                            appearance: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <option value="" disabled>Select Branch</option>
                                        {accessibleBranches.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }}>
                                        ▼
                                    </div>
                                </div>
                            </div>

                            {/* Cutoff Period */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    Cutoff Period
                                </label>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.periodStart}
                                            onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                                            className="compact-input"
                                            style={{
                                                width: '100%', padding: '12px 16px', fontSize: '14px',
                                                background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151'
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>End Date</label>
                                        <input
                                            type="date"
                                            value={formData.periodEnd}
                                            onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                                            className="compact-input"
                                            style={{
                                                width: '100%', padding: '12px 16px', fontSize: '14px',
                                                background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#374151'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Info Banner */}
                            <div style={{
                                background: '#ecfdf5', borderRadius: '8px', padding: '16px',
                                display: 'flex', gap: '12px', alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    background: '#10b981', color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold',
                                    marginTop: '2px', flexShrink: 0
                                }}>
                                    i
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', color: '#064e3b', lineHeight: '1.5' }}>
                                    Setting the cutoff period will automatically filter all attendance and log records for the selected dates.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Employee Selection */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
                                Select Employees
                            </h2>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
                                Choose which employees to include in this payroll run
                            </p>

                            {error && (
                                <div style={{
                                    padding: '12px 16px',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '8px',
                                    color: '#b91c1c',
                                    fontSize: '14px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <span style={{ fontSize: '18px' }}>⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="employeeSelection"
                                        value="all"
                                        checked={formData.employeeSelection === 'all'}
                                        onChange={(e) => setFormData({ ...formData, employeeSelection: 'all' })}
                                        style={{ marginRight: '10px', width: '16px', height: '16px', accentColor: '#10b981' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>All active employees ({employees.length})</span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="employeeSelection"
                                        value="specific"
                                        checked={formData.employeeSelection === 'specific'}
                                        onChange={(e) => setFormData({ ...formData, employeeSelection: 'specific' })}
                                        style={{ marginRight: '10px', width: '16px', height: '16px', accentColor: '#10b981' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>Specific employees</span>
                                </label>
                            </div>

                            {formData.employeeSelection === 'specific' && (
                                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}>
                                    {employees.map(emp => (
                                        <label
                                            key={emp.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                borderBottom: '1px solid #f3f4f6',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.selectedEmployees.includes(emp.id)}
                                                onChange={() => toggleEmployee(emp.id)}
                                                style={{ marginRight: '12px', width: '16px', height: '16px', accentColor: '#10b981' }}
                                            />
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                                                    {emp.last_name}, {emp.first_name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    {emp.position} • {emp.department}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                    {employees.length === 0 && (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                            No employees found for this branch.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Review & Confirm */}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
                                Review & Confirm
                            </h2>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 32px' }}>
                                Please review the payroll details before final processing.
                            </p>

                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px',
                                borderBottom: '1px solid #f3f4f6', paddingBottom: '32px', marginBottom: '32px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 600 }}>Branch</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{formData.branch || 'None Selected'} Branch</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 600 }}>Payroll Period</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                                        {formData.periodStart ? new Date(formData.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                                        {' — '}
                                        {formData.periodEnd ? new Date(formData.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 600 }}>Employee Count</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                                        {estimates.count} Active Employees
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                                    Financial Summary Estimation
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    {/* Gross Pay Card */}
                                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="12" y1="12" x2="12" y2="12" /></svg>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Total Gross Pay</div>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                                            {formatCurrency(estimates.totalGross)}
                                        </div>
                                    </div>

                                    {/* Deductions Card */}
                                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Total Deductions</div>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                                            {formatCurrency(estimates.totalDeductions)}
                                        </div>
                                    </div>

                                    {/* Net Pay Card */}
                                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Total Net Pay</div>
                                        </div>
                                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>
                                            {formatCurrency(estimates.totalNet)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                background: '#ecfdf5', borderRadius: '8px', padding: '16px',
                                display: 'flex', gap: '12px', alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    background: '#10b981', color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold',
                                    marginTop: '2px', flexShrink: 0
                                }}>
                                    i
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', color: '#064e3b', lineHeight: '1.5' }}>
                                    Finalizing this run will generate individual payslips and lock records for the period of <strong>{formData.periodStart ? new Date(formData.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'} to {formData.periodEnd ? new Date(formData.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</strong>. Ensure all adjustments are accounted for.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    <button
                        onClick={() => router.push('/payroll')}
                        className="compact-btn"
                        style={{
                            background: 'white', border: '1px solid #d1d5db', color: '#374151',
                            padding: '10px 20px', borderRadius: '8px', fontWeight: 500, fontSize: '14px', cursor: 'pointer'
                        }}
                        disabled={loading}
                    >
                        Cancel
                    </button>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="compact-btn"
                                style={{
                                    background: 'white', border: '1px solid #d1d5db', color: '#374151',
                                    padding: '10px 20px', borderRadius: '8px', fontWeight: 500, fontSize: '14px', cursor: 'pointer'
                                }}
                                disabled={loading}
                            >
                                ← Back
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNext}
                                className="compact-btn"
                                style={{
                                    background: '#10b981', border: 'none', color: 'white',
                                    padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                className="compact-btn"
                                style={{
                                    background: '#10b981', border: 'none', color: 'white',
                                    padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                    minWidth: '200px'
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Finalize & Generate Payroll →'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
