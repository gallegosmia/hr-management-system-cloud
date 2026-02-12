import React from 'react';
import { formatCurrency } from '@/lib/payroll-calculations';

// Reuse the Payslip interface relative to what's passed
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
    run_number?: string;
    payroll_period_start?: string;
    payroll_period_end?: string;
    cutoff_day?: number;
    payroll_status?: string;
    company_loan_balance?: number;
}

interface PayslipViewModalProps {
    payslip: Payslip;
    onClose: () => void;
    payrollRun: {
        run_number: string;
        payroll_period_start: string;
        payroll_period_end: string;
        cutoff_day: number;
        status: string;
    } | null;
}

export default function PayslipViewModal({ payslip, onClose, payrollRun }: PayslipViewModalProps) {

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatPeriod = (start?: string, end?: string) => {
        if (!start || !end) return '';
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long' })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
        }
        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Payslip Preview</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-gray-50">
                    <div className="payslip-item bg-white shadow-sm mx-auto">
                        <div className="payslip-header">
                            <h3>PAYSLIP</h3>
                        </div>

                        <div className="period-row">
                            <span className="label">Period Covered:</span>
                            <span className="value">{payrollRun ? formatPeriod(payrollRun.payroll_period_start, payrollRun.payroll_period_end) : '-'}</span>
                        </div>

                        <div className="employee-info">
                            <div className="info-row">
                                <span className="label">Name</span>
                                <span className="value name">{payslip.last_name}, {payslip.first_name}</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Position</span>
                                <span className="value">{payslip.position}</span>
                            </div>
                        </div>

                        <div className="details-table">
                            {/* Earnings */}
                            <div className="row">
                                <span className="label">Basic Pay</span>
                                <span className="amount">{formatCurrency(payslip.basic_pay).replace('₱', '')}</span>
                            </div>
                            <div className="row">
                                <span className="label">No. of Worked Days</span>
                                <span className="days">{payslip.payroll_days}</span>
                                <span className="amount">-</span>
                            </div>
                            <div className="row">
                                <span className="label">No. of Holidays</span>
                                <span className="days">0.00</span>
                                <span className="amount">{payslip.holiday_pay > 0 ? formatCurrency(payslip.holiday_pay).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">Special Allowance</span>
                                <span className="amount">{payslip.special_allowance > 0 ? formatCurrency(payslip.special_allowance).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">Regular Allowance</span>
                                <span className="amount">{payslip.regular_allowance > 0 ? formatCurrency(payslip.regular_allowance).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row total-row">
                                <span className="label">Total Pay</span>
                                <span className="amount">{formatCurrency(payslip.gross_pay).replace('₱', '')}</span>
                            </div>

                            <div className="spacer"></div>

                            {/* Deductions */}
                            <div className="row header-row">
                                <span className="label">Deduction:</span>
                            </div>
                            <div className="row">
                                <span className="label">Cash Advance</span>
                                <span className="amount">{payslip.cash_advance > 0 ? formatCurrency(payslip.cash_advance).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">Cash Fund</span>
                                <span className="amount">{payslip.company_funds && payslip.company_funds > 0 ? formatCurrency(payslip.company_funds).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">Philhealth</span>
                                <span className="amount">{payslip.phic && payslip.phic > 0 ? formatCurrency(payslip.phic).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">PAG-IBIG</span>
                                <span className="amount">{payslip.pagibig && payslip.pagibig > 0 ? formatCurrency(payslip.pagibig).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">Pag-ibig Loan</span>
                                <span className="amount">{payslip.pagibig_loan && payslip.pagibig_loan > 0 ? formatCurrency(payslip.pagibig_loan).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">SSS</span>
                                <span className="amount">{payslip.sss && payslip.sss > 0 ? formatCurrency(payslip.sss).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row">
                                <span className="label">Emergency Loan</span>
                                <span className="amount">{payslip.company_loan && payslip.company_loan > 0 ? formatCurrency(payslip.company_loan).replace('₱', '') : '-'}</span>
                            </div>
                            <div className="row total-row">
                                <span className="label">Total Deduction</span>
                                <span className="amount">{formatCurrency(payslip.total_deductions).replace('₱', '')}</span>
                            </div>

                            <div className="row net-pay-row">
                                <span className="label">NET PAY :</span>
                                <span className="amount">{formatCurrency(payslip.net_pay).replace('₱', '')}</span>
                            </div>

                            <div className="row">
                                <span className="label">Company Loan Balance</span>
                                <span className="amount">{payslip.company_loan_balance && payslip.company_loan_balance > 0 ? formatCurrency(payslip.company_loan_balance).replace('₱', '') : '-'}</span>
                            </div>

                            <div className="spacer"></div>

                            <div className="row prepared-row">
                                <span className="label">Prepared by:</span>
                                <span className="value-right">Marilyn Reloba</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                                printWindow.document.write(`
                                    <html>
                                        <head>
                                            <title>Print Payslip</title>
                                            <style>
                                                body { font-family: Arial, sans-serif; display: flex; justify-content: center; padding-top: 50px; }
                                                .payslip-item { border: 1px solid #ccc; padding: 20px; width: 300px; }
                                                h3 { text-align: center; margin: 0 0 10px 0; font-size: 14px; }
                                                .period-row, .info-row, .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11px; }
                                                .name { font-weight: bold; }
                                                .total-row, .net-pay-row { font-weight: bold; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
                                                .net-pay-row { border-bottom: 2px solid #000; border-top: 2px solid #000; padding: 5px 0; font-size: 12px; }
                                                .box-value { border: 2px solid #000; padding: 2px 5px; background: #eee; font-weight: bold; }
                                                .prepared-row { margin-top: 15px; align-items: center; }
                                                .value-right { font-weight: bold; text-transform: uppercase; text-decoration: underline; }
                                            </style>
                                        </head>
                                        <body>
                                            ${document.querySelector('.payslip-item')?.outerHTML || ''}
                                            <script>window.print();</script>
                                        </body>
                                    </html>
                                `);
                                printWindow.document.close();
                            }
                        }}
                        className="ml-3 px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Print
                    </button>
                </div>
            </div>

            <style jsx>{`
                .payslip-item {
                    border: 1px solid #ccc;
                    padding: 8px;
                    font-family: Arial, sans-serif;
                    font-size: 10px;
                    background: white;
                    width: 100%;
                }

                .payslip-header {
                    text-align: center;
                    margin-bottom: 5px;
                }
                
                .payslip-header h3 {
                    margin: 0;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                }

                .period-row {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 2px;
                    margin-bottom: 5px;
                }
                
                .period-row .value {
                     font-weight: bold;
                     text-decoration: underline;
                }

                .employee-info {
                    margin-bottom: 8px;
                }
                
                .info-row {
                    display: flex;
                    margin-bottom: 2px;
                }
                
                .info-row .label {
                    width: 60px;
                    color: #444;
                }
                
                .info-row .value {
                    flex: 1;
                    font-weight: normal;
                    text-transform: uppercase;
                }

                .info-row .value.name {
                    font-weight: bold;
                }

                .details-table {
                    display: flex;
                    flex-direction: column;
                }

                .row {
                    display: flex;
                    justify-content: space-between;
                    padding: 2px 0;
                    border-bottom: 1px solid #eee;
                }
                
                .row.header-row {
                    border-bottom: none;
                    margin-top: 5px;
                }

                .row .label {
                    flex: 1;
                }
                
                .row .days {
                    width: 30px;
                    text-align: center;
                }

                .row .amount {
                    width: 70px;
                    text-align: right;
                }

                .total-row {
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    font-weight: bold;
                    margin-top: 2px;
                }

                .net-pay-row {
                    margin-top: 5px;
                    font-weight: bold;
                    font-size: 11px;
                    border-top: 2px solid #000;
                    border-bottom: 2px solid #000;
                    padding: 4px 0;
                }
                
                .prepared-row {
                    margin-top: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .value-right {
                    font-weight: bold;
                    text-transform: uppercase;
                    border-bottom: 1px solid black;
                }

                .box-value {
                    border: 2px solid #000;
                    padding: 2px 5px;
                    font-weight: bold;
                    background: #ffedd5;
                }

                .spacer {
                    height: 5px;
                }
            `}</style>
        </div>
    );
}
