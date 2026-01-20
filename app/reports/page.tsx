'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
    attendanceSummary: any[];
    leaveUsage: any[];
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
            const res = await fetch(`/api/reports?start=${config.startDate}&end=${config.endDate}&branch=${config.branch}`);
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
            const res = await fetch('/api/employees/branches');
            const result = await res.json();
            setBranches(result);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await fetch('/api/employees/departments');
            const result = await res.json();
            setDepartments(result);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
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

    // PDF Generators (Linked to the reportType)
    const handleGenerate = () => {
        if (!data) return;
        switch (config.reportType) {
            case 'attendance': genAttendancePDF(); break;
            case 'leave': genLeavePDF(); break;
            case 'payroll': genPayrollPDF(); break;
            case 'compliance': genCompliancePDF(); break;
            case 'tenure': genTenurePDF(); break;
            case 'remittance': genRemittancePDF(); break;
            case 'headcount': genHeadcountPDF(); break;
        }
    };

    const filterData = (rows: any[]) => {
        return rows.filter(row => {
            const deptMatch = config.department === 'All Departments' || row.department === config.department;
            const branchMatch = config.branch === 'All Branches' || row.branch === config.branch;
            return deptMatch && branchMatch;
        });
    };

    const genAttendancePDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Attendance Summary');
        const tableData = filterData(data.attendanceSummary)
            .map(row => [row.name, row.department, row.present, row.late, row.absent, row.onLeave || 0, `${row.tardinessRate}%`]);
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
        doc.save(`Attendance_Report.pdf`);
    };

    const genLeavePDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Leave Credit & Usage Report');
        const tableData = filterData(data.leaveUsage)
            .map(row => [row.name, row.department, row.entitlement, row.used, row.remaining]);
        autoTable(doc, {
            head: [['Employee', 'Department', 'Yearly Credits', 'Days Used', 'Balance']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [16, 185, 129] },
        });
        doc.save(`Leave_Credits_Report.pdf`);
    };

    const genPayrollPDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Payroll & Benefits Expenditure');
        const summary = data.payrollSummary;
        const tableData = [
            ['Total Basic Salaries', `PHP ${summary.totalBasicRate.toLocaleString()}`],
            ['Total Allowances', `PHP ${summary.totalAllowances.toLocaleString()}`],
            ['SSS Contributions', `PHP ${summary.totalSSS.toLocaleString()}`],
            ['PhilHealth Contributions', `PHP ${summary.totalPhilHealth.toLocaleString()}`],
            ['Pag-IBIG Contributions', `PHP ${summary.totalPagIBIG.toLocaleString()}`],
            ['Total Monthly Liability', `PHP ${(summary.totalBasicRate + summary.totalAllowances + summary.totalSSS + summary.totalPhilHealth + summary.totalPagIBIG).toLocaleString()}`]
        ];
        autoTable(doc, {
            head: [['Expense Category', 'Total Amount']],
            body: tableData,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] },
        });
        doc.save(`Payroll_Expenditure.pdf`);
    };

    const genCompliancePDF = () => {
        if (!data) return;
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
        doc.save(`Compliance_Audit.pdf`);
    };

    const genTenurePDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Employee Tenure & Anniversaries');
        const tableData = filterData(data.tenureData)
            .map(row => [row.name, row.department, row.dateHired, row.tenure, row.daysToAnniversary <= 30 ? `IN ${row.daysToAnniversary} DAYS!` : `${row.daysToAnniversary} d`]);
        autoTable(doc, {
            head: [['Employee', 'Department', 'Date Hired', 'Tenure', 'Next Anniversary']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [139, 92, 246] },
        });
        doc.save(`Tenure_Report.pdf`);
    };

    const genRemittancePDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Government Remittance Checklist');
        const remit = data.governmentRemittance;
        const tableData = [
            ['SSS Contribution Total', `PHP ${remit.sss.toLocaleString()}`],
            ['PhilHealth Contribution Total', `PHP ${remit.philhealth.toLocaleString()}`],
            ['Pag-IBIG Contribution Total', `PHP ${remit.pagibig.toLocaleString()}`],
            ['GRAND TOTAL', `PHP ${remit.total.toLocaleString()}`]
        ];
        autoTable(doc, {
            head: [['Agency', 'Amount to Remit']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [59, 130, 246] },
        });
        doc.save(`Remittance_Checklist.pdf`);
    };

    const genHeadcountPDF = () => {
        if (!data) return;
        const doc = new jsPDF();
        addReportHeader(doc, 'Headcount & Growth Report');
        const tableData = data.headcount.byDepartment.map(dept => [dept.name, dept.count, `${Math.round((dept.count / data.headcount.total) * 100)}%`]);
        autoTable(doc, {
            head: [['Department', 'Staff Count', 'Organization %']],
            body: tableData,
            startY: 50,
            headStyles: { fillColor: [107, 114, 128] },
        });
        doc.save(`Headcount_Report.pdf`);
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
                                {departments.map(dept => (
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
                                {branches.map(branch => (
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
                            GENERATE REPORT
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
