'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GenerateGovContribution() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [existingReportId, setExistingReportId] = useState<number | null>(null);

    const [branchId, setBranchId] = useState('All');
    const [contributionType, setContributionType] = useState('SSS');
    const [userBranch, setUserBranch] = useState<string | null>(null);

    // Branch-locked users (Ormoc, Naval) cannot change the target branch
    const branchLockedBranches = ['Ormoc', 'Naval'];
    const isBranchLocked = userBranch !== null && branchLockedBranches.includes(userBranch);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            const branch = parsed.assigned_branch || null;
            setUserBranch(branch);
            if (branch && branchLockedBranches.includes(branch)) {
                setBranchId(branch); // locked to their own branch
            }
        }
    }, []);

    // Default to previous month
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const defaultPeriod = `${months[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`;
    const [payrollPeriod, setPayrollPeriod] = useState(defaultPeriod);

    // Generating months for period
    const currentYear = now.getFullYear();
    const periods = [];
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        for (let m of months) {
            periods.push(`${m} ${y}`);
        }
    }

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/gov-contributions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    branch_id: branchId,
                    contribution_type: contributionType,
                    payroll_period: payrollPeriod
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setExistingReportId(data.existing_report_id || null);
                throw new Error(data.error || 'Failed to generate contribution report');
            }
            setExistingReportId(null);

            setSuccess(true);
            setTimeout(() => {
                router.push(`/gov-contributions/${data.report_id}`);
            }, 1000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/gov-contributions" className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-2 mb-4">
                        <span>←</span> Back to Tracker
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">Generate Contribution Report</h1>
                    <p className="text-sm text-slate-500 mt-1">Select the parameters below to automatically compute EE/ER shares based on active employee base salaries.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
                            <strong>Generation Failed: </strong> {error}
                            {existingReportId && (
                                <div className="mt-3">
                                    <Link
                                        href={`/gov-contributions/${existingReportId}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                                    >
                                        → Open Existing Report
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
                            <span className="text-lg">✅</span> <strong>Success!</strong> Report generated successfully. Redirecting...
                        </div>
                    )}

                    <form onSubmit={handleGenerate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Target Branch
                                    {isBranchLocked && (
                                        <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">🔒 Locked</span>
                                    )}
                                </label>
                                <select
                                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isBranchLocked ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    disabled={isBranchLocked}
                                    required
                                >
                                    <option value="All">All Branches</option>
                                    <option value="Head Office">Head Office</option>
                                    <option value="Naval">Naval</option>
                                    <option value="Ormoc">Ormoc</option>
                                </select>
                                {isBranchLocked && (
                                    <p className="mt-1.5 text-xs text-slate-400">Branch-specific users can only generate reports for their own branch.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Contribution Type</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={contributionType}
                                    onChange={(e) => setContributionType(e.target.value)}
                                    required
                                >
                                    <option value="SSS">SSS</option>
                                    <option value="Pag-IBIG">Pag-IBIG</option>
                                    <option value="PhilHealth">PhilHealth</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Payroll Period</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={payrollPeriod}
                                    onChange={(e) => setPayrollPeriod(e.target.value)}
                                    required
                                >
                                    {periods.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">The system will use active employees as of the generation date.</p>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
                            <div>ℹ️</div>
                            <div>
                                <strong className="block mb-1">Computation Note</strong>
                                The system reads the basic salary from the Employee 201 File (`salary_info`) and executes the calculation configured for {contributionType}. It will also map the relevant Government Identification Number.
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => router.push('/gov-contributions')}
                                className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors mr-3"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || success}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>}
                                {loading ? 'Computing...' : 'Generate New Report'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
