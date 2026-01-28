'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface PayrollRun {
    id: number;
    period_start: string;
    period_end: string;
    status: 'Draft' | 'Finalized' | 'Pending Manager' | 'Pending EVP';
    total_amount: number;
    created_at: string;
}

export default function PayrollPage() {
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCost: 0,
        employeeCount: 0,
        pendingReimbursements: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [runsRes, empRes] = await Promise.all([
                fetch('/api/payroll'),
                fetch('/api/employees')
            ]);

            if (runsRes.ok && empRes.ok) {
                const runs = await runsRes.json();
                const employees = await empRes.json();

                setPayrollRuns(runs);

                // Calculate Stats
                const totalCost = runs
                    .filter((r: any) => r.status === 'Finalized')
                    .reduce((sum: number, r: any) => sum + Number(r.total_amount), 0);

                setStats({
                    totalCost,
                    employeeCount: employees.length,
                    pendingReimbursements: 4500 // Mock data for now as per design
                });
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this payroll run? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/payroll/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setPayrollRuns(prev => prev.filter(run => run.id !== id));
            } else {
                alert('Failed to delete payroll run');
            }
        } catch (error) {
            console.error('Error deleting payroll run:', error);
            alert('An error occurred');
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            'Finalized': 'bg-green-100 text-green-700',
            'Draft': 'bg-gray-100 text-gray-700',
            'Pending Manager': 'bg-orange-100 text-orange-700',
            'Pending EVP': 'bg-blue-100 text-blue-700'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles['Draft']}`}>
                {status}
            </span>
        );
    };

    return (
        <DashboardLayout>
            <div style={{ fontFamily: '"Inter", sans-serif', color: '#1f2937' }}>
                {/* Header Section */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Logo Placeholder - Matches the yellow/green square in mockup */}
                        <div style={{
                            width: '50px',
                            height: '50px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #10b981 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.5rem',
                            boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
                        }}>
                            📊
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#111827' }}>Payroll Management</h1>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Manage payroll runs and payslips</p>
                        </div>
                    </div>
                    <Link href="/payroll/create" style={{ textDecoration: 'none' }}>
                        <button style={{
                            backgroundColor: '#22c55e',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '30px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(34, 197, 94, 0.2)',
                            transition: 'transform 0.2s'
                        }}>
                            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span> New Payroll Run
                            <div style={{
                                marginLeft: '5px',
                                background: 'white',
                                color: '#22c55e',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                            }}>+</div>
                        </button>
                    </Link>
                </div>

                {/* Main Content Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '2rem',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    minHeight: '600px'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2rem', color: '#374151' }}>KPI</h3>

                    <div className="layout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 25%) 1fr', gap: '3rem' }}>

                        {/* Left Side: Circular KPIs */}
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: 'center' }}>
                            {/* KPI Circle 1 */}
                            <div className="kpi-circle">
                                <span className="label">Total Payroll Cost</span>
                                <span className="value">₱{stats.totalCost.toLocaleString()}</span>
                                <span className="trend positive">▲ 3.5% vs Last Month</span>
                            </div>

                            {/* KPI Circle 2 */}
                            <div className="kpi-circle">
                                <span className="label">Employee Count</span>
                                <span className="value">{stats.employeeCount}</span>
                                <span className="sub-text">+5 New Hires</span>
                            </div>

                            {/* KPI Circle 3 */}
                            <div className="kpi-circle">
                                <span className="label">Upcoming Tax</span>
                                <span className="value">150</span>
                                <span className="trend positive badge">+5 New Hires</span>
                            </div>

                            {/* KPI Circle 4 */}
                            <div className="kpi-circle">
                                <span className="label">Pending Reimbursements</span>
                                <span className="value">₱{stats.pendingReimbursements.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Right Side: Table */}
                        <div style={{ flex: 1 }}>
                            {/* Table Header */}
                            <div className="table-header-row">
                                <div>STATUS</div>
                                <div>TOTAL AMOUNT</div>
                                <div>CREATED AT</div>
                                <div>ACTIONS</div>
                            </div>

                            <div className="table-body">
                                {loading ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
                                ) : payrollRuns.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No records found</div>
                                ) : (
                                    payrollRuns.map((run, index) => (
                                        <div key={run.id} className={`table-row ${index % 2 === 0 ? 'bg-white' : 'bg-green-light'}`}>
                                            <div style={{ fontWeight: 600 }}>
                                                <StatusBadge status={run.status} />
                                            </div>
                                            <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>₱{Number(run.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                                {new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} <span style={{ fontSize: '0.8rem' }}>{new Date(run.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <Link href={run.status === 'Draft' ? `/payroll/${run.id}/edit` : `/payroll/${run.id}`}>
                                                    <button className="icon-btn" title={run.status === 'Draft' ? 'Edit' : 'View'}>
                                                        {run.status === 'Draft' ? '✎' : '🔍'}
                                                    </button>
                                                </Link>
                                                <button onClick={() => handleDelete(run.id)} className="icon-btn text-red" title="Delete">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .layout-grid {
                    /* Responsive switch handled by CSS if needed, defaulting to grid for desktop */
                }
                
                .kpi-circle {
                    width: 130px;
                    height: 130px;
                    border-radius: 50%;
                    background: white;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    padding: 1rem;
                    border: 1px solid #f3f4f6;
                    transition: transform 0.2s;
                }
                .kpi-circle:hover {
                    transform: translateY(-5px);
                }
                .kpi-circle .label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #4b5563;
                    margin-bottom: 0.25rem;
                    line-height: 1.2;
                }
                .kpi-circle .value {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #111827;
                    margin-bottom: 0.25rem;
                }
                .kpi-circle .trend {
                    font-size: 0.6rem;
                    font-weight: 600;
                }
                .kpi-circle .sub-text {
                    font-size: 0.6rem;
                    color: #9ca3af;
                }
                .trend.positive { color: #10b981; }
                .trend.badge {
                    background: #22c55e;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                }

                .table-header-row {
                    display: grid;
                    grid-template-columns: 1.2fr 1.5fr 1.5fr 1fr;
                    padding: 1rem;
                    border-bottom: 1px solid #e5e7eb;
                    color: #6b7280;
                    font-size: 0.75rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    background: #f9fafb;
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                }
                .table-header-row > div:last-child {
                    text-align: right;
                }

                .table-row {
                    display: grid;
                    grid-template-columns: 1.2fr 1.5fr 1.5fr 1fr;
                    padding: 1rem;
                    align-items: center;
                    border-bottom: 1px solid #f9fafb;
                    font-size: 0.9rem;
                    transition: background-color 0.2s;
                }
                .table-row:hover {
                    background-color: #f0fdf4; /* Very light green on hover */
                }
                .bg-green-light {
                    background-color: #f8fafc; /* Alternating row color */
                }

                .icon-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: #f3f4f6;
                    color: #6b7280;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .icon-btn:hover {
                    background: #e5e7eb;
                    color: #1f2937;
                }
                .icon-btn.text-red:hover {
                    background: #fee2e2;
                    color: #ef4444;
                }

                @media (max-width: 1024px) {
                    .layout-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .kpi-circle {
                        width: 120px;
                        height: 120px;
                    }
                }
            `}</style>
        </DashboardLayout>
    );
}
