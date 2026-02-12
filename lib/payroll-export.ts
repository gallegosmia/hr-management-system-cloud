/**
 * Payroll Export Utilities
 * Client-side utilities for generating Excel and PDF exports
 */

import { formatCurrency } from './payroll-calculations';

/**
 * Generate and download Excel file from payroll data
 */
export function downloadExcelExport(data: any) {
    // Create CSV content (Excel-compatible)
    let csv = '';

    // Header
    csv += `Payroll Run: ${data.runNumber}\n`;
    csv += `Branch: ${data.branch}\n`;
    csv += `Period: ${data.period}\n`;
    csv += `Cutoff: ${data.cutoff}\n`;
    csv += '\n';

    // Column headers
    csv += data.columns.join(',') + '\n';

    // Data rows
    data.rows.forEach((row: any[]) => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Totals row
    csv += '\n';
    csv += 'TOTALS,' + data.totals.slice(1).map((cell: string) => `"${cell}"`).join(',') + '\n';

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${data.runNumber}_Payroll.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate and download PDF from payroll data
 */
/**
 * Generate and download PDF from payroll data
 * Generates 3 payslips per page (Landscape - Short Bond Paper)
 */
export function downloadPayslipPDF(data: any) {
    const html = generatePayslipsPDFHTML(data);
    printHTML(html);
}

/**
 * Generate and download PDF for Payroll Register (Table View)
 */
export function downloadRegisterPDF(data: any) {
    const html = generateRegisterPDFHTML(data);
    printHTML(html);
}

function printHTML(html: string) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }
}

/**
 * Generate HTML for Payroll Register (Table View) - Premium Redesign
 */
function generateRegisterPDFHTML(data: any): string {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatFullTimestamp = (dateStr: string) => {
        if (!dateStr) return 'Pending Approval';
        const date = new Date(dateStr);
        return date.toISOString().replace('T', ' ').slice(0, 19).replace(/-/g, '-');
    };

    const cutoff = data.cutoff;
    const runId = data.runNumber;
    const reportDate = formatDate(new Date().toISOString());

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payroll Register - ${runId}</title>
    <style>
        @page {
            size: letter portrait;
            margin: 10mm;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 8px;
            line-height: 1.4;
            color: #1f2937;
            background: #fff;
            position: relative;
        }

        /* Diagonal Watermark */
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 110px;
            font-weight: 900;
            color: rgba(229, 231, 235, 0.4);
            z-index: -1;
            white-space: nowrap;
            pointer-events: none;
            letter-spacing: 0.1em;
        }

        .container { padding: 10mm; }

        /* Header Section */
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
        }
        .company-branding { display: flex; align-items: center; gap: 12px; }
        .logo-icon {
            width: 32px;
            height: 32px;
            background: #2563eb;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .company-name {
            font-size: 14px;
            font-weight: 800;
            color: #111827;
            letter-spacing: -0.01em;
        }
        .division-name {
            font-size: 9px;
            font-weight: 500;
            color: #6b7280;
            text-transform: uppercase;
        }
        .report-title-section { text-align: right; }
        .report-title {
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 4px;
        }
        .meta-data { font-size: 9px; color: #4b5563; }
        .meta-data strong { color: #111827; }

        /* Status Section */
        .section-label {
            font-size: 9px;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 12px;
            letter-spacing: 0.05em;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 40px;
        }
        .status-card {
            background: #fdfdfd;
            border: 1px solid #f3f4f6;
            border-radius: 8px;
            padding: 12px;
            position: relative;
        }
        .badge-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .badge {
            font-size: 7px;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
        }
        .badge-verified { background: #ecfdf5; color: #059669; }
        .badge-authorized { background: #eff6ff; color: #2563eb; }
        .check-icon { color: #10b981; }
        
        .signature-placeholder {
            height: 35px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .signature-img { height: 100%; object-fit: contain; }
        .signature-line { width: 100%; height: 1px; background: #e5e7eb; }
        
        .signee-info { margin-bottom: 4px; }
        .signee-name { font-size: 10px; font-weight: 700; color: #111827; }
        .signee-role { font-size: 8px; color: #6b7280; }
        .timestamp { font-size: 7px; color: #9ca3af; font-style: italic; }

        /* Table Styles */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        thead th {
            background: #111827;
            color: white;
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        tbody td { padding: 10px 12px; font-size: 9px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .val-gross { font-weight: 600; }
        .val-deduction { color: #ef4444; }
        .val-net { font-weight: 800; color: #111827; }
        .emp-id { color: #6b7280; font-family: monospace; font-size: 8px; }

        /* Financial Summary Box */
        .bottom-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 50px;
        }
        .confidential-note { width: 50%; color: #9ca3af; font-size: 7px; }
        .summary-box {
            background: #1f2937;
            padding: 20px;
            border-radius: 12px;
            width: 280px;
            color: white;
        }
        .summary-title {
            font-size: 8px;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            margin-bottom: 15px;
            letter-spacing: 0.05em;
        }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 10px; }
        .summary-row.total { 
            margin-top: 20px; 
            padding-top: 15px; 
            border-top: 1px solid #374151;
            font-size: 12px;
            font-weight: 800;
        }
        .amount-highlight { color: #60a5fa; }
        .deduction-highlight { color: #f87171; }

        /* Footer Metadata */
        .report-footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            font-size: 7px;
            color: #d1d5db;
            text-transform: uppercase;
            padding-top: 15px;
            border-top: 1px dashed #f3f4f6;
        }
    </style>
</head>
<body>
    <div class="watermark">CONFIDENTIAL</div>

    <div class="container">
        <!-- Header -->
        <div class="header-top">
            <div class="company-branding">
                <div class="logo-icon">ML</div>
                <div>
                    <div class="company-name">Melann Lending Investor Corporation</div>
                    <div class="division-name">Financial Services Division</div>
                </div>
            </div>
            <div class="report-title-section">
                <h1 class="report-title">PAYROLL SUMMARY REPORT</h1>
                <div class="meta-data">
                    <div><strong>Run ID:</strong> ${runId}</div>
                    <div><strong>Period:</strong> ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}</div>
                    <div><strong>Report Date:</strong> ${reportDate}</div>
                </div>
            </div>
        </div>

        <div class="section-label">Status & Approvals</div>
        
        <!-- Status Grid -->
        <div class="status-grid">
            <!-- HR Verification -->
            <div class="status-card">
                <div class="badge-row">
                    <span class="badge badge-verified">VERIFIED (HR)</span>
                    <span class="check-icon">●</span>
                </div>
                <div class="signature-placeholder">
                    <div class="signature-line"></div>
                </div>
                <div class="signee-info">
                    <div class="signee-name">Marilyn Reloba</div>
                    <div class="signee-role">Human Resources Director</div>
                </div>
                <div class="timestamp">Timestamp: ${formatFullTimestamp(data.hr_review_date)}</div>
            </div>

            <!-- Operations Verification -->
            <div class="status-card">
                <div class="badge-row">
                    <span class="badge badge-verified">VERIFIED (OPS)</span>
                    <span class="check-icon">●</span>
                </div>
                <div class="signature-placeholder">
                    <div class="signature-line"></div>
                </div>
                <div class="signee-info">
                    <div class="signee-name">Victorio Reloba Jr.</div>
                    <div class="signee-role">Operations Manager</div>
                </div>
                <div class="timestamp">Timestamp: ${formatFullTimestamp(data.operations_review_date)}</div>
            </div>

            <!-- Executive Authorization -->
            <div class="status-card">
                <div class="badge-row">
                    <span class="badge badge-authorized">AUTHORIZED</span>
                    <span class="check-icon">●</span>
                </div>
                <div class="signature-placeholder">
                    <div class="signature-line"></div>
                </div>
                <div class="signee-info">
                    <div class="signee-name">Anna Liza Rodriguez</div>
                    <div class="signee-role">Executive Vice President</div>
                </div>
                <div class="timestamp">Release Date: ${formatDate(data.evp_review_date || new Date().toISOString())}</div>
            </div>
        </div>

        <!-- Main Payload Table -->
        <table>
            <thead>
                <tr>
                    <th style="width: 40%">Employee Name</th>
                    <th style="width: 15%">Employee ID</th>
                    <th style="width: 15%" class="text-right">Gross Pay</th>
                    <th style="width: 15%" class="text-right">Deductions</th>
                    <th style="width: 15%" class="text-right">Net Pay</th>
                </tr>
            </thead>
            <tbody>
                ${data.payslips.map((ps: any) => `
                    <tr>
                        <td style="font-weight: 500;">${ps.lastName.toUpperCase()}, ${ps.firstName}</td>
                        <td class="emp-id">${ps.employeeNumber}</td>
                        <td class="text-right val-gross">${formatCurrency(ps.grossPay).replace('₱', '₱ ')}</td>
                        <td class="text-right val-deduction">(${formatCurrency(ps.totalDeductions).replace('₱', '')})</td>
                        <td class="text-right val-net">${formatCurrency(ps.netPay).replace('₱', '₱ ')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Bottom Summary Section -->
        <div class="bottom-section">
            <div class="confidential-note">
                <div style="font-weight: bold; margin-bottom: 5px; color: #6b7280;">CONFIDENTIAL INFORMATION</div>
                This document is a formal record of payroll disbursement. Unauthorized access or reproduction is strictly prohibited and may be subject to legal action.
            </div>
            
            <div class="summary-box">
                <div class="summary-title">Financial Summary</div>
                <div class="summary-row">
                    <span>Total Gross Pay</span>
                    <span>${formatCurrency(data.summary.totalGrossPay).replace('₱', '₱ ')}</span>
                </div>
                <div class="summary-row">
                    <span>Total Deductions</span>
                    <span class="deduction-highlight">(${formatCurrency(data.summary.totalDeductions).replace('₱', '')})</span>
                </div>
                <div class="summary-row total">
                    <span>TOTAL NET PAY</span>
                    <span class="amount-highlight">${formatCurrency(data.summary.totalNetPay).replace('₱', '₱ ')}</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="report-footer">
            <span>PR-ID: ${runId}  |  SYSTEM GENERATED</span>
            <span>PAGE 1 OF 1</span>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Generate HTML for 3-up Payslips (Landscape)
 */
function generatePayslipsPDFHTML(data: any): string {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatMoney = (amount: number) => {
        return amount?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
    };

    // Helper to chunk payslips into groups of 3
    const chunkArray = (arr: any[], size: number) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    const payslipChunks = chunkArray(data.payslips, 3);
    const period = `${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`;

    // CSS for the layout
    const styles = `
        @page {
            size: letter landscape; /* 11in x 8.5in */
            margin: 0.25in;
        }
        * { box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 0;
        }
        .page-container {
            display: flex;
            width: 100%;
            height: 100vh; /* Approximate full height */
            page-break-after: always;
            justify-content: space-between;
        }
        .payslip-col {
            width: 32%; /* 3 columns with gap */
            padding: 10px;
            border: 1px solid #ccc;
        }
        .header-section {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
        }
        .logo-box {
            width: 50px;
            height: 50px;
            border: 2px solid #065F46; /* Emerald green */
            color: #065F46;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 10px;
            margin-right: 10px;
        }
        .company-details {
            font-size: 9px;
            color: #333;
        }
        .company-name {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
        }
        .slogan {
            font-style: italic;
            font-size: 9px;
            color: #d946ef; /* Magenta-ish */
            margin-bottom: 2px;
        }
        .payslip-title {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin: 10px 0;
            text-decoration: underline;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .label {
            font-weight: bold;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
        }
        .data-table td {
            border: 1px solid #ddd;
            padding: 4px;
        }
        .amount-col {
            text-align: right;
            width: 80px;
        }
        .section-header {
            background-color: #f3f4f6;
            font-weight: bold;
        }
        .net-pay-row {
            font-weight: bold;
            font-size: 11px;
            background-color: #e5e7eb;
            border-top: 2px solid #000;
        }
        .footer-section {
            margin-top: 20px;
        }
        .signature-line {
            margin-top: 25px;
            border-top: 1px solid #000;
            text-align: center;
            padding-top: 2px;
            font-size: 9px;
        }
        .prepared-by {
            margin-top: 10px;
        }
        .received-by {
            margin-top: 10px;
        }
    `;

    // Payslip Template Function
    const renderPayslip = (ps: any) => {
        const basic = ps.basicPay || 0;
        const regAllow = ps.regularAllowance || 0;
        const specAllow = ps.specialAllowance || 0;
        const holiday = ps.holidayPay || 0;
        const totalEarnings = ps.grossPay || 0;
        const companyLoanBal = ps.companyLoanBalance || 0;

        // Deductions
        const cashAdv = ps.cashAdvance || 0;
        const cashFund = ps.companyFunds || 0; // "Cash Fund"
        const phic = ps.phic || 0;
        const pagibig = ps.pagibig || 0;
        const pagibigLoan = ps.pagibigLoan || 0;
        const companyLoan = ps.companyLoan || 0; // "Emergency Loan" mapping
        const sss = ps.sss || 0;
        const sssLoan = ps.sssLoan || 0;
        const otherDed = ps.otherDeductions || 0;

        // Sum up displayed deductions to match total
        const totalDed = ps.totalDeductions || 0;
        const netPay = ps.netPay || 0;

        return `
        <div class="payslip-col">
            <div class="header-section">
                <div class="logo-box">
                    MELANN
                </div>
                <div class="company-details">
                    <div class="company-name">LENDING INVESTOR CORPORATION</div>
                    <div class="slogan">Kaagapay mo sa Pag-unlad</div>
                    <div>943 Purok II, Brgy. Bagong Buhay, Ormoc City</div>
                    <div>Contact Nos. (053)561-8659, 09190085182</div>
                </div>
            </div>

            <div class="payslip-title">PAYSLIP</div>
            
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 5px;">
                <span class="label">Period Covered:</span>
                <span>${period}</span>
            </div>

            <table class="data-table">
                <tr>
                    <td>Name</td>
                    <td colspan="2" style="font-weight: bold;">${ps.lastName}, ${ps.firstName}</td>
                </tr>
                <tr>
                    <td>Position</td>
                    <td colspan="2">${ps.position}</td>
                </tr>
                
                <!-- Earnings -->
                <tr>
                    <td>Basic Pay</td>
                    <td></td>
                    <td class="amount-col">${formatMoney(basic)}</td>
                </tr>
                <tr>
                    <td>No. of Worked Days</td>
                    <td style="text-align: center;">${ps.payrollDays.toFixed(1)}</td>
                    <td class="amount-col">-</td>
                </tr>
                 <tr>
                    <td>No. of Holidays</td>
                    <td style="text-align: center;">${(ps.holidayPay > 0 ? '1.0' : '0.0')}</td>
                     <td class="amount-col">${holiday > 0 ? formatMoney(holiday) : '-'}</td>
                </tr>
                <tr>
                    <td>Special Allowance</td>
                    <td></td>
                    <td class="amount-col">${specAllow > 0 ? formatMoney(specAllow) : '-'}</td>
                </tr>
                <tr>
                    <td>Regular Allowance</td>
                    <td></td>
                    <td class="amount-col">${regAllow > 0 ? formatMoney(regAllow) : '-'}</td>
                </tr>
                <tr style="font-weight: bold; background: #f9f9f9;">
                    <td>Total Pay</td>
                    <td></td>
                    <td class="amount-col">${formatMoney(totalEarnings)}</td>
                </tr>

                <!-- Deductions -->
                <tr><td colspan="3" style="font-style: italic; color: #555;">Deductions:</td></tr>
                
                <tr>
                    <td>Cash Advance</td>
                    <td></td>
                    <td class="amount-col">${cashAdv > 0 ? formatMoney(cashAdv) : '-'}</td>
                </tr>
                <tr>
                    <td>Cash Fund</td>
                    <td></td>
                    <td class="amount-col">${cashFund > 0 ? formatMoney(cashFund) : '-'}</td>
                </tr>
                <tr>
                    <td>Philhealth</td>
                    <td></td>
                    <td class="amount-col">${phic > 0 ? formatMoney(phic) : '-'}</td>
                </tr>
                <tr>
                    <td>PAG-IBIG</td>
                    <td></td>
                    <td class="amount-col">${pagibig > 0 ? formatMoney(pagibig) : '-'}</td>
                </tr>
                <tr>
                    <td>Pag-ibig Loan</td>
                    <td></td>
                    <td class="amount-col">${pagibigLoan > 0 ? formatMoney(pagibigLoan) : '-'}</td>
                </tr>
                <tr>
                    <td>SSS</td>
                    <td></td>
                    <td class="amount-col">${sss > 0 ? formatMoney(sss) : '-'}</td>
                </tr>
                <tr>
                    <td>SSS Loan</td>
                    <td></td>
                    <td class="amount-col">${sssLoan > 0 ? formatMoney(sssLoan) : '-'}</td>
                </tr>
                <tr>
                    <td>Company/Emergency Loan</td>
                    <td></td>
                    <td class="amount-col">${companyLoan > 0 ? formatMoney(companyLoan) : '-'}</td>
                </tr>
                ${otherDed > 0 ? `
                <tr>
                    <td>Other Deductions</td>
                    <td></td>
                    <td class="amount-col">${formatMoney(otherDed)}</td>
                </tr>
                ` : ''}
                
                <tr style="font-weight: bold; border-top: 1px solid #777;">
                    <td>Total Deduction</td>
                    <td></td>
                    <td class="amount-col">${formatMoney(totalDed)}</td>
                </tr>
                
                <tr class="net-pay-row">
                    <td>NET PAY</td>
                    <td></td>
                    <td class="amount-col" style="font-size: 12px;">${formatMoney(netPay)}</td>
                </tr>
                 <tr>
                    <td colspan="3" style="font-size: 9px; font-style: italic; text-align: right;">
                        Company Loan Balance: <span style="font-weight: bold;">${formatMoney(companyLoanBal)}</span>
                    </td>
                </tr>
            </table>

            <div class="footer-section">
                <div class="prepared-by">
                     <div style="font-size: 9px; margin-bottom: 15px;">Prepared by:</div>
                     <div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>
                     <div style="text-align: center; font-weight: bold; font-size: 10px;">Marilyn O. Reloba</div>
                </div>
                 <div class="received-by" style="margin-top: 20px;">
                     <div style="font-size: 9px; margin-bottom: 15px;">Received by:</div>
                     <div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>
                     <div style="text-align: center;">Signature over Printed Name</div>
                </div>
            </div>
        </div>
        `;
    };

    const pages = payslipChunks.map(chunk => `
        <div class="page-container">
            ${chunk.map(renderPayslip).join('')}
            ${chunk.length < 3 ? '<div class="payslip-col" style="visibility: hidden;"></div>'.repeat(3 - chunk.length) : ''}
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payslips - ${data.runNumber}</title>
    <style>${styles}</style>
</head>
<body>
    ${pages}
</body>
</html>
    `;
}

