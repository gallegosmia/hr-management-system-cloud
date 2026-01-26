'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function EditPayrollPage() {
    const params = useParams();
    const router = useRouter();
    const [dates, setDates] = useState({
        start: '',
        end: ''
    });
    const [preview, setPreview] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const scrollTable = (direction: 'left' | 'right') => {
        if (tableContainerRef.current) {
            const scrollAmount = 300;
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (params.id) {
            fetchPayrollData();
        }
    }, [params.id]);

    const fetchPayrollData = async () => {
        try {
            const response = await fetch(`/api/payroll/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setDates({
                    start: data.period_start ? new Date(data.period_start).toISOString().split('T')[0] : '',
                    end: data.period_end ? new Date(data.period_end).toISOString().split('T')[0] : ''
                });

                // We need to fetch daily rates for each employee to support recalculation
                const enrichedPayslips = data.payslips.map((slip: any) => {
                    const grossPay = Number(slip.gross_pay || 0);
                    const deductions = Number(slip.total_deductions || 0);
                    const allowances = Number(slip.total_allowances || 0);
                    const netPay = Number(slip.net_pay || 0);
                    const daysPresent = Number(slip.days_present || 0);
                    const holidayAmt = Number(slip.double_pay_amount || 0);

                    return {
                        ...slip,
                        gross_pay: grossPay,
                        total_deductions: deductions,
                        total_allowances: allowances,
                        net_pay: netPay,
                        days_present: daysPresent,
                        double_pay_amount: holidayAmt,
                        daily_rate: slip.daily_rate || (grossPay / (daysPresent || 1)),
                        deductions: deductions, // mapping for internal use in render
                        allowances: allowances   // mapping for internal use in render
                    };
                });

                setPreview(enrichedPayslips);
            } else {
                alert('Failed to fetch payroll data');
                router.push('/payroll');
            }
        } catch (error) {
            console.error('Error fetching payroll:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateItem = (employeeId: number, field: string, value: any) => {
        setPreview(prev => {
            const index = prev.findIndex(item => item.employee_id === employeeId);
            if (index === -1) return prev;

            const newPreview = [...prev];
            const item = { ...newPreview[index] };
            const numValue = parseFloat(value) || 0;

            if (field === 'days_present') {
                item.days_present = numValue;
                item.gross_pay = item.days_present * item.daily_rate;
            } else if (field === 'double_pay_amount') {
                item.double_pay_amount = numValue;
            }

            const totalGross = item.gross_pay + (item.double_pay_amount || 0);
            item.net_pay = totalGross + item.allowances - item.deductions;

            newPreview[index] = item;
            return newPreview;
        });
    };

    const handleSave = async (status: 'Draft' | 'Finalized' = 'Finalized') => {
        setSaving(true);
        try {
            const response = await fetch(`/api/payroll/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    period_start: dates.start,
                    period_end: dates.end,
                    items: preview,
                    status
                })
            });

            if (response.ok) {
                router.push(`/payroll/${params.id}`);
            } else {
                alert('Failed to update payroll run');
            }
        } catch (error) {
            console.error('Failed to update payroll:', error);
            alert('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const totalAmount = preview.reduce((sum, item) => sum + (item.net_pay || 0), 0);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading payroll data...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="card mb-3">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title">
                            <span>📝</span>
                            Edit Payroll Run
                        </div>
                        <Link href={`/payroll/${params.id}`} className="btn btn-secondary btn-sm">
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
                        {preview.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Filter by Branch</label>
                                <select
                                    className="form-input"
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                >
                                    <option value="All">All Branches</option>
                                    {Array.from(new Set(preview.map(p => p.branch).filter(Boolean))).sort().map(branch => (
                                        <option key={branch} value={branch}>{branch}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Payslips</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button
                                    onClick={() => scrollTable('left')}
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                    title="Scroll Left"
                                >
                                    ← Scroll
                                </button>
                                <button
                                    onClick={() => scrollTable('right')}
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                    title="Scroll Right"
                                >
                                    Scroll →
                                </button>
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                                Total Payout: ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
                <div
                    ref={tableContainerRef}
                    className="table-container-responsive"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    <table className="table table-condensed">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th style={{ width: '80px' }}>Days</th>
                                <th style={{ width: '120px' }}>Holiday (Amount)</th>
                                <th>Gross</th>
                                <th>Allow.</th>
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
                                        preview.some(s => Number(s.deduction_details?.[d.key] || 0) > 0)
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
                                <th>Net Pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview
                                .filter(item => selectedBranch === 'All' || item.branch === selectedBranch)
                                .map((item) => (
                                    <tr key={item.employee_id}>
                                        <td>
                                            <strong>{item.employee_name}</strong>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {item.position}
                                            </div>
                                            <div style={{ fontSize: '0.70rem', color: 'var(--text-tertiary)' }}>
                                                Daily: ₱{item.daily_rate?.toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={item.days_present}
                                                onChange={(e) => handleUpdateItem(item.employee_id, 'days_present', e.target.value)}
                                                className="form-input"
                                                style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', textAlign: 'center', width: '50px' }}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={item.double_pay_amount}
                                                onChange={(e) => handleUpdateItem(item.employee_id, 'double_pay_amount', e.target.value)}
                                                className="form-input"
                                                style={{ padding: '0.15rem 0.25rem', fontSize: '0.8rem', textAlign: 'center', width: '80px' }}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td>
                                            ₱{item.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            {item.double_pay_amount > 0 && (
                                                <div style={{ fontSize: '0.70rem', color: 'var(--success-600)' }}>
                                                    +₱{item.double_pay_amount.toLocaleString()} (Holiday)
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            ₱{item.allowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
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
                                                preview.some(s => Number(s.deduction_details?.[d.key] || 0) > 0)
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
                                        <td style={{ color: 'var(--danger-600)', textAlign: 'right' }}>
                                            -₱{item.deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>
                                            ₱{item.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--gray-50)', fontWeight: 700 }}>
                                <td colSpan={3} style={{ textAlign: 'right', padding: '0.5rem' }}>TOTALS:</td>
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
                                        preview.some(s => (s.deduction_details?.[d.key] || 0) > 0)
                                    );
                                    return (
                                        <>
                                            {activeDeductions.map(d => (
                                                <td key={d.key} style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                    {preview.reduce((sum, item) => sum + Number(item.deduction_details?.[d.key] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            {saving ? 'Saving...' : 'Keep as Draft'}
                        </button>
                        <button
                            onClick={() => handleSave('Finalized')}
                            disabled={saving}
                            className="btn btn-success"
                        >
                            {saving ? 'Finalizing...' : 'Finalize & Post Payroll'}
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
