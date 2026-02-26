/**
 * Payroll Export Utilities
 * Client-side utilities for generating Excel and PDF exports
 */

import { formatCurrency } from './payroll-calculations';

import * as ExcelJS from 'exceljs';

/**
 * Generate and download Excel file from payroll data matching the ML format
 */
export async function downloadExcelExport(data: {
    runNumber: string;
    branch: string;
    periodEnd: string;
    periodStart: string;
    cutoff: string;
    payslips: any[];
}) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payroll');

    // 1. Setup Page & Base Styles
    sheet.pageSetup.orientation = 'landscape';
    sheet.pageSetup.fitToPage = true;
    sheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

    // Default Font
    sheet.columns.forEach(col => {
        col.font = { name: 'Calibri', size: 10 };
    });

    // 2. Company Address Block (Rows 1-4)
    sheet.mergeCells('A1:L1');
    sheet.getCell('A1').value = 'MELANN LENDING INVESTOR CORPORATION';
    sheet.getCell('A1').font = { name: 'Arial', size: 12, bold: true };
    // We would put logo somewhere but without access to the image file, text is enough

    sheet.mergeCells('A2:L2');
    sheet.getCell('A2').value = 'Kaagapay mo sa Pag-unlad';
    sheet.getCell('A2').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF800000' } }; // brownish red

    sheet.mergeCells('A3:P3');
    sheet.getCell('A3').value = '943 Purok II, Brgy. Bagong Buhay, Ormoc City';
    sheet.getCell('A3').font = { name: 'Arial', size: 8 };

    sheet.mergeCells('A4:P4');
    sheet.getCell('A4').value = 'Contact Nos. (053)561-8659, 09190085182, 09176794449';
    sheet.getCell('A4').font = { name: 'Arial', size: 8 };

    // Row 5: Empty Spacer

    // Row 6: Title
    sheet.mergeCells('A6:E6');
    sheet.getCell('A6').value = 'P A Y R O L L';
    sheet.getCell('A6').font = { name: 'Arial', size: 16, bold: true };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    sheet.getCell('C6').value = `for the Period ${formatDate(data.periodStart).split(',')[0].split(' ')[0]} ${new Date(data.periodStart).getDate()}-${new Date(data.periodEnd).getDate()}, ${new Date(data.periodEnd).getFullYear()}`;
    sheet.getCell('C6').font = { name: 'Arial', size: 12, bold: true, underline: true };
    sheet.getCell('C6').alignment = { horizontal: 'left', vertical: 'bottom' };

    // Row 7: Acknowledge text
    sheet.mergeCells('A7:T7');
    sheet.getCell('A7').value = 'WE HEREBY ACKNOWLEDGE to have received from MELANN LENDING INVESTOR CORP., 943 Purok 2, Brgy. Bagong Buhay, Ormoc City, 6541 Philippines, the sum specified opposite our respective names, as full compensation for our services rendered.';
    sheet.getCell('A7').font = { name: 'Arial', size: 8, italic: true };

    // Row 8: Empty Spacer

    // 3. Define the Headers (Rows 9 & 10)
    // We create the bounds first
    const headerCols = [
        { key: 'num', width: 4 },            // A
        { key: 'name', width: 25 },          // B
        { key: 'daily', width: 8 },          // C
        { key: 'days', width: 8 },           // D
        { key: 'regPay', width: 10 },        // E
        { key: 'holNo', width: 6 },          // F
        { key: 'holAmt', width: 8 },         // G
        { key: 'allReg', width: 8 },         // H
        { key: 'allSpec', width: 8 },        // I
        { key: 'allTot', width: 8 },         // J
        { key: 'totDays', width: 8 },        // K
        { key: 'gross', width: 11 },         // L
        { key: 'phic', width: 8 },           // M
        { key: 'pagibig', width: 8 },        // N
        { key: 'cashFund', width: 8 },       // O
        { key: 'pagLoan', width: 8 },        // P
        { key: 'cashAdv', width: 10 },       // Q
        { key: 'emLoan', width: 10 },        // R
        { key: 'dedTot', width: 11 },        // S
        { key: 'net', width: 12 },           // T
        { key: 'sig', width: 20 },           // U
    ];

    sheet.columns = headerCols;

    // Apply header styles to Row 9 and 10
    const borderAll = {
        top: { style: 'thin' as any }, left: { style: 'thin' as any }, bottom: { style: 'thin' as any }, right: { style: 'thin' as any }
    };
    const headerFont = { name: 'Arial', size: 9, bold: true };
    const centerAlign = { horizontal: 'center' as any, vertical: 'middle' as any, wrapText: true };

    // Single Row merged headers
    sheet.mergeCells('A9:B10'); sheet.getCell('A9').value = 'Names of Employees';
    sheet.mergeCells('C9:C10'); sheet.getCell('C9').value = 'Daily Rate';
    sheet.mergeCells('D9:D10'); sheet.getCell('D9').value = 'Regular Days Worked';
    sheet.mergeCells('E9:E10'); sheet.getCell('E9').value = 'Regular Pay';

    sheet.mergeCells('F9:G9'); sheet.getCell('F9').value = 'Holidays';
    sheet.getCell('F10').value = 'No. of';
    sheet.getCell('G10').value = 'Amount';

    sheet.mergeCells('H9:J9'); sheet.getCell('H9').value = 'Allowance';
    sheet.getCell('H10').value = 'Regular';
    sheet.getCell('I10').value = 'Special';
    sheet.getCell('J10').value = 'Total';

    sheet.mergeCells('K9:K10'); sheet.getCell('K9').value = 'Total Days Worked';
    sheet.mergeCells('L9:L10'); sheet.getCell('L9').value = 'TOTAL\nINCOME';

    sheet.mergeCells('M9:S9'); sheet.getCell('M9').value = 'DEDUCTIONS';
    sheet.getCell('M10').value = 'PHIC';
    sheet.getCell('N10').value = 'Pag-ibig';
    sheet.getCell('O10').value = 'Cash\nFund';
    sheet.getCell('P10').value = 'PAG-\nIBIG';
    sheet.getCell('Q10').value = 'Cash\nAdvance';
    sheet.getCell('R10').value = 'Emergency\nLoan';
    sheet.getCell('S10').value = 'TOTAL';

    sheet.mergeCells('T9:T10'); sheet.getCell('T9').value = 'NET PAY';
    sheet.mergeCells('U9:U10'); sheet.getCell('U9').value = 'Signature of Payee';

    // Apply borders and fonts to A9:U10
    for (let r = 9; r <= 10; r++) {
        for (let c = 1; c <= 21; c++) {
            const cell = sheet.getCell(r, c);
            cell.border = borderAll;
            cell.font = headerFont;
            cell.alignment = centerAlign;
            if (c === 12 || c >= 20) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }; // Slight bg for totals
        }
    }

    // 4. Data Rows
    let currentRow = 11;
    let totals = {
        days: 0, regPay: 0, holAmt: 0, allReg: 0, allSpec: 0, allTot: 0,
        gross: 0, phic: 0, pagibig: 0, cashFund: 0, pagLoan: 0, cashAdv: 0, emLoan: 0, dedTot: 0, net: 0
    };

    // Sort alphabetically by last name before processing as per standard
    const sortedPayslips = [...data.payslips].sort((a, b) => (a.lastName || a.last_name || '').localeCompare(b.lastName || b.last_name || ''));

    sortedPayslips.forEach((ps, index) => {
        const lastName = ps.lastName || ps.last_name || '';
        const firstName = ps.firstName || ps.first_name || '';
        const name = `${lastName.toUpperCase()}, ${firstName}`;

        const daily = ps.dailyRate || ps.daily_rate || 0;
        const days = ps.payrollDays || ps.payroll_days || 0;
        const regPay = ps.basicPay || ps.basic_pay || 0;
        const holNo = (ps.holidayPay || ps.holiday_pay || 0) > 0 ? 1 : 0;
        const holAmt = ps.holidayPay || ps.holiday_pay || 0;
        const allReg = ps.regularAllowance || ps.regular_allowance || 0;
        const allSpec = ps.specialAllowance || ps.special_allowance || 0;
        const allTot = allReg + allSpec;
        const totDays = days; // Assumed equal for now
        const gross = ps.grossPay || ps.gross_pay || 0;

        const phic = ps.phic || 0;
        const pagibig = ps.pagibig || 0;
        const cashFund = ps.companyFunds || ps.company_funds || 0;
        const pagLoan = ps.pagibigLoan || ps.pagibig_loan || 0;
        const cashAdv = ps.cashAdvance || ps.cash_advance || 0;
        const emLoan = ps.companyLoan || ps.company_loan || 0; // Emergency Loan
        const dedTot = phic + pagibig + cashFund + pagLoan + cashAdv + emLoan;
        const net = ps.netPay || ps.net_pay || 0;

        // Add to totals
        totals.days += days;
        totals.regPay += regPay;
        totals.holAmt += holAmt;
        totals.allReg += allReg;
        totals.allSpec += allSpec;
        totals.allTot += allTot;
        totals.gross += gross;
        totals.phic += phic;
        totals.pagibig += pagibig;
        totals.cashFund += cashFund;
        totals.pagLoan += pagLoan;
        totals.cashAdv += cashAdv;
        totals.emLoan += emLoan;
        totals.dedTot += dedTot;
        totals.net += net;

        const row = sheet.getRow(currentRow);
        row.values = [
            index + 1, name, daily, days, regPay, holNo, holAmt || '-', allReg || '-', allSpec || '-', allTot || '-',
            totDays, gross, phic || '-', pagibig || '-', cashFund || '-', pagLoan || '-', cashAdv || '-', emLoan || '-', dedTot || '-', net, ''
        ];

        // Style the data row
        for (let c = 1; c <= 21; c++) {
            const cell = row.getCell(c);
            cell.border = borderAll;
            cell.alignment = { vertical: 'middle', horizontal: (c <= 2) ? 'left' : (c === 21 ? 'center' : 'right') };

            // Number formatting
            if (c >= 3 && c <= 20 && c !== 4 && c !== 6 && c !== 11) {
                cell.numFmt = '#,##0.00';
            }
            if (c === 12 || c === 19 || c === 20) {
                cell.font = { bold: true };
            }
        }
        currentRow++;
    });

    // Row for Totals
    const tRow = sheet.getRow(currentRow);
    tRow.values = [
        'TOTAL', '', '', '', totals.regPay, '', totals.holAmt || '-', totals.allReg || '-', totals.allSpec || '-', totals.allTot || '-',
        '', totals.gross, totals.phic || '-', totals.pagibig || '-', totals.cashFund || '-', totals.pagLoan || '-', totals.cashAdv || '-', totals.emLoan || '-', totals.dedTot, 0.00, totals.net, '', 0.00
    ];

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    tRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Adjust total row values position
    tRow.getCell(5).value = totals.regPay;
    tRow.getCell(20).value = totals.net;
    tRow.getCell(21).value = '';
    tRow.getCell(22).value = 0.00; // The weird red 0.00 in the image

    for (let c = 1; c <= 22; c++) {
        const cell = tRow.getCell(c);
        if (c <= 21) cell.border = borderAll;
        cell.font = { bold: true };
        if (c >= 5 && c <= 20) {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (c === 22) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.border = borderAll;
        }
    }

    currentRow += 2;

    // Footer Certify Text
    sheet.mergeCells(`B${currentRow}:P${currentRow}`);
    sheet.getCell(`B${currentRow}`).value = 'I HEREBY CERTIFY that I have personally paid in cash to each employee whose names appear in the above payroll the amount set opposite his name. The amount paid in this payroll is';
    sheet.getCell(`B${currentRow}`).font = { name: 'Arial', size: 8 };
    sheet.getCell(`B${currentRow}`).alignment = { horizontal: 'left' };

    sheet.mergeCells(`T${currentRow}:U${currentRow}`);
    sheet.getCell(`T${currentRow}`).value = totals.net;
    sheet.getCell(`T${currentRow}`).font = { name: 'Arial', size: 10, bold: true };
    sheet.getCell(`T${currentRow}`).numFmt = '#,##0.00';
    sheet.getCell(`T${currentRow}`).alignment = { horizontal: 'left' };

    currentRow += 4;

    // Signatures
    sheet.mergeCells(`P${currentRow}:Q${currentRow}`);
    sheet.getCell(`P${currentRow}`).value = 'MARILYN O. RELOBA';
    sheet.getCell(`P${currentRow}`).font = { name: 'Arial', size: 10, bold: true, underline: true };
    sheet.getCell(`P${currentRow}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`T${currentRow}:U${currentRow}`);
    sheet.getCell(`T${currentRow}`).value = 'ANNA LIZA R. DOMINGONO';
    sheet.getCell(`T${currentRow}`).font = { name: 'Arial', size: 10, bold: true, underline: true };
    sheet.getCell(`T${currentRow}`).alignment = { horizontal: 'center' };

    currentRow++;
    sheet.mergeCells(`P${currentRow}:Q${currentRow}`);
    sheet.getCell(`P${currentRow}`).value = 'Paymaster';
    sheet.getCell(`P${currentRow}`).font = { name: 'Arial', size: 10 };
    sheet.getCell(`P${currentRow}`).alignment = { horizontal: 'center' };

    sheet.mergeCells(`T${currentRow}:U${currentRow}`);
    sheet.getCell(`T${currentRow}`).value = 'Manager';
    sheet.getCell(`T${currentRow}`).font = { name: 'Arial', size: 10 };
    sheet.getCell(`T${currentRow}`).alignment = { horizontal: 'center' };

    // Write to Blob
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payroll_Register_${data.runNumber}.xlsx`;
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
    const formatDateText = (start: string, end: string) => {
        if (!start || !end) return '';
        const d1 = new Date(start);
        const d2 = new Date(end);
        return `${d1.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${d2.getDate()}, ${d2.getFullYear()}`;
    };

    const formatNumber = (num: number) => num ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

    const sortedPayslips = [...data.payslips].sort((a, b) => (a.lastName || a.last_name || '').localeCompare(b.lastName || b.last_name || ''));

    let totals = { days: 0, regPay: 0, holAmt: 0, allReg: 0, allSpec: 0, allTot: 0, gross: 0, phic: 0, pagibig: 0, cashFund: 0, pagLoan: 0, cashAdv: 0, emLoan: 0, dedTot: 0, net: 0 };

    const rowsHtml = sortedPayslips.map((ps, index) => {
        const lastName = ps.lastName || ps.last_name || '';
        const firstName = ps.firstName || ps.first_name || '';
        const name = `${lastName.toUpperCase()}, ${firstName}`;

        const daily = ps.dailyRate || ps.daily_rate || 0;
        const days = ps.payrollDays || ps.payroll_days || 0;
        const regPay = ps.basicPay || ps.basic_pay || 0;
        const holNo = (ps.holidayPay || ps.holiday_pay || 0) > 0 ? 1 : 0;
        const holAmt = ps.holidayPay || ps.holiday_pay || 0;
        const allReg = ps.regularAllowance || ps.regular_allowance || 0;
        const allSpec = ps.specialAllowance || ps.special_allowance || 0;
        const allTot = allReg + allSpec;
        const totDays = days;
        const gross = ps.grossPay || ps.gross_pay || 0;

        const phic = ps.phic || 0;
        const pagibig = ps.pagibig || 0;
        const cashFund = ps.companyFunds || ps.company_funds || 0;
        const pagLoan = ps.pagibigLoan || ps.pagibig_loan || 0;
        const cashAdv = ps.cashAdvance || ps.cash_advance || 0;
        const emLoan = ps.companyLoan || ps.company_loan || 0;
        const dedTot = phic + pagibig + cashFund + pagLoan + cashAdv + emLoan;
        const net = ps.netPay || ps.net_pay || 0;

        totals.regPay += regPay; totals.holAmt += holAmt; totals.allReg += allReg; totals.allSpec += allSpec; totals.allTot += allTot;
        totals.gross += gross; totals.phic += phic; totals.pagibig += pagibig; totals.cashFund += cashFund; totals.pagLoan += pagLoan; totals.cashAdv += cashAdv; totals.emLoan += emLoan; totals.dedTot += dedTot; totals.net += net;

        return `<tr>
            <td>${index + 1}</td>
            <td class="text-left" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${name}</td>
            <td>${daily}</td>
            <td>${days}</td>
            <td class="text-right">${formatNumber(regPay)}</td>
            <td>${holNo || 0}</td>
            <td class="text-right">${formatNumber(holAmt)}</td>
            <td class="text-right">${formatNumber(allReg)}</td>
            <td class="text-right">${formatNumber(allSpec)}</td>
            <td class="text-right">${formatNumber(allTot)}</td>
            <td>${totDays}</td>
            <td class="text-right text-bold" style="background: #e5e7eb;">${formatNumber(gross)}</td>
            <td class="text-right">${formatNumber(phic)}</td>
            <td class="text-right">${formatNumber(pagibig)}</td>
            <td class="text-right">${formatNumber(cashFund)}</td>
            <td class="text-right">${formatNumber(pagLoan)}</td>
            <td class="text-right">${formatNumber(cashAdv)}</td>
            <td class="text-right">${formatNumber(emLoan)}</td>
            <td class="text-right text-bold" style="background: #e5e7eb;">${formatNumber(dedTot)}</td>
            <td class="text-right"></td>
            <td class="text-right text-bold">${formatNumber(net)}</td>
            <td></td>
            <td></td>
        </tr>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payroll Register - ${data.runNumber}</title>
    <style>
        @page {
            size: legal landscape;
            margin: 5mm;
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 8px;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        .header-box {
            display: flex;
            align-items: flex-start;
            margin-bottom: 25px;
        }
        .logo-box {
            border: 2px solid #000;
            padding: 5px 15px;
            border-radius: 4px;
            font-weight: 900;
            font-size: 20px;
            color: #10b981;
            margin-right: 15px;
            box-shadow: 2px 2px 0 #000;
            background: #d1fae5;
        }
        .payroll-title-wrap {
            margin-top: 15px;
            margin-bottom: 10px;
            display: flex;
            align-items: baseline;
            gap: 15px;
        }
        .payroll-title {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.3em;
        }
        .payroll-period {
            font-size: 11px;
        }
        .payroll-period span {
            font-weight: bold;
            text-decoration: underline;
        }
        .ack-text {
            font-size: 8px;
            font-style: italic;
            margin-bottom: 10px;
            max-width: 90%;
        }
        .payroll-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5px;
            text-align: center;
        }
        .payroll-table th, .payroll-table td {
            border: 1px solid #000;
            padding: 3px 2px;
        }
        .payroll-table th {
            font-weight: bold;
            background: #fdfdfd;
        }
        .text-left { text-align: left !important; }
        .text-right { text-align: right !important; }
        .text-bold { font-weight: bold; }
        .bg-red { background-color: #ef4444 !important; color: white !important; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header-box">
        <div class="logo-box">MELANN</div>
        <div>
            <div style="font-weight: 900; font-size: 13px;">LENDING INVESTOR CORPORATION</div>
            <div style="color: #b91c1c; font-style: italic; font-size: 10px;">Kaagapay mo sa Pag-unlad</div>
            <div style="font-size: 9px;">943 Purok II, Brgy. Bagong Buhay, Ormoc City</div>
            <div style="font-size: 9px;">Contact Nos. (053)561-8659, 09190085182, 09176794449</div>
            <div style="font-size: 9px; color: #2563eb;">Email Address: melann.lic2016@gmail.com</div>
        </div>
    </div>

    <div class="payroll-title-wrap">
        <div class="payroll-title">P A Y R O L L</div>
        <div class="payroll-period">for the Period <span>${formatDateText(data.periodStart, data.periodEnd)}</span></div>
    </div>

    <div class="ack-text">
        WE HEREBY ACKNOWLEDGE to have received from MELANN LENDING INVESTOR CORP., 943 Purok 2, Brgy. Bagong Buhay, Ormoc City, 6541 Philippines, the sum specified opposite our respective names, as full compensation for our services rendered.
    </div>

    <table class="payroll-table">
        <thead>
            <tr>
                <th rowspan="2" style="width: 2%"></th>
                <th rowspan="2" style="width: 14%">Names of Employees</th>
                <th rowspan="2" style="width: 3%">Daily<br>Rate</th>
                <th rowspan="2" style="width: 3%">Regular<br>Days<br>Worked</th>
                <th rowspan="2" style="width: 5%">Regular<br>Pay</th>
                <th colspan="2" style="width: 5%">Holidays</th>
                <th colspan="3" style="width: 9%">Allowance</th>
                <th rowspan="2" style="width: 3%">Total<br>Days<br>Worked</th>
                <th rowspan="2" style="width: 6%; background: #e5e7eb;">TOTAL<br>INCOME</th>
                <th colspan="7" style="width: 28%">DEDUCTIONS</th>
                <th rowspan="2" style="width: 2%"></th>
                <th rowspan="2" style="width: 6%;">NET PAY</th>
                <th rowspan="2" style="width: 2%"></th>
                <th rowspan="2" style="width: 12%; border: 2px solid #10b981;">Signature of Payee</th>
            </tr>
            <tr>
                <th>No.<br>of</th>
                <th>Amount</th>
                <th>Regula<br>r</th>
                <th>Special</th>
                <th>Total</th>
                <th>PHIC</th>
                <th>Pag-ibig</th>
                <th>Cash<br>Fund</th>
                <th>PAG-<br>IBIG</th>
                <th>Cash<br>Advanc</th>
                <th>Emergenc<br>y Loan</th>
                <th style="background: #e5e7eb;">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            ${rowsHtml}
            
            <tr class="text-bold">
                <td colspan="4" class="text-center" style="letter-spacing: 0.5em;">T O T A L</td>
                <td class="text-right">${formatNumber(totals.regPay)}</td>
                <td>0</td>
                <td class="text-right">${formatNumber(totals.holAmt)}</td>
                <td class="text-right">${formatNumber(totals.allReg)}</td>
                <td class="text-right">${formatNumber(totals.allSpec)}</td>
                <td class="text-right">${formatNumber(totals.allTot)}</td>
                <td></td>
                <td class="text-right" style="background: #e5e7eb;">${formatNumber(totals.gross)}</td>
                <td class="text-right">${formatNumber(totals.phic)}</td>
                <td class="text-right">${formatNumber(totals.pagibig)}</td>
                <td class="text-right">${formatNumber(totals.cashFund)}</td>
                <td class="text-right">${formatNumber(totals.pagLoan)}</td>
                <td class="text-right">${formatNumber(totals.cashAdv)}</td>
                <td class="text-right">${formatNumber(totals.emLoan)}</td>
                <td class="text-right" style="background: #e5e7eb;">${formatNumber(totals.dedTot)}</td>
                <td class="text-right">0.00</td>
                <td class="text-right">${formatNumber(totals.net)}</td>
                <td class="text-right">######</td>
                <td class="text-center bg-red">0.00</td>
            </tr>
        </tbody>
    </table>

    <div style="font-size: 9px; margin-top: 10px; display: flex; align-items: baseline;">
        <span style="margin-right: 5px;">I HEREBY CERTIFY that I have personally paid in cash to each employee whose names appear in the above payroll the amount set opposite his name. The amount paid in this payroll is</span>
        <span style="font-weight: bold; font-size: 11px; border-bottom: 1px solid #000; padding: 0 10px;">${formatNumber(totals.net)}</span>
    </div>

    <table style="width: 100%; border: none; margin-top: 25px; font-size: 9px; text-align: left;">
        <tr>
            <td style="width: 25%; border: none; padding: 0;">Prepared by: _______________________</td>
            <td style="width: 25%; border: none; padding: 0;">Reviewed by: _______________________</td>
            <td style="width: 25%; border: none; padding: 0;">Approved for Payment: _______________________</td>
            <td style="width: 25%; border: none; padding: 0;">Payment Date: _______________________</td>
        </tr>
    </table>
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

