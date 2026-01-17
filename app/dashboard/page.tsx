'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import AlertsWidget from '@/components/AlertsWidget';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchStats();
        fetchNotifications();
    }, []);

    const isAdmin = user?.role === 'Admin';
    const isHR = user?.role === 'HR';
    const isManager = user?.role === 'Manager';
    const isPresident = user?.role === 'President';
    const isVicePresident = user?.role === 'Vice President';
    const isStaff = user?.role === 'Employee';
    const canManageHR = isAdmin || isHR || isManager || isPresident || isVicePresident;

    const fetchNotifications = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const localUser = JSON.parse(userData);
            const isEmployee = localUser.role === 'Employee';

            if (isEmployee) {
                // For now, we only show notifications to roles that can take action
                return;
            }

            let url = '/api/leave?status=Pending';
            const response = await fetch(url);
            const data = await response.json();
            setNotifications(data.slice(0, 5)); // Show only 5 most recent
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/dashboard/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--primary-200)',
                        borderTopColor: 'var(--primary-600)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
                </div>
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Welcome Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h2 style={{ marginBottom: '0.5rem' }}>Welcome to Melann Lending Investor Corporation</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isStaff ? 'Track your attendance and manage your leave requests.' : 'Manage your employee 201 files, attendance, leave requests, and more.'}
                    </p>
                </div>
            </div>

            {/* Pending Leave Files - Only for HR/Admin/Manager */}
            {!isStaff && (
                <div className="card mb-4" style={{ borderLeft: '4px solid var(--primary-500)' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-50)' }}>
                        <div className="card-title" style={{ color: 'var(--primary-800)' }}>
                            <span>📂</span>
                            Pending Leave Files ({notifications.length})
                        </div>
                        <Link href="/leave" style={{ fontSize: '0.875rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                            Review All →
                        </Link>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Leave Type</th>
                                        <th>Duration</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notifications.length > 0 ? (
                                        notifications.map((notif: any) => (
                                            <tr key={notif.id}>
                                                <td style={{ fontWeight: 600 }}>{notif.employee_name}</td>
                                                <td><span className="badge badge-info">{notif.leave_type}</span></td>
                                                <td style={{ fontSize: '0.875rem' }}>
                                                    {new Date(notif.start_date).toLocaleDateString()} - {new Date(notif.end_date).toLocaleDateString()}
                                                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{notif.days_count} day(s)</div>
                                                </td>
                                                <td>
                                                    <Link href="/leave" className="btn btn-sm btn-primary">Process</Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                No pending leave files
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts Section - Only for Admin/HR */}
            {canManageHR && (
                <div className="card mb-4" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="card-header" style={{ background: '#fef2f2' }}>
                        <div className="card-title" style={{ color: '#991b1b' }}>
                            <span>🔔</span>
                            Action Required
                        </div>
                    </div>
                    <div className="card-body p-0">
                        <AlertsWidget />
                    </div>
                </div>
            )}

            <div className="card mb-4" style={{
                borderLeft: '4px solid #f472b6',
                background: 'linear-gradient(to bottom right, #ffffff, #fff1f2)',
                overflow: 'hidden'
            }}>
                <div className="card-header" style={{ background: 'linear-gradient(90deg, #fdf2f8 0%, #ffffff 100%)', borderBottom: '1px solid #fce7f3' }}>
                    <div className="card-title" style={{ color: '#9d174d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>🎂</span>
                        <span>Upcoming Celebrations</span>
                    </div>
                </div>
                <div className="card-body p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {stats?.upcomingBirthdays && stats.upcomingBirthdays.length > 0 ? (
                        <div style={{ display: 'grid', gap: '1px', background: '#fce7f3' }}>
                            {stats.upcomingBirthdays.map((bday: any) => (
                                <div
                                    key={bday.id}
                                    style={{
                                        padding: '1rem',
                                        background: bday.daysUntil === 0
                                            ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)'
                                            : 'white',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        position: 'relative',
                                        borderLeft: bday.daysUntil === 0 ? '4px solid #ec4899' : 'none'
                                    }}
                                    className="bday-item"
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '12px',
                                            background: bday.daysUntil === 0 ? '#f472b6' : '#fce7f3',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: bday.daysUntil === 0 ? 'white' : '#9d174d',
                                            fontWeight: '700',
                                            fontSize: '0.75rem',
                                            boxShadow: bday.daysUntil === 0 ? '0 4px 12px rgba(244, 114, 182, 0.3)' : 'none'
                                        }}>
                                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', lineHeight: 1 }}>
                                                {new Date(bday.date).toLocaleString('default', { month: 'short' })}
                                            </span>
                                            <span style={{ fontSize: '1.1rem', lineHeight: 1.1 }}>
                                                {new Date(bday.date).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#1f2937', fontSize: '0.95rem' }}>{bday.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>📍 {bday.department}</span>
                                                {bday.daysUntil === 0 ? (
                                                    <span style={{
                                                        color: '#ec4899',
                                                        fontWeight: '800',
                                                        padding: '2px 8px',
                                                        background: 'white',
                                                        borderRadius: '20px',
                                                        fontSize: '0.7rem',
                                                        border: '1px solid #f472b6',
                                                        marginLeft: '4px',
                                                        animation: 'pulse 2s infinite'
                                                    }}>
                                                        HAPPENING TODAY! 🎈
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#9d174d', fontWeight: '500' }}>
                                                        • in {bday.daysUntil} day{bday.daysUntil > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {canManageHR && (
                                        <Link
                                            href={`/employees/${bday.id}`}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                textDecoration: 'none',
                                                background: bday.daysUntil === 0 ? '#ec4899' : 'transparent',
                                                color: bday.daysUntil === 0 ? 'white' : '#be185d',
                                                border: bday.daysUntil === 0 ? 'none' : '1px solid #f9a8d4',
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover-lift"
                                        >
                                            View Profile
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#fff1f2' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧁</div>
                            <h4 style={{ color: '#9d174d', marginBottom: '0.5rem' }}>No Celebrations Soon</h4>
                            <p style={{ color: '#be185d', fontSize: '0.875rem', opacity: 0.8 }}>
                                No birthdays found for the current or next month.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .bday-item:hover {
                    background-color: #fff1f2 !important;
                    transform: translateX(4px);
                }
                .hover-lift:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `}</style>

            {/* Statistics Grid - Only for non-staff */}
            {!isStaff && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div>
                                <div className="stat-card-value">{stats?.totalEmployees || 0}</div>
                                <div className="stat-card-label">Total Employees</div>
                            </div>
                            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>
                                👥
                            </div>
                        </div>
                    </div>

                    {canManageHR && (
                        <>
                            <div className="stat-card">
                                <div className="stat-card-header">
                                    <div>
                                        <div className="stat-card-value">{stats?.completeFiles || 0}</div>
                                        <div className="stat-card-label">Complete 201 Files</div>
                                    </div>
                                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a' }}>
                                        ✅
                                    </div>
                                </div>
                                <div className="stat-card-trend positive">
                                    <span>↗</span>
                                    <span>Complete & Audit-Ready</span>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-card-header">
                                    <div>
                                        <div className="stat-card-value">{stats?.partialFiles || 0}</div>
                                        <div className="stat-card-label">Partial 201 Files</div>
                                    </div>
                                    <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
                                        ⚠️
                                    </div>
                                </div>
                                <div className="stat-card-trend" style={{ color: '#d97706' }}>
                                    <span>→</span>
                                    <span>Needs Attention</span>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <Link href="/leave" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <div>
                                    <div className="stat-card-value">{stats?.pendingLeaves || 0}</div>
                                    <div className="stat-card-label">Pending Leave Files</div>
                                </div>
                                <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb' }}>
                                    📄
                                </div>
                            </Link>
                        </div>
                        <div className="stat-card-trend" style={{ color: '#2563eb' }}>
                            <span>↗</span>
                            <span>Awaiting Approval</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Row - Only for non-staff */}
            {!isStaff && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                    {/* Department Distribution */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span>📊</span>
                                Employees by Department
                            </div>
                        </div>
                        <div className="card-body">
                            {stats?.byDepartment && stats.byDepartment.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {stats.byDepartment.map((dept: any) => {
                                        const percentage = ((dept.count / stats.totalEmployees) * 100).toFixed(1);
                                        return (
                                            <div key={dept.department}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{dept.department}</span>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                        {dept.count} ({percentage}%)
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '8px',
                                                    background: 'var(--gray-200)',
                                                    borderRadius: 'var(--radius-full)',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: percentage + '%',
                                                        background: 'linear-gradient(90deg, var(--primary-600), var(--primary-500))',
                                                        borderRadius: 'var(--radius-full)',
                                                        transition: 'width 0.5s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                    No employee data available
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Employment Status */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span>👔</span>
                                Employment Status
                            </div>
                        </div>
                        <div className="card-body">
                            {stats?.byStatus && stats.byStatus.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {stats.byStatus.map((status: any) => {
                                        const colors: Record<string, string> = {
                                            'Regular': 'var(--success-500)',
                                            'Probationary': 'var(--warning-500)',
                                            'Contractual': 'var(--primary-500)',
                                            'Resigned': 'var(--gray-400)',
                                            'Terminated': 'var(--danger-500)'
                                        };
                                        const color = colors[status.employment_status] || 'var(--gray-400)';
                                        const percentage = stats.totalEmployees > 0
                                            ? ((status.count / stats.totalEmployees) * 100).toFixed(1)
                                            : '0';

                                        return (
                                            <div key={status.employment_status} style={{
                                                padding: 'var(--spacing-md)',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-md)',
                                                borderLeft: `4px solid ${color}`
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>{status.employment_status}</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{
                                                            fontWeight: '700',
                                                            fontSize: '1.25rem',
                                                            color: color,
                                                            lineHeight: 1
                                                        }}>
                                                            {status.count}
                                                        </span>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{percentage}%</div>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    height: '6px',
                                                    background: 'rgba(0,0,0,0.05)',
                                                    borderRadius: 'var(--radius-full)',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${percentage}%`,
                                                        background: color,
                                                        borderRadius: 'var(--radius-full)',
                                                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                    No status data available
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <span>⚡</span>
                        Quick Actions
                    </div>
                </div>
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {!isStaff && canManageHR && (
                            <Link href="/employees/add" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                <span>➕</span>
                                Add New Employee
                            </Link>
                        )}
                        {!isStaff && (
                            <Link href="/employees" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                                <span>📋</span>
                                View 201 Files
                            </Link>
                        )}
                        <Link href="/leave" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                            <span>🏖️</span>
                            File Leave Request
                        </Link>
                        {!isStaff && (
                            <Link href="/attendance" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                                <span>⏰</span>
                                Record Attendance
                            </Link>
                        )}
                        {!isStaff && (
                            <Link href="/reports" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                                <span>📊</span>
                                Generate Reports
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </DashboardLayout>
    );
}
