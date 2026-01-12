'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

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
        company_loan: {
            balance: number;
            amortization: number;
        };
        sss_loan: {
            balance: number;
            amortization: number;
        };
        pagibig_loan: {
            balance: number;
            amortization: number;
        };
        cash_advance: number;
        other_deductions: {
            name: string;
            amount: number;
        }[];
    };
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    position: string;
    department: string;
    branch?: string;
    employment_status: string;
    date_hired: string;
    salary_info?: SalaryInfo;
}

export default function CompensationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<SalaryInfo>({
        basic_salary: 0,
        allowances: {
            special: 0,
        },
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

    useEffect(() => {
        if (params.id) {
            fetchEmployee();
        }
    }, [params.id]);

    const fetchEmployee = async () => {
        try {
            const res = await fetch(`/api/employees?id=${params.id}`);
            const data = await res.json();
            setEmployee(data);

            if (data.salary_info) {
                setFormData(data.salary_info);
            } else {
                // Calculate default rates based on basic salary if available
                const basicSalary = data.salary_info?.basic_salary || 0;
                const dailyRate = basicSalary / 30;
                const hourlyRate = dailyRate / 8;

                setFormData(prev => ({
                    ...prev,
                    basic_salary: basicSalary,
                    daily_rate: dailyRate,
                    hourly_rate: hourlyRate
                }));
            }
        } catch (error) {
            console.error('Error fetching employee:', error);
            alert('Failed to load employee data');
        } finally {
            setLoading(false);
        }
    };

    const handleSalaryChange = (field: string, value: any) => {
        const numValue = value === '' ? 0 : parseFloat(value);

        setFormData(prev => {
            const updated = { ...prev };

            // Update the field being edited with the numeric value
            (updated as any)[field] = isNaN(numValue) ? 0 : numValue;

            // Only calculate OTHER fields if we have a valid number
            if (!isNaN(numValue) && numValue > 0) {
                if (field === 'basic_salary') {
                    // User is typing basic salary - calculate daily and hourly
                    updated.daily_rate = parseFloat((numValue / 30).toFixed(2));
                    updated.hourly_rate = parseFloat((updated.daily_rate / 8).toFixed(2));
                } else if (field === 'daily_rate') {
                    // User is typing daily rate - calculate basic and hourly
                    updated.basic_salary = parseFloat((numValue * 30).toFixed(2));
                    updated.hourly_rate = parseFloat((numValue / 8).toFixed(2));
                } else if (field === 'hourly_rate') {
                    // User is typing hourly rate - calculate daily and basic
                    updated.daily_rate = parseFloat((numValue * 8).toFixed(2));
                    updated.basic_salary = parseFloat((updated.daily_rate * 30).toFixed(2));
                }
            }

            return updated;
        });
    };

    const handleAllowanceChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            allowances: {
                ...prev.allowances,
                [field]: parseFloat(value) || 0
            }
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
                other_deductions: prev.deductions.other_deductions.filter((_, i) => i !== index)
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

        console.log('Saving compensation for employee:', params.id);
        console.log('Form data:', formData);

        try {
            const payload = { id: params.id, salary_info: formData };
            console.log('Payload:', JSON.stringify(payload, null, 2));

            const res = await fetch(`/api/employees`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('Response status:', res.status);
            const responseData = await res.json();
            console.log('Response data:', responseData);

            if (res.ok) {
                alert('Compensation updated successfully!');
                // Use hard redirect to force data refresh
                window.location.href = '/compensation';
            } else {
                alert(`Error: ${responseData.error || 'Failed to update compensation'}`);
            }
        } catch (error) {
            console.error('Error updating compensation:', error);
            alert('Failed to update compensation. Check console for details.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to clear all compensation data for this employee? This action cannot be undone.')) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/employees`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: params.id, salary_info: null })
            });

            if (res.ok) {
                alert('Compensation data cleared successfully!');
                window.location.href = '/compensation';
            } else {
                const error = await res.json();
                alert(`Error: ${error.error || 'Failed to clear compensation'}`);
            }
        } catch (error) {
            console.error('Error clearing compensation:', error);
            alert('Failed to clear compensation');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!employee) {
        return (
            <DashboardLayout>
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p>Employee not found</p>
                        <Link href="/compensation" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Back to Compensation
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 className="card-title">💰 Compensation & Benefits</h2>
                            <p className="card-subtitle">
                                {employee.employee_id} - {employee.last_name}, {employee.first_name}
                            </p>
                        </div>
                        <Link href="/compensation" className="btn btn-secondary">
                            ← Back to List
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card-body">
                        {/* Employee Info Summary */}
                        <div style={{
                            background: 'var(--gray-50)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '2rem'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Position</label>
                                    <div style={{ fontWeight: 600 }}>{employee.position}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Department</label>
                                    <div style={{ fontWeight: 600 }}>{employee.department}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Branch</label>
                                    <div style={{ fontWeight: 600 }}>{employee.branch || 'N/A'}</div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Date Hired</label>
                                    <div style={{ fontWeight: 600 }}>{new Date(employee.date_hired).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Salary Information */}
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary-700)' }}>
                            💵 Salary Information
                        </h3>

                        <div className="form-row">
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
                                <p className="form-help">Auto-calculated as: Daily Rate × 30</p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pay Frequency</label>
                                <select
                                    value={formData.pay_frequency}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pay_frequency: e.target.value as any }))}
                                    className="form-select"
                                >
                                    <option value="Semi-Monthly">Semi-Monthly</option>
                                    <option value="Monthly">Monthly</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Daily Rate</label>
                                <input
                                    type="number"
                                    value={formData.daily_rate || ''}
                                    onChange={(e) => {
                                        // Only update the daily_rate, no calculations
                                        setFormData(prev => ({
                                            ...prev,
                                            daily_rate: e.target.value === '' ? 0 : parseFloat(e.target.value)
                                        }));
                                    }}
                                    onBlur={(e) => {
                                        // Calculate other fields when user finishes typing
                                        const dailyRate = parseFloat(e.target.value) || 0;
                                        setFormData(prev => ({
                                            ...prev,
                                            daily_rate: dailyRate,
                                            basic_salary: parseFloat((dailyRate * 30).toFixed(2)),
                                            hourly_rate: parseFloat((dailyRate / 8).toFixed(2))
                                        }));
                                    }}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                                <p className="form-help">Enter daily rate, basic & hourly will auto-calculate</p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hourly Rate</label>
                                <input
                                    type="number"
                                    value={formData.hourly_rate || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                                <p className="form-help">Auto-calculated as: Daily Rate ÷ 8</p>
                            </div>
                        </div>

                        {/* Allowances */}
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '2rem 0 1rem', color: 'var(--success-700)' }}>
                            🎁 Allowances
                        </h3>

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

                        {/* Deductions */}
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '2rem 0 1rem', color: 'var(--danger-700)' }}>
                            📉 Deductions
                        </h3>

                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Government Contributions</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">SSS Contribution</label>
                                <input
                                    type="number"
                                    value={formData.deductions.sss_contribution}
                                    onChange={(e) => handleDeductionChange('sss_contribution', null, e.target.value)}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PhilHealth Contribution</label>
                                <input
                                    type="number"
                                    value={formData.deductions.philhealth_contribution}
                                    onChange={(e) => handleDeductionChange('philhealth_contribution', null, e.target.value)}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pag-IBIG Contribution</label>
                                <input
                                    type="number"
                                    value={formData.deductions.pagibig_contribution}
                                    onChange={(e) => handleDeductionChange('pagibig_contribution', null, e.target.value)}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: '1.5rem' }}>Loans & Cash Fund</h4>
                        <div className="form-group mb-4">
                            <label className="form-label">Company Cash Fund (Fixed Amount)</label>
                            <input
                                type="number"
                                value={formData.deductions.company_cash_fund}
                                onChange={(e) => handleDeductionChange('company_cash_fund', null, e.target.value)}
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="form-label">Company Loan Balance</label>
                                <input
                                    type="number"
                                    value={formData.deductions.company_loan.balance}
                                    onChange={(e) => handleDeductionChange('company_loan', 'balance', e.target.value)}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="form-label">Monthly Amortization</label>
                                <input
                                    type="number"
                                    value={formData.deductions.company_loan.amortization}
                                    onChange={(e) => handleDeductionChange('company_loan', 'amortization', e.target.value)}
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label">SSS Loan Monthly Amortization</label>
                            <input
                                type="number"
                                value={formData.deductions.sss_loan.amortization}
                                onChange={(e) => handleDeductionChange('sss_loan', 'amortization', e.target.value)}
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Pag-IBIG Loan Monthly Amortization</label>
                            <input
                                type="number"
                                value={formData.deductions.pagibig_loan.amortization}
                                onChange={(e) => handleDeductionChange('pagibig_loan', 'amortization', e.target.value)}
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cash Advance</label>
                            <input
                                type="number"
                                value={formData.deductions.cash_advance}
                                onChange={(e) => handleDeductionChange('cash_advance', null, e.target.value)}
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: '1.5rem' }}>Other Deductions</h4>
                        <div className="mb-4">
                            {(formData.deductions.other_deductions || []).map((item, index) => (
                                <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="text"
                                            placeholder="Deduction Name"
                                            value={item.name}
                                            onChange={(e) => handleOtherDeductionChange(index, 'name', e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    <div style={{ width: '200px' }}>
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={item.amount}
                                            onChange={(e) => handleOtherDeductionChange(index, 'amount', e.target.value)}
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOtherDeduction(index)}
                                        className="btn btn-danger btn-sm"
                                        style={{ padding: '0.5rem 0.75rem' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddOtherDeduction}
                                className="btn btn-secondary btn-sm"
                                style={{ marginTop: '0.5rem' }}
                            >
                                + Add Other Deduction
                            </button>
                        </div>
                    </div>

                    <div className="card-footer">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="btn btn-danger"
                                disabled={saving}
                            >
                                🗑️ Clear All Compensation Data
                            </button>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Link href="/compensation" className="btn btn-secondary">
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : '💾 Save Compensation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
