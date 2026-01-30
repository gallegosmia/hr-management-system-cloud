'use client';

import { useState, useRef, useEffect } from 'react';
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

    // Auto-select deductions based on date range
    useEffect(() => {
        if (!dates.end) return;

        const end = new Date(dates.end);
        const day = end.getDate();
        const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

        if (day === 15) {
            // 15th Cutoff Defaults
            setSelectedDeductions(['philhealth', 'pagibig', 'pagibig_loan', 'company_loan', 'company_cash_fund', 'cash_advance', 'other_deductions']);
        } else if (day >= 28 && (day >= 30 || day === lastDay)) {
            // 30th/End-of-Month Cutoff Defaults (Covers 30th, 31st, and last day of Feb)
            setSelectedDeductions(['sss', 'sss_loan', 'company_loan', 'cash_advance', 'other_deductions']);
        }
    }, [dates.end]);




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
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/payroll/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
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
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/payroll', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
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

    // ... logic remains ...

    return (
        <DashboardLayout>
            <div style={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg,rgb(16, 68, 107) 0%,rgb(17, 95, 114) 100%)', // Match image tone
                padding: '2rem',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background elements if needed */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    filter: 'blur(40px)'
                }}></div>

                <div className="glass-card" style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '500px',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        background: '#1f2937',
                        color: 'white',
                        padding: '1rem 1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <span style={{ color: '#ef4444' }}>📊</span>
                            Create New Payroll Run
                        </div>
                        <Link href="/payroll" style={{ color: '#ef4444', textDecoration: 'none', fontSize: '1.2rem', lineHeight: 1 }}>
                            ⓧ
                        </Link>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {/* Date Inputs */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Period Start</label>
                            <div className="input-group">
                                <input
                                    type="date"
                                    value={dates.start}
                                    onChange={(e) => setDates({ ...dates, start: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Period End</label>
                            <div className="input-group">
                                <input
                                    type="date"
                                    value={dates.end}
                                    onChange={(e) => setDates({ ...dates, end: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Branch / Presets */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Branch / Defaults</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => {
                                        setSelectedDeductions(['pagibig', 'pagibig_loan', 'company_loan', 'company_cash_fund', 'philhealth', 'cash_advance', 'other_deductions']);
                                        // Maybe auto-set date to 15th?
                                    }}
                                    style={{
                                        padding: '0.75rem',
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Select 15th Defaults
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedDeductions(['sss', 'sss_loan', 'company_loan', 'cash_advance', 'other_deductions']);
                                        // Maybe auto-set date to 30th?
                                    }}
                                    style={{
                                        padding: '0.75rem',
                                        background: '#2dd4bf',
                                        color: '#134e4a',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Select 30th Defaults
                                </button>
                            </div>
                        </div>

                        {/* Deductions Toggle Section */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.5)',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
                                Select Deductions to Include
                            </label>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {deductionOptions.map((opt) => (
                                    <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {/* Icons mapping could be improved, using generic for now */}
                                            <span style={{ color: '#0ea5e9', fontSize: '1.2rem' }}>
                                                {['sss', 'sss_loan'].includes(opt.id) ? '🛡️' :
                                                    ['philhealth'].includes(opt.id) ? '❤️' :
                                                        ['pagibig', 'pagibig_loan'].includes(opt.id) ? '🏠' : '💰'}
                                            </span>
                                            <span style={{ fontSize: '0.95rem', color: '#374151', fontWeight: 500 }}>{opt.label}</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={selectedDeductions.includes(opt.id)}
                                                onChange={() => toggleDeduction(opt.id)}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                                <span>Note</span>
                                <span style={{ border: '1px solid #9ca3af', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>i</span>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                style={{
                                    background: '#15803d',
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                <span>▷</span> {loading ? 'Calculating...' : 'Generate Preview'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Section - Only show if preview generated */}
            {preview.length > 0 && (
                <div className="card mt-4" style={{ padding: '0.75rem', animation: 'fadeIn 0.5s' }}>
                    {/* ... Existing Table Code ... */}
                    <div className="card-header" style={{ padding: '0.5rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Payroll Preview</h3>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button onClick={() => scrollTable('left')} className="btn btn-secondary btn-sm">←</button>
                                    <button onClick={() => scrollTable('right')} className="btn btn-secondary btn-sm">→</button>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                                    To Payout: ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={tableContainerRef} className="table-container-responsive" style={{ fontSize: '0.75rem', scrollBehavior: 'smooth' }}>
                        <table className="table table-condensed table-payroll">
                            {/* ... Include existing table headers/body/foot ... */}
                            <thead>
                                <tr>
                                    <th style={{ minWidth: '120px' }}>Employee</th>
                                    <th>Branch</th>
                                    <th style={{ width: '50px', textAlign: 'center' }}>Days</th>
                                    <th style={{ textAlign: 'right' }}>Gross</th>
                                    <th style={{ textAlign: 'right' }}>Allow.</th>
                                    {/* Deductions Columns */}
                                    {deductionOptions.filter(d => selectedDeductions.includes(d.id)).map(d => (
                                        <th key={d.id} style={{ textAlign: 'right' }}>{d.label.split(' ')[0]}</th>
                                    ))}
                                    <th style={{ textAlign: 'right' }}>Net Pay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((item, index) => (
                                    <tr key={item.employee_id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{item.employee_name}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#666' }}>₱{item.daily_rate}/day</div>
                                        </td>
                                        <td>{item.branch || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={item.days_present}
                                                    onChange={(e) => handleUpdateItem(index, 'days_present', e.target.value)}
                                                    className="form-input"
                                                    style={{
                                                        width: '60px',
                                                        textAlign: 'center',
                                                        padding: '0.4rem',
                                                        borderRadius: '8px',
                                                        fontWeight: '600',
                                                        border: '2px solid #e5e7eb'
                                                    }}
                                                    placeholder="15"
                                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>₱{item.gross_pay?.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>₱{item.allowances?.toLocaleString()}</td>
                                        {deductionOptions.filter(d => selectedDeductions.includes(d.id)).map(d => (
                                            <td key={d.id} style={{ textAlign: 'right' }}>
                                                {item.deduction_details?.[d.id] ? `₱${item.deduction_details[d.id].toLocaleString()}` : '-'}
                                            </td>
                                        ))}
                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₱{item.net_pay?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="card-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button onClick={() => handleSave('Draft')} disabled={saving} className="btn btn-secondary">{saving ? 'Saving...' : 'Save Draft'}</button>
                        <button onClick={() => handleSave('Finalized')} disabled={saving} className="btn btn-success">{saving ? 'Saving...' : 'Finalize Run'}</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* Toggle Switch */
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 28px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider {
                    background-color: #15803d; /* Green */
                }
                input:checked + .slider:before {
                    transform: translateX(22px);
                }
                .slider.round {
                    border-radius: 34px;
                }
                .slider.round:before {
                    border-radius: 50%;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DashboardLayout>
    );
}

