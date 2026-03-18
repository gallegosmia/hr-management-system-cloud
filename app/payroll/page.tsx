/**
 * Payroll List Page
 * Displays all payroll runs in a comprehensive table view
 * Optimized for 1366×768 screens
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { formatCurrency } from '@/lib/payroll-calculations';

interface PayrollRun {
    id: number;
    run_number: string;
    branch: string;
    payroll_period_start: string;
    payroll_period_end: string;
    cutoff_day: number;
    status: string;
    employee_count: number;
    total_gross_pay: number;
    total_net_pay: number;
    created_at: string;
}

export default function PayrollListPage() {
    const router = useRouter();
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filters, setFilters] = useState({
        branch: 'All',
        status: 'all',
        period: '12months', // 12months, 30days, custom
        search: ''
    });

    const [permissions, setPermissions] = useState({
        canCreate: false,
        canDelete: false,
        accessibleBranches: [] as string[]
    });

    useEffect(() => {
        fetchPermissions();
    }, []);

    useEffect(() => {
        fetchPayrollRuns();
    }, [filters.branch, filters.status, filters.period]);

    const fetchPermissions = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/auth/me', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();
            if (data.user) {
                const canCreate = ['Super Admin', 'Admin', 'HR', 'President', 'Vice President'].includes(data.user.role);
                const assignedBranch = data.user.assigned_branch ? data.user.assigned_branch.replace(/\s+Branch$/i, '').trim() : '';

                const accessibleBranches = ['Super Admin', 'Admin', 'President', 'Vice President', 'Finance', 'Operations Manager'].includes(data.user.role)
                    ? ['All', 'Ormoc', 'Naval']
                    : [assignedBranch];

                const canDelete = ['Super Admin', 'Admin', 'President', 'Vice President', 'HR', 'Finance'].includes(data.user.role);
                setPermissions({ canCreate, canDelete, accessibleBranches });

                if (!['Super Admin', 'Admin', 'President', 'Vice President', 'Finance', 'Operations Manager'].includes(data.user.role)) {
                    setFilters(prev => ({ ...prev, branch: assignedBranch }));
                }

                if (data.user.role === 'Operations Manager') {
                    setFilters(prev => ({ ...prev, status: 'Under Review - Operations Manager' }));
                }

                if (data.user.role === 'Vice President' || data.user.role === 'President') {
                    setFilters(prev => ({ ...prev, status: 'Under Review - Vice President' }));
                }
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    const fetchPayrollRuns = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.branch !== 'All') params.append('branch', filters.branch);
            if (filters.status !== 'all') params.append('status', filters.status);

            // Period filtering would happen here or backend. For now we fetch all and filter client side if needed or assume backend handles 'limit'
            // Added period param just in case backend supports it, otherwise we filter below

            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs?${params}`, {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
            const data = await response.json();

            if (response.ok) {
                setPayrollRuns(data.runs || []);
            } else {
                console.error('Failed to fetch payroll runs:', data.error);
            }
        } catch (error) {
            console.error('Error fetching payroll runs:', error);
            setPayrollRuns([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePayroll = async (payrollId: number) => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${payrollId}`, {
                method: 'DELETE',
                headers: {
                    'x-session-id': sessionId || ''
                }
            });

            if (response.ok) {
                alert('Payroll deleted successfully');
                fetchPayrollRuns(); // Refresh the list
            } else {
                const data = await response.json();
                alert(`Failed to delete payroll: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting payroll:', error);
            alert('Failed to delete payroll');
        }
    };

    // Filter Logic
    const filteredRuns = payrollRuns.filter(run => {
        // Search
        if (filters.search) {
            const search = filters.search.toLowerCase();
            const runNum = run.run_number ? run.run_number.toLowerCase() : '';
            const branch = run.branch ? run.branch.toLowerCase() : '';

            if (!runNum.includes(search) && !branch.includes(search)) {
                return false;
            }
        }
        return true;
    });

    // Styles & Helpers
    const getStatusStyle = (status: string) => {
        const s = status ? status.toLowerCase() : 'pending';
        // STRICT STATUS COLOR CODING per requirements
        if (s === 'released') return { bg: '#dcfce7', text: '#166534', dot: '#22c55e' }; // Green
        if (s === 'for release') return { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' }; // Blue
        if (s.includes('vice president')) return { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' }; // Yellow (VP)
        if (s.includes('operations')) return { bg: '#ffedd5', text: '#9a3412', dot: '#f97316' }; // Orange (Ops)
        if (s.includes('draft')) return { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' }; // Gray
        if (s.includes('returned')) return { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' }; // Red
        return { bg: '#f3f4f6', text: '#4b5563', dot: '#9ca3af' }; // Default
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingTop: '10px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>Payroll History</h1>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Manage and review all past payroll cycles.</p>
                    </div>
                </div>

                {/* Returned Payroll Notification Banner */}
                {filteredRuns.some(run => run.status.toLowerCase().includes('returned')) && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 2px 5px rgba(220, 38, 38, 0.05)'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#fee2e2',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#991b1b' }}>
                                Action Required: Payroll Returned
                            </h3>
                            <p style={{ margin: 0, fontSize: '14px', color: '#b91c1c' }}>
                                One or more payroll runs have been returned for correction. Please check the list below and review the remarks.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters Card */}
                <div style={{
                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '24px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr', gap: '20px', alignItems: 'end' }}>

                        {/* Date Range/Period */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Date Range
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={filters.period}
                                    onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px 12px 10px 36px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e5e7eb', appearance: 'none', color: '#374151'
                                    }}
                                >
                                    <option value="12months">Last 12 Months</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="all">All Time</option>
                                </select>
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>📅</div>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', fontSize: '10px' }}>▼</div>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Status
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e5e7eb', appearance: 'none', color: '#374151'
                                    }}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="all">All Statuses</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Under Review - Operations Manager">For Ops Review</option>
                                    <option value="Under Review - Vice President">For VP Approval</option>
                                    <option value="Approved">Approved</option>
                                    <option value="For Release">For Release</option>
                                    <option value="Released">Released</option>
                                    <option value="Returned to HR">Returned to HR</option>
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none', fontSize: '10px' }}>▼</div>
                            </div>
                        </div>

                        {/* Search */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Search Pay Period
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search by ID, Branch..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px 12px 10px 36px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none'
                                    }}
                                />
                                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</div>
                            </div>
                        </div>

                        {/* Action Box */}
                        <div style={{ textAlign: 'right' }}>
                            {permissions.canCreate && (
                                <Link href="/payroll/create">
                                    <button style={{
                                        background: '#2563eb', color: 'white', border: 'none',
                                        padding: '10px 20px', borderRadius: '8px', fontWeight: '600',
                                        fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', width: '100%', justifyContent: 'center'
                                    }}>
                                        <span>+</span> Run New Payroll
                                    </button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Pay Period</th>
                                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Total Net Pay</th>
                                <th style={{ textAlign: 'center', padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Employees</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ textAlign: 'center', padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading payroll history...</td>
                                </tr>
                            ) : filteredRuns.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No payroll runs found.</td>
                                </tr>
                            ) : (
                                filteredRuns.map((run) => {
                                    const style = getStatusStyle(run.status);

                                    // Map backend status to display status per requirements
                                    let displayStatus = run.status;
                                    const s = run.status ? run.status.toLowerCase() : '';

                                    // STRICT STATUS DISPLAY NAMES
                                    if (s === 'draft') displayStatus = 'Draft';
                                    else if (s === 'under review - operations manager') displayStatus = 'For Operations Manager Approval';
                                    else if (s === 'under review - vice president') displayStatus = 'For Executive Vice President Approval';
                                    else if (s === 'for release') displayStatus = 'FOR RELEASE';
                                    else if (s === 'released') displayStatus = 'RELEASED';
                                    else displayStatus = run.status; // Fallback

                                    return (
                                        <tr key={run.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }} className="hover:bg-gray-50">
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                                                    {formatDate(run.payroll_period_start)} - {formatDate(run.payroll_period_end)}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                    {run.branch}
                                                    {run.run_number ? ` • ${run.run_number}` : ''}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '600', color: '#2563eb', fontSize: '14px' }}>
                                                {formatCurrency(run.total_net_pay || 0)}
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center', color: '#4b5563', fontSize: '14px' }}>
                                                {run.employee_count}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 12px', borderRadius: '9999px',
                                                    background: style.bg, color: style.text, fontSize: '12px', fontWeight: '600'
                                                }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.dot }}></div>
                                                    {displayStatus}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                    <Link href={`/payroll/${run.id}`} style={{ textDecoration: 'none' }}>
                                                        {/* STRICT ACTION BUTTON LOGIC */}
                                                        {s === 'draft' || s.includes('returned') ? (
                                                            <button style={{
                                                                background: '#4f46e5', border: 'none', cursor: 'pointer',
                                                                color: 'white', fontSize: '13px', fontWeight: '600',
                                                                padding: '6px 12px', borderRadius: '6px'
                                                            }}>
                                                                Edit
                                                            </button>
                                                        ) : s.includes('review') || s.includes('operations') || s.includes('vice president') || s === 'for release' ? (
                                                            <button style={{
                                                                background: '#6366f1', border: 'none', cursor: 'pointer',
                                                                color: 'white', fontSize: '13px', fontWeight: '600',
                                                                padding: '6px 12px', borderRadius: '6px'
                                                            }}>
                                                                View
                                                            </button>
                                                        ) : s === 'released' ? (
                                                            <button style={{
                                                                background: '#22c55e', border: 'none', cursor: 'pointer',
                                                                color: 'white', fontSize: '13px', fontWeight: '600',
                                                                padding: '6px 12px', borderRadius: '6px'
                                                            }}>
                                                                Download
                                                            </button>
                                                        ) : (
                                                            <button style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                color: '#9ca3af', fontSize: '20px', fontWeight: 'bold',
                                                                display: 'inline-block', lineHeight: 1
                                                            }}>
                                                                •••
                                                            </button>
                                                        )}
                                                    </Link>

                                                    {/* Delete button - Show for Draft OR if user has canDelete permission (Executives/HR) */}
                                                    {(s === 'draft' || s.includes('returned') || permissions.canDelete) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const msg = s === 'released' || s === 'approved' || s === 'for release'
                                                                    ? `WARNING: You are about to delete a ${s.toUpperCase()} payroll. This will also REVERT any loan deductions applied. Are you absolutely sure?`
                                                                    : `Are you sure you want to delete payroll ${run.run_number}? This action cannot be undone.`;
                                                                
                                                                if (confirm(msg)) {
                                                                    handleDeletePayroll(run.id);
                                                                }
                                                            }}
                                                            style={{
                                                                background: '#fee2e2',
                                                                border: '1px solid #fecaca',
                                                                cursor: 'pointer',
                                                                color: '#dc2626',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                padding: '6px 12px',
                                                                borderRadius: '6px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}
                                                            title="Delete payroll"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                                            </svg>
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination (Visual Only for now) */}
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            Showing {filteredRuns.length > 0 ? 1 : 0}-{filteredRuns.length} of {filteredRuns.length} results
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button disabled style={{ padding: '8px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#d1d5db', cursor: 'not-allowed' }}>Previous</button>
                            <button style={{ padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: '6px', color: 'white' }}>1</button>
                            <button disabled style={{ padding: '8px 12px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#d1d5db', cursor: 'not-allowed' }}>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
