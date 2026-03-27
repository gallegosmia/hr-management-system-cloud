import React from 'react';
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
    monthly_salary?: number;
    daily_rate?: number;
    payroll_days?: number;
    basic_pay?: number;
    regular_allowance?: number;
    special_allowance?: number;
    holiday_pay?: number;
    other_earnings?: number;
    gross_pay?: number;
    // Deductions
    phic?: number;
    pagibig?: number;
    pagibig_loan?: number;
    company_funds?: number;
    company_funds_balance?: number;
    sss?: number;
    sss_loan?: number;
    company_loan?: number;
    company_loan_balance?: number;
    cash_advance?: number;
    other_deductions?: number;
    total_deductions?: number;
    net_pay?: number;
    // Payroll run info
    run_number?: string;
    payroll_period_start?: string;
    payroll_period_end?: string;
    cutoff_day?: number;
    payroll_status?: string;
    salary_info?: any; // To allow flexibility
}

interface PayslipBatchPrintProps {
    payslips: Payslip[];
}

export default function PayslipBatchPrint({ payslips }: PayslipBatchPrintProps) {
    // Group into pages of 3 (for 3 columns landscape)
    const chunkArray = (arr: Payslip[], size: number) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );
    };

    const pages = chunkArray(payslips, 3); // 3 per page (Landscape)

    const formatPeriod = (start?: string, end?: string) => {
        if (!start || !end) return '';
        const startDate = new Date(start);
        const endDate = new Date(end);
        // If months are the same, format nicely like "January 1-15, 2026"
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long' })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
        }
        return `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const safeVal = (val: any) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    return (
        <div className="batch-print-container">
            {pages.map((pagePayslips, pageIndex) => (
                <div key={pageIndex} className="print-page">
                    <div className="payslips-grid">
                        {pagePayslips.map((payslip) => (
                            <div key={payslip.id} className="payslip-item-new">
                                {/* Header Section */}
                                <div className="header-new">
                                    <div className="logo-box">
                                        <div className="melann-logo-text">MELANN</div>
                                        <div className="logo-shape"></div>
                                    </div>
                                    <div className="company-text">
                                        <div className="company-name">LENDING INVESTOR CORPORATION</div>
                                        <div className="company-tagline">Kaagapay mo sa Pag-unlad</div>
                                        <div className="company-address">943 Purok II, Brgy. Bagong Buhay, Ormoc City</div>
                                        <div className="company-contact">Contact Nos. (053)561-8659, 09190085182, 09176794449</div>
                                        <div className="company-email">Email Address: melann.lic2016@gmail.com</div>
                                        <div className="company-fb">Facebook Page: facebook.com/melann.lending</div>
                                    </div>
                                </div>

                                <div className="payslip-title-new">PAYSLIP</div>

                                {/* Employee Info */}
                                <div className="info-grid">
                                    <div className="info-row-new">
                                        <div className="info-label">Period Covered:</div>
                                        <div className="info-value underline text-center font-bold">
                                            {formatPeriod(payslip.payroll_period_start, payslip.payroll_period_end)}
                                        </div>
                                    </div>
                                    <div className="info-row-new">
                                        <div className="info-label">Name</div>
                                        <div className="info-value font-bold uppercase">
                                            {payslip.last_name}, {payslip.first_name}
                                        </div>
                                    </div>
                                    <div className="info-row-new">
                                        <div className="info-label">Position</div>
                                        <div className="info-value uppercase">{payslip.position}</div>
                                    </div>
                                </div>

                                {/* Earnings */}
                                <div className="earnings-section">
                                    <div className="line-item">
                                        <span className="label">Basic Pay</span>
                                        <span className="amount">{formatCurrency(safeVal(payslip.basic_pay)).replace('₱', '')}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">No. of Worked Days : &nbsp; {payslip.payroll_days}</span>
                                        <span className="amount">-</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label" style={{ fontSize: '9px' }}>No. of Holidays &nbsp; &nbsp; &nbsp; &nbsp; : &nbsp; {safeVal(payslip.holiday_pay) > 0 && safeVal(payslip.daily_rate) > 0 ? (safeVal(payslip.holiday_pay) / safeVal(payslip.daily_rate)).toFixed(2) : '0.00'}</span>
                                        <span className="amount">{safeVal(payslip.holiday_pay) > 0 ? formatCurrency(safeVal(payslip.holiday_pay)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Special Allowance</span>
                                        <span className="amount">{safeVal(payslip.special_allowance) > 0 ? formatCurrency(safeVal(payslip.special_allowance)).replace('₱', '') : ''}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Regular Allowance</span>
                                        <span className="amount">{safeVal(payslip.regular_allowance) > 0 ? formatCurrency(safeVal(payslip.regular_allowance)).replace('₱', '') : ''}</span>
                                    </div>
                                    <div className="line-item total-line">
                                        <span className="label">Total Pay</span>
                                        <span className="amount font-bold">{formatCurrency(safeVal(payslip.gross_pay)).replace('₱', '')}</span>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div className="deductions-section">
                                    <div className="section-header">Deduction:</div>

                                    <div className="line-item">
                                        <span className="label">Cash Advance</span>
                                        <span className="amount">{safeVal(payslip.cash_advance) > 0 ? formatCurrency(safeVal(payslip.cash_advance)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Cash Fund</span>
                                        <span className="amount">{safeVal(payslip.company_funds) > 0 ? formatCurrency(safeVal(payslip.company_funds)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Philhealth</span>
                                        <span className="amount">{safeVal(payslip.phic) > 0 ? formatCurrency(safeVal(payslip.phic)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">PAG-IBIG</span>
                                        <span className="amount">{safeVal(payslip.pagibig) > 0 ? formatCurrency(safeVal(payslip.pagibig)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Pag-ibig Loan</span>
                                        <span className="amount">{safeVal(payslip.pagibig_loan) > 0 ? formatCurrency(safeVal(payslip.pagibig_loan)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Emergency Loan</span>
                                        <span className="amount">{safeVal(payslip.company_loan) > 0 ? formatCurrency(safeVal(payslip.company_loan)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">SSS Contribution</span>
                                        <span className="amount">{safeVal(payslip.sss) > 0 ? formatCurrency(safeVal(payslip.sss)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">SSS Loan</span>
                                        <span className="amount">{safeVal(payslip.sss_loan) > 0 ? formatCurrency(safeVal(payslip.sss_loan)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item">
                                        <span className="label">Other Deductions</span>
                                        <span className="amount">{safeVal(payslip.other_deductions) > 0 ? formatCurrency(safeVal(payslip.other_deductions)).replace('₱', '') : '-'}</span>
                                    </div>
                                    <div className="line-item total-line">
                                        <span className="label">Total Deduction</span>
                                        <span className="amount font-bold">{formatCurrency(safeVal(payslip.total_deductions)).replace('₱', '')}</span>
                                    </div>
                                </div>

                                {/* Net Pay */}
                                <div className="net-pay-section">
                                    <div className="net-pay-row">
                                        <span className="label">NET PAY &nbsp; &nbsp; &nbsp; : &nbsp; &nbsp; Php</span>
                                        <span className="amount font-bold text-lg">{formatCurrency(safeVal(payslip.net_pay)).replace('₱', '')}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="footer-section">
                                    <div className="prepared-by">
                                        <div className="label">Prepared by:</div>
                                        <div className="value"></div>
                                    </div>
                                    <div className="final-amount-box">
                                        {formatCurrency(safeVal(payslip.net_pay)).replace('₱', '')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    body {
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .batch-print-container {
                        page-break-inside: avoid;
                        height: auto;
                    }
                    .print-page {
                        height: auto;
                        overflow: hidden;
                    }
                    .print-only-batch {
                        display: block !important;
                        width: 100%;
                        height: auto;
                    }
                    /* Hide everything else */
                    aside, header, nav, .hide-print {
                        display: none !important;
                    }
                }

                .batch-print-container {
                    width: 100%;
                    background: white;
                    color: black;
                    font-family: 'Arial', sans-serif;
                    font-size: 10px;
                    line-height: 1.2;
                }

                .print-page {
                    width: 100%; 
                    height: auto;
                    position: relative;
                    page-break-after: always;
                    background: white;
                    padding: 10mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    margin: 0 auto;
                }
                .print-page:last-child {
                    page-break-after: auto;
                }

                .payslips-grid {
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    width: 100%;
                    height: auto;
                }

                .payslip-item-new {
                    border: 1px solid #000;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    height: auto;
                    width: 33.33%;
                    box-sizing: border-box;
                }

                /* Header New */
                .header-new {
                    display: flex;
                    align-items: center;
                    margin-bottom: 2px;
                    gap: 6px;
                }
                .logo-box {
                    width: 40px; /* Reduced logo size */
                    height: 40px;
                    border: 2px solid #000;
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .melann-logo-text {
                    font-weight: 900;
                    font-style: italic;
                    font-size: 10px; /* Reduced */
                    transform: rotate(-15deg);
                }
                .logo-shape {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 8px;
                    height: 8px;
                    background: #000;
                    border-radius: 50%;
                }
                .company-text {
                    flex: 1;
                }
                .company-name {
                    font-weight: 900;
                    font-size: 11px; /* Reduced */
                    line-height: 1.1;
                }
                .company-tagline {
                    font-style: italic;
                    font-size: 8px; /* Reduced */
                    margin-bottom: 1px;
                }
                .company-address, .company-contact, .company-email, .company-fb {
                    font-size: 7px; /* Very small details */
                    line-height: 1.1;
                }

                .payslip-title-new {
                    text-align: center;
                    font-weight: 900;
                    font-size: 12px; /* Reduced */
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                    padding: 1px 0; /* Reduced */
                    margin: 3px 0; /* Reduced */
                    letter-spacing: 1px;
                }

                .row {
                    display: flex;
                    justify-content: space-between;
                    padding: 1px 0; /* Ultra compact */
                    border-bottom: 1px solid #eee;
                }
                .row:last-child {
                    border-bottom: none;
                }
                .label {
                    color: #555;
                    font-size: 0.95em;
                }
                .value {
                    font-weight: 600;
                    font-size: 0.95em;
                }
                
                .section-title {
                    font-weight: bold;
                    text-decoration: underline;
                    margin: 2px 0;
                    font-size: 1em;
                }

                .totals-section {
                    margin-top: 10px;
                    border-top: 2px solid #000;
                    padding-top: 4px;
                }

                .line-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 1px 0; /* Tighter padding */
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 10px;
                }
                .line-item.total-line {
                    font-weight: bold;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    margin-top: 2px;
                    padding: 1px 0;
                }
                .line-item .label {
                    flex: 1;
                }
                .line-item .amount {
                    text-align: right;
                }

                .deductions-section {
                    margin-top: 2px;
                }
                .section-header {
                    font-weight: bold;
                    margin-bottom: 1px;
                    font-size: 9px;
                    text-decoration: underline;
                }

                .net-pay-section {
                    margin-top: 15px;
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                    padding: 4px 0;
                    margin-bottom: 10px;
                }
                .net-pay-row {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 11px;
                }

                .footer-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: 2px;
                }
                .prepared-by {
                    display: flex;
                    flex-direction: column;
                }
                .prepared-by .label {
                    font-size: 8px;
                    font-style: italic;
                }
                .prepared-by .value {
                    margin-top: 4px; /* Drastically reduced signature space */
                    border-bottom: 1px solid #000;
                    width: 100px;
                }
                .final-amount-box {
                    border: 2px solid #000;
                    padding: 1px 4px;
                    font-weight: bold;
                    min-width: 60px;
                    text-align: center;
                    background: #ffedd5;
                    font-size: 11px;
                }
            `}</style>
        </div >
    );
}
