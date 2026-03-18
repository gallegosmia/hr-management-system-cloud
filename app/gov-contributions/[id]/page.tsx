'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function GovContributionReportView() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id;

    const [report, setReport] = useState<any>(null);
    const [details, setDetails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
        fetchReport();
    }, [reportId]);

    const fetchReport = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/gov-contributions/${reportId}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setReport(data.report);
                setDetails(data.details);
            } else {
                router.push('/gov-contributions');
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

        setActionLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/gov-contributions/${reportId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchReport();
            } else {
                const data = await res.json();
                alert(data.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!report) return null;

    const isManager = userRole === 'President' || userRole === 'Vice President' || userRole === 'Manager' || userRole === 'Operations Manager';
    const isSSS = report.contribution_type === 'SSS';
    const isPagIbig = report.contribution_type === 'Pag-IBIG';
    const isPhic = report.contribution_type === 'PhilHealth';

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        const data = details.map(d => {
            const row: any = {
                'Name of Employees': `${d.last_name}, ${d.first_name}`,
                [isSSS ? 'SSS No.' : isPagIbig ? 'Pag-IBIG No.' : 'PHIC No.']: d.government_number,
                'Salary': Number(d.salary).toFixed(2)
            };
            if (isPhic) {
                row['Total Contrib.'] = (Number(d.ee_share) + Number(d.er_share)).toFixed(2);
            }
            row['EE Share'] = Number(d.ee_share).toFixed(2);
            row['ER Share'] = Number(d.er_share).toFixed(2);
            if (isSSS) {
                row['EC'] = Number(d.ec).toFixed(2);
            }
            row['Loan Deduct.'] = Number(d.loan_deduction).toFixed(2);
            row['Total'] = (Number(d.ee_share) + Number(d.er_share) + Number(d.ec) + Number(d.loan_deduction)).toFixed(2);
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Contributions");
        XLSX.writeFile(workbook, `${report.branch_id}_${report.contribution_type}_${report.payroll_period}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('landscape');

        doc.setFontSize(16);
        doc.text(`${report.branch_id} Monthly ${report.contribution_type} Contribution`, 14, 20);
        doc.setFontSize(11);
        doc.text(`Payroll Period: ${report.payroll_period}`, 14, 28);

        const tableColumn = ["Name of Employees", isSSS ? 'SSS No.' : isPagIbig ? 'Pag-IBIG No.' : 'PHIC No.', "Salary"];
        if (isPhic) tableColumn.push("Total Contrib.");
        tableColumn.push("EE Share", "ER Share");
        if (isSSS) tableColumn.push("EC");
        tableColumn.push("Loan Deduct.", "Total");

        const tableRows: any[] = [];

        details.forEach(d => {
            const total = Number(d.ee_share) + Number(d.er_share) + Number(d.ec) + Number(d.loan_deduction);
            const rowData: any[] = [
                `${d.last_name}, ${d.first_name}`,
                d.government_number,
                Number(d.salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];
            if (isPhic) {
                rowData.push((Number(d.ee_share) + Number(d.er_share)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }
            rowData.push(
                Number(d.ee_share).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                Number(d.er_share).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            );
            if (isSSS) {
                rowData.push(Number(d.ec).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }
            rowData.push(
                Number(d.loan_deduction) > 0 ? Number(d.loan_deduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
                total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            );
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [15, 23, 42] }
        });

        doc.save(`${report.branch_id}_${report.contribution_type}_${report.payroll_period}.pdf`);
    };

    return (
        <DashboardLayout>
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    .dashboard-sidebar, .dashboard-header { display: none !important; }
                    .dashboard-main { padding: 0 !important; margin: 0 !important; }
                }
            `}</style>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <Link href="/gov-contributions" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2 mb-2">
                            <span>←</span> Back to Tracker
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">
                            {report.branch_id} Monthly {report.contribution_type} Contribution
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Payroll Period: <span className="font-semibold text-slate-700">{report.payroll_period}</span></p>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold border 
                            ${report.status === 'Draft' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                                report.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                    report.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                        'bg-rose-100 text-rose-700 border-rose-300'}`}>
                            {report.status.toUpperCase()}
                        </div>

                        {/* Actions Workflow */}
                        <div className="flex gap-2">
                            {report.status === 'Draft' && (
                                <button
                                    onClick={() => handleStatusUpdate('Pending')}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700 transition"
                                >
                                    Submit to Manager
                                </button>
                            )}

                            {report.status === 'Pending' && isManager && (
                                <>
                                    <button
                                        onClick={() => handleStatusUpdate('Approved')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate('Rejected')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-rose-700 transition"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <div className="font-semibold text-slate-700">Detailed Computation</div>
                        <div className="flex gap-2 no-print">
                            <button onClick={handlePrint} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                <span>👁️</span> Preview Print
                            </button>
                            <button onClick={handleExportPDF} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                <span>📄</span> Export PDF
                            </button>
                            <button onClick={handleExportExcel} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                <span>📊</span> Export Excel
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead className="bg-[#f8fafc]">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 uppercase text-xs tracking-wider w-[250px]">Name of Employees</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 w-[120px]">{isSSS ? 'SSS No.' : isPagIbig ? 'Pag-IBIG No.' : 'PHIC No.'}</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-right w-[120px]">Salary</th>

                                    {isPhic && (
                                        <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-right">Total Contrib.</th>
                                    )}

                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-right">EE Share</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-right">ER Share</th>

                                    {isSSS && (
                                        <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-right">EC</th>
                                    )}

                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-right">Loan Deduct.</th>
                                    <th className="px-4 py-3 font-bold text-slate-800 text-right bg-slate-50">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {details.map((d: any, index: number) => {
                                    const totalRow = Number(d.ee_share) + Number(d.er_share) + Number(d.ec) + Number(d.loan_deduction);

                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 border-r border-slate-100">
                                                <div className="font-medium text-slate-800">{d.last_name}, {d.first_name}</div>
                                            </td>
                                            <td className="px-4 py-2 border-r border-slate-100 font-mono text-slate-600">
                                                {d.government_number}
                                            </td>
                                            <td className="px-4 py-2 border-r border-slate-100 text-right font-medium text-slate-700">
                                                {Number(d.salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {isPhic && (
                                                <td className="px-4 py-2 border-r border-slate-100 text-right font-medium text-emerald-600">
                                                    {(Number(d.ee_share) + Number(d.er_share)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            )}

                                            <td className="px-4 py-2 border-r border-slate-100 text-right text-slate-600">
                                                {Number(d.ee_share).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2 border-r border-slate-100 text-right text-slate-600">
                                                {Number(d.er_share).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>

                                            {isSSS && (
                                                <td className="px-4 py-2 border-r border-slate-100 text-right text-slate-600">
                                                    {Number(d.ec).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            )}

                                            <td className="px-4 py-2 border-r border-slate-100 text-right text-amber-600 font-medium">
                                                {Number(d.loan_deduction) > 0 ? Number(d.loan_deduction).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-800 bg-slate-50/50">
                                                {totalRow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td className="px-4 py-3 text-slate-800 border-r border-slate-300">GRAND TOTAL</td>
                                    <td className="px-4 py-3 border-r border-slate-300"></td>
                                    <td className="px-4 py-3 border-r border-slate-300"></td>

                                    {isPhic && (
                                        <td className="px-4 py-3 border-r border-slate-300 text-right text-emerald-700">
                                            {(Number(report.total_ee) + Number(report.total_er)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    )}

                                    <td className="px-4 py-3 border-r border-slate-300 text-right">
                                        {Number(report.total_ee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 border-r border-slate-300 text-right">
                                        {Number(report.total_er).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    {isSSS && (
                                        <td className="px-4 py-3 border-r border-slate-300 text-right">
                                            {Number(report.total_ec).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    )}

                                    <td className="px-4 py-3 border-r border-slate-300 text-right text-amber-700">
                                        {Number(report.total_loan).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-right text-[#0f172a] text-lg bg-emerald-100/30">
                                        {(Number(report.total_ee) + Number(report.total_er) + Number(report.total_ec) + Number(report.total_loan)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Generated By</div>
                        <div className="font-medium text-slate-800">{report.created_by_name || 'System'}</div>
                        <div className="text-xs text-slate-400 mt-1">{new Date(report.created_at).toLocaleDateString()}</div>
                    </div>
                    {report.approved_by_name && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Approved By</div>
                            <div className="font-medium text-emerald-700">{report.approved_by_name}</div>
                            <div className="text-xs text-slate-400 mt-1">Branch Manager</div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
