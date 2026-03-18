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

    // Inline Editing logic
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editEE, setEditEE] = useState<string>('');
    const [editER, setEditER] = useState<string>('');
    const [editEC, setEditEC] = useState<string>('');
    const [editMpfEr, setEditMpfEr] = useState<string>('');

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

                const reportData = data.report;
                let mappedDetails = data.details || [];

                mappedDetails = mappedDetails.map((empMatch: any) => {
                    let d = { ...empMatch };
                    if (d.salary_info) {
                        let parsedSalary: any = {};
                        try {
                            parsedSalary = typeof d.salary_info === 'string' ? JSON.parse(d.salary_info) : d.salary_info;
                        } catch (e) { }

                        const deds = parsedSalary.deductions || {};
                        const getVal = (v: any) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

                        if (reportData.contribution_type === 'Pag-IBIG' || reportData.contribution_type === 'PagIBIG') {
                            const pb15 = getVal(deds.pagibig_loan_15th);
                            const pb30 = getVal(deds.pagibig_loan_30th);
                            let pbLegacy = 0;
                            if (!pb15 && deds.pagibig_loan && !pb30) {
                                pbLegacy = getVal(deds.pagibig_loan?.amortization || deds.pagibig_loan);
                            }
                            const pbTotal = pb15 + pb30 + pbLegacy;
                            d.loan_deduction = Math.max(Number(d.loan_deduction || 0), pbTotal);
                        } else if (reportData.contribution_type === 'SSS') {
                            const sssLoan = getVal(deds.sss_loan?.amortization || deds.sss_loan);
                            d.loan_deduction = Math.max(Number(d.loan_deduction || 0), sssLoan);
                        }
                    }
                    return d;
                });

                setReport(reportData);
                setDetails(mappedDetails);
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

    const handleEditClick = (detail: any) => {
        setEditingId(detail.id);
        setEditEE(detail.ee_share?.toString() || '0');
        setEditER(detail.er_share?.toString() || '0');
        setEditEC(detail.ec?.toString() || '0');
        setEditMpfEr(detail.mpf_er?.toString() || '0');
    };

    const handleSaveEdit = async (detailId: number) => {
        setActionLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/gov-contributions/details/${detailId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId || '' },
                body: JSON.stringify({ ee_share: editEE, er_share: editER, ec: editEC, mpf_er: editMpfEr })
            });

            if (res.ok) {
                setEditingId(null);
                fetchReport();
            } else {
                const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                console.error('Save edit error:', errData);
                alert(`Update failed: ${errData.error || res.status}`);
            }
        } catch (error) {
            console.error('Save edit exception:', error);
            alert('A network error occurred. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDetail = async (detailId: number) => {
        if (!confirm('Are you sure you want to remove this employee from the report?')) return;
        setActionLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/gov-contributions/details/${detailId}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                fetchReport();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-64 items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E40AF]"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!report) return null;

    const isManager = userRole === 'President' || userRole === 'Vice President' || userRole === 'Manager' || userRole === 'Operations Manager';
    const isPhic = report.contribution_type === 'PhilHealth';
    const isSss = report.contribution_type === 'SSS';

    // ✅ Always compute totals live from the details array (avoids stale DB master values)
    const totalEE = details.reduce((sum, d) => sum + Number(d.ee_share || 0), 0);
    const totalER = details.reduce((sum, d) => sum + Number(d.er_share || 0), 0);
    const totalEC = details.reduce((sum, d) => sum + Number(d.ec || 0), 0);
    const totalMpfEr = details.reduce((sum, d) => sum + Number(d.mpf_er || 0), 0);
    const serviceCharge = Number(report.service_charge || 0);
    const totalLoans = details.reduce((sum, d) => sum + Number(d.loan_deduction || 0), 0);

    const isPagibig = report.contribution_type === 'Pag-IBIG';
    const extraEE = isPagibig ? 200 : 0;
    const extraER = isPagibig ? 200 : 0;
    const extraTotal = extraEE + extraER;

    // Derived Totals based on rules
    // Total Contribution varies by type: PhilHealth shows EE+ER, Pag-IBIG shows EE+ER+Loan
    const totalContributionOnly = isPhic ? (totalEE + totalER) : (totalEE + totalER + totalEC + totalMpfEr + extraTotal);
    const grandTotalRemittance = totalContributionOnly + totalLoans + serviceCharge;

    const loanDetails = details.filter(d => Number(d.loan_deduction) > 0);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`${report.contribution_type} Detailed Summary`, 14, 18);
        doc.setFontSize(10);
        doc.text(`Period: ${report.payroll_period}`, 14, 26);
        doc.text(`Status: ${report.status}`, 14, 32);
        doc.text(`Due: 15th of the following month`, 14, 38);

        const rows = details.map((d: any) => {
            const rowData: any[] = [
                `${d.last_name}, ${d.first_name}`,
                formatMoney(Number(d.ee_share)),
                formatMoney(Number(d.er_share))
            ];
            if (isSss) {
                rowData.push(formatMoney(Number(d.ec || 0)));
                rowData.push(formatMoney(Number(d.mpf_er || 0)));
            }
            rowData.push(formatMoney(Number(d.ee_share || 0) + Number(d.er_share || 0) + (isPhic ? 0 : Number(d.ec || 0)) + (isSss ? Number(d.mpf_er || 0) : 0)));
            return rowData;
        });

        const footRows: any[] = [
            isSss ?
                ['Sub-total (Contribution)', formatMoney(totalEE), formatMoney(totalER), formatMoney(totalEC), formatMoney(totalMpfEr), formatMoney(totalEE + totalER + totalEC + totalMpfEr)] :
                ['Sub-total (Contribution)', formatMoney(totalEE), formatMoney(totalER + totalEC), formatMoney(isPhic ? totalEE + totalER : totalEE + totalER + totalEC)],
        ];
        if (isPagibig) {
            footRows.push(['Anna Liza Rodriguez', '200.00', '200.00', '400.00']);
            footRows.push(['TOTAL CONTRIBUTION', formatMoney(totalEE + extraEE), formatMoney(totalER + totalEC + extraER), formatMoney(totalEE + totalER + totalEC + extraTotal)]);
        }
        if (isPagibig || isSss) {
            if (totalLoans > 0) {
                loanDetails.forEach((ld: any) => {
                    footRows.push([`${ld.last_name}, ${ld.first_name} (Loan)`, '', '', isSss ? '' : '', isSss ? '' : '', formatMoney(Number(ld.loan_deduction))].filter((_, i, arr) => {
                        // Adjust padding based on columns
                        return (isSss && i < 6) || (!isSss && i !== 3 && i !== 4);
                    }));
                });
                footRows.push(isSss ? ['Sub-total (Loans)', '', '', '', '', formatMoney(totalLoans)] : ['Sub-total (Loans)', '', '', formatMoney(totalLoans)]);
            }
        }
        if (serviceCharge > 0) {
            footRows.push(isSss ? ['Service Charge', '', '', '', '', formatMoney(serviceCharge)] : ['Service Charge', '', '', formatMoney(serviceCharge)]);
        }
        footRows.push(isSss ? ['GRAND TOTAL REMITTANCE', '', '', '', '', formatMoney(grandTotalRemittance)] : ['GRAND TOTAL REMITTANCE', '', '', formatMoney(grandTotalRemittance)]);

        autoTable(doc, {
            startY: 46,
            head: [isSss ? ['Employee Name', 'EE', 'ER', 'EC', 'MPF (ER)', 'Total'] : ['Employee Name', 'EE', 'ER', 'Total']],
            body: rows,
            foot: footRows,
            headStyles: { fillColor: [29, 78, 216], halign: 'right' },
            footStyles: { fillColor: [240, 244, 255], textColor: [29, 78, 216], fontStyle: 'bold', halign: 'right' },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' }
            }
        });

        doc.save(`${report.contribution_type}_${report.payroll_period.replace(/ /g, '_')}_report.pdf`);
    };

    const handlePreviewPrint = () => {
        const previewWindow = window.open('', '_blank', 'width=900,height=700');
        if (!previewWindow) { alert('Pop-up blocked. Please allow pop-ups and try again.'); return; }
        const rows = details.map((d: any) => `
            <tr>
                <td>${d.last_name}, ${d.first_name}</td>
                <td style="text-align:right">${formatMoney(Number(d.ee_share || 0))}</td>
                <td style="text-align:right">${formatMoney(Number(d.er_share || 0))}</td>
                ${isSss ? `<td style="text-align:right">${formatMoney(Number(d.ec || 0))}</td><td style="text-align:right">${formatMoney(Number(d.mpf_er || 0))}</td>` : ''}
                <td style="text-align:right;font-weight:bold;color:#1d4ed8">${formatMoney(Number(d.ee_share || 0) + Number(d.er_share || 0) + (isPhic ? 0 : Number(d.ec || 0)) + (isSss ? Number(d.mpf_er || 0) : 0))}</td>
            </tr>
        `).join('');
        previewWindow.document.write(`
            <html><head><title>${report.contribution_type} Report - ${report.payroll_period}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
                h1 { font-size: 22px; margin-bottom: 4px; } p { color: #64748b; margin: 2px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #1d4ed8; color: white; padding: 10px; text-align: left; font-size: 12px; }
                td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                tfoot td { font-weight: bold; background: #f0f4ff; color: #1d4ed8; }
                .total-row { margin-top: 16px; font-size: 16px; font-weight: bold; text-align: right; color: #1d4ed8; }
                @media print { button { display: none !important; } }
            </style></head>
            <body>
            <button onclick="window.print()" style="float:right;padding:8px 18px;background:#1d4ed8;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;margin-bottom:10px">🖨️ Print</button>
            <h1>${report.contribution_type} Detailed Summary</h1>
            <p>Period: <strong>${report.payroll_period}</strong></p>
            <p>Status: <strong>${report.status}</strong> &nbsp;|&nbsp; Due: <strong>15th of the Month</strong></p>
            <table>
                <thead><tr><th style="text-align:left">Employee Name</th><th style="text-align:right">EE</th><th style="text-align:right">ER</th>${isSss ? '<th style="text-align:right">EC</th><th style="text-align:right">MPF (ER)</th>' : ''}<th style="text-align:right">Total</th></tr></thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    ${isSss ? `
                    <tr><td><strong>Sub-total (Contribution)</strong></td><td style="text-align:right">${formatMoney(totalEE)}</td><td style="text-align:right">${formatMoney(totalER)}</td><td style="text-align:right">${formatMoney(totalEC)}</td><td style="text-align:right">${formatMoney(totalMpfEr)}</td><td style="text-align:right">${formatMoney(totalEE + totalER + totalEC + totalMpfEr)}</td></tr>
                    ` : `
                    <tr><td><strong>Sub-total (Contribution)</strong></td><td style="text-align:right">${formatMoney(totalEE)}</td><td style="text-align:right">${formatMoney(totalER + totalEC)}</td><td style="text-align:right">${formatMoney(isPhic ? totalEE + totalER : totalEE + totalER + totalEC)}</td></tr>
                    `}
                    ${isPagibig ? `<tr><td><strong>Anna Liza Rodriguez</strong></td><td style="text-align:right">200.00</td><td style="text-align:right">200.00</td><td style="text-align:right"><strong>400.00</strong></td></tr>` : ''}
                    ${isPagibig ? `<tr><td style="color:#dc2626; font-weight:900;">TOTAL CONTRIBUTION</td><td style="text-align:right; color:#dc2626; font-weight:900;">${formatMoney(totalEE + extraEE)}</td><td style="text-align:right; color:#dc2626; font-weight:900;">${formatMoney(totalER + totalEC + extraER)}</td><td style="text-align:right; color:#dc2626; font-weight:900;">${formatMoney(totalEE + totalER + totalEC + extraTotal)}</td></tr>` : ''}
                    ${(isPagibig || isSss) && totalLoans > 0 ? loanDetails.map((ld: any) => `<tr><td style="color:#4b5563;">${ld.last_name}, ${ld.first_name} (Loan)</td><td></td><td></td>${isSss ? '<td></td><td></td>' : ''}<td style="text-align:right;color:#4b5563;">${formatMoney(Number(ld.loan_deduction))}</td></tr>`).join('') : ''}
                    ${(isPagibig || isSss) && totalLoans > 0 ? `<tr><td style="color:#dc2626; font-weight:900; text-transform:uppercase;">SUB-TOTAL (LOANS)</td><td></td><td></td>${isSss ? '<td></td><td></td>' : ''}<td style="text-align:right; color:#dc2626; font-weight:900;">${formatMoney(totalLoans)}</td></tr>` : ''}
                    ${serviceCharge > 0 ? `<tr><td>Service Charge</td><td></td><td></td>${isSss ? '<td></td><td></td>' : ''}<td style="text-align:right">${formatMoney(serviceCharge)}</td></tr>` : ''}
                    <tr style="background:#fee2e2;">
                        <td style="font-size: 16px; font-weight: 900; color: #dc2626; padding-top: 14px; padding-bottom: 14px;">GRAND TOTAL REMITTANCE</td>
                        <td></td>
                        <td></td>
                        ${isSss ? '<td></td><td></td>' : ''}
                        <td style="text-align:right; font-size: 18px; font-weight: 900; color: #dc2626; padding-top: 14px; padding-bottom: 14px;">&#8369;${formatMoney(grandTotalRemittance)}</td>
                    </tr>
                </tfoot>
            </table>
            </body></html>
        `);
        previewWindow.document.close();
    };

    // Data formatters
    const formatMoney = (amount: number) => {
        if (isNaN(amount)) return '0.00';
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <DashboardLayout>
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .dashboard-sidebar, .dashboard-header { display: none !important; }
                    .dashboard-main { padding: 0 !important; margin: 0 !important; }
                    .print-break { page-break-inside: avoid; }
                }
                .blue-card { background-color: #2563EB !important; color: white !important; }
            `}</style>

            <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans bg-[#FAFAFA] min-h-screen">

                {/* Header Action Row */}
                <div className="mb-6">
                    <Link href="/gov-contributions" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition mb-4 no-print pr-4 py-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Back to Contributions
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-[#E0E7FF] text-[#4338CA] px-3 py-1 text-xs font-bold rounded-full tracking-wide">
                                    MONTHLY REPORT
                                </div>
                                <div className={`px-3 py-1 text-xs font-bold rounded-full border ${report.status === 'Draft' ? 'bg-slate-100 text-slate-700 border-slate-300' : report.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-300' : report.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                    {report.status.toUpperCase()}
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-1 tracking-tight">
                                {report.contribution_type} Detailed Summary
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <span>📅</span> {report.payroll_period}
                                </div>
                                <div className="flex items-center gap-1.5 text-rose-500 font-semibold">
                                    <span>❗</span> Due: 15th of the Month
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 pt-2 no-print">
                            <div className="relative hidden md:block">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                                <input type="text" placeholder="Search employees..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                            </div>
                            <button onClick={handlePreviewPrint} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 shadow-sm hover:bg-slate-50 transition text-sm font-bold flex items-center gap-2">
                                <span>👁️‍🗨️</span> Preview Print
                            </button>
                            <button onClick={handleExportPDF} className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 shadow-sm hover:bg-slate-50 transition text-sm font-bold flex items-center gap-2">
                                <span>📥</span> Export PDF
                            </button>
                            <button className="p-2 border border-slate-200 rounded-lg text-slate-600 shadow-sm transition hover:bg-slate-50">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm print-break">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">TOTAL CONTRIBUTIONS</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-extrabold text-slate-900">₱{formatMoney(totalContributionOnly)}</div>
                            <div className="text-xs font-bold text-emerald-500">+2.5%</div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 mt-5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 w-[65%] h-full"></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm print-break">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">TOTAL SALARY LOANS</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-extrabold text-slate-900">₱{formatMoney(totalLoans)}</div>
                            <div className="text-sm font-semibold text-blue-500">{loanDetails.length} active</div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 mt-5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 w-[75%] h-full"></div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm print-break">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">SERVICE CHARGES</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-extrabold text-slate-900">₱{formatMoney(serviceCharge)}</div>
                            <div className="text-sm font-semibold text-slate-400">Fixed Rate</div>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 mt-5 rounded-full overflow-hidden">
                            <div className="bg-slate-400 w-[30%] h-full"></div>
                        </div>
                    </div>

                    <div className="blue-card rounded-xl shadow-md border border-transparent print-break flex flex-col justify-center relative overflow-hidden py-5 px-6">
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-2 relative z-10">GRAND TOTAL REMITTANCE</div>
                        <div className="text-3xl font-extrabold relative z-10 text-white tracking-tight">₱{formatMoney(grandTotalRemittance)}</div>
                        <div className="text-[10px] font-medium text-blue-200 mt-4 relative z-10 uppercase tracking-widest">CONSOLIDATED SUMMARY FOR {report.payroll_period.toUpperCase()}</div>
                    </div>
                </div>

                {/* Tables Section - Dual Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* Left Column: Contributions */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-break">
                        <div className="p-5 flex justify-between items-center bg-white">
                            <div className="flex items-center gap-3">
                                <div className="text-[#1E40AF] text-lg font-bold flex items-center">👥</div>
                                <h2 className="text-[15px] font-bold text-slate-900">Monthly Contributions</h2>
                            </div>
                            <div className="text-slate-500 text-xs font-bold border border-slate-200 px-3 py-1 rounded-md">
                                {details.length} Employees
                            </div>
                        </div>

                        <div className="overflow-auto max-h-[600px] min-h-[350px]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-white drop-shadow-sm box-border after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:border-b after:border-slate-200">
                                    <tr className="text-left bg-white">
                                        <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[40%]">EMPLOYEE NAME</th>
                                        <th className="py-4 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">EE</th>
                                        <th className="py-4 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">ER</th>
                                        {isSss && (
                                            <>
                                                <th className="py-4 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">EC</th>
                                                <th className="py-4 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">MPF (ER)</th>
                                            </>
                                        )}
                                        <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">TOTAL</th>
                                        <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-24">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {details.map((d) => (
                                        <tr key={d.id} className="hover:bg-slate-50 transition text-slate-800">
                                            <td className="py-3.5 px-5 text-[13px] font-medium">
                                                {d.last_name}, {d.first_name}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-mono text-[13px] text-slate-600">
                                                {editingId === d.id ? (
                                                    <input type="number" value={editEE} onChange={(e) => setEditEE(e.target.value)} className="w-20 text-right border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-[13px]" />
                                                ) : formatMoney(Number(d.ee_share || 0))}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-mono text-[13px] text-slate-600">
                                                {editingId === d.id ? (
                                                    <input type="number" value={editER} onChange={(e) => setEditER(e.target.value)} className="w-20 text-right border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-[13px]" />
                                                ) : formatMoney(Number(d.er_share || 0))}
                                            </td>
                                            {isSss && (
                                                <>
                                                    <td className="py-3.5 px-3 text-right font-mono text-[13px] text-slate-600">
                                                        {editingId === d.id ? (
                                                            <input type="number" value={editEC} onChange={(e) => setEditEC(e.target.value)} className="w-16 text-right border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-[13px]" />
                                                        ) : formatMoney(Number(d.ec || 0))}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-right font-mono text-[13px] text-slate-600">
                                                        {editingId === d.id ? (
                                                            <input type="number" value={editMpfEr} onChange={(e) => setEditMpfEr(e.target.value)} className="w-16 text-right border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 text-[13px]" />
                                                        ) : formatMoney(Number(d.mpf_er || 0))}
                                                    </td>
                                                </>
                                            )}
                                            <td className="py-3.5 px-5 text-right font-mono font-bold text-blue-600 text-[13px]">
                                                {formatMoney((editingId === d.id ? Number(editEE || 0) : Number(d.ee_share || 0)) + (editingId === d.id ? Number(editER || 0) : Number(d.er_share || 0)) + (isPhic ? 0 : (editingId === d.id && isSss ? Number(editEC || 0) : Number(d.ec || 0))) + (isSss ? (editingId === d.id ? Number(editMpfEr || 0) : Number(d.mpf_er || 0)) : 0))}
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                {report.status !== 'Approved' && (
                                                    <div className="flex gap-3 justify-center">
                                                        {editingId === d.id ? (
                                                            <>
                                                                <button onClick={() => handleSaveEdit(d.id)} className="text-blue-600 font-bold text-[13px] hover:text-blue-800 transition disabled:opacity-50" disabled={actionLoading}>Save</button>
                                                                <button onClick={() => setEditingId(null)} className="text-slate-400 font-bold text-[13px] hover:text-slate-600 transition disabled:opacity-50" disabled={actionLoading}>Cancel</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleEditClick(d)} className="text-[#1d4ed8] font-bold text-[13px] hover:underline disabled:opacity-50" disabled={actionLoading}>Edit</button>
                                                                <button onClick={() => handleDeleteDetail(d.id)} className="text-rose-600 font-bold text-[13px] hover:underline disabled:opacity-50" disabled={actionLoading}>Delete</button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="sticky bottom-0 z-10 shadow-[0_-1px_0_0_#e2e8f0]">
                                    <tr className="border-t border-slate-200 bg-white">
                                        <td className="py-4 px-5 text-[13px] font-bold text-slate-900 border-b border-slate-100">Sub-total (Contribution)</td>
                                        <td className="py-4 px-3 text-right font-mono font-bold text-[13px] text-slate-900 border-b border-slate-100">{formatMoney(totalEE)}</td>
                                        <td className="py-4 px-3 text-right font-mono font-bold text-[13px] text-slate-900 border-b border-slate-100">{formatMoney(isSss ? totalER : totalER + totalEC)}</td>
                                        {isSss && (
                                            <>
                                                <td className="py-4 px-3 text-right font-mono font-bold text-[13px] text-slate-900 border-b border-slate-100">{formatMoney(totalEC)}</td>
                                                <td className="py-4 px-3 text-right font-mono font-bold text-[13px] text-slate-900 border-b border-slate-100">{formatMoney(totalMpfEr)}</td>
                                            </>
                                        )}
                                        <td className="py-4 px-5 text-right font-mono font-bold text-[13px] text-blue-600 border-b border-slate-100">{formatMoney(isPhic ? totalEE + totalER : totalEE + totalER + totalEC + totalMpfEr)}</td>
                                        <td className="py-4 px-5 border-b border-slate-100 bg-white"></td>
                                    </tr>
                                    {isPagibig && (
                                        <>
                                            <tr className="bg-[#F8FAFC]">
                                                <td className="py-3 px-5 font-bold text-[12px] text-slate-800 uppercase tracking-wide border-b border-slate-100">Anna Liza Rodriguez</td>
                                                <td className="py-3 px-3 text-right font-mono font-medium text-[13px] text-slate-800 border-b border-slate-100">200.00</td>
                                                <td className="py-3 px-3 text-right font-mono font-medium text-[13px] text-slate-800 border-b border-slate-100">200.00</td>
                                                <td className="py-3 px-5 text-right font-mono font-bold text-[13px] text-blue-600 border-b border-slate-100">400.00</td>
                                                <td className="border-b border-slate-100"></td>
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="py-3 px-5 font-bold text-[12px] text-red-600 uppercase tracking-wide border-b border-slate-100">TOTAL CONTRIBUTION</td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-[13px] text-red-600 border-b border-slate-100">{formatMoney(totalEE + extraEE)}</td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-[13px] text-red-600 border-b border-slate-100">{formatMoney(totalER + totalEC + extraER)}</td>
                                                <td className="py-3 px-5 text-right font-mono font-extrabold text-[13px] text-red-600 border-b border-slate-100">{formatMoney(totalEE + totalER + totalEC + extraTotal)}</td>
                                                <td className="border-b border-slate-100"></td>
                                            </tr>
                                        </>
                                    )}
                                </tfoot>
                            </table>
                        </div>

                        {/* Additional Summary Footer */}
                        <div className="bg-white border-t border-slate-200">

                            {isPagibig && totalLoans > 0 && (
                                <div className="border-b border-slate-100 bg-white">
                                    {loanDetails.map((ld: any, idx: number) => (
                                        <div key={`ui-loan-${idx}`} className="flex justify-between items-center py-2.5 px-6 border-b border-slate-50 bg-[#FfFfFf]">
                                            <div className="text-[12px] text-slate-600 pl-4">{ld.last_name}, {ld.first_name} (Loan)</div>
                                            <div className="font-mono text-[13px] text-slate-600 flex-shrink-0">
                                                {formatMoney(Number(ld.loan_deduction))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center py-3 px-5 border-t border-slate-100 bg-white">
                                        <div className="font-bold text-[12px] text-red-600 tracking-wide uppercase">SUB-TOTAL (LOANS)</div>
                                        <div className="font-mono font-extrabold text-[13px] text-red-600 flex-shrink-0 pr-0 sm:pr-2">
                                            {formatMoney(totalLoans)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {serviceCharge > 0 && (
                                <div className="flex justify-between items-center py-3 px-5 border-b border-slate-100 bg-white">
                                    <div className="font-bold text-[10px] tracking-widest text-slate-600 uppercase flex-1 text-right pr-6 md:pr-10 lg:pr-12">SERVICE CHARGE</div>
                                    <div className="font-mono font-bold text-[13px] text-blue-600 flex-shrink-0">
                                        {formatMoney(serviceCharge)}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-6 px-5 bg-red-50 border-t border-red-100">
                                <div className="font-black text-[14px] tracking-widest text-red-600 uppercase">GRAND TOTAL REMITTANCE</div>
                                <div className="font-mono font-black text-2xl text-red-600 tracking-tight">
                                    ₱ {formatMoney(grandTotalRemittance)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Loans & Remittance */}
                    <div className="space-y-6 print-break">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
                            <div className="p-5 flex justify-between items-center bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="text-blue-600 text-lg font-bold flex items-center pt-0.5">💳</div>
                                    <h2 className="text-[15px] font-bold text-slate-900">Active Salary Loans</h2>
                                </div>
                                <div className="text-slate-500 text-xs font-bold border border-slate-200 px-3 py-1 rounded-md">
                                    {loanDetails.length} Accounts
                                </div>
                            </div>

                            <div className="overflow-x-auto min-h-[350px]">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-t border-b border-slate-100 text-left bg-white">
                                            <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[45%]">BORROWER NAME</th>
                                            <th className="py-4 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">DEDUCTION AMOUNT</th>
                                            <th className="py-4 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {loanDetails.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="py-12 text-center text-slate-400 italic">No active loan deductions for this batch.</td>
                                            </tr>
                                        ) : loanDetails.map((d) => (
                                            <tr key={`loan-${d.id}`} className="hover:bg-slate-50 transition text-slate-800">
                                                <td className="py-3.5 px-5 text-[13px] font-medium">
                                                    {d.last_name}, {d.first_name}
                                                </td>
                                                <td className="py-3.5 px-3 text-right font-mono text-[13px] text-slate-800">
                                                    {formatMoney(Number(d.loan_deduction))}
                                                </td>
                                                <td className="py-3.5 px-5 text-right w-12">
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 text-white flex items-center justify-center ml-auto font-serif italic text-xs">i</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Loans Summary Footer */}
                            <div className="bg-white border-t border-slate-200">
                                <div className="flex justify-between items-center py-4 px-5">
                                    <div className="font-bold text-[11px] text-slate-500 tracking-widest uppercase">SUB-TOTAL (LOANS)</div>
                                    <div className="font-mono font-bold text-base text-slate-900 pr-12">
                                        {formatMoney(totalLoans)}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-5 px-5 bg-[#F8FAFC] border-t border-slate-200">
                                    <div className="font-bold text-[11px] tracking-widest text-slate-900 uppercase">TOTAL LOAN PAYMENT</div>
                                    <div className="font-mono font-extrabold text-lg text-blue-600 tracking-tight pr-12">
                                        {formatMoney(totalLoans)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Workflow */}
                        <div className="flex justify-end gap-3 mt-4 no-print pb-8">
                            {report.status === 'Draft' && (
                                <button onClick={() => handleStatusUpdate('Pending')} disabled={actionLoading} className="px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-slate-900 transition flex items-center gap-2 border border-slate-900">
                                    Submit Remittance
                                </button>
                            )}

                            {report.status === 'Pending' && isManager && (
                                <>
                                    <button onClick={() => handleStatusUpdate('Rejected')} disabled={actionLoading} className="px-6 py-2.5 bg-white text-rose-600 border border-slate-200 text-sm font-bold rounded-lg hover:bg-rose-50 hover:border-rose-200 transition">
                                        Return / Reject
                                    </button>
                                    <button onClick={() => handleStatusUpdate('Approved')} disabled={actionLoading} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700 transition flex items-center gap-2 border border-blue-600">
                                        Approve Remittance
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
