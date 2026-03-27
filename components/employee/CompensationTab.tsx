/**
 * Compensation & Benefits Tab
 * Displays and allows editing of employee salary information
 * Automatically syncs with payroll system
 */

'use client';

import { useState, useEffect } from 'react';

interface CompensationTabProps {
    employeeId: number;
    employee: any;
    onUpdate: () => void;
}

export default function CompensationTab({ employeeId, employee, onUpdate }: CompensationTabProps) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initialize salary info with proper defaults and legacy data handling
    const initializeSalaryInfo = () => {
        const info = employee?.salary_info || {};

        // If we have monthly_salary but no daily_rate, calculate it
        if (info.monthly_salary && !info.daily_rate) {
            info.daily_rate = info.monthly_salary / 30;
        }

        // Handle legacy pagibig_loan (migrate to separate fields if needed)
        let pagibig_loan_15th = info.deductions?.pagibig_loan_15th || 0;
        let pagibig_loan_30th = info.deductions?.pagibig_loan_30th || 0;

        // If old pagibig_loan exists but new fields don't, migrate it
        if (info.deductions?.pagibig_loan && !pagibig_loan_15th && !pagibig_loan_30th) {
            pagibig_loan_15th = info.deductions.pagibig_loan;
            // Removed migrating to 30th to avoid double deduction
        }

        const totalAllowance = (info.allowances?.regular || 0) + (info.allowances?.special || 0);

        return {
            daily_rate: info.daily_rate || 0,
            monthly_salary: info.monthly_salary || 0,
            allowances: {
                regular: 0, // Consolidated into special
                special: totalAllowance
            },
            holidays: {
                regular_holiday_days: info.holidays?.regular_holiday_days || 0,
                special_holiday_days: info.holidays?.special_holiday_days || 0
            },
            deductions: {
                phic: info.deductions?.phic || 0,
                phic_er: info.deductions?.phic_er || 0,
                pagibig: info.deductions?.pagibig || 0,
                pagibig_er: info.deductions?.pagibig_er || 0,
                pagibig_loan_15th: pagibig_loan_15th,
                pagibig_loan_30th: pagibig_loan_30th,
                company_funds: 300, // Fixed at 300
                sss: info.deductions?.sss || 0,
                sss_loan: info.deductions?.sss_loan || 0,
                company_loan: info.deductions?.company_loan || 0,
                company_loan_balance: info.deductions?.company_loan_balance || 0,
                cash_advance: info.deductions?.cash_advance || 0,
                other_deductions: info.deductions?.other_deductions || 0
            }
        };
    };

    const [salaryInfo, setSalaryInfo] = useState(initializeSalaryInfo());

    useEffect(() => {
        if (employee?.salary_info) {
            setSalaryInfo(initializeSalaryInfo());
        }
    }, [employee]);

    const handleSave = async () => {
        // Validation
        if (!salaryInfo.daily_rate || salaryInfo.daily_rate <= 0) {
            alert('Daily Rate is required and must be greater than zero.');
            return;
        }

        setSaving(true);
        try {
            const sessionId = localStorage.getItem('sessionId');

            // Ensure monthly_salary is calculated before saving
            const dataToSave = {
                ...salaryInfo,
                monthly_salary: calculateMonthlySalary()
            };

            const response = await fetch(`/api/employees`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    id: employeeId,
                    salary_info: dataToSave
                })
            });

            if (response.ok) {
                alert('Compensation & Benefits updated successfully!');
                setEditing(false);
                onUpdate();
            } else {
                const data = await response.json();
                alert(`Error: ${data.error || 'Failed to update'}`);
            }
        } catch (error) {
            console.error('Error updating compensation:', error);
            alert('Failed to update compensation & benefits');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        // Ensure we have a valid number, default to 0 for null/undefined/NaN
        const validAmount = (amount !== null && amount !== undefined && !isNaN(amount)) ? amount : 0;

        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(validAmount);
    };

    const calculateMonthlySalary = () => {
        const dailyRate = salaryInfo.daily_rate || 0;
        return dailyRate * 30;
    };

    const calculateGrossPayPerCutoff = () => {
        const dailyRate = salaryInfo.daily_rate || 0;
        const basicPay = dailyRate * 15; // Default 15 days
        const totalAllowances = ((salaryInfo.allowances?.regular || 0) + (salaryInfo.allowances?.special || 0)) / 2;

        return basicPay + totalAllowances;
    };

    const calculate15thDeductions = () => {
        const deductions = salaryInfo.deductions || {};
        const phic = (deductions.phic !== null && deductions.phic !== undefined && !isNaN(deductions.phic)) ? deductions.phic : 0;
        const pagibig = (deductions.pagibig !== null && deductions.pagibig !== undefined && !isNaN(deductions.pagibig)) ? deductions.pagibig : 0;
        const pagibig_loan_15th = (deductions.pagibig_loan_15th !== null && deductions.pagibig_loan_15th !== undefined && !isNaN(deductions.pagibig_loan_15th)) ? deductions.pagibig_loan_15th : 0;
        const company_funds = (deductions.company_funds !== null && deductions.company_funds !== undefined && !isNaN(deductions.company_funds)) ? deductions.company_funds : 0;
        const company_loan = (deductions.company_loan !== null && deductions.company_loan !== undefined && !isNaN(deductions.company_loan)) ? deductions.company_loan : 0;
        const cash_advance = (deductions.cash_advance !== null && deductions.cash_advance !== undefined && !isNaN(deductions.cash_advance)) ? deductions.cash_advance : 0;

        let other_deductions = 0;
        if (Array.isArray(deductions.other_deductions)) {
            other_deductions = deductions.other_deductions.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        } else {
            other_deductions = (deductions.other_deductions !== null && deductions.other_deductions !== undefined && !isNaN(deductions.other_deductions)) ? deductions.other_deductions : 0;
        }

        return phic + pagibig + pagibig_loan_15th + company_funds + company_loan + cash_advance + other_deductions;
    };

    const calculate30thDeductions = () => {
        const deductions = salaryInfo.deductions || {};
        const sss = (deductions.sss !== null && deductions.sss !== undefined && !isNaN(deductions.sss)) ? deductions.sss : 0;
        const sss_loan = (deductions.sss_loan !== null && deductions.sss_loan !== undefined && !isNaN(deductions.sss_loan)) ? deductions.sss_loan : 0;
        const pagibig_loan_30th = (deductions.pagibig_loan_30th !== null && deductions.pagibig_loan_30th !== undefined && !isNaN(deductions.pagibig_loan_30th)) ? deductions.pagibig_loan_30th : 0;
        const company_loan = (deductions.company_loan !== null && deductions.company_loan !== undefined && !isNaN(deductions.company_loan)) ? deductions.company_loan : 0;
        const cash_advance = (deductions.cash_advance !== null && deductions.cash_advance !== undefined && !isNaN(deductions.cash_advance)) ? deductions.cash_advance : 0;

        let other_deductions = 0;
        if (Array.isArray(deductions.other_deductions)) {
            other_deductions = deductions.other_deductions.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
        } else {
            other_deductions = (deductions.other_deductions !== null && deductions.other_deductions !== undefined && !isNaN(deductions.other_deductions)) ? deductions.other_deductions : 0;
        }

        return sss + sss_loan + pagibig_loan_30th + company_loan + cash_advance + other_deductions;
    };

    const calculateNetPay15th = () => {
        return calculateGrossPayPerCutoff() - calculate15thDeductions();
    };

    const calculateNetPay30th = () => {
        return calculateGrossPayPerCutoff() - calculate30thDeductions();
    };

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                        Compensation & Benefits
                    </h2>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Salary information automatically syncs with payroll system
                    </p>
                </div>
                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        style={{
                            padding: '8px 16px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        ✏️ Edit
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => {
                                setEditing(false);
                                setSalaryInfo(employee?.salary_info || salaryInfo);
                            }}
                            style={{
                                padding: '8px 16px',
                                background: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '8px 16px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500
                            }}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : '💾 Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left Column - Basic Salary & Allowances */}
                <div>
                    {/* Basic Salary */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            💰 Basic Salary
                        </h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                Daily Rate (PHP) <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            {editing ? (
                                <>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={salaryInfo.daily_rate || 0}
                                        onChange={(e) => setSalaryInfo({
                                            ...salaryInfo,
                                            daily_rate: parseFloat(e.target.value) || 0
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '2px solid #10b981',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: 600
                                        }}
                                        placeholder="Enter daily rate"
                                    />
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                        Required field - Monthly salary will be auto-calculated
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>
                                    {formatCurrency(salaryInfo.daily_rate || 0)}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '4px', fontWeight: 500 }}>
                                Monthly Salary (Auto-computed)
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color: '#15803d' }}>
                                {formatCurrency(calculateMonthlySalary())}
                            </div>
                            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>
                                Daily Rate × 30 days
                            </div>
                            <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '6px', fontStyle: 'italic' }}>
                                💡 Monthly salary is automatically computed based on a 30-day month
                            </div>
                        </div>
                    </div>

                    {/* Allowances */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            🎁 Allowances
                        </h3>



                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                Special Allowance
                            </label>
                            {editing ? (
                                <input
                                    type="number"
                                    value={salaryInfo.allowances?.special || 0}
                                    onChange={(e) => setSalaryInfo({
                                        ...salaryInfo,
                                        allowances: {
                                            ...salaryInfo.allowances,
                                            special: parseFloat(e.target.value) || 0
                                        }
                                    })}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                />
                            ) : (
                                <div style={{ fontSize: '15px', fontWeight: 500 }}>
                                    {formatCurrency(salaryInfo.allowances?.special || 0)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Deductions */}
                <div>
                    {/* 15th Cutoff Deductions */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            📅 15th Cutoff Deductions
                        </h3>

                        {[
                            { key: 'phic', label: 'PhilHealth (PHIC) - EE' },
                            { key: 'pagibig', label: 'Pag-IBIG - EE' },
                            { key: 'pagibig_loan_15th', label: 'Pag-IBIG Loan' },
                            { key: 'company_funds', label: 'Company Funds' }
                        ].map(({ key, label }) => (
                            <div key={key} style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                    {label}
                                </label>
                                {editing ? (
                                    <input
                                        type="number"
                                        value={(salaryInfo.deductions as any)?.[key] || 0}
                                        disabled={key === 'company_funds'}
                                        readOnly={key === 'company_funds'}
                                        onChange={(e) => {
                                            if (key === 'company_funds') return; // Prevent changes
                                            setSalaryInfo({
                                                ...salaryInfo,
                                                deductions: {
                                                    ...salaryInfo.deductions,
                                                    [key]: parseFloat(e.target.value) || 0
                                                }
                                            });
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: key === 'company_funds' ? '#f3f4f6' : 'white',
                                            color: key === 'company_funds' ? '#6b7280' : 'inherit',
                                            cursor: key === 'company_funds' ? 'not-allowed' : 'text'
                                        }}
                                    />
                                ) : (
                                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#ef4444' }}>
                                        {formatCurrency((salaryInfo.deductions as any)?.[key] || 0)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 30th Cutoff Deductions */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            📅 30th Cutoff Deductions
                        </h3>

                        {[
                            { key: 'sss', label: 'SSS' },
                            { key: 'sss_loan', label: 'SSS Loan' },
                            { key: 'pagibig_loan_30th', label: 'Pag-IBIG Loan' }
                        ].map(({ key, label }) => (
                            <div key={key} style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                    {label}
                                </label>
                                {editing ? (
                                    <input
                                        type="number"
                                        value={(salaryInfo.deductions as any)?.[key] || 0}
                                        disabled={key === 'company_loan_balance'}
                                        readOnly={key === 'company_loan_balance'}
                                        onChange={(e) => setSalaryInfo({
                                            ...salaryInfo,
                                            deductions: {
                                                ...salaryInfo.deductions,
                                                [key]: parseFloat(e.target.value) || 0
                                            }
                                        })}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px'
                                        }}
                                    />
                                ) : (
                                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#ef4444' }}>
                                        {formatCurrency((salaryInfo.deductions as any)?.[key] || 0)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Common Deductions */}
                    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginTop: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
                            📋 Common Deductions (Both Cutoffs)
                        </h3>

                        {[
                            { key: 'company_loan', label: 'Company Loan (Deduction)' },
                            { key: 'company_loan_balance', label: 'Company Loan Balance' },
                            { key: 'cash_advance', label: 'Cash Advance' }
                        ].map(({ key, label }) => (
                            <div key={key} style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                                    {label}
                                </label>
                                {editing ? (
                                    <input
                                        type="number"
                                        value={key === 'company_loan_balance' ? (employee?.ledger_balance || 0) : ((salaryInfo.deductions as any)?.[key] || 0)}
                                        disabled={key === 'company_loan_balance'}
                                        readOnly={key === 'company_loan_balance'}
                                        onChange={(e) => {
                                            if (key === 'company_loan_balance') return;
                                            setSalaryInfo({
                                                ...salaryInfo,
                                                deductions: {
                                                    ...salaryInfo.deductions,
                                                    [key]: parseFloat(e.target.value) || 0
                                                }
                                            });
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            backgroundColor: key === 'company_loan_balance' ? '#f3f4f6' : 'white',
                                            color: key === 'company_loan_balance' ? '#9ca3af' : 'inherit',
                                            cursor: key === 'company_loan_balance' ? 'not-allowed' : 'text'
                                        }}
                                    />
                                ) : (
                                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#ef4444' }}>
                                        {formatCurrency(key === 'company_loan_balance' ? (employee?.ledger_balance || 0) : ((salaryInfo.deductions as any)?.[key] || 0))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Other Deductions Dynamic List */}
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                                    Other Deductions
                                </label>
                                {editing && (
                                    <button
                                        onClick={() => {
                                            const current = Array.isArray(salaryInfo.deductions.other_deductions)
                                                ? salaryInfo.deductions.other_deductions
                                                : [];
                                            setSalaryInfo({
                                                ...salaryInfo,
                                                deductions: {
                                                    ...salaryInfo.deductions,
                                                    other_deductions: [...current, { name: '', amount: 0, balance: 0 }]
                                                }
                                            });
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            background: '#dbeafe',
                                            color: '#1e40af',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    >
                                        + Add Item
                                    </button>
                                )}
                            </div>

                            {(!salaryInfo.deductions.other_deductions ||
                                (Array.isArray(salaryInfo.deductions.other_deductions) && salaryInfo.deductions.other_deductions.length === 0) ||
                                (!Array.isArray(salaryInfo.deductions.other_deductions) && salaryInfo.deductions.other_deductions === 0)
                            ) ? (
                                <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', padding: '8px 0' }}>
                                    No other deductions
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {Array.isArray(salaryInfo.deductions.other_deductions) ? (
                                        salaryInfo.deductions.other_deductions.map((item: any, index: number) => (
                                            <div key={index} style={{
                                                background: '#f9fafb',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '6px',
                                                padding: '10px'
                                            }}>
                                                {editing ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Deduction Name"
                                                            value={item.name}
                                                            onChange={(e) => {
                                                                const updated = [...salaryInfo.deductions.other_deductions];
                                                                updated[index] = { ...updated[index], name: e.target.value };
                                                                setSalaryInfo({
                                                                    ...salaryInfo,
                                                                    deductions: { ...salaryInfo.deductions, other_deductions: updated }
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Amount</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Amount"
                                                                    value={item.amount}
                                                                    onChange={(e) => {
                                                                        const updated = [...salaryInfo.deductions.other_deductions];
                                                                        updated[index] = { ...updated[index], amount: parseFloat(e.target.value) || 0 };
                                                                        setSalaryInfo({
                                                                            ...salaryInfo,
                                                                            deductions: { ...salaryInfo.deductions, other_deductions: updated }
                                                                        });
                                                                    }}
                                                                    style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Balance</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Balance"
                                                                    value={item.balance || 0}
                                                                    onChange={(e) => {
                                                                        const updated = [...salaryInfo.deductions.other_deductions];
                                                                        updated[index] = { ...updated[index], balance: parseFloat(e.target.value) || 0 };
                                                                        setSalaryInfo({
                                                                            ...salaryInfo,
                                                                            deductions: { ...salaryInfo.deductions, other_deductions: updated }
                                                                        });
                                                                    }}
                                                                    style={{ width: '100%', padding: '6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const updated = salaryInfo.deductions.other_deductions.filter((_: any, i: number) => i !== index);
                                                                setSalaryInfo({
                                                                    ...salaryInfo,
                                                                    deductions: { ...salaryInfo.deductions, other_deductions: updated }
                                                                });
                                                            }}
                                                            style={{ alignSelf: 'flex-end', fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                                            {item.name || 'Unnamed Deduction'}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                            <span style={{ color: '#ef4444' }}>Amount: {formatCurrency(item.amount)}</span>
                                                            <span style={{ color: '#6b7280' }}>Bal: {formatCurrency(item.balance || 0)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        // Backwards compatibility for single number
                                        <div style={{
                                            background: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            padding: '10px'
                                        }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>Legacy Deduction</div>
                                            <div style={{ fontSize: '13px', color: '#ef4444' }}>
                                                Amount: {formatCurrency(salaryInfo.deductions.other_deductions)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '12px', padding: '20px', color: 'white' }}>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>15th Cutoff - Estimated Net Pay</div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{formatCurrency(calculateNetPay15th())}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                        Gross: {formatCurrency(calculateGrossPayPerCutoff())} - Deductions: {formatCurrency(calculate15thDeductions())}
                    </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '12px', padding: '20px', color: 'white' }}>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>30th Cutoff - Estimated Net Pay</div>
                    <div style={{ fontSize: '28px', fontWeight: 700 }}>{formatCurrency(calculateNetPay30th())}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>
                        Gross: {formatCurrency(calculateGrossPayPerCutoff())} - Deductions: {formatCurrency(calculate30thDeductions())}
                    </div>
                </div>
            </div>

            {/* Info Note */}
            <div style={{ marginTop: '20px', padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>ℹ️</span>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                            Payroll Integration
                        </div>
                        <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
                            This information automatically syncs with the payroll system. When creating payroll runs,
                            the system will use these values to calculate employee compensation. Net pay estimates assume
                            15 payroll days per cutoff (default).
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
