'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function CreatePayrollPage() {
    const router = useRouter();
    const [dates, setDates] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [preview, setPreview] = useState<any[]>([]);
    const [selectedDeductions, setSelectedDeductions] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('All');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);



    const deductionOptions = [
        { id: 'sss', label: 'SSS Contribution' },
        { id: 'philhealth', label: 'PhilHealth' },
        { id: 'pagibig', label: 'Pag-IBIG' },
        { id: 'sss_loan', label: 'SSS Loan' },
        { id: 'pagibig_loan', label: 'Pag-IBIG Loan' },
        { id: 'company_loan', label: 'Company Loan' },
        { id: 'company_cash_fund', label: 'Company Cash Fund' },
        { id: 'cash_advance', label: 'Cash Advance' },
        { id: 'other_deductions', label: 'Other Deductions' },
    ];

    const toggleDeduction = (id: string) => {
        setSelectedDeductions(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/payroll/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: dates.start,
                    endDate: dates.end,
                    selectedDeductions,
                    branch: selectedBranch
                })
            });
            const data = await response.json();
            // Initialize with defaults
            const initializedData = data.map((item: any) => ({
                ...item,
                days_present: 15, // Default assumption for semi-monthly
                double_pay_amount: 0
            }));
            setPreview(initializedData);
        } catch (error) {
            console.error('Failed to generate preview:', error);
            alert('Failed to generate payroll preview');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (status: 'Draft' | 'Finalized' = 'Finalized') => {
        setSaving(true);
        try {
            const response = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period_start: dates.start,
                    period_end: dates.end,
                    items: preview,
                    status
                })
            });

            if (response.ok) {
                router.push('/payroll');
            } else {
                alert('Failed to save payroll run');
            }
        } catch (error) {
            console.error('Failed to save payroll:', error);
            alert('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateItem = (index: number, field: string, value: any) => {
        setPreview(prev => {
            const newPreview = [...prev];
            const item = { ...newPreview[index] };
            const numValue = parseFloat(value) || 0;

            if (field === 'days_present') {
                item.days_present = numValue;
                // Recalculate Gross Pay based on attendance
                item.gross_pay = item.days_present * item.daily_rate;
            } else if (field === 'double_pay_amount') {
                item.double_pay_amount = numValue;
            }

            // Recalculate Net Pay
            const totalGross = item.gross_pay + (item.double_pay_amount || 0);
            item.net_pay = totalGross + item.allowances - item.deductions;

            newPreview[index] = item;
            return newPreview;
        });
    };

    const totalAmount = preview.reduce((sum, item) => sum + (item.net_pay || 0), 0);

    return (
        <DashboardLayout>
            <div className="card mb-3">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title">
                            <span>💰</span>
                            Create New Payroll Run
                        </div>
                        <Link href="/payroll" className="btn btn-secondary btn-sm">
                            ← Cancel
                        </Link>
                    </div>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-2 gap-4" style={{ maxWidth: '600px' }}>
                        <div className="form-group">
                            <label className="form-label">Period Start</label>
                            <input
                                type="date"
                                value={dates.start}
                                onChange={(e) => setDates({ ...dates, start: e.target.value })}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Period End</label>
                            <input
                                type="date"
                                value={dates.end}
                                onChange={(e) => setDates({ ...dates, end: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4" style={{ marginTop: '1.5rem', maxWidth: '600px' }}>
                        <div className="form-group">
                            <label className="form-label">Branch</label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="form-input"
                            >
                                <option value="All">All Branches</option>
                                <option value="Ormoc Branch">Ormoc Branch</option>
                                <option value="Naval Branch">Naval Branch</option>
                            </select>
                        </div>

                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <label className="form-label" style={{ fontWeight: '600', margin: 0 }}>
                                Select Deductions to Include:
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDeductions(['pagibig', 'pagibig_loan', 'company_loan', 'company_cash_fund', 'philhealth', 'cash_advance', 'other_deductions'])}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Select 15th Defaults
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDeductions(['sss', 'sss_loan', 'company_loan', 'cash_advance', 'other_deductions'])}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Select 30th Defaults
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDeductions([])}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '0.75rem',
                            background: 'var(--bg-secondary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)'
                        }}>
                            {deductionOptions.map(opt => (
                                <label key={opt.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedDeductions.includes(opt.id)}
                                        onChange={() => toggleDeduction(opt.id)}
                                        style={{ width: '1rem', height: '1rem' }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            * Note: Loans and Cash Advance will only be deducted if the employee has an outstanding balance.
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Calculating...' : 'Generate Preview'}
                        </button>
                    </div>
                </div>
            </div>

            {preview.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Payroll Preview</h3>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                                Total Payout: ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                    <div className="table-container-responsive">
                        <table className="table table-condensed">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Branch</th>
                                    <th style={{ width: '80px', textAlign: 'center' }}>Days</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Holiday</th>
                                    <th style={{ textAlign: 'right' }}>Gross</th>
                                    <th style={{ textAlign: 'right' }}>Allow.</th>
                                    {(() => {
                                        const deductionConfigs = [
                                            { key: 'sss', label: 'SSS' },
                                            { key: 'sss_loan', label: 'SSS L.' },
                                            { key: 'philhealth', label: 'P.H.' },
                                            { key: 'pagibig', label: 'P.IBIG' },
                                            { key: 'pagibig_loan', label: 'P.I. L' },
                                            { key: 'company_loan', label: 'C.Loan' },
                                            { key: 'company_cash_fund', label: 'C.Fund' },
                                            { key: 'cash_advance', label: 'C.Adv' },
                                            { key: 'other_deductions', label: 'Other' },
                                        ];
                                        const activeDeductions = deductionConfigs.filter(d =>
                                            ['cash_advance', 'other_deductions'].includes(d.key) ||
                                            preview.some(s => (s.deduction_details?.[d.key] || 0) > 0)
                                        );
                                        return (
                                            <>
                                                {activeDeductions.map(d => (
                                                    <th key={d.key} style={{ textAlign: 'right' }}>{d.label}</th>
                                                ))}
                                                <th style={{ textAlign: 'right' }}>Tot. Ded.</th>
                                            </>
                                        );
                                    })()}
                                    <th style={{ textAlign: 'right' }}>Net Pay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((item, index) => (
                                    <tr key={item.employee_id}>
                                        <td style={{ minWidth: '150px' }}>
                                            <div style={{ fontWeight: 600 }}>{item.employee_name}</div>
                                            <div style={{ fontSize: '0.70rem', color: 'var(--text-tertiary)' }}>
                                                Daily: ₱{item.daily_rate?.toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {item.branch || 'N/A'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                value={item.days_present}
                                                onChange={(e) => handleUpdateItem(index, 'days_present', e.target.value)}
                                                className="form-input"
                                                style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', textAlign: 'center', width: '50px', margin: '0 auto' }}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="number"
                                                value={item.double_pay_amount}
                                                onChange={(e) => handleUpdateItem(index, 'double_pay_amount', e.target.value)}
                                                className="form-input"
                                                style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', textAlign: 'center', width: '70px', margin: '0 auto' }}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                            ₱{(item.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            {item.double_pay_amount > 0 && (
                                                <div style={{ fontSize: '0.70rem', color: 'var(--success-600)' }}>
                                                    +₱{(item.double_pay_amount || 0).toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₱{(item.allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        {(() => {
                                            const deductionConfigs = [
                                                { key: 'sss', label: 'SSS' },
                                                { key: 'sss_loan', label: 'SSS L.' },
                                                { key: 'philhealth', label: 'P.Health' },
                                                { key: 'pagibig', label: 'PagIBIG' },
                                                { key: 'pagibig_loan', label: 'P.I. L.' },
                                                { key: 'company_loan', label: 'Co.Loan' },
                                                { key: 'company_cash_fund', label: 'Cash Fund' },
                                                { key: 'cash_advance', label: 'Cash Adv' },
                                                { key: 'other_deductions', label: 'Other' },
                                            ];
                                            const activeDeductions = deductionConfigs.filter(d =>
                                                ['cash_advance', 'other_deductions'].includes(d.key) ||
                                                preview.some(s => (s.deduction_details?.[d.key] || 0) > 0)
                                            );
                                            return (
                                                <>
                                                    {activeDeductions.map(d => (
                                                        <td key={d.key} style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                            {(item.deduction_details?.[d.key] || 0) > 0
                                                                ? `₱${item.deduction_details[d.key].toLocaleString()}`
                                                                : <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                            }
                                                        </td>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                        <td style={{ textAlign: 'right', color: 'var(--danger-600)', fontFamily: 'monospace' }}>
                                            -₱{(item.deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-700)', fontFamily: 'monospace' }}>
                                            ₱{(item.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--gray-50)', fontWeight: 700 }}>
                                    <td colSpan={4} style={{ textAlign: 'right', padding: '0.5rem' }}>TOTALS:</td>
                                    <td style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace' }}>
                                        {preview.reduce((sum, item) => sum + (item.gross_pay + (item.double_pay_amount || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace' }}>
                                        {preview.reduce((sum, item) => sum + item.allowances, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    {(() => {
                                        const deductionConfigs = [
                                            { key: 'sss', label: 'SSS' },
                                            { key: 'sss_loan', label: 'SSS L.' },
                                            { key: 'philhealth', label: 'P.H.' },
                                            { key: 'pagibig', label: 'P.IBIG' },
                                            { key: 'pagibig_loan', label: 'P.I. L' },
                                            { key: 'company_loan', label: 'C.Loan' },
                                            { key: 'company_cash_fund', label: 'C.Fund' },
                                            { key: 'cash_advance', label: 'C.Adv' },
                                            { key: 'other_deductions', label: 'Other' },
                                        ];
                                        const activeDeductions = deductionConfigs.filter(d =>
                                            ['cash_advance', 'other_deductions'].includes(d.key) ||
                                            preview.some(s => (s.deduction_details?.[d.key] || 0) > 0)
                                        );
                                        return (
                                            <>
                                                {activeDeductions.map(d => (
                                                    <td key={d.key} style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                        {preview.reduce((sum, item) => sum + (item.deduction_details?.[d.key] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                ))}
                                            </>
                                        );
                                    })()}
                                    <td style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace', color: 'var(--danger-600)' }}>
                                        {preview.reduce((sum, item) => sum + item.deductions, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1rem', color: 'var(--primary-700)', fontFamily: 'monospace' }}>
                                        ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="card-footer">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => handleSave('Draft')}
                                disabled={saving}
                                className="btn btn-secondary"
                            >
                                {saving ? 'Saving...' : 'Save as Draft'}
                            </button>
                            <button
                                onClick={() => handleSave('Finalized')}
                                disabled={saving}
                                className="btn btn-success"
                            >
                                {saving ? 'Saving...' : 'Confirm & Finalize Payroll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
