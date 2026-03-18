'use client';

import { useState, useEffect, Fragment } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { format, parse, addMonths, setDate, differenceInDays, isPast } from 'date-fns';

interface GovContributionReport {
    id: number;
    branch_id: string;
    payroll_period: string;
    contribution_type: string;
    total_er: number;
    total_ee: number;
    total_ec: number;
    total_loan: number;
    status: string;
    created_at: string;
    approved_by: number | null;
    approved_by_name?: string;
}

export default function GovContributionsTracker() {
    const [reports, setReports] = useState<GovContributionReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAgency, setExpandedAgency] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/gov-contributions', {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (error) {
            console.error('Failed to fetch Gov Contributions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredReports = statusFilter === 'All' ? reports : reports.filter(r => r.status === statusFilter);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this contribution report? This action cannot be undone.')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/gov-contributions/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });

            if (res.ok) {
                setReports(reports.filter(r => r.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete report.');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('An error occurred during deletion.');
        }
    };

    // Data Aggregation for RemitHub Layout
    type AgencySummary = {
        name: string;
        type: string;
        employees: number;
        contribution: number;
        loan: number;
        readyChecks: { draft: number; pending: number; approved: number; total: number };
        reports: GovContributionReport[];
    };

    const summaries: Record<string, AgencySummary> = {
        'SSS': { name: 'Social Security System', type: 'SSS', employees: 0, contribution: 0, loan: 0, readyChecks: { draft: 0, pending: 0, approved: 0, total: 0 }, reports: [] },
        'PhilHealth': { name: 'PhilHealth', type: 'PhilHealth', employees: 0, contribution: 0, loan: 0, readyChecks: { draft: 0, pending: 0, approved: 0, total: 0 }, reports: [] },
        'Pag-IBIG': { name: 'Pag-IBIG Fund', type: 'Pag-IBIG', employees: 0, contribution: 0, loan: 0, readyChecks: { draft: 0, pending: 0, approved: 0, total: 0 }, reports: [] }
    };

    let totalDisbursed = 0;

    // Determine the overall active month based on the most common payroll_period in the visible reports
    let activeMonth = format(new Date(), 'MMMM yyyy');
    if (filteredReports.length > 0) {
        const periods = filteredReports.map(r => r.payroll_period);
        activeMonth = periods.sort((a, b) => periods.filter(v => v === a).length - periods.filter(v => v === b).length).pop() || activeMonth;
    }

    filteredReports.forEach(report => {
        if (summaries[report.contribution_type]) {
            const summary = summaries[report.contribution_type];
            summary.reports.push(report);

            // Safe numbers
            const er = Number(report.total_er) || 0;
            const ee = Number(report.total_ee) || 0;
            const ec = Number(report.total_ec) || 0;
            const loan = Number(report.total_loan) || 0;
            const sc = Number((report as any).service_charge) || 0;
            const empCount = Number((report as any).employee_count) || 0;

            const isPhic = report.contribution_type === 'PhilHealth';
            const contrib = isPhic ? (ee + er + sc) : (ee + er + ec + sc);

            summary.employees += empCount;
            summary.contribution += contrib;
            summary.loan += loan;

            totalDisbursed += (contrib + loan);

            summary.readyChecks.total++;
            if (report.status === 'Draft') summary.readyChecks.draft++;
            if (report.status === 'Pending') summary.readyChecks.pending++;
            if (report.status === 'Approved') summary.readyChecks.approved++;
        }
    });

    // Calculate Deadline: 15th of the month FOLLOWING the active payroll period
    let deadlineDate = new Date();
    let daysRemainingContent = "No active period";
    let isDeadlinePast = false;

    try {
        const periodDate = parse(activeMonth, 'MMMM yyyy', new Date());
        deadlineDate = setDate(addMonths(periodDate, 1), 15);

        const today = new Date();
        const diff = differenceInDays(deadlineDate, today);
        isDeadlinePast = isPast(deadlineDate) && diff < 0;

        if (diff > 0) {
            daysRemainingContent = `${diff} days remaining for current period`;
        } else if (diff === 0) {
            daysRemainingContent = "Deadline is today!";
        } else {
            daysRemainingContent = `${Math.abs(diff)} days overdue`;
        }
    } catch (e) {
        // Fallback if parsing fails
    }

    // Global Timeline Logic (Simplified for Visuals)
    let totalDrafts = summaries['SSS'].readyChecks.draft + summaries['PhilHealth'].readyChecks.draft + summaries['Pag-IBIG'].readyChecks.draft;
    let totalPending = summaries['SSS'].readyChecks.pending + summaries['PhilHealth'].readyChecks.pending + summaries['Pag-IBIG'].readyChecks.pending;
    let totalApproved = summaries['SSS'].readyChecks.approved + summaries['PhilHealth'].readyChecks.approved + summaries['Pag-IBIG'].readyChecks.approved;
    let overallTotal = filteredReports.length;

    // Timeline Steps - Logic based on the MOST advanced state currently active
    const hasAnyReports = overallTotal > 0;
    const finalApprovalDone = hasAnyReports && totalApproved === overallTotal; // All approved

    // The Manager Review is active if there is AT LEAST ONE pending report. 
    // It is COMPLETED (past) if there are 0 pending reports AND at least one approved report.
    const managerReviewReady = hasAnyReports && (totalPending > 0 || totalApproved > 0);

    // HR Submission is active if there is AT LEAST ONE draft report.
    // It is COMPLETED (past) if there are 0 drafts AND manager review is ready or done.
    const hrSubInProgress = hasAnyReports && (totalDrafts > 0 || managerReviewReady);
    const dataEntryDone = hasAnyReports;

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans bg-[#F8FAFC] min-h-screen">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight mb-1">Monthly Remittances Overview</h1>
                        <p className="text-[15px] text-slate-500 font-medium">Manage and track government agency submissions for {activeMonth}.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input type="text" placeholder="Search transactions, records..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-white shadow-sm" />
                        </div>
                        <Link href="/gov-contributions/generate" className="ml-2 bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition shadow-sm flex items-center gap-2">
                            <span>➤</span> Submit for Branch Manager Approval
                        </Link>
                    </div>
                </div>

                {/* Tracking Timeline Component */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6 relative overflow-hidden">
                    <div className="flex justify-between relative z-10 max-w-4xl mx-auto">

                        {/* Connecting Line */}
                        <div className="absolute top-[18px] left-[50px] right-[50px] h-[3px] bg-slate-100 -z-10"></div>
                        {/* Dynamic Progress Line */}
                        <div className="absolute top-[18px] left-[50px] h-[3px] bg-[#1d4ed8] -z-10 transition-all duration-500" style={{ width: finalApprovalDone ? '100%' : managerReviewReady ? '66%' : hrSubInProgress ? '33%' : '0%' }}></div>

                        {/* Step 1: Data Entry */}
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white mb-3 shadow-sm ${dataEntryDone ? 'bg-[#1d4ed8]' : 'bg-slate-200'}`}>✓</div>
                            <span className="text-sm font-bold text-slate-900">Data Entry</span>
                            <span className="text-[11px] font-medium text-slate-400 mt-1">{dataEntryDone ? 'Completed' : 'Pending'}</span>
                        </div>

                        {/* Step 2: HR Submission */}
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white mb-3 shadow-sm ${hrSubInProgress ? 'bg-[#1d4ed8]' : dataEntryDone ? 'bg-blue-100 text-[#1d4ed8]' : 'bg-slate-200'}`}>
                                {managerReviewReady ? '✓' : '•••'}
                            </div>
                            <span className={`text-sm font-bold ${hrSubInProgress ? 'text-[#1d4ed8]' : 'text-slate-400'}`}>HR Submission</span>
                            <span className={`text-[11px] font-medium mt-1 ${hrSubInProgress ? 'text-[#1d4ed8]' : 'text-slate-400'}`}>
                                {managerReviewReady ? 'Completed' : hrSubInProgress ? 'In Progress' : 'Pending'}
                            </span>
                        </div>

                        {/* Step 3: Manager Review */}
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-sm ${managerReviewReady ? 'bg-[#1d4ed8] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {finalApprovalDone ? '✓' : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                )}
                            </div>
                            <span className="text-sm font-bold text-slate-400">Manager Review</span>
                            <span className="text-[11px] font-medium text-slate-400 mt-1">
                                {finalApprovalDone ? 'Completed' : managerReviewReady && totalPending > 0 ? 'Awaiting Action' : 'Pending'}
                            </span>
                        </div>

                        {/* Step 4: Final Approval */}
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 shadow-sm ${finalApprovalDone ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                            </div>
                            <span className="text-sm font-bold text-slate-400">Final Approval</span>
                            <span className="text-[11px] font-medium text-slate-400 mt-1">{finalApprovalDone ? 'Completed' : 'Pending'}</span>
                        </div>

                    </div>
                </div>

                {/* Main Agency Breakdowns Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 text-[#1d4ed8] rounded-md flex items-center justify-center">☰</div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Agency Breakdowns</h2>
                        </div>
                        <div className="flex gap-3 relative">
                            <div className="relative">
                                <button
                                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                                    className={`px-4 py-2 border rounded-lg text-xs font-bold transition flex items-center gap-2 ${statusFilter !== 'All' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-slate-50'}`}
                                >
                                    <span>≡</span> Filter {statusFilter !== 'All' && `(${statusFilter})`}
                                </button>
                                {showFilterMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                                        {['All', 'Draft', 'Pending', 'Approved', 'Rejected'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setStatusFilter(s); setShowFilterMenu(false); }}
                                                className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 transition ${statusFilter === s ? 'text-blue-700 bg-blue-50' : 'text-slate-700'}`}
                                            >
                                                {s === 'All' ? 'All Statuses' : s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-white">
                                    <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[25%]">AGENCY</th>
                                    <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[15%]">TOTAL EMPLOYEES</th>
                                    <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[20%]">CONTRIBUTION AMOUNT</th>
                                    <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[15%]">LOAN REMITTANCE</th>
                                    <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-[15%]">STATUS</th>
                                    <th className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">Loading agencies...</td></tr>
                                ) : (
                                    Object.values(summaries).map((agency, idx) => {
                                        const isReady = agency.readyChecks.approved === agency.readyChecks.total && agency.readyChecks.total > 0;
                                        const isInProgress = agency.readyChecks.draft > 0 || agency.readyChecks.pending > 0;

                                        return (
                                            <Fragment key={agency.type}>
                                                <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedAgency === agency.type ? 'bg-slate-50' : ''}`} onClick={() => setExpandedAgency(expandedAgency === agency.type ? null : agency.type)}>
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shadow-sm ${agency.type === 'SSS' ? 'bg-[#dbeafe] text-[#1e40af]' :
                                                                agency.type === 'PhilHealth' ? 'bg-[#fee2e2] text-[#b91c1c]' :
                                                                    'bg-[#ffedd5] text-[#c2410c]'
                                                                }`}>
                                                                {agency.type === 'SSS' ? 'SSS' : agency.type === 'PhilHealth' ? 'PH' : 'PI'}
                                                            </div>
                                                            <span className="font-bold text-[14px] text-slate-900 tracking-tight">{agency.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6 font-medium text-[14px] text-slate-600">
                                                        {agency.employees.toLocaleString()}
                                                    </td>
                                                    <td className="py-5 px-6 font-bold text-[14px] text-slate-900">
                                                        ₱{formatMoney(agency.contribution)}
                                                    </td>
                                                    <td className="py-5 px-6 font-medium text-[14px] text-slate-500">
                                                        {agency.type === 'PhilHealth' ? '₱0.00' : `₱${formatMoney(agency.loan)}`}
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        {agency.readyChecks.total === 0 ? (
                                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-full border border-slate-200 flex items-center gap-1.5 w-fit">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> None
                                                            </span>
                                                        ) : isReady ? (
                                                            <span className="px-3 py-1 bg-[#dcfce7] text-[#166534] text-[11px] font-bold rounded-full border border-[#bbf7d0] flex items-center gap-1.5 w-fit">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></div> Ready
                                                            </span>
                                                        ) : isInProgress ? (
                                                            <span className="px-3 py-1 bg-[#fef3c7] text-[#92400e] text-[11px] font-bold rounded-full border border-[#fde68a] flex items-center gap-1.5 w-fit">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#d97706]"></div> In Progress
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[11px] font-bold rounded-full border border-slate-200 flex items-center gap-1.5 w-fit">Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-6 text-right">
                                                        {agency.readyChecks.total > 0 ? (
                                                            <button
                                                                className="text-[#1d4ed8] hover:text-[#1e40af] text-[12px] font-bold flex items-center justify-end gap-1 group w-full"
                                                            >
                                                                <span>{expandedAgency === agency.type ? 'Hide Branches' : 'View Branches'}</span>
                                                                <span className={`text-[14px] transition-transform ${expandedAgency === agency.type ? 'rotate-90' : ''}`}>→</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-300 text-[12px] font-bold">---</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* Expanded Branch Reports Sub-table */}
                                                {expandedAgency === agency.type && agency.reports.length > 0 && (
                                                    <tr className="bg-slate-50/50">
                                                        <td colSpan={6} className="p-0 border-b border-slate-100">
                                                            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 inner-shadow-sm">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest">{agency.type} Branch Reports</h3>
                                                                </div>
                                                                <table className="w-full text-left bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                                                    <thead className="bg-slate-100/50">
                                                                        <tr>
                                                                            <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Branch</th>
                                                                            <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Amount</th>
                                                                            <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                                                                            <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase text-right">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100 text-[13px]">
                                                                        {agency.reports.map(rep => (
                                                                            <tr key={rep.id} className="hover:bg-slate-50">
                                                                                <td className="py-3 px-4 font-semibold text-slate-800">{rep.branch_id}</td>
                                                                                <td className="py-3 px-4 font-medium text-slate-600">
                                                                                    ₱{formatMoney(Number(rep.total_ee) + Number(rep.total_er) + Number(rep.total_ec) + Number(rep.total_loan) + Number((rep as any).service_charge || 0))}
                                                                                </td>
                                                                                <td className="py-3 px-4">
                                                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${rep.status === 'Draft' ? 'bg-slate-100 border-slate-200 text-slate-600' : rep.status === 'Approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                                                                                        {rep.status}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-3 px-4 text-right">
                                                                                    <div className="flex items-center justify-end gap-3">
                                                                                        <Link
                                                                                            href={`/gov-contributions/${rep.id}`}
                                                                                            className="text-[#1d4ed8] hover:text-[#1e40af] font-semibold flex items-center gap-1"
                                                                                        >
                                                                                            Open
                                                                                        </Link>
                                                                                        {(rep.status === 'Draft' || rep.status === 'Rejected' || rep.status === 'Pending') && (
                                                                                            <Link
                                                                                                href={`/gov-contributions/${rep.id}`}
                                                                                                className="text-slate-600 hover:text-slate-800 font-semibold"
                                                                                            >
                                                                                                Edit
                                                                                            </Link>
                                                                                        )}
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleDelete(rep.id); }}
                                                                                            className="text-rose-500 hover:text-rose-700 font-semibold"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })
                                )}

                                {/* Totals Row */}
                                <tr className="bg-[#f8fafc] border-t-2 border-slate-200">
                                    <td className="py-5 px-6 font-extrabold text-[14px] text-slate-900">Totals</td>
                                    <td className="py-5 px-6 font-bold text-[14px] text-slate-700">
                                        {(summaries['SSS'].employees + summaries['PhilHealth'].employees + summaries['Pag-IBIG'].employees).toLocaleString()}
                                    </td>
                                    <td className="py-5 px-6 font-extrabold text-[14px] text-[#1d4ed8]">
                                        ₱{formatMoney(summaries['SSS'].contribution + summaries['PhilHealth'].contribution + summaries['Pag-IBIG'].contribution)}
                                    </td>
                                    <td className="py-5 px-6 font-bold text-[14px] text-slate-700">
                                        ₱{formatMoney(summaries['SSS'].loan + summaries['Pag-IBIG'].loan)}
                                    </td>
                                    <td colSpan={2} className="py-5 px-6"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Summaries */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Deadline Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Submission Deadline</span>
                            <span className="text-amber-500">📅</span>
                        </div>
                        <div className={`text-[28px] font-extrabold tracking-tight mb-1 ${isDeadlinePast ? 'text-rose-600' : 'text-slate-900'}`}>
                            {format(deadlineDate, 'MMM dd, yyyy')}
                        </div>
                        <div className={`text-[12px] font-medium ${isDeadlinePast ? 'text-rose-500' : 'text-slate-400'}`}>
                            {daysRemainingContent}
                        </div>
                    </div>

                    {/* Review Status Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Review Status</span>
                            <span className="text-[#1d4ed8]">📊</span>
                        </div>
                        <div className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-1">
                            {finalApprovalDone ? 'Fully Approved' : managerReviewReady && totalPending > 0 ? 'Pending Approval' : 'In Progress'}
                        </div>
                        <div className="text-[12px] font-medium text-slate-400">
                            {finalApprovalDone ? 'All remittances verified ✔' : managerReviewReady && totalPending > 0 ? 'Requires signature from Branch Manager' : 'Requires data entry and submission'}
                        </div>
                    </div>

                    {/* Total Disbursed Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-t-4 border-t-emerald-500">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Total Disbursed</span>
                            <span className="text-emerald-500 text-lg">💵</span>
                        </div>
                        <div className="text-[28px] font-extrabold text-slate-900 tracking-tight mb-1">₱{formatMoney(totalDisbursed)}</div>
                        <div className="text-[12px] font-medium text-slate-400">Combined contributions and loans</div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
