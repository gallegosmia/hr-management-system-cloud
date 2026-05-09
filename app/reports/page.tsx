'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isValid } from 'date-fns';
import * as XLSX from 'xlsx';

const safeDate = (date: any, formatStr: string) => {
    try {
        const d = new Date(date);
        if (!isValid(d)) return '---';
        return format(d, formatStr);
    } catch {
        return '---';
    }
};

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
        employeeId: 'All Employees',
        sortBy: 'Name',
        column: 'All Columns',
        filter: 'None'
    });
    const [branches, setBranches] = useState<string[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            if (parsed.role === 'HR' && parsed.assigned_branch) {
                setConfig(prev => ({ ...prev, branch: parsed.assigned_branch }));
            }
        }
    }, []);

    const reportOptions = [
        { id: 'attendance', title: 'Attendance Summary', action: 'genAttendancePDF' },
        { id: 'latesAbsences', title: 'Lates and Absences', action: 'genLatesAbsencesPDF' },
        { id: 'leave', title: 'Leave Credits & Usage', action: 'genLeavePDF' },
        { id: 'compliance', title: '201 File Compliance', action: 'genCompliancePDF' },
        { id: 'tenure', title: 'Tenure & Anniversaries', action: 'genTenurePDF' },
        { id: 'remittance', title: 'Government Remittance', action: 'genRemittancePDF' },
        { id: 'headcount', title: 'Headcount & Growth', action: 'genHeadcountPDF' },
    ];

    const [debouncedStartDate, setDebouncedStartDate] = useState(config.startDate);
    const [debouncedEndDate, setDebouncedEndDate] = useState(config.endDate);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedStartDate(config.startDate);
            setDebouncedEndDate(config.endDate);
        }, 1000); // 1 second debounce for smoother typing
        return () => clearTimeout(timer);
    }, [config.startDate, config.endDate]);

    useEffect(() => {
        fetchReports();
    }, [debouncedStartDate, debouncedEndDate, config.branch]);

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
        
        // Use a consistent normalization logic that matches the backend/access layers
        const normalize = (b: string | undefined | null) => {
            if (!b) return '';
            // Match 'Naval' with 'Naval Branch' or 'NAVAL'
            return b.toString().replace(/\s*branch\s*$/i, '').trim().toUpperCase();
        };

        const configBranchNormalized = normalize(config.branch);
        const isAllBranches = config.branch === 'All Branches' || config.branch === 'All' || !config.branch;
        const isAllDepts = config.department === 'All Departments' || config.department === 'All' || !config.department;
        const isAllEmployees = config.employeeId === 'All Employees' || !config.employeeId;

        const filtered = rows.filter(row => {
            const rowBranchNormalized = normalize(row.branch);
            
            // Branch matching logic
            const branchMatch = isAllBranches || rowBranchNormalized === configBranchNormalized;
            
            // Department matching logic
            const deptMatch = isAllDepts || row.department === config.department;
            
            // Employee matching logic (handles both numeric ID and employee_id string like '2024-001')
            const employeeMatch = isAllEmployees || 
                String(row.id) === String(config.employeeId) || 
                String(row.employee_id) === String(config.employeeId);
            
            return deptMatch && branchMatch && employeeMatch;
        });

        // Apply Sorting
        return filtered.sort((a, b) => {
            const valA = (a.name || '').toString().toLowerCase();
            const valB = (b.name || '').toString().toLowerCase();

            if (config.sortBy === 'Employee Name (A-Z)' || config.sortBy === 'Name') {
                return valA.localeCompare(valB);
            } else if (config.sortBy === 'Employee Name (Z-A)') {
                return valB.localeCompare(valA);
            } else if (config.sortBy === 'Department') {
                return (a.department || '').localeCompare(b.department || '');
            } else if (config.sortBy === 'Staff ID') {
                const idA = String(a.employee_id || a.id || '');
                const idB = String(b.employee_id || b.id || '');
                return idA.localeCompare(idB);
            }
            return 0;
        });
    };

    const addReportHeader = (doc: jsPDF, title: string) => {
        // Logo & Title Row
        doc.setFillColor(34, 197, 94); // Emerald 500
        doc.roundedRect(14, 12, 12, 12, 2, 2, 'F');

        // Simulating the person icon inside the logo
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);
        doc.circle(20, 16, 1.8); // Head
        doc.moveTo(17, 21);
        doc.lineTo(23, 21); // Shoulders line (simplified)

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text('Melann Lending Investor Corporation', 29, 18);

        doc.setFontSize(12);
        doc.text('HUMAN RESOURCES', 14, 32);

        // Report Title on Right
        doc.setTextColor(16, 185, 129); // Emerald 600
        doc.setFontSize(16);
        doc.text(title.toUpperCase(), 196, 22, { align: 'right' });

        // Divider Line
        doc.setDrawColor(241, 245, 249); // Slate 100
        doc.setLineWidth(0.5);
        doc.line(14, 38, 196, 38);

        // Header Info Grid (2x2)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('DEPARTMENT', 14, 48);
        doc.text('DATE RANGE', 105, 48);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(config.department, 14, 55);
        doc.text(`${safeDate(config.startDate, 'MMM dd')} - ${safeDate(config.endDate, 'MMM dd, yyyy')}`, 105, 55);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('GENERATED ON', 14, 65);
        doc.text('REPORT ID', 105, 65);

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(safeDate(new Date(), 'MMMM dd, yyyy'), 14, 72);
        doc.text(`#MEL-${safeDate(config.startDate, 'yyyyMMdd')}`, 105, 72);

        doc.setTextColor(0, 0, 0);
    };

    const addReportFooter = (doc: jsPDF) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Signature Line
            doc.setDrawColor(203, 213, 225); // Slate 300
            doc.setLineWidth(0.5);
            doc.line(14, pageHeight - 30, 80, pageHeight - 30);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // Slate 500
            doc.text('HR MANAGER', 14, pageHeight - 24);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184); // Slate 400
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 24, { align: 'right' });
        }
    };

    const handlePrint = () => {
        if (!data) return;
        const width = 1000;
        const height = 800;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        const printWindow = window.open('', '', `width=${width},height=${height},left=${left},top=${top}`);
        if (!printWindow) return;

        const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 10px; font-family: 'Inter', sans-serif;";
        const thStyle = "background-color: #f0fdf4; color: #064e3b; font-weight: 700; padding: 12px 10px; border-bottom: 2px solid #bbf7d0; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;";
        const tdStyle = "padding: 10px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 11px;";

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
                        <td style="${tdStyle}; text-align: right;">${row.isThresholdExceeded ? '<span style="color: #dc2626; font-weight: bold;">⚠️ EXCEEDED</span>' : (row.lateCount > 0 ? `<span style="color: #ea580c; font-weight: bold;">LATE: ${row.lateCount}</span>` : '<span style="color: #16a34a; font-weight: bold;">NO LATES</span>')}</td>
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
                         <td style="${tdStyle}; text-align: center; color: ${row.late > 0 ? '#dc2626' : 'inherit'}; font-weight: ${row.late > 0 ? 'bold' : 'normal'}">${row.late}</td>
                         <td style="${tdStyle}; text-align: center; color: ${row.absent > 0 ? '#dc2626' : 'inherit'}; font-weight: ${row.absent > 0 ? 'bold' : 'normal'}">${row.absent}</td>
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
                         <th style="${thStyle}; text-align: center;">Training / Seminar</th>
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
                         <td style="${tdStyle}; text-align: center;">${(row as any).birthdayLeaveUsed || 0}</td>
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
                        <th style="${thStyle}; text-align: center;">Birthday</th>
                        <th style="${thStyle}; text-align: center;">Balance</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
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
                    <title>${reportTitle}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <div style="width: 14px; height: 14px; background: #22c55e; border-radius: 3px;"></div>
                                <span style="font-weight: 800; font-size: 10px; color: #0f172a; letter-spacing: 0.05em;">Melann Lending Investor Corporation</span>
                            </div>
                            <h2 style="font-size: 14px; font-weight: 800; color: #334155; margin: 0; letter-spacing: 0.02em;">HUMAN RESOURCES</h2>
                        </div>
                        <h1 style="color: #10b981; margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em;">${reportTitle}</h1>
                    </div>
                    
                    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="font-size: 9px; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 2px; text-transform: uppercase;">Department</label>
                            <span style="font-size: 13px; font-weight: 600; color: #1e293b;">${config.department}</span>
                        </div>
                        <div>
                            <label style="font-size: 9px; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 2px; text-transform: uppercase;">Date Range</label>
                            <span style="font-size: 13px; font-weight: 600; color: #1e293b;">${safeDate(config.startDate, 'MMM dd')} - ${safeDate(config.endDate, 'MMM dd, yyyy')}</span>
                        </div>
                        <div>
                            <label style="font-size: 9px; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 2px; text-transform: uppercase;">Generated On</label>
                            <span style="font-size: 13px; font-weight: 600; color: #1e293b;">${safeDate(new Date(), 'MMMM dd, yyyy')}</span>
                        </div>
                        <div>
                            <label style="font-size: 9px; font-weight: 800; color: #94a3b8; display: block; margin-bottom: 2px; text-transform: uppercase;">Report ID</label>
                             <span style="font-size: 13px; font-weight: 600; color: #1e293b;">#MEL-${safeDate(config.startDate, 'yyyyMMdd')}</span>
                        </div>
                    </div>
                    
                    <table style="${tableStyle}">
                        ${tableContent}
                    </table>

                    <div style="margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <div style="width: 180px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px;"></div>
                            <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">HR Manager Signature</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Confidential | Page 1 of 1</span>
                        </div>
                    </div>

                    <script>
                        window.onload = function() { 
                            setTimeout(() => {
                                window.print(); 
                                window.close();
                            }, 500);
                        }
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
            .map(row => [row.id || '---', row.name, row.present, row.late, row.absent, row.tardinessRate + '%']);
        autoTable(doc, {
            head: [['ID', 'NAME', 'PRES.', 'LATE', 'ABS.', 'RATE']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    // Late column color (Index 3)
                    if (data.column.index === 3 && Number(data.cell.raw) > 0) {
                        data.cell.styles.textColor = [239, 68, 68]; // Red 500
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // ABS column color (Index 4)
                    if (data.column.index === 4 && Number(data.cell.raw) > 0) {
                        data.cell.styles.textColor = [239, 68, 68]; // Red 500
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // RATE column color (Index 5)
                    if (data.column.index === 5) {
                        const rate = parseFloat(data.cell.raw as string);
                        if (rate > 10) data.cell.styles.textColor = [245, 158, 11]; // Orange
                        else if (rate > 0) data.cell.styles.textColor = [16, 185, 129]; // Green
                        else data.cell.styles.textColor = [16, 185, 129]; // Green for 0%
                    }
                }
            }
        });
        addReportFooter(doc);
        doc.save('Attendance_Report.pdf');
    };

    const genLatesAbsencesPDF = () => {
        if (!data?.latesAbsencesSummary) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Lates & Absences Report');

        const tableData = filterData(data.latesAbsencesSummary || [])
            .map(row => [
                row.id || '---',
                row.name,
                row.lateCount,
                row.absentCount,
                row.isThresholdExceeded ? 'EXCEEDED' : (row.lateCount > 0 ? `LATE (${row.lateCount})` : 'NO LATES')
            ]);

        autoTable(doc, {
            head: [['ID', 'EMPLOYEE NAME', 'LATES', 'ABSENCES', 'STATUS']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    if (data.column.index === 2 && Number(data.cell.raw) > 0) {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.column.index === 3 && Number(data.cell.raw) > 0) {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.column.index === 4 && data.cell.raw === 'EXCEEDED') {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.column.index === 4 && String(data.cell.raw).startsWith('LATE')) {
                        data.cell.styles.textColor = [234, 88, 12]; // Orange 600
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.column.index === 4 && data.cell.raw === 'NO LATES') {
                        data.cell.styles.textColor = [22, 163, 74]; // Green 600
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        addReportFooter(doc);
        doc.save('Lates_Absences_Summary_' + config.startDate + '.pdf');
    };

    const genLeavePDF = () => {
        if (!data?.leaveUsage) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Leave Usage Report');
        const tableData = filterData(data.leaveUsage)
            .map(row => [row.id || '---', row.name, row.entitlement, row.used, (row as any).birthdayLeaveUsed || 0, row.remaining]);
        autoTable(doc, {
            head: [['ID', 'EMPLOYEE', 'ENTITLEMENT', 'USED', 'BIRTHDAY', 'BALANCE']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
        });
        addReportFooter(doc);
        doc.save('Leave_Credits_Report.pdf');
    };



    const genCompliancePDF = () => {
        if (!data?.complianceAudit) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Compliance Audit');
        const tableData = filterData(data.complianceAudit)
            .map(row => [row.id || '---', row.name, row.status, row.missingFields.join(', ') || 'NONE']);
        autoTable(doc, {
            head: [['ID', 'EMPLOYEE', 'STATUS', 'MISSING INFO']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
        });
        addReportFooter(doc);
        doc.save('Compliance_Audit.pdf');
    };

    const genTenurePDF = () => {
        if (!data?.tenureData) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Tenure Report');
        const tableData = filterData(data.tenureData)
            .map(row => [
                row.id || '---',
                row.name,
                row.dateHired ? format(new Date(row.dateHired), 'MMM dd, yyyy') : '-',
                row.tenure,
                row.daysToAnniversary <= 30 ? 'IN ' + row.daysToAnniversary + ' DAYS!' : row.daysToAnniversary + ' d'
            ]);
        autoTable(doc, {
            head: [['ID', 'EMPLOYEE', 'DATE HIRED', 'TENURE', 'NEXT ANNIVERSARY']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
        });
        addReportFooter(doc);
        doc.save('Tenure_Report.pdf');
    };

    const genRemittancePDF = () => {
        if (!data?.governmentRemittance) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Remittance Report');
        const remit = data.governmentRemittance;
        const tableData = [
            ['SSS Contribution Total', 'PHP ' + Number(remit.sss || 0).toLocaleString()],
            ['PhilHealth Contribution Total', 'PHP ' + Number(remit.philhealth || 0).toLocaleString()],
            ['Pag-IBIG Contribution Total', 'PHP ' + Number(remit.pagibig || 0).toLocaleString()],
            ['GRAND TOTAL', 'PHP ' + Number(remit.total || 0).toLocaleString()]
        ];
        autoTable(doc, {
            head: [['AGENCY', 'AMOUNT TO REMIT']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
        });
        addReportFooter(doc);
        doc.save('Remittance_Checklist.pdf');
    };

    const genHeadcountPDF = () => {
        if (!data?.headcount) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Headcount Report');
        const tableData = data.headcount.byDepartment.map(dept => [dept.name, dept.count, Math.round((dept.count / (data.headcount.total || 1)) * 100) + '%']);
        autoTable(doc, {
            head: [['DEPARTMENT', 'STAFF COUNT', 'ORGANIZATION %']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
        });
        addReportFooter(doc);
        doc.save('Headcount_Report.pdf');
    };

    const genExcelExport = () => {
        if (!data) return;
        let exportData: any[] = [];
        let fileName = 'Report';

        switch (config.reportType) {
            case 'attendance':
                exportData = filterData(data.attendanceSummary).map(r => ({
                    'ID': r.id, 'Name': r.name, 'Department': r.department, 'Branch': r.branch,
                    'Present': r.present, 'Late': r.late, 'Absent': r.absent, 'Training / Seminar': r.onLeave, 'Tardiness Rate': r.tardinessRate + '%'
                }));
                fileName = 'Attendance_Report';
                break;
            case 'latesAbsences':
                exportData = filterData(data.latesAbsencesSummary).map(r => ({
                    'ID': r.id, 'Name': r.name, 'Department': r.department, 'Lates': r.lateCount,
                    'Absences': r.absentCount, 'Threshold Exceeded': r.isThresholdExceeded ? 'Yes' : 'No'
                }));
                fileName = 'Lates_Absences_Report';
                break;
            case 'leave':
                exportData = filterData(data.leaveUsage).map(r => ({
                    'ID': r.id, 'Name': r.name, 'Department': r.department,
                    'Entitlement': r.entitlement, 'Used': (r as any).used, 'Birthday Leave Used': (r as any).birthdayLeaveUsed || 0, 'Balance': r.remaining
                }));
                fileName = 'Leave_Usage_Report';
                break;

            case 'compliance':
                exportData = filterData(data.complianceAudit).map(r => ({
                    'ID': r.id, 'Name': r.name, 'Department': r.department,
                    'Status': r.status, 'Missing Info': r.missingFields.join(', ') || 'None'
                }));
                fileName = 'Compliance_Audit';
                break;
            case 'tenure':
                exportData = filterData(data.tenureData).map(r => ({
                    'ID': r.id, 'Name': r.name, 'Department': r.department,
                    'Date Hired': r.dateHired, 'Tenure': r.tenure, 'Days to Anniversary': r.daysToAnniversary
                }));
                fileName = 'Tenure_Report';
                break;
            case 'remittance':
                exportData = [
                    { 'Agency': 'SSS', 'Amount': data.governmentRemittance.sss },
                    { 'Agency': 'PhilHealth', 'Amount': data.governmentRemittance.philhealth },
                    { 'Agency': 'Pag-IBIG', 'Amount': data.governmentRemittance.pagibig },
                    { 'Agency': 'TOTAL', 'Amount': data.governmentRemittance.total }
                ];
                fileName = 'Remittance_Report';
                break;
            case 'headcount':
                exportData = data.headcount.byDepartment.map(d => ({
                    'Department': d.name, 'Staff Count': d.count,
                    'Percentage': Math.round((d.count / (data.headcount.total || 1)) * 100) + '%'
                }));
                fileName = 'Headcount_Report';
                break;
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${fileName}_${config.startDate}.xlsx`);
    };

    const handleGenerate = () => {
        if (!data) return;
        switch (config.reportType) {
            case 'attendance': genAttendancePDF(); break;
            case 'latesAbsences': genLatesAbsencesPDF(); break;
            case 'leave': genLeavePDF(); break;

            case 'compliance': genCompliancePDF(); break;
            case 'tenure': genTenurePDF(); break;
            case 'remittance': genRemittancePDF(); break;
            case 'headcount': genHeadcountPDF(); break;
        }
    };

    const inputClasses = "w-full border border-gray-300 rounded-lg py-3 px-4 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer";
    const labelClasses = "absolute -top-2.5 left-3 bg-white px-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider";

    const ReportField = ({ label, value, onChange, options, children, icon, helpText, disabled }: any) => (
        <div style={{ marginBottom: '1.25rem' }}>
            {label && <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{label}</label>}
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '0.5rem 1rem',
                border: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                minHeight: '60px'
            }}>
                <div style={{ flex: 1 }}>
                    {children ? children : (
                        <select
                            value={value}
                            onChange={onChange}
                            style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: '#1f2937',
                                padding: 0,
                                background: 'transparent',
                                appearance: 'none',
                                cursor: disabled ? 'not-allowed' : 'pointer'
                            }}
                            disabled={disabled}
                        >
                            {options.map((opt: any) => (
                                <option key={typeof opt === 'string' ? opt : opt.id} value={typeof opt === 'string' ? opt : opt.id}>
                                    {typeof opt === 'string' ? opt : opt.title}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                {icon && <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>{icon}</div>}
            </div>
        </div>
    );

    const DateField = ({ label, value, onChange }: any) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const [error, setError] = useState('');

        const handleBlur = (e: any) => {
            const val = e.target.value;
            if (!val) {
                setError('Required');
            } else if (!isValid(new Date(val))) {
                setError('Invalid Date');
            } else {
                setError('');
            }
        };

        return (
            <div
                style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '0.5rem 1rem',
                    border: `1px solid ${error ? '#ef4444' : '#f1f5f9'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    minHeight: '60px',
                    flex: 1,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                }}
                onClick={() => inputRef.current?.showPicker?.()}
            >
                <label style={{
                    display: 'block',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    color: error ? '#ef4444' : '#94a3b8',
                    textTransform: 'uppercase',
                    marginBottom: '2px',
                    pointerEvents: 'none'
                }}>{label}</label>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    <input
                        ref={inputRef}
                        type="date"
                        value={value}
                        onChange={(e) => {
                            setError('');
                            onChange(e);
                        }}
                        onBlur={handleBlur}
                        style={{
                            border: 'none',
                            outline: 'none',
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#1e293b',
                            background: 'transparent',
                            width: '100%',
                            padding: '4px 0',
                            fontFamily: 'inherit',
                            cursor: 'pointer'
                        }}
                    />
                    <div
                        style={{ color: '#94a3b8', display: 'flex', gap: '4px', opacity: 0.8, pointerEvents: 'none' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                </div>
                {error && <span style={{ position: 'absolute', bottom: '-15px', left: '10px', fontSize: '0.6rem', color: '#ef4444', fontWeight: 700 }}>{error}</span>}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 10;
                }
            `}</style>
            <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ background: 'white', padding: '1.25rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <button onClick={() => window.history.back()} style={{ border: 'none', background: 'transparent', padding: '8px', cursor: 'pointer' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginRight: '40px' }}>Report Center</h1>
                </div>

                <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1.5rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Generate Reports</h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Select parameters to export attendance data.</p>
                    </div>

                    {/* Form Fields */}
                    <ReportField
                        label="Report Type"
                        value={config.reportType}
                        onChange={(e: any) => setConfig({ ...config, reportType: e.target.value })}
                        options={reportOptions}
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M22 17.5L18.5 21L15 17.5M2 17.5L5.5 21L9 17.5" /><path d="M22 6.5L18.5 3L15 6.5M2 6.5L5.5 3L9 6.5" /><path d="M2 12h20" /></svg>}
                    />

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Date Range</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <DateField label="Start" value={config.startDate} onChange={(e: any) => setConfig({ ...config, startDate: e.target.value })} />
                            <DateField label="End" value={config.endDate} onChange={(e: any) => setConfig({ ...config, endDate: e.target.value })} />
                        </div>
                    </div>

                    <ReportField
                        label="Select Branch"
                        value={config.branch}
                        onChange={(e: any) => setConfig({ ...config, branch: e.target.value })}
                        options={user?.role === 'HR' ? branches : ['All Branches', ...branches]}
                        disabled={user?.role === 'HR'}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>}
                    />

                    <ReportField
                        label="Specific Employee"
                        value={config.employeeId}
                        onChange={(e: any) => setConfig({ ...config, employeeId: e.target.value })}
                        options={['All Employees', ...(data?.attendanceSummary || []).map(e => ({ id: e.id, title: e.name }))]}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>}
                    />

                    <ReportField
                        label="Departments"
                        value={config.department}
                        onChange={(e: any) => setConfig({ ...config, department: e.target.value })}
                        options={['All Departments', ...departments]}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                    />

                    <ReportField
                        label="Sort By"
                        value={config.sortBy}
                        onChange={(e: any) => setConfig({ ...config, sortBy: e.target.value })}
                        options={['Employee Name (A-Z)', 'Employee Name (Z-A)', 'Department', 'Staff ID']}
                        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="14" y2="12"></line><line x1="4" y1="18" x2="10" y2="18"></line></svg>}
                    />

                    <div style={{ padding: '1rem 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Advanced Filters</span>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !data}
                            style={{
                                flex: 1,
                                minWidth: '140px',
                                background: '#1e293b',
                                color: 'white',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.2)',
                                opacity: (loading || !data) ? 0.6 : 1
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Export PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={loading || !data}
                            style={{
                                flex: 1,
                                minWidth: '140px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                                opacity: (loading || !data) ? 0.6 : 1
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                            Print
                        </button>
                        <button
                            onClick={() => setShowPreview(true)}
                            disabled={loading || !data}
                            style={{
                                flex: 1,
                                minWidth: '140px',
                                background: 'white',
                                color: '#1e293b',
                                border: '1px solid #e2e8f0',
                                padding: '1rem',
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                opacity: (loading || !data) ? 0.6 : 1
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            Preview Report
                        </button>
                        <button
                            onClick={genExcelExport}
                            disabled={loading || !data}
                            style={{
                                flex: 1,
                                minWidth: '140px',
                                background: '#f8fafc',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                padding: '1rem',
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                opacity: (loading || !data) ? 0.6 : 1
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            Export Excel
                        </button>
                    </div>

                    {/* Preview Modal */}
                    {showPreview && data && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(15, 23, 42, 0.95)',
                            backdropFilter: 'blur(8px)',
                            padding: '2rem'
                        }}>
                            <div style={{
                                width: '100%',
                                maxWidth: '900px',
                                maxHeight: '90vh',
                                background: 'white',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}>
                                {/* Modal Header */}
                                <div style={{
                                    padding: '1.5rem 2rem',
                                    borderBottom: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#f8fafc'
                                }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Report Preview</h3>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Review data before exporting to PDF or Printing.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        style={{
                                            border: 'none',
                                            background: '#f1f5f9',
                                            color: '#64748b',
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>

                                {/* Modal Content - The Actual Report Preview */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '3rem' }}>
                                    <div style={{ padding: '0', color: '#1e293b', lineHeight: 1.5 }}>
                                        {/* Header Branding */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ width: '14px', height: '14px', background: '#22c55e', borderRadius: '3px' }}></div>
                                                    <span style={{ fontWeight: 800, fontSize: '10px', color: '#0f172a', letterSpacing: '0.05em' }}>Melann Lending Investor Corporation</span>
                                                </div>
                                                <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#334155', margin: 0, letterSpacing: '0.02em' }}>HUMAN RESOURCES</h2>
                                            </div>
                                            <h1 style={{ color: '#10b981', margin: 0, fontSize: '22px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{reportOptions.find(o => o.id === config.reportType)?.title}</h1>
                                        </div>

                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Department</label>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{config.department}</span>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Date Range</label>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{safeDate(config.startDate, 'MMM dd')} - {safeDate(config.endDate, 'MMM dd, yyyy')}</span>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Generated On</label>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{safeDate(new Date(), 'MMMM dd, yyyy')}</span>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Report ID</label>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>#MEL-{safeDate(config.startDate, 'yyyyMMdd')}</span>
                                            </div>
                                        </div>

                                        {/* Table Content */}
                                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                            <thead>
                                                <tr>
                                                    {config.reportType === 'attendance' && ['Employee', 'Department', 'Pres.', 'Late', 'Abs.', 'Rate'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 || i === 1 ? 'left' : i === 5 ? 'right' : 'center', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}
                                                    {config.reportType === 'latesAbsences' && ['Employee', 'Department', 'Lates', 'Absences', 'Status'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 || i === 1 ? 'left' : i === 4 ? 'right' : 'center', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}
                                                    {config.reportType === 'leave' && ['Employee', 'Department', 'Entitlement', 'Used', 'Birthday', 'Balance'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 || i === 1 ? 'left' : 'center', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}

                                                    {config.reportType === 'remittance' && ['Agency', 'Amount to Remit'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'right', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}
                                                    {config.reportType === 'headcount' && ['Department', 'Staff Count', 'Organization %'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}
                                                    {config.reportType === 'compliance' && ['Employee', 'Department', 'Status', 'Missing Info'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 || i === 1 ? 'left' : 'center', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}
                                                    {config.reportType === 'tenure' && ['Employee', 'Department', 'Date Hired', 'Tenure', 'Anniversary'].map((h, i) => <th key={i} style={{ padding: '12px 10px', background: '#f0fdf4', color: '#064e3b', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', textAlign: i === 0 || i === 1 ? 'left' : 'center', borderBottom: '2px solid #bbf7d0' }}>{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {config.reportType === 'attendance' && filterData(data.attendanceSummary || []).map((row: any, i: number) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.name}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.department}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.present}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: row.late > 0 ? '#dc2626' : '#334155', fontWeight: row.late > 0 ? 800 : 400, textAlign: 'center' }}>{row.late}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: row.absent > 0 ? '#dc2626' : '#334155', fontWeight: row.absent > 0 ? 800 : 400, textAlign: 'center' }}>{row.absent}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'right' }}>{row.tardinessRate}%</td>
                                                    </tr>
                                                ))}
                                                {config.reportType === 'latesAbsences' && filterData(data.latesAbsencesSummary || []).map((row: any, i: number) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.name}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.department}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: row.lateCount > 0 ? '#dc2626' : '#334155', fontWeight: row.lateCount > 0 ? 800 : 400, textAlign: 'center' }}>{row.lateCount}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.absentCount}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', textAlign: 'right' }}>
                                                            {row.isThresholdExceeded ? <span style={{ color: '#dc2626', fontWeight: 800 }}>⚠️ EXCEEDED</span> : (row.lateCount > 0 ? <span style={{ color: '#ea580c', fontWeight: 800 }}>LATE: {row.lateCount}</span> : <span style={{ color: '#16a34a', fontWeight: 800 }}>NO LATES</span>)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {config.reportType === 'leave' && filterData(data.leaveUsage || []).map((row: any, i: number) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.name}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.department}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.entitlement}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.used}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.birthdayLeaveUsed || 0}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center', fontWeight: 800 }}>{row.remaining}</td>
                                                    </tr>
                                                ))}

                                                {config.reportType === 'remittance' && (
                                                    <>
                                                        {[
                                                            { label: 'SSS Contribution Total', value: data.governmentRemittance.sss },
                                                            { label: 'PhilHealth Contribution Total', value: data.governmentRemittance.philhealth },
                                                            { label: 'Pag-IBIG Contribution Total', value: data.governmentRemittance.pagibig }
                                                        ].map((row, i) => (
                                                            <tr key={i}>
                                                                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.label}</td>
                                                                <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'right', fontWeight: 600 }}>PHP {Number(row.value || 0).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                        <tr style={{ background: '#eff6ff' }}>
                                                            <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#1d4ed8', fontWeight: 800 }}>GRAND TOTAL</td>
                                                            <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#1d4ed8', textAlign: 'right', fontWeight: 800 }}>PHP {Number(data.governmentRemittance.total || 0).toLocaleString()}</td>
                                                        </tr>
                                                    </>
                                                )}
                                                {config.reportType === 'headcount' && data.headcount.byDepartment.map((dept, i) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{dept.name}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{dept.count}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'right' }}>{Math.round((dept.count / (data.headcount.total || 1)) * 100)}%</td>
                                                    </tr>
                                                ))}
                                                {config.reportType === 'compliance' && filterData(data.complianceAudit || []).map((row: any, i: number) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.name}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.department}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.status}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#dc2626', textAlign: 'right' }}>{row.missingFields.join(', ') || 'NONE'}</td>
                                                    </tr>
                                                ))}
                                                {config.reportType === 'tenure' && filterData(data.tenureData || []).map((row: any, i: number) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.name}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155' }}>{row.department}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.dateHired}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.tenure}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#334155', textAlign: 'center' }}>{row.daysToAnniversary}d</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        <div style={{ marginTop: '50px', display: 'flex', justifySelf: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                                            <div style={{ width: '150px', borderBottom: '1px solid #cbd5e1', marginBottom: '8px' }}></div>
                                            <span style={{ fontSize: '8px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HR Manager Badge Verified</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div style={{
                                    padding: '1.5rem 2rem',
                                    borderTop: '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '1rem',
                                    background: '#f8fafc'
                                }}>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            background: 'white',
                                            color: '#475569',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Close Preview
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPreview(false);
                                            handlePrint();
                                        }}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#10b981',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                                        Print Now
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPreview(false);
                                            handleGenerate();
                                        }}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#1e293b',
                                            color: 'white',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                        Export PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
