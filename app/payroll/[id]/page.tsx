'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function PayrollDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [run, setRun] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeSlip, setActiveSlip] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
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
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    useEffect(() => {
        if (params.id) {
            fetchRunDetails();
        }
    }, [params.id]);

    const fetchRunDetails = async () => {
        try {
            const response = await fetch(`/api/payroll/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setRun(data);
            } else {
                alert('Failed to fetch payroll details');
                router.push('/payroll');
            }
        } catch (error) {
            console.error('Error fetching payroll details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (targetStatus: string) => {
        const action = targetStatus === 'Finalized' ? 'finalize' : 'approve';
        if (!confirm(`Are you sure you want to ${action} this payroll?`)) return;

        const approvalData: any = { status: targetStatus };
        if (targetStatus === 'Pending EVP') {
            approvalData.manager_approved_by = user.id;
            approvalData.manager_approved_at = new Date().toISOString();
        } else if (targetStatus === 'Finalized') {
            approvalData.evp_approved_by = user.id;
            approvalData.evp_approved_at = new Date().toISOString();
        }

        try {
            const response = await fetch(`/api/payroll/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(approvalData)
            });

            if (response.ok) {
                fetchRunDetails();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Approval error:', error);
        }
    };

    const exportPDF = () => {
        if (!run) return;
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFillColor(33, 150, 243);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('PAYROLL REGISTER', 14, 25);

        doc.setFontSize(10);
        doc.text(`Period: ${format(new Date(run.period_start), 'MMM dd, yyyy')} - ${format(new Date(run.period_end), 'MMM dd, yyyy')}`, 14, 33);
        doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth - 60, 33);

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
            run.payslips.some((s: any) => (s.deduction_details?.[d.key] || 0) > 0)
        );

        const tableHead = [
            'Employee',
            'Days',
            'Gross Pay',
            'Allowances',
            ...activeDeductions.map(d => d.label),
            'Total Ded.',
            'Net Pay'
        ];

        const tableBody = run.payslips.map((slip: any) => [
            slip.employee_name,
            slip.days_present,
            slip.gross_pay.toLocaleString(),
            (slip.total_allowances || 0).toLocaleString(),
            ...activeDeductions.map(d => (slip.deduction_details?.[d.key] || 0).toLocaleString()),
            slip.total_deductions.toLocaleString(),
            slip.net_pay.toLocaleString()
        ]);

        autoTable(doc, {
            head: [tableHead],
            body: tableBody,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [33, 150, 243] },
            styles: { fontSize: 8 },
            foot: [[
                'TOTALS',
                '',
                run.payslips.reduce((sum: number, s: any) => sum + s.gross_pay, 0).toLocaleString(),
                run.payslips.reduce((sum: number, s: any) => sum + s.total_allowances, 0).toLocaleString(),
                ...activeDeductions.map(d => run.payslips.reduce((sum: number, s: any) => sum + (s.deduction_details?.[d.key] || 0), 0).toLocaleString()),
                run.payslips.reduce((sum: number, s: any) => sum + s.total_deductions, 0).toLocaleString(),
                run.total_amount.toLocaleString()
            ]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        doc.save(`Payroll_${format(new Date(run.period_end), 'yyyy-MM-dd')}.pdf`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Finalized': return 'badge-success';
            case 'Pending EVP': return 'badge-info';
            case 'Pending Manager': return 'badge-warning';
            default: return 'badge-secondary';
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading payroll details...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!run) return null;

    return (
        <DashboardLayout>
            <div className="card mb-3 no-print">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title">
                            <span>📋</span>
                            Payroll Run Details
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    document.body.classList.add('printing-payslips');
                                    document.body.classList.remove('printing-register');
                                    window.print();
                                    document.body.classList.remove('printing-payslips');
                                }}
                                className="btn btn-secondary btn-sm"
                            >
                                🖨️ Print Payslips
                            </button>
                            <button
                                onClick={() => {
                                    document.body.classList.add('printing-register');
                                    document.body.classList.remove('printing-payslips');
                                    window.print();
                                    document.body.classList.remove('printing-register');
                                }}
                                className="btn btn-secondary btn-sm"
                            >
                                📋 Print Payroll Register
                            </button>
                            {run.status === 'Draft' && (user?.role === 'Admin' || user?.role === 'HR') && (
                                <button
                                    onClick={() => handleApproval('Pending Manager')}
                                    className="btn btn-warning btn-sm"
                                >
                                    📩 Submit for Approval
                                </button>
                            )}
                            {run.status === 'Pending Manager' && (user?.role === 'Admin' || user?.role === 'Manager') && (
                                <button
                                    onClick={() => handleApproval('Pending EVP')}
                                    className="btn btn-info btn-sm"
                                >
                                    ✅ Manager Approve
                                </button>
                            )}
                            {run.status === 'Pending EVP' && (user?.role === 'Admin' || user?.role === 'President' || user?.role === 'Vice President') && (
                                <button
                                    onClick={() => handleApproval('Finalized')}
                                    className="btn btn-success btn-sm"
                                >
                                    💎 EVP Finalize
                                </button>
                            )}
                            {(run.status === 'Draft' || run.status === 'Pending Manager') && (user?.role === 'Admin' || user?.role === 'HR') && (
                                <Link href={`/payroll/${params.id}/edit`} className="btn btn-primary btn-sm">
                                    ✏️ Edit Run
                                </Link>
                            )}
                            <button
                                onClick={() => exportPDF()}
                                className="btn btn-primary btn-sm"
                                style={{ backgroundColor: '#2563eb' }}
                            >
                                📥 Export PDF Report
                            </button>
                            <Link href="/payroll" className="btn btn-secondary btn-sm">
                                ← Back to List
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="card-body no-print">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Period</label>
                            <span style={{ fontWeight: 600 }}>
                                {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                            </span>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Status</label>
                            <span className={`badge ${getStatusBadge(run.status)}`}>
                                {run.status}
                            </span>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total Payout</label>
                            <span style={{ fontWeight: 700, color: 'var(--primary-600)', fontSize: '1.25rem' }}>
                                ₱{run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Container (Hidden on screen) */}
            <div className="payslip-print-container">
                {run.payslips.map((slip: any) => (
                    <div key={slip.id} className="payslip-page">
                        <div className="payslip-header">
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Melann Lending Investor Corporation</h2>
                            <p style={{ fontSize: '1rem', fontWeight: 600 }}>PAYSLIP</p>
                            <p style={{ fontSize: '0.875rem' }}>
                                Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: '#666' }}>Employee Name</p>
                                    <p style={{ fontWeight: 700 }}>{slip.employee_name}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: '#666' }}>Position</p>
                                    <p style={{ fontWeight: 600 }}>{slip.position}</p>
                                </div>
                            </div>
                        </div>

                        <div className="payslip-grid">
                            <div>
                                <h3 className="payslip-section-title">EARNINGS</h3>
                                <div className="payslip-row">
                                    <span>Basic Pay ({slip.days_present} days)</span>
                                    <span>₱{slip.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {slip.double_pay_amount > 0 && (
                                    <div className="payslip-row">
                                        <span>Holiday/Double Pay</span>
                                        <span>₱{slip.double_pay_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="payslip-row">
                                    <span>Allowances</span>
                                    <span>₱{(slip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="payslip-total" style={{ borderTop: '1px solid #ddd', marginTop: '0.5rem' }}>
                                    <span>GROSS INCOME</span>
                                    <span>₱{(slip.gross_pay + (slip.double_pay_amount || 0) + (slip.total_allowances || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="payslip-section-title">DEDUCTIONS</h3>
                                {Object.entries(slip.deduction_details || {}).map(([key, val]: [string, any]) => {
                                    if (key.includes('_balance')) return null;
                                    const balanceKey = `${key}_balance`;
                                    const hasBalance = slip.deduction_details[balanceKey] !== undefined;

                                    return (
                                        <div key={key} className="payslip-row">
                                            <span>
                                                <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                                                {hasBalance && (
                                                    <span style={{ fontSize: '0.6rem', color: key === 'company_loan' ? '#dc2626' : '#666', display: 'block', fontStyle: 'italic', marginTop: '1px', fontWeight: key === 'company_loan' ? 700 : 400 }}>
                                                        Bal: ₱{slip.deduction_details[balanceKey].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </span>
                                            <span>₱{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                                <div className="payslip-total" style={{ borderTop: '1px solid #ddd', marginTop: '0.5rem' }}>
                                    <span>TOTAL DEDUCTIONS</span>
                                    <span>₱{slip.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="payslip-total" style={{ marginTop: '2rem', fontSize: '1.25rem', padding: '1rem', background: '#f9f9f9' }}>
                            <span>NET PAY</span>
                            <span style={{ color: 'var(--primary-700)' }}>₱{slip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="signature-section" style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
                            <div style={{ borderTop: '1.5px solid #333', textAlign: 'center', paddingTop: '4px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>{slip.employee_name}</div>
                                <p style={{ fontSize: '0.65rem', marginTop: '2px' }}>Employee Signature</p>
                            </div>
                            <div style={{ borderTop: '1.5px solid #333', textAlign: 'center', paddingTop: '4px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>MARILYN RELOBA</div>
                                <p style={{ fontSize: '0.65rem', marginTop: '2px' }}>Branch Manager</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card no-print">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Payslips</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => scrollTable('left')}
                                className="scroll-btn"
                                title="Scroll Left"
                            >
                                ⬅️ Scroll Left
                            </button>
                            <button
                                onClick={() => scrollTable('right')}
                                className="scroll-btn"
                                title="Scroll Right"
                            >
                                Scroll Right ➡️
                            </button>
                        </div>
                    </div>
                </div>
                <div
                    ref={tableContainerRef}
                    className="table-container-responsive"
                    style={{ scrollBehavior: 'smooth' }}
                >
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
                            run.payslips.some((s: any) => (s.deduction_details?.[d.key] || 0) > 0)
                        );

                        return (
                            <table className="table table-condensed">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th style={{ textAlign: 'center' }}>Days</th>
                                        <th style={{ textAlign: 'right' }}>Gross</th>
                                        <th style={{ textAlign: 'right' }}>Allow.</th>
                                        {activeDeductions.map(d => (
                                            <th key={d.key} style={{ textAlign: 'right' }}>{d.label}</th>
                                        ))}
                                        <th style={{ textAlign: 'right' }}>Tot. Ded.</th>
                                        <th style={{ textAlign: 'right' }}>Net Pay</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {run.payslips.map((slip: any) => (
                                        <tr key={slip.id}>
                                            <td style={{ minWidth: '150px' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{slip.employee_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {slip.position}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                                    {slip.days_present} Days
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                                ₱{slip.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                {slip.double_pay_amount > 0 && (
                                                    <div style={{ fontSize: '0.70rem', color: 'var(--success-600)' }}>
                                                        +₱{slip.double_pay_amount.toLocaleString()} (Holiday)
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                                ₱{slip.total_allowances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            {activeDeductions.map(d => (
                                                <td key={d.key} style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                    {(slip.deduction_details?.[d.key] || 0) > 0
                                                        ? `₱${slip.deduction_details[d.key].toLocaleString()}`
                                                        : <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                    }
                                                </td>
                                            ))}
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ color: 'var(--danger-600)', fontWeight: 600, fontFamily: 'monospace' }}>
                                                    -₱{slip.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: 'var(--primary-700)', fontFamily: 'monospace' }}>
                                                ₱{slip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setActiveSlip(slip)}
                                                    className="btn btn-sm btn-outline"
                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                                >
                                                    👁️ View Slip
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--gray-50)', fontWeight: 700 }}>
                                        <td colSpan={2} style={{ textAlign: 'right', padding: '0.5rem' }}>TOTALS:</td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace' }}>
                                            {run.payslips.reduce((sum: number, s: any) => sum + (s.gross_pay + (s.double_pay_amount || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace' }}>
                                            {run.payslips.reduce((sum: number, s: any) => sum + s.total_allowances, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        {activeDeductions.map(d => (
                                            <td key={d.key} style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {run.payslips.reduce((sum: number, s: any) => sum + (s.deduction_details?.[d.key] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        ))}
                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontFamily: 'monospace', color: 'var(--danger-600)' }}>
                                            {run.payslips.reduce((sum: number, s: any) => sum + s.total_deductions, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1rem', color: 'var(--primary-700)', fontFamily: 'monospace' }}>
                                            ₱{run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        );
                    })()}
                </div>
            </div>

            {/* View Slip Modal Overlay */}
            {activeSlip && (
                <div
                    className="no-print"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setActiveSlip(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            padding: '40px',
                            borderRadius: '12px',
                            width: '100%',
                            maxWidth: '700px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setActiveSlip(null)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                border: 'none',
                                background: '#eee',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                color: '#666'
                            }}
                        >
                            ×
                        </button>

                        {/* High Fidelity Slip Preview */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-800)', margin: 0 }}>Melann Lending Investor Corporation</h2>
                            <p style={{ margin: '5px 0', fontWeight: 600, letterSpacing: '2px', color: '#444' }}>PAYSLIP</p>
                            <p style={{ fontSize: '0.85rem', color: '#666' }}>Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}</p>
                        </div>

                        <div style={{ borderTop: '2px solid #333', borderBottom: '1px solid #eee', padding: '15px 0', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: '#777', margin: 0 }}>Employee Name</p>
                                <p style={{ fontWeight: 800, fontSize: '1rem', margin: '2px 0 0', textTransform: 'uppercase' }}>{activeSlip.employee_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.7rem', color: '#777', margin: 0 }}>Position</p>
                                <p style={{ fontWeight: 800, fontSize: '1rem', margin: '2px 0 0', textTransform: 'uppercase' }}>{activeSlip.position}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-700)', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>EARNINGS</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                    <span>Basic Pay ({activeSlip.days_present} days)</span>
                                    <span style={{ fontWeight: 600 }}>₱{activeSlip.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {activeSlip.double_pay_amount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <span>Holiday Amount</span>
                                        <span style={{ fontWeight: 600 }}>₱{activeSlip.double_pay_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                                    <span>Allowances</span>
                                    <span style={{ fontWeight: 600 }}>₱{(activeSlip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {activeSlip.midyear_bonus > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <span>Midyear Bonus</span>
                                        <span style={{ fontWeight: 600 }}>₱{activeSlip.midyear_bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {activeSlip.thirteenth_month > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <span>13th Month Pay</span>
                                        <span style={{ fontWeight: 600 }}>₱{activeSlip.thirteenth_month.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                                    <span>GROSS INCOME</span>
                                    <span>₱{(activeSlip.gross_pay + (activeSlip.double_pay_amount || 0) + (activeSlip.total_allowances || 0) + (activeSlip.midyear_bonus || 0) + (activeSlip.thirteenth_month || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger-700)', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>DEDUCTIONS</h3>
                                {Object.entries(activeSlip.deduction_details || {}).map(([key, val]: [string, any]) => {
                                    if (key.includes('_balance')) return null;
                                    const balanceKey = `${key}_balance`;
                                    const hasBalance = activeSlip.deduction_details[balanceKey] !== undefined;

                                    return (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                            <span style={{ textTransform: 'capitalize' }}>
                                                {key.replace(/_/g, ' ')}
                                                {hasBalance && (
                                                    <span style={{ display: 'block', fontSize: '0.65rem', color: key === 'company_loan' ? '#dc2626' : '#888', fontStyle: 'italic', fontWeight: key === 'company_loan' ? 700 : 400 }}>
                                                        Bal: ₱{activeSlip.deduction_details[balanceKey].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </span>
                                            <span style={{ fontWeight: 600 }}>₱{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                                <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--danger-700)' }}>
                                    <span>TOTAL DEDUCTIONS</span>
                                    <span>-₱{activeSlip.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f5f5f5', padding: '15px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>NET PAY</span>
                            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary-700)' }}>₱{activeSlip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '40px' }}>
                            <div style={{ borderTop: '1.5px solid #333', textAlign: 'center', paddingTop: '8px' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, textTransform: 'uppercase' }}>{activeSlip.employee_name}</p>
                                <p style={{ fontSize: '0.7rem', color: '#666', margin: '2px 0 0' }}>Employee Signature</p>
                            </div>
                            <div style={{ borderTop: '1.5px solid #333', textAlign: 'center', paddingTop: '8px' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, textTransform: 'uppercase' }}>MARILYN RELOBA</p>
                                <p style={{ fontSize: '0.7rem', color: '#666', margin: '2px 0 0' }}>Branch Manager</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }} className="no-print">
                            <button
                                onClick={() => setActiveSlip(null)}
                                className="btn btn-secondary"
                                style={{ padding: '10px 30px' }}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    document.body.classList.add('printing-payslips');
                                    document.body.classList.add('printing-single');
                                    window.print();
                                    // Remove classes after a small delay to allow print dialog to capture state
                                    setTimeout(() => {
                                        document.body.classList.remove('printing-payslips');
                                        document.body.classList.remove('printing-single');
                                    }, 100);
                                }}
                                className="btn btn-outline"
                                style={{ padding: '10px 30px', borderColor: 'var(--primary-600)', color: 'var(--primary-600)' }}
                            >
                                🖨️ Print This Slip
                            </button>
                            <button
                                onClick={() => {
                                    document.body.classList.add('printing-payslips');
                                    window.print();
                                    setTimeout(() => {
                                        document.body.classList.remove('printing-payslips');
                                    }, 100);
                                }}
                                className="btn btn-primary"
                                style={{ padding: '10px 30px' }}
                            >
                                🖨️ Print All Slips
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payroll Register Report (Hidden on screen) */}
            <div className="payroll-register-print-container">
                <div className="payroll-register-page">
                    <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '3px solid #333', paddingBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>Melann Lending Investor Corporation</h2>
                        <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>PAYROLL REGISTER / ACKNOWLEDGMENT RECEIPT</p>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>
                            Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                        </p>
                    </div>

                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #333',
                        fontSize: '0.55rem'
                    }}>
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

                            const visibleDeductions = deductionConfigs.filter(d =>
                                run.payslips.some((s: any) => (s.deduction_details?.[d.key] || 0) > 0)
                            );

                            return (
                                <>
                                    <thead>
                                        <tr style={{ background: '#f5f5f5' }}>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'center', width: '20px' }} rowSpan={2}>No.</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'left', minWidth: '80px' }} rowSpan={2}>Employee Name</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '35px' }} rowSpan={2}>Daily Rate</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'center', width: '25px' }} rowSpan={2}>Days</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '45px' }} rowSpan={2}>Reg. Pay</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '45px' }} rowSpan={2}>Holiday</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '45px' }} rowSpan={2}>Allow.</th>

                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '50px', background: '#eee', fontWeight: 700 }} rowSpan={2}>Income</th>
                                            {visibleDeductions.length > 0 && (
                                                <th style={{ border: '1px solid #333', padding: '2px', textAlign: 'center' }} colSpan={visibleDeductions.length}>Deductions</th>
                                            )}
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '45px', background: '#eee', fontWeight: 700 }} rowSpan={2}>Tot. Ded.</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '55px', fontWeight: 800, background: '#e0e0e0' }} rowSpan={2}>Net Pay</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'center', width: '80px' }} rowSpan={2}>Signature</th>
                                        </tr>
                                        {visibleDeductions.length > 0 && (
                                            <tr style={{ background: '#f5f5f5' }}>
                                                {visibleDeductions.map(d => (
                                                    <th key={d.key} style={{ border: '1px solid #333', padding: '2px', minWidth: '35px' }}>{d.label}</th>
                                                ))}
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {run.payslips.map((slip: any, idx: number) => {
                                            const totalIncome = slip.gross_pay + (slip.double_pay_amount || 0) + (slip.total_allowances || 0);
                                            const d = slip.deduction_details || {};
                                            return (
                                                <tr key={slip.id}>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'center' }}>{idx + 1}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px' }}>
                                                        <div style={{ fontWeight: 700 }}>{slip.employee_name}</div>
                                                        <div style={{ fontSize: '0.45rem', color: '#666' }}>{slip.position}</div>
                                                    </td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{slip.daily_rate?.toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'center' }}>{slip.days_present}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{slip.gross_pay.toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{(slip.double_pay_amount || 0).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{(slip.total_allowances || 0).toLocaleString()}</td>

                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', background: '#f9f9f9', fontWeight: 600 }}>{totalIncome.toLocaleString()}</td>

                                                    {visibleDeductions.map(vd => (
                                                        <td key={vd.key} style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>
                                                            {d[vd.key] > 0 ? d[vd.key].toLocaleString() : ''}
                                                        </td>
                                                    ))}

                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', color: '#c00', fontWeight: 600 }}>{slip.total_deductions.toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', fontWeight: 800, background: '#f0f0f0' }}>{slip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td style={{ border: '1px solid #333', padding: '2px', verticalAlign: 'bottom', textAlign: 'center', minWidth: '100px' }}>
                                                        <div style={{ borderBottom: '1px solid #333', width: '100%', marginBottom: '2px', marginTop: '12px' }}></div>
                                                        <div style={{ fontSize: '0.45rem', fontWeight: 700, textTransform: 'uppercase' }}>{slip.employee_name}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ fontWeight: 700, background: '#e8e8e8' }}>
                                            <td colSpan={4} style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right' }}>TOTALS:</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{run.payslips.reduce((sum: number, s: any) => sum + s.gross_pay, 0).toLocaleString()}</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{run.payslips.reduce((sum: number, s: any) => sum + (s.double_pay_amount || 0), 0).toLocaleString()}</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>{run.payslips.reduce((sum: number, s: any) => sum + (s.total_allowances || 0), 0).toLocaleString()}</td>

                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', background: '#ddd' }}>
                                                {run.payslips.reduce((sum: number, s: any) => sum + (s.gross_pay + (s.double_pay_amount || 0) + (s.total_allowances || 0)), 0).toLocaleString()}
                                            </td>

                                            {visibleDeductions.map(vd => (
                                                <td key={vd.key} style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>
                                                    {run.payslips.reduce((sum: number, s: any) => sum + (s.deduction_details?.[vd.key] || 0), 0).toLocaleString()}
                                                </td>
                                            ))}

                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', color: '#c00' }}>{run.payslips.reduce((sum: number, s: any) => sum + s.total_deductions, 0).toLocaleString()}</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', fontSize: '0.65rem', background: '#ccc' }}>₱{run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ border: '1px solid #333' }}></td>
                                        </tr>
                                    </tfoot>
                                </>
                            );
                        })()}
                    </table>

                    <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                        <div>
                            <p style={{ fontSize: '0.8rem', marginBottom: '2.5rem', fontWeight: 600 }}>Prepared By:</p>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>MARILYN RELOBA</div>
                            <div style={{ borderBottom: '1.5px solid #333', width: '200px', marginBottom: '0.25rem' }}></div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Branch Manager</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', marginBottom: '2.5rem', fontWeight: 600 }}>Reviewed By:</p>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>VICTORIO RELOBA JR.</div>
                            <div style={{ borderBottom: '1.5px solid #333', width: '200px', marginBottom: '0.25rem' }}></div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Operations Manager</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', marginBottom: '2.5rem', fontWeight: 600 }}>Approved By:</p>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>ANNA LIZA RODRIGUEZ</div>
                            <div style={{ borderBottom: '1.5px solid #333', width: '200px', marginBottom: '0.25rem' }}></div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Executive Vice President</p>
                        </div>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media screen {
                    .payslip-print-container, .payroll-register-print-container, .single-payslip-print-container {
                        display: none;
                    }
                    /* Compact Table for Details */
                    .table-condensed th, .table-condensed td {
                        padding: 0.5rem 0.75rem !important;
                        font-size: 0.85rem;
                        border: 1px solid #edf2f7;
                        white-space: nowrap;
                    }
                    .table-condensed th {
                        background: #f7fafc;
                        font-weight: 700;
                        color: #4a5568;
                    }
                    .table-condensed {
                        width: 100%;
                        border-collapse: collapse;
                        min-width: 1200px; /* Force a minimum width to ensure scrolling */
                    }
                    .table-container-responsive {
                        overflow-x: auto;
                        width: 100%;
                        display: block;
                        -webkit-overflow-scrolling: touch;
                        border: 1px solid #edf2f7;
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    }
                    .scroll-btn {
                        background: #3b82f6;
                        color: white !important;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        transition: all 0.2s;
                    }
                    .scroll-btn:hover {
                        background: #2563eb;
                        transform: translateY(-1px);
                    }
                }
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    
                    /* Reset everything */
                    .payslip-print-container, .payroll-register-print-container, .single-payslip-print-container {
                        display: none !important;
                    }

                    /* When printing register, use landscape and long paper */
                    body.printing-register {
                        width: 100%;
                    }
                    body.printing-register @page {
                        size: 13in 8.5in; /* Long Bond Paper Landscape */
                        margin: 0.5cm;
                    }
                    body.printing-register .payroll-register-print-container {
                        display: block !important;
                    }

                    /* When printing payslips, use portrait long paper and fit 3 per page */
                    body.printing-payslips @page {
                        size: 8.5in 13in; /* Long Bond Paper Portrait */
                        margin: 0.5cm;
                    }
                    body.printing-payslips .payslip-print-container {
                        display: block !important;
                    }

                    body.printing-single .payslip-print-container {
                        display: none !important;
                    }
                    body.printing-single .single-payslip-print-container {
                        display: block !important;
                    }

                    body.printing-payslips .payslip-page, 
                    body.printing-single .payslip-page {
                        height: 32%; /* Optimized for 13 inch length */
                        min-height: 10cm;
                        border-bottom: 1px dashed #000;
                        padding: 0.4cm 0.5cm;
                        margin-bottom: 0px;
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                        position: relative;
                    }
                    body.printing-single .payslip-page {
                        border-bottom: none;
                    }
                    body.printing-payslips .payslip-page:nth-child(3n) {
                        page-break-after: always;
                        border-bottom: none;
                    }
                    
                    /* Adjust internal spacing to fit better */
                    body.printing-payslips .payslip-header {
                        margin-bottom: 0.25rem !important;
                    }
                    body.printing-payslips .payslip-header h2 {
                        font-size: 1.3rem !important;
                        margin-bottom: 2px !important;
                    }
                    body.printing-payslips .payslip-header p {
                        font-size: 0.85rem !important;
                        margin-bottom: 2px !important;
                    }
                    body.printing-payslips .payslip-section-title {
                        font-size: 0.8rem !important;
                        margin: 2px 0 !important;
                    }
                    body.printing-payslips .payslip-row {
                        font-size: 0.8rem !important;
                        padding: 1px 0 !important;
                    }
                    body.printing-payslips .payslip-total {
                        font-size: 0.85rem !important;
                        padding: 2px 4px !important;
                        margin-top: 2px !important;
                    }
                    body.printing-payslips .signature-section {
                        margin-top: 0.75rem !important;
                    }
                    /* Hide Dashboard UI during print */
                    .sidebar, .topbar, .dashboard-content-header {
                        display: none !important;
                    }
                }
            `}} />

            {/* Hidden Single Payslip Print Container */}
            {activeSlip && (
                <div className="single-payslip-print-container">
                    <div className="payslip-page">
                        <div className="payslip-header" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Melann Lending Investor Corporation</h2>
                            <p style={{ margin: '2px 0', fontWeight: 600 }}>PAYSLIP</p>
                            <p style={{ fontSize: '0.875rem', color: '#666' }}>
                                Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                            </p>
                        </div>

                        <div style={{ borderTop: '2px solid #333', borderBottom: '1px solid #777', padding: '0.5rem 0', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>Employee Name</p>
                                <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>{activeSlip.employee_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>Position</p>
                                <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>{activeSlip.position}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1 }}>
                            <div>
                                <h3 className="payslip-section-title">EARNINGS</h3>
                                <div className="payslip-row">
                                    <span>Basic Pay ({activeSlip.days_present} days)</span>
                                    <span>₱{activeSlip.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {activeSlip.double_pay_amount > 0 && (
                                    <div className="payslip-row">
                                        <span>Holiday Amount</span>
                                        <span>₱{activeSlip.double_pay_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="payslip-row">
                                    <span>Allowances</span>
                                    <span>₱{(activeSlip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="payslip-total" style={{ borderTop: '1px solid #ddd', marginTop: '0.5rem' }}>
                                    <span>GROSS INCOME</span>
                                    <span>₱{(activeSlip.gross_pay + (activeSlip.double_pay_amount || 0) + (activeSlip.total_allowances || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="payslip-section-title">DEDUCTIONS</h3>
                                {Object.entries(activeSlip.deduction_details || {}).map(([key, val]: [string, any]) => {
                                    if (key.includes('_balance')) return null;
                                    const balanceKey = `${key}_balance`;
                                    const hasBalance = activeSlip.deduction_details[balanceKey] !== undefined;

                                    return (
                                        <div key={key} className="payslip-row">
                                            <span>
                                                <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                                                {hasBalance && (
                                                    <span style={{ fontSize: '0.6rem', color: key === 'company_loan' ? '#dc2626' : '#666', display: 'block', fontStyle: 'italic', marginTop: '1px', fontWeight: key === 'company_loan' ? 700 : 400 }}>
                                                        Bal: ₱{activeSlip.deduction_details[balanceKey].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </span>
                                            <span>₱{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                                <div className="payslip-total" style={{ borderTop: '1px solid #ddd', marginTop: '0.5rem' }}>
                                    <span>TOTAL DEDUCTIONS</span>
                                    <span>₱{activeSlip.total_deductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f5f5f5', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>NET PAY</span>
                            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary-700)' }}>₱{activeSlip.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="signature-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                            <div style={{ borderTop: '1px solid #333', textAlign: 'center', paddingTop: '0.25rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.75rem', margin: 0, textTransform: 'uppercase' }}>{activeSlip.employee_name}</p>
                                <p style={{ fontSize: '0.65rem', marginTop: '2px' }}>Employee Signature</p>
                            </div>
                            <div style={{ borderTop: '1px solid #333', textAlign: 'center', paddingTop: '0.25rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.75rem', margin: 0, textTransform: 'uppercase' }}>MARILYN RELOBA</p>
                                <p style={{ fontSize: '0.65rem', marginTop: '2px' }}>Branch Manager</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
