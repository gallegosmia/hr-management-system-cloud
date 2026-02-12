/**
 * Payroll List Page
 * Displays all payroll runs with filtering and compact sizing
 * Optimized for 1366×768 screens
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { formatCurrency, formatAmount } from '@/lib/payroll-calculations';

interface PayrollRun {
    id: number;
    run_number: string;
    branch: string;
    payroll_period_start: string;
    payroll_period_end: string;
    cutoff_day: number;
    status: string;
    employee_count: number;
    total_net_pay: number;
    created_by_name: string;
    created_at: string;
}

export default function PayrollListPage() {
    const router = useRouter();
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        branch: 'All',
        status: 'all',
        search: ''
    });
    const [permissions, setPermissions] = useState({
        canCreate: false,
        accessibleBranches: [] as string[]
    });

    useEffect(() => {
        fetchPayrollRuns();
        fetchPermissions();
    }, [filters.branch, filters.status]);

    const fetchPayrollRuns = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.branch !== 'All') params.append('branch', filters.branch);
            if (filters.status !== 'all') params.append('status', filters.status);

            const response = await fetch(`/api/payroll/runs?${params}`);
            const data = await response.json();

            if (response.ok) {
                setPayrollRuns(data.runs || []);
            } else {
                console.error('Failed to fetch payroll runs:', data.error);
            }
        } catch (error) {
            console.error('Error fetching payroll runs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/auth/me', {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
            const data = await response.json();
            if (data.user) {
                // Get permissions from user role
                const canCreate = ['Super Admin', 'Admin', 'HR', 'President', 'Vice President'].includes(data.user.role);
                const accessibleBranches = ['Super Admin', 'Admin', 'President', 'Vice President', 'Finance'].includes(data.user.role)
                    ? ['All', 'Ormoc', 'Naval']
                    : [data.user.assigned_branch];

                setPermissions({ canCreate, accessibleBranches });

                // Set default branch filter if not Super Admin
                if (!['Super Admin', 'Admin', 'President', 'Vice President', 'Finance'].includes(data.user.role)) {
                    setFilters(prev => ({ ...prev, branch: data.user.assigned_branch }));
                }
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    const formatPeriod = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    };

    const filteredRuns = payrollRuns.filter(run => {
        if (filters.search) {
            const search = filters.search.toLowerCase();
            return (
                run.run_number.toLowerCase().includes(search) ||
                run.branch.toLowerCase().includes(search)
            );
        }
        return true;
    });

    // Helper to get status color
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return { bg: '#d1fae5', text: '#065f46' };
            case 'approved': return { bg: '#dcfce7', text: '#166534' };
            case 'pending': return { bg: '#fef3c7', text: '#92400e' };
            case 'draft': return { bg: '#f3f4f6', text: '#374151' };
            case 'locked': return { bg: '#dbeafe', text: '#1e40af' };
            default: return { bg: '#f3f4f6', text: '#374151' };
        }
    };

    const getActionText = (status: string) => {
        switch (status.toLowerCase()) {
            case 'draft': return { text: 'Resume ✏️', color: '#374151' };
            case 'pending': return { text: 'Process Now ⚡', color: '#10b981' };
            case 'approved':
            case 'completed':
            case 'locked': return { text: 'View Details >', color: '#10b981' };
            default: return { text: 'View Details >', color: '#10b981' };
        }
    };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>
                            Payroll Management
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                            Manage payroll runs and payslips
                        </p>
                    </div>
                    {permissions.canCreate && (
                        <Link href="/payroll/create">
                            <button style={{
                                background: '#10b981', color: 'white', border: 'none',
                                padding: '10px 20px', borderRadius: '8px', fontWeight: '600',
                                fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                            }}>
                                <span>+</span> Create
                            </button>
                        </Link>
                    )}
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '18px' }}>
                            🔍
                        </span>
                        <input
                            type="text"
                            placeholder="Search run number or branch..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            style={{
                                width: '100%', padding: '14px 14px 14px 48px', fontSize: '15px',
                                borderRadius: '12px', border: '1px solid #e5e7eb',
                                background: 'white', outline: 'none',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                    <div style={{ position: 'relative', minWidth: '200px' }}>
                        <select
                            value={filters.branch}
                            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 16px', fontSize: '14px',
                                borderRadius: '8px', border: '1px solid #e5e7eb',
                                background: 'white', appearance: 'none', cursor: 'pointer',
                                color: '#374151'
                            }}
                        >
                            {permissions.accessibleBranches.map(branch => (
                                <option key={branch} value={branch}>
                                    {branch === 'All' ? 'All Branches' : branch}
                                </option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280', fontSize: '12px' }}>
                            ▼
                        </div>
                    </div>

                    <div style={{ position: 'relative', minWidth: '200px' }}>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            style={{
                                width: '100%', padding: '10px 16px', fontSize: '14px',
                                borderRadius: '8px', border: '1px solid #e5e7eb',
                                background: 'white', appearance: 'none', cursor: 'pointer',
                                color: '#374151'
                            }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="completed">Completed</option>
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280', fontSize: '12px' }}>
                            ▼
                        </div>
                    </div>
                </div>

                {/* Payroll Run Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            Loading payroll runs...
                        </div>
                    ) : filteredRuns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', background: '#f9fafb', borderRadius: '16px', border: '1px dashed #d1d5db' }}>
                            <p style={{ color: '#6b7280', margin: 0 }}>No payroll runs found matching your filters.</p>
                        </div>
                    ) : (
                        filteredRuns.map((run) => {
                            const statusStyle = getStatusColor(run.status);
                            const action = getActionText(run.status);

                            return (
                                <div key={run.id} style={{
                                    background: 'white', borderRadius: '16px', padding: '24px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                                    border: '1px solid #f3f4f6'
                                }}>
                                    {/* Top Row: Run # and Status */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                RUN NUMBER
                                            </div>
                                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                                                {run.run_number}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{
                                                padding: '6px 16px', borderRadius: '20px',
                                                fontSize: '13px', fontWeight: '600',
                                                backgroundColor: statusStyle.bg, color: statusStyle.text
                                            }}>
                                                {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                                            </span>
                                            <button style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer' }}>
                                                ⋮
                                            </button>
                                        </div>
                                    </div>

                                    {/* Middle Row: Details Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1.5fr', gap: '20px', marginBottom: '24px' }}>
                                        {/* Branch */}
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                BRANCH
                                            </div>
                                            <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500' }}>
                                                {run.branch}
                                            </div>
                                        </div>

                                        {/* Employees */}
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                EMPLOYEES
                                            </div>
                                            <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500' }}>
                                                {run.employee_count} Staff
                                            </div>
                                        </div>

                                        {/* Period */}
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                PERIOD
                                            </div>
                                            <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500' }}>
                                                {formatPeriod(run.payroll_period_start, run.payroll_period_end)}
                                            </div>
                                        </div>

                                        {/* Total Net Pay */}
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                TOTAL NET PAY
                                            </div>
                                            <div style={{ fontSize: '16px', color: '#111827', fontWeight: '700' }}>
                                                {run.status === 'draft' ? (
                                                    <span style={{ color: '#9ca3af', fontWeight: 'normal', fontSize: '14px' }}>Calculated on run</span>
                                                ) : (
                                                    formatCurrency(run.total_net_pay || 0)
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Cutoff and Action */}
                                    <div style={{
                                        borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '16px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                            <span style={{ color: '#9ca3af' }}>Cutoff:</span> {new Date(run.payroll_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>

                                        <Link href={`/payroll/${run.id}`} style={{ textDecoration: 'none' }}>
                                            <button style={{
                                                background: 'none', border: 'none',
                                                color: action.color,
                                                fontWeight: '600', fontSize: '14px',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                            }}>
                                                {action.text}
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <div style={{ textAlign: 'center', color: '#cbd5e1', marginTop: '30px', fontSize: '14px', paddingBottom: '20px' }}>
                        End of payroll history
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
