'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface ReportData {
    attendanceSummary: any[];
    leaveUsage: {
        id: number;
        name: string;
        department: string;
        entitlement: number;
        used: number;
        remaining: number;
        filedValidation?: number;
        details?: Record<string, number>;
    }[];
    payrollSummary: any;
    complianceAudit: any[];
    tenureData: any[];
    governmentRemittance: any;
    headcount: {
        byDepartment: { name: string, count: number }[];
        byBranch: { name: string, count: number }[];
        total: number;
        growthThisYear: number;
    };
    attendance_metrics?: any;
    latesAbsencesLog: any[];
    latesAbsencesSummary: {
        id: number;
        name: string;
        department: string;
        branch?: string;
        lateCount: number;
        absentCount: number;
        isThresholdExceeded: boolean;
    }[];
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({
        reportType: 'attendance',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        department: 'All Departments',
        branch: 'All Branches',
        sortBy: 'Name',
        column: 'All Columns',
        filter: 'None'
    });
    const [branches, setBranches] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    const reportOptions = [
        { id: 'attendance', title: 'Attendance Summary', action: 'genAttendancePDF' },
        { id: 'latesAbsences', title: 'Lates and Absences', action: 'genLatesAbsencesPDF' },
        { id: 'leave', title: 'Leave Credits & Usage', action: 'genLeavePDF' },
        { id: 'payroll', title: 'Payroll Expenditure', action: 'genPayrollPDF' },
        { id: 'compliance', title: '201 File Compliance', action: 'genCompliancePDF' },
        { id: 'tenure', title: 'Tenure & Anniversaries', action: 'genTenurePDF' },
        { id: 'remittance', title: 'Government Remittance', action: 'genRemittancePDF' },
        { id: 'headcount', title: 'Headcount & Growth', action: 'genHeadcountPDF' },
    ];

    useEffect(() => {
        fetchReports();
    }, [config.startDate, config.endDate, config.branch]);

    useEffect(() => {
        fetchBranches();
        fetchDepartments();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/reports?start=${config.startDate}&end=${config.endDate}&branch=${config.branch}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/employees/branches', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const result = await res.json();
            if (Array.isArray(result)) {
                setBranches(result);
            } else {
                console.error('Branches response is not an array:', result);
                setBranches([]);
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/employees/departments', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const result = await res.json();
            if (Array.isArray(result)) {
                setDepartments(result);
            } else {
                console.error('Departments response is not an array:', result);
                setDepartments([]);
            }
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const filterData = (rows: any[]) => {
        if (!rows) return [];
        return rows.filter(row => {
            const deptMatch = config.department === 'All Departments' || row.department === config.department;
            const branchMatch = config.branch === 'All Branches' || row.branch === config.branch;
            return deptMatch && branchMatch;
        });
    };

    const addReportHeader = (doc: jsPDF, title: string) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(title, 14, 25);
        doc.setFontSize(10);
        doc.text(`Period: ${config.startDate} to ${config.endDate}`, 14, 32);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 160, 32);

        // Add Branch info to header if selected
        if (config.branch !== 'All Branches') {
            doc.text(`Branch: ${config.branch}`, 14, 37);
        }

        doc.setTextColor(0, 0, 0);
    };

    const handlePrint = () => {
        if (!data) return;
        const width = 1000;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const printWindow = window.open('', '', `width=${width},height=${height},left=${left},top=${top}`);
        if (!printWindow) return;

        const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 20px; font-family: Arial, sans-serif; font-size: 12px;";
        const thStyle = "background-color: #f3f4f6; color: #1f2937; font-weight: bold; padding: 10px; border: 1px solid #e5e7eb; text-align: left;";
        const tdStyle = "padding: 8px; border: 1px solid #e5e7eb; color: #374151;";

        let reportTitle = reportOptions.find(o => o.id === config.reportType)?.title || 'Report';
        let tableContent = '';

        if (config.reportType === 'latesAbsences' && data.latesAbsencesSummary) {
            let rows = filterData(data.latesAbsencesSummary || [])
                .map(row => `
                    <tr>
                        <td style="${tdStyle}">${row.name}</td>
                        <td style="${tdStyle}">${row.department}</td>
                        <td style="${tdStyle}; text-align: center; color: ${row.lateCount > 0 ? '#dc2626' : 'inherit'}; font-weight: ${row.lateCount > 0 ? 'bold' : 'normal'}">${row.lateCount}</td>
                        <td style="${tdStyle}; text-align: center;">${row.absentCount}</td>
                        <td style="${tdStyle}; text-align: right;">${row.isThresholdExceeded ? '<span style="color: #dc2626; font-weight: bold;">⚠️ EXCEEDED</span>' : '<span style="color: #16a34a;">Normal</span>'}</td>
                    </tr>
                `).join('');

            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Employee</th>
                        <th style="${thStyle}">Department</th>
                        <th style="${thStyle}; text-align: center;">Lates</th>
                        <th style="${thStyle}; text-align: center;">Absences</th>
                        <th style="${thStyle}; text-align: right;">Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            `;
        } else if (config.reportType === 'attendance' && data.attendanceSummary) {
            let rows = filterData(data.attendanceSummary || [])
                .map(row => `
                    <tr>
                         <td style="${tdStyle}">${row.name}</td>
                         <td style="${tdStyle}">${row.department}</td>
                         <td style="${tdStyle}; text-align: center;">${row.present}</td>
                         <td style="${tdStyle}; text-align: center; color: ${row.late > 0 ? '#dc2626' : 'inherit'};">${row.late}</td>
                         <td style="${tdStyle}; text-align: center; color: ${row.absent > 0 ? '#dc2626' : 'inherit'};">${row.absent}</td>
                         <td style="${tdStyle}; text-align: center;">${row.onLeave || 0}</td>
                         <td style="${tdStyle}; text-align: right;">${row.tardinessRate}%</td>
                    </tr>
                `).join('');

            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Employee</th>
                        <th style="${thStyle}">Department</th>
                        <th style="${thStyle}; text-align: center;">Present</th>
                        <th style="${thStyle}; text-align: center;">Late</th>
                        <th style="${thStyle}; text-align: center;">Absent</th>
                         <th style="${thStyle}; text-align: center;">On Leave</th>
                        <th style="${thStyle}; text-align: right;">Tardiness</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            `;
        } else if (config.reportType === 'leave' && data.leaveUsage) {
            let rows = filterData(data.leaveUsage || [])
                .map(row => `
                    <tr>
                         <td style="${tdStyle}">${row.name}</td>
                         <td style="${tdStyle}">${row.department}</td>
                         <td style="${tdStyle}; text-align: center;">${row.entitlement}</td>
                         <td style="${tdStyle}; text-align: center;">${row.used}</td>
                         <td style="${tdStyle}; text-align: center; font-weight: bold;">${row.remaining}</td>
                    </tr>
                `).join('');

            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Employee</th>
                        <th style="${thStyle}">Department</th>
                        <th style="${thStyle}; text-align: center;">Entitlement</th>
                        <th style="${thStyle}; text-align: center;">Used</th>
                        <th style="${thStyle}; text-align: center;">Balance</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            `;
        } else if (config.reportType === 'payroll' && data.payrollSummary) {
            const s = data.payrollSummary;
            tableContent = `
                <tbody>
                    <tr><td style="${tdStyle}">Total Basic Salaries</td><td style="${tdStyle}; text-align: right; font-weight: bold;">PHP ${Number(s.totalBasicRate).toLocaleString()}</td></tr>
                    <tr><td style="${tdStyle}">Total Allowances</td><td style="${tdStyle}; text-align: right; font-weight: bold;">PHP ${Number(s.totalAllowances).toLocaleString()}</td></tr>
                    <tr><td style="${tdStyle}">SSS Contributions</td><td style="${tdStyle}; text-align: right; font-weight: bold;">PHP ${Number(s.totalSSS).toLocaleString()}</td></tr>
                    <tr><td style="${tdStyle}">PhilHealth Contributions</td><td style="${tdStyle}; text-align: right; font-weight: bold;">PHP ${Number(s.totalPhilHealth).toLocaleString()}</td></tr>
                    <tr><td style="${tdStyle}">Pag-IBIG Contributions</td><td style="${tdStyle}; text-align: right; font-weight: bold;">PHP ${Number(s.totalPagIBIG).toLocaleString()}</td></tr>
                     <tr style="background: #fdf2f8;"><td style="${tdStyle}; font-weight: bold; font-size: 14px;">TOTAL MONTHLY LIABILITY</td><td style="${tdStyle}; text-align: right; font-weight: bold; font-size: 14px; color: #db2777;">PHP ${(Number(s.totalBasicRate) + Number(s.totalAllowances) + Number(s.totalSSS) + Number(s.totalPhilHealth) + Number(s.totalPagIBIG)).toLocaleString()}</td></tr>
                </tbody>
             `;
        } else if (config.reportType === 'remittance' && data.governmentRemittance) {
            const remit = data.governmentRemittance;
            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Agency</th>
                        <th style="${thStyle}">Amount to Remit</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="${tdStyle}">SSS Contribution Total</td><td style="${tdStyle}; font-weight: bold;">PHP ${Number(remit.sss || 0).toLocaleString()}</td></tr>
                    <tr><td style="${tdStyle}">PhilHealth Contribution Total</td><td style="${tdStyle}; font-weight: bold;">PHP ${Number(remit.philhealth || 0).toLocaleString()}</td></tr>
                    <tr><td style="${tdStyle}">Pag-IBIG Contribution Total</td><td style="${tdStyle}; font-weight: bold;">PHP ${Number(remit.pagibig || 0).toLocaleString()}</td></tr>
                    <tr style="background: #eff6ff;"><td style="${tdStyle}; font-weight: bold;">GRAND TOTAL</td><td style="${tdStyle}; font-weight: bold; color: #2563eb;">PHP ${Number(remit.total || 0).toLocaleString()}</td></tr>
                </tbody>
             `;
        } else if (config.reportType === 'headcount' && data.headcount) {
            let rows = data.headcount.byDepartment.map(dept => `
                <tr>
                    <td style="${tdStyle}">${dept.name}</td>
                    <td style="${tdStyle}; text-align: center;">${dept.count}</td>
                    <td style="${tdStyle}; text-align: right;">${Math.round((dept.count / (data.headcount.total || 1)) * 100)}%</td>
                </tr>
             `).join('');

            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Department</th>
                        <th style="${thStyle}; text-align: center;">Staff Count</th>
                        <th style="${thStyle}; text-align: right;">Organization %</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
             `;
        } else if (config.reportType === 'compliance' && data.complianceAudit) {
            let rows = filterData(data.complianceAudit)
                .map(row => `
                    <tr>
                         <td style="${tdStyle}">${row.name}</td>
                         <td style="${tdStyle}">${row.department}</td>
                         <td style="${tdStyle}">${row.status}</td>
                         <td style="${tdStyle}; color: #dc2626;">${row.missingFields.join(', ') || 'NONE'}</td>
                    </tr>
                `).join('');
            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Employee</th>
                        <th style="${thStyle}">Department</th>
                        <th style="${thStyle}">Status</th>
                        <th style="${thStyle}">Missing Info</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
             `;
        } else if (config.reportType === 'tenure' && data.tenureData) {
            let rows = filterData(data.tenureData)
                .map(row => `
                    <tr>
                         <td style="${tdStyle}">${row.name}</td>
                         <td style="${tdStyle}">${row.department}</td>
                         <td style="${tdStyle}">${row.dateHired ? new Date(row.dateHired).toLocaleDateString() : '-'}</td>
                         <td style="${tdStyle}">${row.tenure}</td>
                         <td style="${tdStyle}">${row.daysToAnniversary <= 30 ? `IN ${row.daysToAnniversary} DAYS!` : `${row.daysToAnniversary} d`}</td>
                    </tr>
                `).join('');
            tableContent = `
                <thead>
                    <tr>
                        <th style="${thStyle}">Employee</th>
                        <th style="${thStyle}">Department</th>
                        <th style="${thStyle}">Date Hired</th>
                        <th style="${thStyle}">Tenure</th>
                        <th style="${thStyle}">Next Anniversary</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            `;
        } else {
            tableContent = `<tbody><tr><td style="padding: 20px; text-align: center;">Print view not available for this report type.</td></tr></tbody>`;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>${reportTitle} - Print</title>
                </head>
                <body style="font-family: Arial, sans-serif; padding: 40px; color: #111;">
                    <div style="margin-bottom: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px;">
                        <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">${reportTitle}</h1>
                        <p style="margin: 5px 0 0; color: #666; font-size: 14px;">
                            Period: <strong>${config.startDate}</strong> to <strong>${config.endDate}</strong>
                            <span style="float: right;">Generated: ${new Date().toLocaleString()}</span>
                        </p>
                         <p style="margin: 5px 0 0; color: #666; font-size: 14px;">
                            Branch: <strong>${config.branch}</strong>
                        </p>
                    </div>
                    
                    <table style="${tableStyle}">
                        ${tableContent}
                    </table>

                    <div style="margin-top: 50px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
                        CONFIDENTIAL | HR Management System
                    </div>

                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };



    const genAttendancePDF = () => {
        if (!data?.attendanceSummary) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Attendance Summary');
        const tableData = filterData(data.attendanceSummary)
            .map(row => [row.name, row.department, row.present, row.late, row.absent, row.onLeave || 0, row.tardinessRate + '%']);
        autoTable(doc, {
            head: [['Employee', 'Department', 'Present', 'Late', 'Absent', 'On Leave', 'Tardiness Rate']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [79, 70, 229] },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    // Late (Index 3) and Absent (Index 4)
                    if ((data.column.index === 3 || data.column.index === 4) && Number(data.cell.raw) > 0) {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        doc.save('Attendance_Report.pdf');
    };

    const genLatesAbsencesPDF = () => {
        if (!data?.latesAbsencesSummary) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Monthly Lates & Absences Summary');

        // Use summary data instead of detailed logs
        const tableData = filterData(data.latesAbsencesSummary || [])
            .map(row => [
                row.name,
                row.department,
                row.lateCount,
                row.absentCount,
                row.isThresholdExceeded ? '⚠️ EXCEEDED' : 'Normal'
            ]);

        autoTable(doc, {
            head: [['Employee Name', 'Department', 'Total Lates', 'Total Absences', 'Threshold Status']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [185, 28, 28] }, // Deep Red
            didParseCell: function (data) {
                if (data.section === 'body') {
                    // Always bold and red for Late Count (Index 2)
                    if (data.column.index === 2) {
                        data.cell.styles.textColor = [185, 28, 28]; // Deep Red
                        data.cell.styles.fontStyle = 'bold';
                    }

                    // Also check if threshold is exceeded for this row
                    const isExceeded = data.row.cells[4].raw?.toString().includes('EXCEEDED');
                    if (isExceeded) {
                        data.cell.styles.textColor = [185, 28, 28]; // Deep Red
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        doc.save('Lates_Absences_Summary_' + config.startDate + '.pdf');
    };

    const genLeavePDF = () => {
        if (!data?.leaveUsage) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Leave Credit & Usage Report');
        const tableData = filterData(data.leaveUsage)
            .map(row => [row.name, row.department, row.entitlement, row.used, row.remaining]);
        autoTable(doc, {
            head: [['Employee', 'Department', 'Yearly Credits', 'Days Used', 'Balance']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [16, 185, 129] },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    // Check 'Days Used' column (Index 3)
                    const daysUsed = Number(data.row.cells[3].raw);
                    if (daysUsed > 0 && (data.column.index === 3 || data.column.index === 4)) {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        doc.save('Leave_Credits_Report.pdf');
    };

    const genPayrollPDF = () => {
        if (!data?.payrollSummary) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Payroll & Benefits Expenditure');
        const summary = data.payrollSummary;

        // Ensure numeric values
        const totalBasic = Number(summary.totalBasicRate || 0);
        const totalAllowances = Number(summary.totalAllowances || 0);
        const totalSSS = Number(summary.totalSSS || 0);
        const totalPhilHealth = Number(summary.totalPhilHealth || 0);
        const totalPagIBIG = Number(summary.totalPagIBIG || 0);
        const totalLiability = totalBasic + totalAllowances + totalSSS + totalPhilHealth + totalPagIBIG;

        const tableData = [
            ['Total Basic Salaries', 'PHP ' + totalBasic.toLocaleString()],
            ['Total Allowances', 'PHP ' + totalAllowances.toLocaleString()],
            ['SSS Contributions', 'PHP ' + totalSSS.toLocaleString()],
            ['PhilHealth Contributions', 'PHP ' + totalPhilHealth.toLocaleString()],
            ['Pag-IBIG Contributions', 'PHP ' + totalPagIBIG.toLocaleString()],
            ['Total Monthly Liability', 'PHP ' + totalLiability.toLocaleString()]
        ];
        autoTable(doc, {
            head: [['Expense Category', 'Total Amount']],
            body: tableData,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] },
        });
        doc.save('Payroll_Expenditure.pdf');
    };

    const genCompliancePDF = () => {
        if (!data?.complianceAudit) return;
        const doc = new jsPDF();
        addReportHeader(doc, '201 File Compliance Audit');
        const tableData = filterData(data.complianceAudit)
            .map(row => [row.name, row.department, row.status, row.missingFields.join(', ') || 'NONE']);
        autoTable(doc, {
            head: [['Employee', 'Department', 'Status', 'Missing Info']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [239, 68, 68] },
        });
        doc.save('Compliance_Audit.pdf');
    };

    const genTenurePDF = () => {
        if (!data?.tenureData) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Employee Tenure & Anniversaries');
        const tableData = filterData(data.tenureData)
            .map(row => [
                row.name,
                row.department,
                row.dateHired ? format(new Date(row.dateHired), 'MMMM dd, yyyy') : '-',
                row.tenure,
                row.daysToAnniversary <= 30 ? 'IN ' + row.daysToAnniversary + ' DAYS!' : row.daysToAnniversary + ' d'
            ]);
        autoTable(doc, {
            head: [['Employee', 'Department', 'Date Hired', 'Tenure', 'Next Anniversary']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [139, 92, 246] },
        });
        doc.save('Tenure_Report.pdf');
    };

    const genRemittancePDF = () => {
        if (!data?.governmentRemittance) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Government Remittance Checklist');
        const remit = data.governmentRemittance;
        const tableData = [
            ['SSS Contribution Total', 'PHP ' + Number(remit.sss || 0).toLocaleString()],
            ['PhilHealth Contribution Total', 'PHP ' + Number(remit.philhealth || 0).toLocaleString()],
            ['Pag-IBIG Contribution Total', 'PHP ' + Number(remit.pagibig || 0).toLocaleString()],
            ['GRAND TOTAL', 'PHP ' + Number(remit.total || 0).toLocaleString()]
        ];
        autoTable(doc, {
            head: [['Agency', 'Amount to Remit']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [59, 130, 246] },
        });
        doc.save('Remittance_Checklist.pdf');
    };

    const genHeadcountPDF = () => {
        if (!data?.headcount) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Headcount & Growth Report');
        const tableData = data.headcount.byDepartment.map(dept => [dept.name, dept.count, Math.round((dept.count / (data.headcount.total || 1)) * 100) + '%']);
        autoTable(doc, {
            head: [['Department', 'Staff Count', 'Organization %']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [107, 114, 128] },
        });
        doc.save('Headcount_Report.pdf');
    };

    const handleGenerate = () => {
        if (!data) return;
        switch (config.reportType) {
            case 'attendance': genAttendancePDF(); break;
            case 'latesAbsences': genLatesAbsencesPDF(); break;
            case 'leave': genLeavePDF(); break;
            case 'payroll': genPayrollPDF(); break;
            case 'compliance': genCompliancePDF(); break;
            case 'tenure': genTenurePDF(); break;
            case 'remittance': genRemittancePDF(); break;
            case 'headcount': genHeadcountPDF(); break;
        }
    };

    const inputClasses = "w-full border border-gray-300 rounded-lg py-3 px-4 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer";
    const labelClasses = "absolute -top-2.5 left-3 bg-white px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider";

    return (
        <DashboardLayout>
            <div className="min-h-[80vh] flex items-center justify-center p-4 bg-gray-50/50">
                <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-12 relative overflow-hidden">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50"></div>

                    <h1 className="text-3xl font-extrabold text-gray-900 mb-10 relative z-10">Generate Reports</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* Report Type - Full Width */}
                        <div className="md:col-span-2 relative">
                            <label className={labelClasses}>Report Type</label>
                            <select
                                value={config.reportType}
                                onChange={(e) => setConfig({ ...config, reportType: e.target.value })}
                                className={inputClasses}
                            >
                                {reportOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.title}</option>
                                ))}
                            </select>
                        </div>

                        {/* Starting Date */}
                        <div className="relative">
                            <label className={labelClasses}>Starting Date</label>
                            <input
                                type="date"
                                value={config.startDate}
                                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        {/* End Date */}
                        <div className="relative">
                            <label className={labelClasses}>End Date</label>
                            <input
                                type="date"
                                value={config.endDate}
                                onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                                className={inputClasses}
                            />
                        </div>

                        {/* Departments */}
                        <div className="relative">
                            <label className={labelClasses}>Departments</label>
                            <select
                                value={config.department}
                                onChange={(e) => setConfig({ ...config, department: e.target.value })}
                                className={inputClasses}
                            >
                                <option>All Departments</option>
                                {Array.isArray(departments) && departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Branch - NEW */}
                        <div className="relative">
                            <label className={labelClasses}>Select Branch</label>
                            <select
                                value={config.branch}
                                onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                                className={inputClasses}
                            >
                                <option>All Branches</option>
                                {Array.isArray(branches) && branches.map(branch => (
                                    <option key={branch} value={branch}>{branch}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort By */}
                        <div className="relative">
                            <label className={labelClasses}>Sort By</label>
                            <select
                                value={config.sortBy}
                                onChange={(e) => setConfig({ ...config, sortBy: e.target.value })}
                                className={inputClasses}
                            >
                                <option>Name</option>
                                <option>Date</option>
                                <option>Department</option>
                            </select>
                        </div>

                        {/* Column Filter */}
                        <div className="relative">
                            <label className={labelClasses}>Column Visibility</label>
                            <select
                                value={config.column}
                                onChange={(e) => setConfig({ ...config, column: e.target.value })}
                                className={inputClasses}
                            >
                                <option>All Columns</option>
                                <option>Basic Info Only</option>
                                <option>Financial Data Only</option>
                            </select>
                        </div>

                        {/* Advanced Number Filter */}
                        <div className="relative">
                            <label className={labelClasses}>Metric Filter</label>
                            <select
                                value={config.filter}
                                onChange={(e) => setConfig({ ...config, filter: e.target.value })}
                                className={inputClasses}
                            >
                                <option>No Additional Filters</option>
                                <option>Tardiness &gt; 10%</option>
                                <option>Salary &gt; 50,000</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-16 flex justify-end">
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !data}
                            className="bg-indigo-600 hover:bg-slate-900 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            )}
                            GENERATE PDF
                        </button>

                        <button
                            onClick={handlePrint}
                            disabled={loading || !data}
                            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none ml-4"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            PRINT REPORT
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Preview Section */}
            <div className="mt-12 w-full max-w-6xl mx-auto pb-20">
                {!loading && data && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {reportOptions.find(o => o.id === config.reportType)?.title} Preview
                            </h2>
                            <span className="text-sm font-medium text-slate-500 bg-white px-4 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                {config.startDate} to {config.endDate}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            {config.reportType === 'latesAbsences' && (
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-red-700 text-left border-b border-gray-100">
                                            <th className="p-5 text-xs font-bold text-white uppercase tracking-wider">Employee Name</th>
                                            <th className="p-5 text-xs font-bold text-white uppercase tracking-wider">Department</th>
                                            <th className="p-5 text-xs font-bold text-white uppercase tracking-wider text-center">Total Lates</th>
                                            <th className="p-5 text-xs font-bold text-white uppercase tracking-wider text-center">Total Absences</th>
                                            <th className="p-5 text-xs font-bold text-white uppercase tracking-wider text-right">Threshold Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filterData(data.latesAbsencesSummary || []).length === 0 ? (
                                            <tr><td colSpan={5} className="p-10 text-center text-slate-400">No data available for the selected period.</td></tr>
                                        ) : (
                                            filterData(data.latesAbsencesSummary || []).map((row) => (
                                                <tr key={row.id} className={`border-b border-gray-50 hover:bg-slate-50/50 transition-colors ${row.isThresholdExceeded ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                                                    <td className="p-5 whitespace-nowrap font-medium">{row.name}</td>
                                                    <td className="p-5 whitespace-nowrap">{row.department}</td>
                                                    <td className="p-5 text-center text-red-600 font-bold">{row.lateCount}</td>
                                                    <td className="p-5 text-center">{row.absentCount}</td>
                                                    <td className="p-5 text-right whitespace-nowrap">
                                                        {row.isThresholdExceeded ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                                ⚠️ EXCEEDED (5L/10A)
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                Normal
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* Preview implementation for other reports will go here */}
                            {config.reportType !== 'latesAbsences' && (
                                <div className="p-20 text-center">
                                    <div className="text-4xl mb-4">📥</div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Ready to Export</h3>
                                    <p className="text-slate-500">Visual preview for this report type is coming soon. Please click the generate button above to download the full PDF.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
