/**
 * Individual Payslip View
 * Premium design optimized for viewing and printing
 * Based on PAYROLL_UI_SPECIFICATIONS.md
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { formatCurrency } from '@/lib/payroll-calculations';

interface Payslip {
    id: number;
    employee_id: number;
    employee_number: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    branch: string;
    monthly_salary: number;
    daily_rate: number;
    payroll_days: number;
    basic_pay: number;
    regular_allowance: number;
    special_allowance: number;
    holiday_pay: number;
    other_earnings: number;
    gross_pay: number;
    // Deductions
    phic?: number;
    pagibig?: number;
    pagibig_loan?: number;
    company_funds?: number;
    sss?: number;
    sss_loan?: number;
    company_loan: number;
    cash_advance: number;
    other_deductions: number;
    total_deductions: number;
    net_pay: number;
    // Payroll run info
    run_number: string;
    payroll_period_start: string;
    payroll_period_end: string;
    cutoff_day: number;
    payroll_status: string;
}

export default function PayslipViewPage({ params }: { params: { id: string; payslipId: string } }) {
    const router = useRouter();
    const [payslip, setPayslip] = useState<Payslip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayslip();
    }, [params.payslipId]);

    const fetchPayslip = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/payslips/${params.payslipId}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();

            if (response.ok) {
                setPayslip(data.payslip);
            } else {
                alert(`Error: ${data.error}`);
                router.push(`/payroll/${params.id}`);
            }
        } catch (error) {
            console.error('Error fetching payslip:', error);
            alert('Failed to load payslip');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatPeriod = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Loading payslip...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!payslip) {
        return (
            <DashboardLayout>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Payslip not found</p>
                </div>
            </DashboardLayout>
        );
    }

    const cutoff = payslip.cutoff_day;

    return (
        <DashboardLayout hideNavbar hideSidebar>
            <div className="payslip-container">
                {/* Action Bar - Hidden in print */}
                <div className="action-bar no-print">
                    <Link href={`/payroll/${params.id}`}>
                        <button className="btn-back">← Back to Payroll Run</button>
                    </Link>
                    <button onClick={handlePrint} className="btn-print">🖨️ Print Payslip</button>
                </div>

                {/* Payslip Document */}
                <div className="payslip-document">
                    {/* Header */}
                    <div className="payslip-header">
                        <div className="company-logo">
                            <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="10" y="50" width="20" height="40" rx="4" fill="#8B2635" />
                                <rect x="40" y="30" width="20" height="60" rx="4" fill="#D2691E" />
                                <rect x="70" y="10" width="20" height="80" rx="4" fill="#E74C3C" />
                            </svg>
                        </div>
                        <div className="company-info">
                            <h1>Melann HR Management System</h1>
                            <p>Payslip for {payslip.payroll_period_start ? formatPeriod(payslip.payroll_period_start, payslip.payroll_period_end) : `Period Ending ${new Date(payslip.payroll_period_end || new Date()).toLocaleDateString()}`}</p>
                        </div>
                        <div className="payslip-meta">
                            <div className="meta-item">
                                <span className="meta-label">Run Number:</span>
                                <span className="meta-value">{payslip.run_number}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Cutoff:</span>
                                <span className="meta-value">{cutoff}th</span>
                            </div>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Employee Information */}
                    <div className="employee-section">
                        <h2>Employee Information</h2>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Employee ID:</span>
                                <span className="info-value">{payslip.employee_number}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Name:</span>
                                <span className="info-value">{payslip.first_name} {payslip.last_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Position:</span>
                                <span className="info-value">{payslip.position}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Department:</span>
                                <span className="info-value">{payslip.department}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Branch:</span>
                                <span className="info-value">{payslip.branch}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Payroll Days:</span>
                                <span className="info-value">{Number(payslip.payroll_days || 0).toFixed(2)} days</span>
                            </div>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Earnings and Deductions */}
                    <div className="earnings-deductions-section">
                        <div className="earnings-column">
                            <h2>Earnings</h2>
                            <table className="breakdown-table">
                                <tbody>
                                    <tr>
                                        <td>Basic Pay</td>
                                        <td className="amount">{formatCurrency(payslip.basic_pay)}</td>
                                    </tr>
                                    {payslip.regular_allowance > 0 && (
                                        <tr>
                                            <td>Regular Allowance</td>
                                            <td className="amount">{formatCurrency(payslip.regular_allowance)}</td>
                                        </tr>
                                    )}
                                    {payslip.special_allowance > 0 && (
                                        <tr>
                                            <td>Special Allowance</td>
                                            <td className="amount">{formatCurrency(payslip.special_allowance)}</td>
                                        </tr>
                                    )}
                                    {payslip.holiday_pay > 0 && (
                                        <tr>
                                            <td>Holiday Pay</td>
                                            <td className="amount">{formatCurrency(payslip.holiday_pay)}</td>
                                        </tr>
                                    )}
                                    {payslip.other_earnings > 0 && (
                                        <tr>
                                            <td>Other Earnings</td>
                                            <td className="amount">{formatCurrency(payslip.other_earnings)}</td>
                                        </tr>
                                    )}
                                    <tr className="total-row">
                                        <td><strong>Gross Pay</strong></td>
                                        <td className="amount"><strong>{formatCurrency(payslip.gross_pay)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="deductions-column">
                            <h2>Deductions</h2>
                            <table className="breakdown-table">
                                <tbody>
                                    {/* 15th Cutoff Deductions */}
                                    {cutoff === 15 && (
                                        <>
                                            {(payslip.phic || 0) > 0 && (
                                                <tr>
                                                    <td>PhilHealth (PHIC)</td>
                                                    <td className="amount">{formatCurrency(payslip.phic || 0)}</td>
                                                </tr>
                                            )}
                                            {(payslip.pagibig || 0) > 0 && (
                                                <tr>
                                                    <td>Pag-IBIG</td>
                                                    <td className="amount">{formatCurrency(payslip.pagibig || 0)}</td>
                                                </tr>
                                            )}
                                            {(payslip.pagibig_loan || 0) > 0 && (
                                                <tr>
                                                    <td>Pag-IBIG Loan</td>
                                                    <td className="amount">{formatCurrency(payslip.pagibig_loan || 0)}</td>
                                                </tr>
                                            )}
                                            {(payslip.company_funds || 0) > 0 && (
                                                <tr>
                                                    <td>Company Funds</td>
                                                    <td className="amount">{formatCurrency(payslip.company_funds || 0)}</td>
                                                </tr>
                                            )}
                                        </>
                                    )}

                                    {/* 30th Cutoff Deductions */}
                                    {cutoff !== 15 && (
                                        <>
                                            {(payslip.sss || 0) > 0 && (
                                                <tr>
                                                    <td>SSS</td>
                                                    <td className="amount">{formatCurrency(payslip.sss || 0)}</td>
                                                </tr>
                                            )}
                                            {(payslip.sss_loan || 0) > 0 && (
                                                <tr>
                                                    <td>SSS Loan</td>
                                                    <td className="amount">{formatCurrency(payslip.sss_loan || 0)}</td>
                                                </tr>
                                            )}
                                        </>
                                    )}

                                    {/* Common Deductions */}
                                    {payslip.company_loan > 0 && (
                                        <tr>
                                            <td>Company Loan</td>
                                            <td className="amount">{formatCurrency(payslip.company_loan)}</td>
                                        </tr>
                                    )}
                                    {payslip.cash_advance > 0 && (
                                        <tr>
                                            <td>Cash Advance</td>
                                            <td className="amount">{formatCurrency(payslip.cash_advance)}</td>
                                        </tr>
                                    )}
                                    {payslip.other_deductions > 0 && (
                                        <tr>
                                            <td>Other Deductions</td>
                                            <td className="amount">{formatCurrency(payslip.other_deductions)}</td>
                                        </tr>
                                    )}
                                    <tr className="total-row">
                                        <td><strong>Total Deductions</strong></td>
                                        <td className="amount"><strong>{formatCurrency(payslip.total_deductions)}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Take Home Pay */}
                    <div className="net-pay-section">
                        <div className="net-pay-label">Take Home Pay</div>
                        <div className="net-pay-amount">{formatCurrency(payslip.net_pay)}</div>
                    </div>

                    <div className="divider"></div>

                    {/* Signature Section */}
                    <div className="signature-section">
                        <div className="signature-box">
                            <div className="signature-line"></div>
                            <div className="signature-label">Employee Signature</div>
                            <div className="signature-date">Date: _________________</div>
                        </div>
                        <div className="signature-box">
                            <div className="signature-line"></div>
                            <div className="signature-label">Authorized Signature</div>
                            <div className="signature-date">Date: _________________</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="payslip-footer">
                        <p>This is a computer-generated payslip and does not require a signature.</p>
                        <p>Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .payslip-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .action-bar {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }

                .btn-back, .btn-print {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-back {
                    background: #f3f4f6;
                    color: #374151;
                }

                .btn-back:hover {
                    background: #e5e7eb;
                }

                .btn-print {
                    background: #10b981;
                    color: white;
                    font-weight: 600;
                }

                .btn-print:hover {
                    background: #059669;
                }

                .payslip-document {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 40px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }

                .payslip-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                }

                .company-logo {
                    flex-shrink: 0;
                }

                .company-info {
                    flex: 1;
                    margin-left: 16px;
                }

                .company-info h1 {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 4px 0;
                }

                .company-info p {
                    font-size: 14px;
                    color: #6b7280;
                    margin: 0;
                }

                .payslip-meta {
                    text-align: right;
                }

                .meta-item {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .meta-label {
                    font-size: 12px;
                    color: #6b7280;
                }

                .meta-value {
                    font-size: 12px;
                    font-weight: 600;
                    color: #111827;
                    font-family: monospace;
                }

                .divider {
                    height: 1px;
                    background: #e5e7eb;
                    margin: 24px 0;
                }

                .employee-section h2 {
                    font-size: 16px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 16px 0;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .info-item {
                    display: flex;
                    gap: 8px;
                }

                .info-label {
                    font-size: 13px;
                    color: #6b7280;
                    min-width: 120px;
                }

                .info-value {
                    font-size: 13px;
                    font-weight: 600;
                    color: #111827;
                }

                .earnings-deductions-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }

                .earnings-column h2,
                .deductions-column h2 {
                    font-size: 16px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 12px 0;
                }

                .breakdown-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .breakdown-table td {
                    padding: 8px 0;
                    font-size: 13px;
                    border-bottom: 1px solid #f3f4f6;
                }

                .breakdown-table td:first-child {
                    color: #374151;
                }

                .breakdown-table td.amount {
                    text-align: right;
                    font-family: monospace;
                    color: #111827;
                }

                .breakdown-table .total-row td {
                    padding-top: 12px;
                    border-top: 2px solid #e5e7eb;
                    border-bottom: none;
                    font-size: 14px;
                }

                .net-pay-section {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 24px;
                    border-radius: 8px;
                    text-align: center;
                }

                .net-pay-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: rgba(255, 255, 255, 0.9);
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .net-pay-amount {
                    font-size: 36px;
                    font-weight: 700;
                    color: white;
                    font-family: monospace;
                }

                .signature-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    margin-top: 40px;
                }

                .signature-box {
                    text-align: center;
                }

                .signature-line {
                    height: 1px;
                    background: #d1d5db;
                    margin-bottom: 8px;
                }

                .signature-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 4px;
                }

                .signature-date {
                    font-size: 11px;
                    color: #6b7280;
                }

                .payslip-footer {
                    text-align: center;
                    margin-top: 32px;
                }

                .payslip-footer p {
                    font-size: 11px;
                    color: #9ca3af;
                    margin: 4px 0;
                }

                @media print {
                    .no-print {
                        display: none !important;
                    }

                    .payslip-container {
                        padding: 0;
                        max-width: 100%;
                    }

                    .payslip-document {
                        border: none;
                        box-shadow: none;
                        padding: 20px;
                    }

                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                }
            `}</style>
        </DashboardLayout>
    );
}
