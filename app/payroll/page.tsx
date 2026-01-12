'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface PayrollRun {
    id: number;
    period_start: string;
    period_end: string;
    status: 'Draft' | 'Finalized';
    total_amount: number;
    created_at: string;
}

export default function PayrollPage() {
    const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayrollRuns();
    }, []);

    const fetchPayrollRuns = async () => {
        try {
            const response = await fetch('/api/payroll');
            if (response.ok) {
                const data = await response.json();
                setPayrollRuns(data);
            }
        } catch (error) {
            console.error('Failed to fetch payroll runs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Finalized': return 'badge-success';
            case 'Pending EVP': return 'badge-info';
            case 'Pending Manager': return 'badge-warning';
            default: return 'badge-secondary';
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

    return (
        <DashboardLayout>
            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Payroll Management</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Manage payroll runs and payslips
                            </p>
                        </div>
                        <Link href="/payroll/create" className="btn btn-primary">
                            <span>➕</span>
                            New Payroll Run
                        </Link>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Status</th>
                                <th>Total Amount</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                                </tr>
                            ) : payrollRuns.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                        No payroll runs found. Create your first one!
                                    </td>
                                </tr>
                            ) : (
                                payrollRuns.map(run => (
                                    <tr key={run.id}>
                                        <td>
                                            {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(run.status)}`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td>₱{run.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td>{new Date(run.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {run.status === 'Draft' ? (
                                                    <Link href={`/payroll/${run.id}/edit`} className="btn btn-sm btn-primary">
                                                        Resume Draft
                                                    </Link>
                                                ) : (
                                                    <Link href={`/payroll/${run.id}`} className="btn btn-sm btn-secondary">
                                                        View Details
                                                    </Link>
                                                )}
                                                {run.status === 'Finalized' && (
                                                    <Link href={`/payroll/${run.id}/edit`} className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem' }}>
                                                        ✏️
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(run.id)}
                                                    className="btn btn-sm btn-danger"
                                                    style={{ padding: '0.25rem 0.5rem' }}
                                                >
                                                    🗑️
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
