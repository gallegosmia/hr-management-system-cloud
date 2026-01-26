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
        // Legal Landscape (355.6mm x 215.9mm) - Optimized for All Columns
        const doc = new jsPDF('l', 'mm', 'legal');
        const pageWidth = 355.6;
        const pageHeight = 215.9;

        // --- COMPACT HEADER ---
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('Melann Lending Investor Corporation', pageWidth / 2, 15, { align: 'center' });

        doc.setFontSize(13);
        doc.text('PAYROLL REGISTER / ACKNOWLEDGMENT RECEIPT', pageWidth / 2, 23, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(`Period: ${format(new Date(run.period_start), 'MMMM dd, yyyy')} - ${format(new Date(run.period_end), 'MMMM dd, yyyy')}`, pageWidth / 2, 30, { align: 'center' });

        doc.setLineWidth(0.5);
        doc.line(10, 35, pageWidth - 10, 35);

        // --- TABLE ---
        const potentialDeductions = [
            { id: 'sss', label: 'SSS' },
            { id: 'philhealth', label: 'PHIC' },
            { id: 'pagibig', label: 'Pag-ibig' },
            { id: 'company_cash_fund', label: 'Cash Fund' },
            { id: 'sss_loan', label: 'SSS Loan' },
            { id: 'pagibig_loan', label: 'P-ibig Loan' },
            { id: 'cash_advance', label: 'C.A.' },
            { id: 'company_loan', label: 'Co. Loan' },
            { id: 'other_deductions', label: 'Others' }
        ];

        const activeDeductions = potentialDeductions.filter(pd =>
            run.payslips.some((s: any) => Number(s.deduction_details?.[pd.id] || 0) > 0)
        );

        const deductionHeaderCols = activeDeductions.map(d => ({ content: d.label, styles: { halign: 'right' as const } }));
        deductionHeaderCols.push({ content: 'TOTAL', styles: { halign: 'right' as const } });

        const tableHead: any[] = [
            [
                { content: 'No.', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
                { content: 'Employee Name', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
                { content: 'Rate', rowSpan: 2, styles: { halign: 'right' as const, valign: 'middle' as const } },
                { content: 'Days', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
                { content: 'Reg.Pay', rowSpan: 2, styles: { halign: 'right' as const, valign: 'middle' as const } },
                { content: 'Holiday', colSpan: 2, styles: { halign: 'center' as const } },
                { content: 'Allowance', colSpan: 3, styles: { halign: 'center' as const } },
                { content: 'GROSS', rowSpan: 2, styles: { halign: 'right' as const, valign: 'middle' as const } },
                { content: 'DEDUCTIONS', colSpan: activeDeductions.length + 1, styles: { halign: 'center' as const } },
                { content: 'NET PAY', rowSpan: 2, styles: { halign: 'right' as const, valign: 'middle' as const } },
                { content: 'Signature', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } }
            ],
            [
                { content: 'Days', styles: { halign: 'center' as const } },
                { content: 'Amount', styles: { halign: 'right' as const } },
                { content: 'Regular', styles: { halign: 'right' as const } },
                { content: 'Special', styles: { halign: 'right' as const } },
                { content: 'Total', styles: { halign: 'right' as const } },
                ...deductionHeaderCols
            ]
        ];

        const tableBody = run.payslips.map((slip: any, idx: number) => {
            const regPay = Number(slip.gross_pay || 0);
            const holAmt = Number(slip.double_pay_amount || 0);
            const holDays = Number(slip.double_pay_days || 0);
            const totalAllow = Number(slip.total_allowances || 0);
            const regAllow = Math.min(totalAllow, 500);
            const specAllow = Math.max(0, totalAllow - 500);
            const totalIncome = regPay + holAmt + totalAllow;
            const d = slip.deduction_details || {};

            const row: any[] = [
                idx + 1,
                slip.employee_name,
                Number(slip.daily_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                Number(slip.days_present || 0).toFixed(1),
                regPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                holDays > 0 ? holDays.toFixed(1) : '',
                holAmt > 0 ? holAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                regAllow > 0 ? regAllow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                specAllow > 0 ? specAllow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                totalAllow > 0 ? totalAllow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];

            activeDeductions.forEach(ad => {
                row.push(Number(d[ad.id] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            });

            row.push(Number(slip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            row.push(Number(slip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            row.push('');

            return row;
        });

        const grandTotals: any[] = [
            '',
            { content: 'GRAND TOTALS', styles: { fontStyle: 'bold' as const } },
            '',
            '',
            run.payslips.reduce((sum: number, s: any) => sum + Number(s.gross_pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            '',
            run.payslips.reduce((sum: number, s: any) => sum + Number(s.double_pay_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            run.payslips.reduce((sum: number, s: any) => sum + Math.min(Number(s.total_allowances || 0), 500), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            run.payslips.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.total_allowances || 0) - 500), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            run.payslips.reduce((sum: number, s: any) => sum + Number(s.total_allowances || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            run.payslips.reduce((sum: number, s: any) => sum + (Number(s.gross_pay || 0) + Number(s.double_pay_amount || 0) + Number(s.total_allowances || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ];

        activeDeductions.forEach(ad => {
            grandTotals.push(run.payslips.reduce((sum: number, s: any) => sum + Number(s.deduction_details?.[ad.id] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        });

        grandTotals.push(run.payslips.reduce((sum: number, s: any) => sum + Number(s.total_deductions || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        grandTotals.push(run.payslips.reduce((sum: number, s: any) => sum + Number(s.net_pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        grandTotals.push('');

        const columnStyles: any = {
            0: { halign: 'center' as const, cellWidth: 10 },
            1: { fontStyle: 'bold' as const, cellWidth: 'auto' },
            2: { halign: 'right' as const },
            3: { halign: 'center' as const },
            4: { halign: 'right' as const },
            5: { halign: 'center' as const },
            6: { halign: 'right' as const },
            7: { halign: 'right' as const },
            8: { halign: 'right' as const },
            9: { halign: 'right' as const },
            10: { halign: 'right', fontStyle: 'bold' as const }
        };

        let currentIdx = 11;
        activeDeductions.forEach(() => {
            columnStyles[currentIdx] = { halign: 'right' as const };
            currentIdx++;
        });

        columnStyles[currentIdx] = { halign: 'right' as const, fontStyle: 'bold' as const };
        columnStyles[currentIdx + 1] = { halign: 'right' as const, fontStyle: 'bold' as const };
        columnStyles[currentIdx + 2] = { halign: 'center' as const, cellWidth: 35 };

        autoTable(doc, {
            head: tableHead,
            body: [...tableBody, grandTotals],
            startY: 40,
            margin: { left: 8, right: 8, bottom: 40 },
            theme: 'grid',
            tableWidth: 'auto',
            styles: {
                fontSize: 7.5, // Reduced for wider fit
                cellPadding: 1.2,
                lineWidth: 0.1,
                lineColor: [0, 0, 0],
                textColor: [0, 0, 0],
                font: 'helvetica',
                valign: 'middle',
                overflow: 'visible' // Ensure numbers don't wrap
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.1,
                halign: 'center',
                fontSize: 7.5
            },
            columnStyles: {
                ...columnStyles,
                1: { fontStyle: 'bold' as const, cellWidth: 'auto', overflow: 'linebreak' } // Only Name should wrap
            },
            didDrawPage: (data: any) => {
                const isLastPage = data.pageNumber === (doc as any).internal.getNumberOfPages();
                if (isLastPage) {
                    const finalY = data.cursor?.y || 150;
                    doc.setFontSize(11);
                    // Dynamically position signatures at bottom
                    const sigY = Math.max(finalY + 20, pageHeight - 35);
                    const col1 = 30;
                    const col2 = pageWidth / 2 - 40;
                    const col3 = pageWidth - 100;

                    doc.setFont('helvetica', 'normal');
                    doc.text('Prepared By:', col1, sigY);
                    doc.text('Reviewed By:', col2, sigY);
                    doc.text('Approved By:', col3, sigY);

                    doc.setLineWidth(0.4);
                    doc.line(col1, sigY + 8, col1 + 70, sigY + 8);
                    doc.line(col2, sigY + 8, col2 + 70, sigY + 8);
                    doc.line(col3, sigY + 8, col3 + 70, sigY + 8);

                    doc.setFont('helvetica', 'bold');
                    doc.text('MARILYN RELOBA', col1, sigY + 15);
                    doc.text('VICTORIO RELOBA JR.', col2, sigY + 15);
                    doc.text('ANNA LIZA RODRIGUEZ', col3, sigY + 15);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.text('Branch Manager', col1, sigY + 21);
                    doc.text('Operations Manager', col2, sigY + 21);
                    doc.text('Executive Vice President', col3, sigY + 21);
                }
            }
        });

        doc.save(`Payroll_Register_Landscape_${format(new Date(run.period_end), 'MMM_dd_yyyy')}.pdf`);
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
                                onClick={() => exportPDF()}
                                className="btn btn-primary btn-sm"
                                style={{ backgroundColor: '#2563eb' }}
                            >
                                📥 Export PDF Report
                            </button>
                        </div>
                    </div>
                </div>
                <div className="card-body no-print">
                    <div className="summary-grid">
                        <div className="summary-item">
                            <label>Payroll Period</label>
                            <div className="value">
                                {new Date(run.period_start).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(run.period_end).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                        </div>
                        <div className="summary-item">
                            <label>Status</label>
                            <div className="value">
                                <span className={`badge ${getStatusBadge(run.status)}`}>
                                    {run.status}
                                </span>
                            </div>
                        </div>
                        <div className="summary-item">
                            <label>Total Disbursement</label>
                            <div className="value highlight">
                                ₱{run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
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
                                    <span>₱{(
                                        Number(slip.gross_pay || 0) +
                                        Number(slip.double_pay_amount || 0) +
                                        Number(slip.total_allowances || 0) +
                                        Number(slip.midyear_bonus || 0) +
                                        Number(slip.thirteenth_month || 0)
                                    ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                                {hasBalance && key !== 'sss_loan' && key !== 'pagibig_loan' && (
                                                    <span style={{ fontSize: '0.6rem', color: key === 'company_loan' ? '#dc2626' : '#666', display: 'block', fontStyle: 'italic', marginTop: '1px', fontWeight: key === 'company_loan' ? 700 : 400 }}>
                                                        Bal: ₱{Number(slip.deduction_details[balanceKey]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                        <th className="employee-col">Employee</th>
                                        <th className="days-col">Days</th>
                                        <th className="amount-col">Gross</th>
                                        <th className="amount-col">Allow.</th>
                                        {activeDeductions.map(d => (
                                            <th key={d.key} className="amount-col">{d.label}</th>
                                        ))}
                                        <th className="amount-col">Tot. Ded.</th>
                                        <th className="amount-col">Net Pay</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {run.payslips.map((slip: any) => {
                                        const totalIncome = Number(slip.gross_pay || 0) + Number(slip.double_pay_amount || 0) + Number(slip.total_allowances || 0);
                                        return (
                                            <tr key={slip.id}>
                                                <td className="employee-col">
                                                    <div
                                                        onClick={() => setActiveSlip(slip)}
                                                        style={{ fontWeight: 600, color: 'var(--primary-700)', cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        {slip.employee_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {slip.position}
                                                    </div>
                                                </td>
                                                <td className="days-col">
                                                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                                                        {slip.days_present} Days
                                                    </span>
                                                </td>
                                                <td className="amount-col">
                                                    ₱{Number(slip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    {Number(slip.double_pay_amount || 0) > 0 && (
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--success-600)' }}>
                                                            +₱{Number(slip.double_pay_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Hol)
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="amount-col">
                                                    ₱{Number(slip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                {activeDeductions.map(d => (
                                                    <td key={d.key} className="amount-col">
                                                        {(slip.deduction_details?.[d.key] || 0) > 0 ? (
                                                            <div>
                                                                <div>₱{Number(slip.deduction_details?.[d.key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                {slip.deduction_details?.[`${d.key}_balance`] !== undefined && d.key !== 'sss_loan' && d.key !== 'pagibig_loan' && (
                                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                                        Bal: ₱{Number(slip.deduction_details?.[`${d.key}_balance`] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                ))}
                                                <td className="amount-col">
                                                    <div style={{ color: 'var(--danger-600)', fontWeight: 600 }}>
                                                        -₱{Number(slip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </td>
                                                <td className="amount-col highlight-net">
                                                    ₱{Number(slip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="table-footer">
                                        <td colSpan={2} style={{ textAlign: 'right', padding: '1rem', fontWeight: 800 }}>GRAND TOTALS:</td>
                                        <td className="amount-col footer-val">
                                            ₱{run.payslips.reduce((sum: number, s: any) => sum + (Number(s.gross_pay || 0) + Number(s.double_pay_amount || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="amount-col footer-val">
                                            ₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.total_allowances || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        {activeDeductions.map(d => (
                                            <td key={d.key} className="amount-col footer-val">
                                                ₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.deduction_details?.[d.key] || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        ))}
                                        <td className="amount-col footer-val" style={{ color: 'var(--danger-700)' }}>
                                            -₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.total_deductions || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="amount-col footer-val highlight">
                                            ₱{Number(run.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        );
                    })()}
                </div>
            </div>

            {/* View Slip Modal Overlay */}
            {activeSlip && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setActiveSlip(null)} className="no-print">
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '16px',
                        maxWidth: '800px',
                        width: '100%',
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>Payslip Detail</h2>
                                <p style={{ margin: '2px 0', color: '#64748b' }}>{activeSlip.employee_name} • {activeSlip.position}</p>
                            </div>
                            <button onClick={() => setActiveSlip(null)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Earnings</h3>
                                <div className="payslip-row">
                                    <span>Basic Pay ({activeSlip.days_present} days)</span>
                                    <span>₱{Number(activeSlip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {Number(activeSlip.double_pay_amount || 0) > 0 && (
                                    <div className="payslip-row">
                                        <span>Holiday/Double Pay</span>
                                        <span>₱{Number(activeSlip.double_pay_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="payslip-row">
                                    <span>Allowances</span>
                                    <span>₱{Number(activeSlip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="payslip-total">
                                    <span>Gross Income</span>
                                    <span>₱{(Number(activeSlip.gross_pay || 0) + Number(activeSlip.double_pay_amount || 0) + Number(activeSlip.total_allowances || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>Deductions</h3>
                                {Object.entries(activeSlip.deduction_details || {}).map(([key, val]: [string, any]) => {
                                    if (key.includes('_balance')) return null;
                                    const balanceKey = `${key}_balance`;
                                    const bal = activeSlip.deduction_details[balanceKey];
                                    return (
                                        <div key={key} className="payslip-row">
                                            <span>
                                                <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                                                {bal !== undefined && key !== 'sss_loan' && key !== 'pagibig_loan' && (
                                                    <div style={{ fontSize: '0.65rem', color: key === 'company_loan' || key === 'cash_advance' ? '#dc2626' : '#94a3b8', fontStyle: 'italic', fontWeight: key === 'company_loan' ? 700 : 400 }}>
                                                        Bal: ₱{Number(bal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </span>
                                            <span>₱{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                                <div className="payslip-total">
                                    <span>Total Deductions</span>
                                    <span>₱{Number(activeSlip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0369a1' }}>NET PAY</span>
                            <span style={{ fontWeight: 800, fontSize: '1.75rem', color: 'var(--primary-700)', fontFamily: 'JetBrains Mono, monospace' }}>
                                ₱{Number(activeSlip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => {
                                    document.body.classList.add('printing-single');
                                    document.body.classList.remove('printing-payslips', 'printing-register');
                                    setTimeout(() => {
                                        window.print();
                                        document.body.classList.remove('printing-single');
                                    }, 100);
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '0.75rem', fontWeight: 700 }}
                            >
                                🖨️ Print This Payslip
                            </button>
                            <button
                                onClick={() => setActiveSlip(null)}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '0.75rem', fontWeight: 700 }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Single Payslip Print Container */}
            {activeSlip && (
                <div className="single-payslip-print-container">
                    <div className="payslip-page">
                        <div className="payslip-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>Melann Lending Investor Corporation</h2>
                            <p style={{ margin: '4px 0', fontSize: '1.125rem', fontWeight: 700 }}>PAYSLIP</p>
                            <p style={{ fontSize: '0.9rem' }}>
                                Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                            </p>
                        </div>

                        <div style={{ borderTop: '2px solid #333', borderBottom: '1px solid #333', padding: '0.75rem 0', display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Employee Name</p>
                                <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: '1.1rem' }}>{activeSlip.employee_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Position</p>
                                <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>{activeSlip.position}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
                            <div>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 10px 0', borderBottom: '1.5px solid #333', paddingBottom: '4px' }}>EARNINGS</h3>
                                <div className="payslip-row">
                                    <span>Basic Pay ({activeSlip.days_present} days)</span>
                                    <span>₱{Number(activeSlip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {Number(activeSlip.double_pay_amount || 0) > 0 && (
                                    <div className="payslip-row">
                                        <span>Holiday Pay</span>
                                        <span>₱{Number(activeSlip.double_pay_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="payslip-row">
                                    <span>Allowances</span>
                                    <span>₱{Number(activeSlip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="payslip-total">
                                    <span>GROSS INCOME</span>
                                    <span>₱{(Number(activeSlip.gross_pay || 0) + Number(activeSlip.double_pay_amount || 0) + Number(activeSlip.total_allowances || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 10px 0', borderBottom: '1.5px solid #333', paddingBottom: '4px' }}>DEDUCTIONS</h3>
                                {Object.entries(activeSlip.deduction_details || {}).map(([key, val]: [string, any]) => {
                                    if (key.includes('_balance')) return null;
                                    const balanceKey = `${key}_balance`;
                                    const hasBal = activeSlip.deduction_details[balanceKey] !== undefined;
                                    return (
                                        <div key={key} className="payslip-row">
                                            <span>
                                                <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                                                {hasBal && key !== 'sss_loan' && key !== 'pagibig_loan' && (
                                                    <span style={{ fontSize: '0.65rem', display: 'block', fontStyle: 'italic' }}>
                                                        Bal: ₱{Number(activeSlip.deduction_details[balanceKey] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </span>
                                            <span>₱{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                                <div className="payslip-total">
                                    <span>TOTAL DEDUCTIONS</span>
                                    <span>₱{Number(activeSlip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f5f5f5', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', border: '1.5px solid #333' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>NET PAY</span>
                            <span style={{ fontWeight: 800, fontSize: '1.5rem' }}>₱{Number(activeSlip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderTop: '1.5px solid #333', marginTop: '20px', paddingTop: '4px' }}>
                                    <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: '0.8rem' }}>{activeSlip.employee_name}</p>
                                    <p style={{ fontSize: '0.7rem', margin: 0 }}>Employee Signature</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderTop: '1.5px solid #333', marginTop: '20px', paddingTop: '4px' }}>
                                    <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: '0.8rem' }}>MARILYN RELOBA</p>
                                    <p style={{ fontSize: '0.7rem', margin: 0 }}>Branch Manager</p>
                                </div>
                            </div>
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
                        <p style={{ fontSize: '0.9rem', color: '#444' }}>
                            Period: {format(new Date(run.period_start), 'MMMM dd, yyyy')} - {format(new Date(run.period_end), 'MMMM dd, yyyy')}
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
                                        <tr style={{ background: '#007bff', color: 'white' }}>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'center', width: '25px' }} rowSpan={2}>No.</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'left', minWidth: '120px' }} rowSpan={2}>Employee Name</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '50px' }} rowSpan={2}>Daily Rate</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'center', width: '30px' }} rowSpan={2}>Days</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '60px' }} rowSpan={2}>Reg. Pay</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '55px' }} rowSpan={2}>Holiday</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '55px' }} rowSpan={2}>Allow.</th>

                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '65px', background: '#0056b3', fontWeight: 700 }} rowSpan={2}>Gross Income</th>
                                            {visibleDeductions.length > 0 && (
                                                <th style={{ border: '1px solid #333', padding: '2px', textAlign: 'center' }} colSpan={visibleDeductions.length}>Deductions</th>
                                            )}
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '60px', background: '#0056b3', fontWeight: 700 }} rowSpan={2}>Tot. Ded.</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right', width: '70px', fontWeight: 800, background: '#004085' }} rowSpan={2}>Net Pay</th>
                                            <th style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'center', width: '100px' }} rowSpan={2}>Signature</th>
                                        </tr>
                                        {visibleDeductions.length > 0 && (
                                            <tr style={{ background: '#007bff', color: 'white' }}>
                                                {visibleDeductions.map(d => (
                                                    <th key={d.key} style={{ border: '1px solid #333', padding: '2px', minWidth: '35px', fontSize: '0.45rem' }}>{d.label}</th>
                                                ))}
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {run.payslips.map((slip: any, idx: number) => {
                                            const totalIncome = Number(slip.gross_pay || 0) + Number(slip.double_pay_amount || 0) + Number(slip.total_allowances || 0);
                                            const d = slip.deduction_details || {};
                                            return (
                                                <tr key={slip.id}>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.65rem' }}>{slip.employee_name}</div>
                                                        <div style={{ fontSize: '0.5rem', color: '#666' }}>{slip.position}</div>
                                                    </td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right' }}>₱{Number(slip.daily_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'center' }}>{Number(slip.days_present || 0).toFixed(1)}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right' }}>₱{Number(slip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right' }}>₱{Number(slip.double_pay_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right' }}>₱{Number(slip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right', background: '#f9f9f9', fontWeight: 600 }}>₱{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                                                    {visibleDeductions.map(vd => (
                                                        <td key={vd.key} style={{ border: '1px solid #333', padding: '4px', textAlign: 'right' }}>
                                                            {Number(d?.[vd.key] || 0) > 0 ? (
                                                                <div>
                                                                    <div>₱{Number(d?.[vd.key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                    {d?.[`${vd.key}_balance`] !== undefined && vd.key !== 'sss_loan' && vd.key !== 'pagibig_loan' && (
                                                                        <div style={{ fontSize: '0.45rem', color: '#666', fontStyle: 'italic' }}>Bal: ₱{Number(d?.[`${vd.key}_balance`] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                    )}
                                                                </div>
                                                            ) : '0.00'}
                                                        </td>
                                                    ))}

                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right', color: '#c00', fontWeight: 600 }}>₱{Number(slip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', textAlign: 'right', fontWeight: 800, background: '#f0f0f0' }}>₱{Number(slip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td style={{ border: '1px solid #333', padding: '4px', verticalAlign: 'bottom', textAlign: 'center', minWidth: '90px' }}>
                                                        <div style={{ borderBottom: '1px solid #333', width: '100%', marginBottom: '2px', marginTop: '8px' }}></div>
                                                        <div style={{ fontSize: '0.45rem', fontWeight: 700, textTransform: 'uppercase' }}>{slip.employee_name}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ fontWeight: 700, background: '#e8e8e8' }}>
                                            <td colSpan={4} style={{ border: '1px solid #333', padding: '4px 2px', textAlign: 'right' }}>TOTALS:</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.gross_pay || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.double_pay_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.total_allowances || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', background: '#ddd' }}>
                                                ₱{run.payslips.reduce((sum: number, s: any) => sum + (Number(s.gross_pay || 0) + Number(s.double_pay_amount || 0) + Number(s.total_allowances || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {visibleDeductions.map(vd => (
                                                <td key={vd.key} style={{ border: '1px solid #333', padding: '2px', textAlign: 'right' }}>
                                                    ₱{run.payslips.reduce((sum: number, s: any) => sum + (Number(s.deduction_details?.[vd.key] || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            ))}

                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', color: '#c00' }}>₱{run.payslips.reduce((sum: number, s: any) => sum + Number(s.total_deductions || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ border: '1px solid #333', padding: '2px', textAlign: 'right', fontSize: '0.65rem', background: '#ccc' }}>₱{run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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

            {/* All Payslips Print Container */}
            <div className="payslip-print-container">
                {run.payslips.map((slip: any) => (
                    <div key={slip.id} className="payslip-page">
                        <div className="payslip-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>Melann Lending Investor Corporation</h2>
                            <p style={{ margin: '4px 0', fontSize: '1.125rem', fontWeight: 700 }}>PAYSLIP</p>
                            <p style={{ fontSize: '0.9rem' }}>
                                Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                            </p>
                        </div>

                        <div style={{ borderTop: '2px solid #333', borderBottom: '1px solid #333', padding: '0.75rem 0', display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Employee Name</p>
                                <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: '1.1rem' }}>{slip.employee_name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.75rem', color: '#666', margin: 0 }}>Position</p>
                                <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>{slip.position}</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
                            <div>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 8px 0', borderBottom: '1.5px solid #333', paddingBottom: '3px' }}>EARNINGS</h3>
                                <div className="payslip-row">
                                    <span>Basic Pay ({slip.days_present} days)</span>
                                    <span>₱{Number(slip.gross_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {Number(slip.double_pay_amount || 0) > 0 && (
                                    <div className="payslip-row">
                                        <span>Holiday Pay</span>
                                        <span>₱{Number(slip.double_pay_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="payslip-row">
                                    <span>Allowances</span>
                                    <span>₱{Number(slip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="payslip-total">
                                    <span>GROSS INCOME</span>
                                    <span>₱{(Number(slip.gross_pay || 0) + Number(slip.double_pay_amount || 0) + Number(slip.total_allowances || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, margin: '0 0 8px 0', borderBottom: '1.5px solid #333', paddingBottom: '3px' }}>DEDUCTIONS</h3>
                                {Object.entries(slip.deduction_details || {}).map(([key, val]: [string, any]) => {
                                    if (key.includes('_balance')) return null;
                                    const balanceKey = `${key}_balance`;
                                    const hasBal = slip.deduction_details[balanceKey] !== undefined;
                                    return (
                                        <div key={key} className="payslip-row">
                                            <span>
                                                <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                                                {hasBal && key !== 'sss_loan' && key !== 'pagibig_loan' && (
                                                    <span style={{ fontSize: '0.65rem', display: 'block', fontStyle: 'italic' }}>
                                                        Bal: ₱{Number(slip.deduction_details?.[balanceKey] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </span>
                                            <span>₱{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    );
                                })}
                                <div className="payslip-total">
                                    <span>TOTAL DEDUCTIONS</span>
                                    <span>₱{Number(slip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f5f5f5', padding: '0.6rem 0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', border: '1.5px solid #333' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem' }}>NET PAY</span>
                            <span style={{ fontWeight: 800, fontSize: '1.35rem' }}>₱{Number(slip.net_pay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '1rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderTop: '1.5px solid #333', marginTop: '15px', paddingTop: '3px' }}>
                                    <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: '0.75rem' }}>{slip.employee_name}</p>
                                    <p style={{ fontSize: '0.65rem', margin: 0 }}>Employee Signature</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderTop: '1.5px solid #333', marginTop: '15px', paddingTop: '3px' }}>
                                    <p style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: '0.75rem' }}>MARILYN RELOBA</p>
                                    <p style={{ fontSize: '0.65rem', margin: 0 }}>Branch Manager</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media screen {
                    .payslip-print-container, .payroll-register-print-container, .single-payslip-print-container {
                        display: none;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 1.5rem;
                        margin-bottom: 2rem;
                    }
                    .summary-item {
                        padding: 1.25rem;
                        background: white;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .summary-item label {
                        display: block;
                        font-size: 0.75rem;
                        font-weight: 700;
                        color: #64748b;
                        text-transform: uppercase;
                        margin-bottom: 0.5rem;
                    }
                    .summary-item .value {
                        font-size: 1.25rem;
                        font-weight: 800;
                        color: #1e293b;
                    }
                    .summary-item .value.highlight {
                        color: var(--primary-700);
                        font-size: 1.5rem;
                    }
                    .table-container-responsive {
                        overflow-x: auto;
                        width: 100%;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        background: white;
                        margin-bottom: 1.5rem;
                    }
                    .table-condensed th {
                        background: #f8fafc;
                        padding: 1rem;
                        font-size: 0.75rem;
                        font-weight: 800;
                        color: #475569;
                        text-transform: uppercase;
                        border-bottom: 2px solid #e2e8f0;
                        white-space: nowrap;
                    }
                    .table-condensed td {
                        padding: 1rem;
                        vertical-align: middle;
                        font-size: 0.875rem;
                        border-bottom: 1px solid #f1f5f9;
                        white-space: nowrap;
                    }
                    .amount-col {
                        text-align: right !important;
                        font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
                        font-weight: 600;
                        width: 120px;
                    }
                    .employee-col { min-width: 200px; }
                    .highlight-net {
                        background: #f0f9ff;
                        color: var(--primary-700);
                        font-weight: 800 !important;
                    }
                    .scroll-btn {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        padding: 0.4rem 0.8rem;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.75rem;
                        font-weight: 600;
                    }
                    /* Modal styles */
                    .payslip-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid #f1f5f9;
                    }
                    .payslip-total {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.75rem 0;
                        margin-top: 0.5rem;
                        font-weight: 800;
                        border-top: 2px solid #1e293b;
                    }
                }

                @media print {
                    .no-print, .sidebar, .topbar {
                        display: none !important;
                    }
                    @page { margin: 0.5cm; }
                    
                    /* Force hide all by default with high specificity */
                    body .payslip-print-container, 
                    body .payroll-register-print-container, 
                    body .single-payslip-print-container {
                        display: none !important;
                    }

                    /* Conditional display based on body class */
                    body.printing-register @page { size: legal landscape; }
                    body.printing-register .payroll-register-print-container {
                        display: block !important;
                    }

                    body.printing-payslips @page { size: legal portrait; }
                    body.printing-payslips .payslip-print-container {
                        display: block !important;
                    }

                    body.printing-single @page { size: legal portrait; }
                    body.printing-single .single-payslip-print-container {
                        display: block !important;
                    }

                    .payslip-page {
                        height: 32.5%;
                        border-bottom: 1px dashed #000;
                        padding: 0.5cm;
                        page-break-inside: avoid;
                        display: flex;
                        flex-direction: column;
                        background: white !important;
                    }
                    body.printing-single .payslip-page {
                        height: auto;
                        border-bottom: none;
                    }
                    .payslip-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                        border-bottom: 1px solid #eee;
                        font-size: 0.8rem;
                    }
                    .payslip-total {
                        display: flex;
                        justify-content: space-between;
                        padding: 6px 0;
                        font-weight: 800;
                        border-top: 1.5px solid #333;
                    }
                }
            `}} />
        </DashboardLayout>
    );
}
