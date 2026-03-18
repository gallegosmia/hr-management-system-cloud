'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { format } from 'date-fns';

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
    const [filterBranch, setFilterBranch] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

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

    const filteredReports = reports.filter(r => {
        if (filterBranch !== 'All' && r.branch_id !== filterBranch) return false;
        if (filterType !== 'All' && r.contribution_type !== filterType) return false;
        if (filterStatus !== 'All' && r.status !== filterStatus) return false;
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-800 border-slate-200';
            case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Rejected': return 'bg-rose-100 text-rose-800 border-rose-200';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

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

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Government Contributions</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage and track SSS, Pag-IBIG, and PhilHealth contributions.</p>
                    </div>
                    <Link
                        href="/gov-contributions/generate"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm focus:ring-4 focus:ring-emerald-500/20"
                    >
                        + Generate Contribution
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 sticky top-0 z-10">
                    <div className="flex gap-4">
                        <select
                            className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            value={filterBranch}
                            onChange={(e) => setFilterBranch(e.target.value)}
                        >
                            <option value="All">All Branches</option>
                            <option value="Head Office">Head Office</option>
                            <option value="Naval">Naval</option>
                            <option value="Ormoc">Ormoc</option>
                        </select>
                        <select
                            className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            <option value="SSS">SSS</option>
                            <option value="Pag-IBIG">Pag-IBIG</option>
                            <option value="PhilHealth">PhilHealth</option>
                        </select>
                        <select
                            className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-600">Branch</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Contribution Type</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Month</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Total Amount</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600">Reviewed By</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 hidden sm:table-cell">Date Generated</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white min-h-[500px]">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 min-h-[200px]">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                        <p className="mt-2">Loading reports...</p>
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 min-h-[200px]">
                                        <div className="text-4xl mb-3">📄</div>
                                        <p className="text-lg font-medium text-slate-700">No reports found.</p>
                                        <p className="text-sm mt-1">Generate a new contribution to see it here.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-800">{report.branch_id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${report.contribution_type === 'SSS' ? 'bg-blue-600' : report.contribution_type === 'Pag-IBIG' ? 'bg-red-600' : 'bg-emerald-500'}`}></div>
                                                <span className="font-medium text-slate-700">{report.contribution_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {report.payroll_period}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-800">
                                                ₱{(
                                                    Number(report.total_er) +
                                                    Number(report.total_ee) +
                                                    Number(report.total_ec) +
                                                    Number(report.total_loan)
                                                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(report.status)}`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {report.approved_by_name || '---'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs hidden sm:table-cell">
                                            {report.created_at ? format(new Date(report.created_at), 'MMM dd, yyyy') : '---'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/gov-contributions/${report.id}`}
                                                    className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    View
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    className="text-rose-600 hover:text-rose-800 text-xs font-semibold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
