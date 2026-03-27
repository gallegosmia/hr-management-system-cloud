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

    // UI States
    const [finalReviewChecked, setFinalReviewChecked] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdRun, setCreatedRun] = useState<{ id: number, run_number: string } | null>(null);

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
        setLoading(true);
        setError(null);
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
                }
            } else {
                setError(data.error || `Error ${response.status}: Failed to fetch employees.`);
                setEmployees([]);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            setError('Failed to connect to employee record service.');
        } finally {
            setLoading(false);
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

            // Create Draft Payroll
            const createResponse = await fetch('/api/payroll/runs', {
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

            const createData = await createResponse.json();

            if (!createResponse.ok) {
                throw new Error(createData.error || 'Failed to create payroll');
            }

            const runId = createData.payrollRun.id;
            const runNumber = createData.payrollRun.run_number;

            // Success! Show Modal (payroll stays as DRAFT)
            setCreatedRun({ id: runId, run_number: runNumber });
            setShowSuccessModal(true);

        } catch (error: any) {
            console.error('Error creating payroll:', error);
            alert(`Failed to create payroll: ${error.message}`);
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

        const getSafeValue = (val: any): number => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val) || 0;
            if (typeof val === 'object') return parseFloat(val.amortization || val.amount || 0) || 0;
            return 0;
        };

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
            const companyLoan = getSafeValue(deductionsInfo.company_loan);
            const cashAdvance = getSafeValue(deductionsInfo.cash_advance);

            let otherDeductions = 0;
            if (Array.isArray(deductionsInfo.other_deductions)) {
                otherDeductions = deductionsInfo.other_deductions.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
            }

            if (cutoff === 15) {
                phic = getSafeValue(deductionsInfo.philhealth_contribution);
                pagibig = getSafeValue(deductionsInfo.pagibig_contribution);
                pagibigLoan = getSafeValue(deductionsInfo.pagibig_loan);
                companyFunds = getSafeValue(deductionsInfo.company_funds || deductionsInfo.company_cash_fund);
            } else {
                sss = getSafeValue(deductionsInfo.sss_contribution);
                sssLoan = getSafeValue(deductionsInfo.sss_loan);
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
            count: selectedEmps.length,
            totalSSS: selectedEmps.reduce((sum, e) => {
                const sInfo = (typeof e.salary_info === 'string' ? JSON.parse(e.salary_info) : e.salary_info) || {};
                return sum + getSafeValue(sInfo.deductions?.sss);
            }, 0),
            totalPHIC: selectedEmps.reduce((sum, e) => {
                const sInfo = (typeof e.salary_info === 'string' ? JSON.parse(e.salary_info) : e.salary_info) || {};
                return sum + getSafeValue(sInfo.deductions?.phic);
            }, 0),
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

                {/* Step 1: Branch & Period */}
                {step === 1 && (
                    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                Select Branch
                            </label>
                            <select
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db',
                                    background: accessibleBranches.length === 1 ? '#f3f4f6' : 'white'
                                }}
                                disabled={accessibleBranches.length === 1}
                            >
                                <option value="" disabled>Select a branch...</option>
                                {accessibleBranches.map(branch => (
                                    <option key={branch} value={branch}>{branch}</option>
                                ))}
                            </select>
                            {accessibleBranches.length > 1 && (
                                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Only Super Admins can select different branches.</p>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                    Period Start
                                </label>
                                <input
                                    type="date"
                                    value={formData.periodStart}
                                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                    Period End
                                </label>
                                <input
                                    type="date"
                                    value={formData.periodEnd}
                                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Employees */}
                {step === 2 && (
                    <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                                Who should be included in this payroll run?
                            </label>

                            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        checked={formData.employeeSelection === 'all'}
                                        onChange={() => setFormData({ ...formData, employeeSelection: 'all' })}
                                        style={{ accentColor: '#2563eb', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>All Eligible Employees ({employees.length})</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        checked={formData.employeeSelection === 'specific'}
                                        onChange={() => setFormData({ ...formData, employeeSelection: 'specific' })}
                                        style={{ accentColor: '#2563eb', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>Select Specific Employees</span>
                                </label>
                            </div>

                            {formData.employeeSelection === 'specific' && (
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                                            <tr>
                                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.selectedEmployees.length === employees.length}
                                                        onChange={(e) => setFormData({ ...formData, selectedEmployees: e.target.checked ? employees.map(emp => emp.id) : [] })}
                                                    />
                                                </th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>EMPLOYEE</th>
                                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>POSITION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.map(employee => (
                                                <tr key={employee.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '12px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.selectedEmployees.includes(employee.id)}
                                                            onChange={() => toggleEmployee(employee.id)}
                                                            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                                                        {employee.first_name} {employee.last_name}
                                                    </td>
                                                    <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                                                        {employee.position}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Review & Confirm (Redesigned) */}
                {step === 3 && (
                    <div>
                        {/* Pro Header / Stepper (Visual Only to match design) */}
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                                {/* Line */}
                                <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: '#e2e8f0', zIndex: 1, transform: 'translateY(-50%)' }}></div>
                                <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: '#3b82f6', zIndex: 1, transform: 'translateY(-50%)', width: '100%' }}></div>

                                {/* Steps */}
                                {['Review', 'Adjustments', 'Preview', 'Finalize'].map((label, i) => (
                                    <div key={label} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'white', padding: '0 10px' }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: '#2563eb', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '14px', fontWeight: '600', marginBottom: '8px',
                                            boxShadow: '0 0 0 4px #dbeafe'
                                        }}>
                                            {i === 3 ? '4' : '✓'}
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: i === 3 ? '#2563eb' : '#64748b' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
                            {/* Main Content */}
                            <div>
                                {/* Summary Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                    {/* Total Payroll */}
                                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL PAYROLL</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="12" y1="12" x2="12" y2="12" /></svg>
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{formatCurrency(estimates.totalGross)}</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}> Includes gross wages & benefits</div>
                                    </div>

                                    {/* Total Taxes */}
                                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GOVERNMENT DEDUCTIONS</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4 8 4v14" /></svg>
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{formatCurrency(estimates.totalDeductions)}</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}> EE contribution withholdings</div>
                                    </div>

                                    {/* Net Disbursement */}
                                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NET DISBURSEMENT</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 18V6" /></svg>
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>{formatCurrency(estimates.totalNet)}</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}> Scheduled for Payment</div>
                                    </div>
                                </div>

                                {/* Employee Breakdown */}
                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Employee Breakdown</h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg></button>
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
                                        </div>
                                    </div>

                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 20px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Employee</th>
                                                    <th style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Basic Pay</th>
                                                    <th style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Allowances</th>
                                                    <th style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Gross Pay</th>
                                                    <th style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Deductions</th>
                                                    <th style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' }}>Net Pay</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(formData.employeeSelection === 'all' ? employees : employees.filter(e => formData.selectedEmployees.includes(e.id))).map(emp => {
                                                    // Inline Calc for display (simplified)
                                                    let sInfo = emp.salary_info;
                                                    if (typeof sInfo === 'string') try { sInfo = JSON.parse(sInfo) } catch (e) { sInfo = {} };
                                                    const monthly = parseFloat(sInfo?.monthly_salary || sInfo?.basic_salary || 0);

                                                    const payrollDays = formData.cutoffDay === 15 ? 15 : (new Date(formData.periodEnd).getDate() > 15 ? (new Date(formData.periodEnd).getDate() - 15) : 15);
                                                    const dailyRate = monthly / 30; // Estimate
                                                    const basic = dailyRate * payrollDays;
                                                    const allowances = parseFloat(sInfo?.allowances?.regular || 0) + parseFloat(sInfo?.allowances?.special || 0);
                                                    const gross = basic + allowances;

                                                    const getLoanAmort = (val: any) => typeof val === 'object' && val !== null ? (parseFloat(val.amortization || val.amount) || 0) : (parseFloat(val) || 0);
                                                    const mappedDeductions = {
                                                        phic: getLoanAmort(sInfo?.deductions?.phic || sInfo?.deductions?.philhealth_contribution),
                                                        pagibig: getLoanAmort(sInfo?.deductions?.pagibig || sInfo?.deductions?.pagibig_contribution),
                                                        companyFunds: getLoanAmort(sInfo?.deductions?.company_funds || sInfo?.deductions?.company_cash_fund),
                                                        pagibigLoan: getLoanAmort(sInfo?.deductions?.pagibig_loan_15th || sInfo?.deductions?.pagibig_loan),
                                                        sss: getLoanAmort(sInfo?.deductions?.sss || sInfo?.deductions?.sss_contribution),
                                                        sssLoan: getLoanAmort(sInfo?.deductions?.sss_loan),
                                                        companyLoan: getLoanAmort(sInfo?.deductions?.company_loan),
                                                        cashAdvance: getLoanAmort(sInfo?.deductions?.cash_advance),
                                                        other: Array.isArray(sInfo?.deductions?.other_deductions) 
                                                                ? sInfo.deductions.other_deductions.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0)
                                                                : 0
                                                    };

                                                    // Re-use compute logic for consistency if possible, but for now simple calc
                                                    // To be accurate we should call computePayslip properly
                                                    const computation = computePayslip({
                                                        payrollDays: payrollDays,
                                                        monthlySalary: monthly,
                                                        allowances: sInfo?.allowances,
                                                        deductions: mappedDeductions
                                                    }, formData.cutoffDay as 15 | 30 | 31);

                                                    return (
                                                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '12px 20px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{emp.first_name[0]}{emp.last_name[0]}</span>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontWeight: '600', color: '#334155' }}>{emp.first_name} {emp.last_name}</div>
                                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.position}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b' }}>{formatCurrency(computation.basicPay)}</td>
                                                            <td style={{ textAlign: 'right', padding: '12px 20px', color: '#64748b' }}>{formatCurrency(allowances)}</td>
                                                            <td style={{ textAlign: 'right', padding: '12px 20px', color: '#334155' }}>{formatCurrency(computation.grossPay)}</td>
                                                            <td style={{ textAlign: 'right', padding: '12px 20px', color: '#ef4444' }}>{formatCurrency(computation.totalDeductions)}</td>
                                                            <td style={{ textAlign: 'right', padding: '12px 20px', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(computation.netPay)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600', cursor: 'pointer' }}>View All Employees</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div>
                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 4px', color: '#0f172a' }}>Employer Liabilities</h3>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 20px' }}>Total Company-side Costs (Est)</p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                        {formData.cutoffDay !== 15 ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: '#64748b' }}>ER SSS Contrib</span>
                                                <span style={{ color: '#334155', fontWeight: '500' }}>{formatCurrency((estimates.totalSSS || 0) * 2)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#64748b' }}>ER PhilHealth</span>
                                                    <span style={{ color: '#334155', fontWeight: '500' }}>{formatCurrency(estimates.totalPHIC || 0)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#64748b' }}>ER Pag-IBIG</span>
                                                    <span style={{ color: '#334155', fontWeight: '500' }}>{formatCurrency((estimates.count || 0) * 100)}</span>
                                                </div>
                                            </>
                                        )}
                                        <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '2px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>Total ER Cost</span>
                                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#2563eb' }}>{formatCurrency(formData.cutoffDay !== 15 ? ((estimates.totalSSS || 0) * 2) : ((estimates.totalPHIC || 0) + ((estimates.count || 0) * 100)))}</span>
                                    </div>
                                </div>

                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>PAY DATE</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M12 2v20" /><path d="M2 12h20" /><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z" /></svg>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>PAY PERIOD</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                                {formData.periodStart ? new Date(formData.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'} - {formData.periodEnd ? new Date(formData.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Final Action Area */}
                        <div style={{ marginTop: '24px', background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <input
                                    type="checkbox"
                                    id="finalReview"
                                    style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }}
                                    checked={finalReviewChecked}
                                    onChange={(e) => setFinalReviewChecked(e.target.checked)}
                                />
                                <label htmlFor="finalReview" style={{ cursor: 'pointer' }}>
                                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Final Review Complete</div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>I have reviewed the payroll summary above and confirm that all hours, adjustments, and tax calculations are accurate.</div>
                                </label>
                            </div>
                            <div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!finalReviewChecked || loading}
                                    style={{
                                        background: !finalReviewChecked || loading ? '#94a3b8' : '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '12px 32px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: !finalReviewChecked || loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: !finalReviewChecked || loading ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                                    }}
                                >
                                    {loading ? 'Processing...' : 'Submit Payroll'}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons (Hidden for Step 3 as it has its own) */}
                {step !== 3 && (
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

                            {step < 3 && (
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
                            )}
                        </div>
                    </div>
                )}
                {/* Success Modal */}
                {showSuccessModal && createdRun && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '16px', padding: '32px',
                            width: '100%', maxWidth: '480px', textAlign: 'center',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}>
                            <div style={{
                                width: '64px', height: '64px', background: '#ecfdf5', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>

                            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: '0 0 12px' }}>
                                Payroll Created!
                            </h2>

                            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 8px', lineHeight: '1.5' }}>
                                Payroll Run <strong>{createdRun.run_number}</strong> has been successfully created as <strong>DRAFT</strong>.
                            </p>

                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 32px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
                                Review the payroll details and click <strong>"Finalize Payroll"</strong> when ready to submit for approval.
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => router.push('/payroll')}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db',
                                        background: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    Back to List
                                </button>
                                <button
                                    onClick={() => router.push(`/payroll/${createdRun.id}`)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                                        background: '#2563eb', color: 'white', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
