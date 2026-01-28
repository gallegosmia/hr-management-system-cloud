'use client';

import React, { useState, useEffect } from 'react';

interface SalaryInfo {
    basic_salary: number;
    allowances: {
        special: number;
    };
    daily_rate: number;
    hourly_rate: number;
    pay_frequency: 'Semi-Monthly' | 'Monthly';
    deductions: {
        sss_contribution: number;
        philhealth_contribution: number;
        pagibig_contribution: number;
        company_cash_fund: number;
        company_loan: { balance: number; amortization: number };
        sss_loan: { balance: number; amortization: number };
        pagibig_loan: { balance: number; amortization: number };
        cash_advance: number;
        other_deductions: { name: string; amount: number }[];
    };
}

interface PayrollDetailsTabProps {
    employee: any;
    onUpdate: (data: SalaryInfo) => Promise<void>;
}

export default function PayrollDetailsTab({ employee, onUpdate }: PayrollDetailsTabProps) {
    const [formData, setFormData] = useState<SalaryInfo>({
        basic_salary: 0,
        allowances: { special: 0 },
        daily_rate: 0,
        hourly_rate: 0,
        pay_frequency: 'Semi-Monthly',
        deductions: {
            sss_contribution: 0,
            philhealth_contribution: 0,
            pagibig_contribution: 0,
            company_cash_fund: 0,
            company_loan: { balance: 0, amortization: 0 },
            sss_loan: { balance: 0, amortization: 0 },
            pagibig_loan: { balance: 0, amortization: 0 },
            cash_advance: 0,
            other_deductions: []
        }
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (employee?.salary_info) {
            setFormData(employee.salary_info);
        }
    }, [employee]);

    const handleSalaryChange = (field: string, value: any) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        setFormData(prev => {
            const updated = { ...prev };
            (updated as any)[field] = isNaN(numValue) ? 0 : numValue;

            if (!isNaN(numValue) && numValue > 0) {
                if (field === 'basic_salary') {
                    updated.daily_rate = parseFloat((numValue / 30).toFixed(2));
                    updated.hourly_rate = parseFloat((updated.daily_rate / 8).toFixed(2));
                } else if (field === 'daily_rate') {
                    updated.basic_salary = parseFloat((numValue * 30).toFixed(2));
                    updated.hourly_rate = parseFloat((numValue / 8).toFixed(2));
                }
            }
            return updated;
        });
    };

    const handleAllowanceChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            allowances: { ...prev.allowances, [field]: parseFloat(value) || 0 }
        }));
    };

    const handleDeductionChange = (field: string, subField: string | null, value: any) => {
        setFormData(prev => {
            const newDeductions = { ...prev.deductions };
            if (subField) {
                (newDeductions as any)[field] = {
                    ...(newDeductions as any)[field],
                    [subField]: parseFloat(value) || 0
                };
            } else {
                (newDeductions as any)[field] = parseFloat(value) || 0;
            }
            return { ...prev, deductions: newDeductions };
        });
    };

    const handleAddOtherDeduction = () => {
        setFormData(prev => ({
            ...prev,
            deductions: {
                ...prev.deductions,
                other_deductions: [
                    ...(prev.deductions.other_deductions || []),
                    { name: '', amount: 0 }
                ]
            }
        }));
    };

    const handleRemoveOtherDeduction = (index: number) => {
        setFormData(prev => ({
            ...prev,
            deductions: {
                ...prev.deductions,
                other_deductions: (prev.deductions.other_deductions || []).filter((_, i) => i !== index)
            }
        }));
    };

    const handleOtherDeductionChange = (index: number, field: 'name' | 'amount', value: any) => {
        setFormData(prev => {
            const newOthers = [...(prev.deductions.other_deductions || [])];
            newOthers[index] = {
                ...newOthers[index],
                [field]: field === 'amount' ? (parseFloat(value) || 0) : value
            };
            return {
                ...prev,
                deductions: {
                    ...prev.deductions,
                    other_deductions: newOthers
                }
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await onUpdate(formData);
            setMessage('Payroll details updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error(error);
            setMessage('Failed to update payroll details.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Salary Information Section */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        💵 Salary Information
                    </h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">Basic Salary (Monthly)</label>
                            <input
                                type="number"
                                value={formData.basic_salary}
                                onChange={(e) => handleSalaryChange('basic_salary', e.target.value)}
                                className="form-input"
                                min="0"
                                step="0.01"
                                required
                            />
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Auto-calculated: Daily Rate × 30</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Pay Frequency</label>
                            <select
                                value={formData.pay_frequency}
                                onChange={(e) => setFormData(p => ({ ...p, pay_frequency: e.target.value as any }))}
                                className="form-select"
                            >
                                <option value="Semi-Monthly">Semi-Monthly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">Daily Rate</label>
                            <input
                                type="number"
                                value={formData.daily_rate}
                                onChange={(e) => handleSalaryChange('daily_rate', e.target.value)}
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hourly Rate</label>
                            <input
                                type="number"
                                value={formData.hourly_rate}
                                readOnly
                                className="form-input"
                                style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Allowances/Benefits Section */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🎁 Allowances & Benefits
                    </h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group">
                        <label className="form-label">Special Allowance (Per Cutoff)</label>
                        <input
                            type="number"
                            value={formData.allowances.special}
                            onChange={(e) => handleAllowanceChange('special', e.target.value)}
                            className="form-input"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Company Cash Fund</label>
                        <input
                            type="number"
                            value={formData.deductions.company_cash_fund}
                            onChange={(e) => handleDeductionChange('company_cash_fund', null, e.target.value)}
                            className="form-input"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            {/* Deductions Section */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📉 Deductions
                    </h3>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Government Contributions */}
                    <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>Government Contributions</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">SSS</label>
                                <input
                                    type="number"
                                    value={formData.deductions.sss_contribution}
                                    onChange={(e) => handleDeductionChange('sss_contribution', null, e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PhilHealth</label>
                                <input
                                    type="number"
                                    value={formData.deductions.philhealth_contribution}
                                    onChange={(e) => handleDeductionChange('philhealth_contribution', null, e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pag-IBIG</label>
                                <input
                                    type="number"
                                    value={formData.deductions.pagibig_contribution}
                                    onChange={(e) => handleDeductionChange('pagibig_contribution', null, e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Loans & Advances */}
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>Loans & Cash Advances</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Company Loan Balance</label>
                                <input
                                    type="number"
                                    value={formData.deductions.company_loan.balance}
                                    onChange={(e) => handleDeductionChange('company_loan', 'balance', e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Monthly Amortization</label>
                                <input
                                    type="number"
                                    value={formData.deductions.company_loan.amortization}
                                    onChange={(e) => handleDeductionChange('company_loan', 'amortization', e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">SSS Loan (Monthly)</label>
                                <input
                                    type="number"
                                    value={formData.deductions.sss_loan.amortization}
                                    onChange={(e) => handleDeductionChange('sss_loan', 'amortization', e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pag-IBIG Loan (Monthly)</label>
                                <input
                                    type="number"
                                    value={formData.deductions.pagibig_loan.amortization}
                                    onChange={(e) => handleDeductionChange('pagibig_loan', 'amortization', e.target.value)}
                                    className="form-input"
                                    step="0.01"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cash Advance</label>
                            <input
                                type="number"
                                value={formData.deductions.cash_advance}
                                onChange={(e) => handleDeductionChange('cash_advance', null, e.target.value)}
                                className="form-input"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Other Deductions */}
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: 0 }}>Other Deductions</h4>
                            <button type="button" onClick={handleAddOtherDeduction} className="btn btn-sm btn-secondary">
                                + Add Other
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(formData.deductions.other_deductions || []).map((item, index) => (
                                <div key={index} style={{ display: 'flex', gap: '1rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Name (e.g. Uniform)"
                                        value={item.name}
                                        onChange={(e) => handleOtherDeductionChange(index, 'name', e.target.value)}
                                        className="form-input"
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={item.amount}
                                        onChange={(e) => handleOtherDeductionChange(index, 'amount', e.target.value)}
                                        className="form-input"
                                        style={{ width: '150px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOtherDeduction(index)}
                                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 0.5rem' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            {(!formData.deductions.other_deductions || formData.deductions.other_deductions.length === 0) && (
                                <p style={{ fontSize: '0.875rem', color: '#9ca3af', textAlign: 'center', margin: '1rem 0' }}>No other deductions recorded.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', background: '#f9fafb', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
                {message && <span style={{ color: message.includes('success') ? '#059669' : '#ef4444', fontSize: '0.875rem', fontWeight: 600 }}>{message}</span>}
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 2.5rem', borderRadius: '10px' }}>
                    {saving ? 'Saving...' : '💾 Save Payroll Details'}
                </button>
            </div>
        </form>
    );
}
