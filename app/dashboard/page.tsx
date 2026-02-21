'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CriticalAttendance from '@/components/CriticalAttendance';

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [onboarding, setOnboarding] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const userData = localStorage.getItem('user');
            const userParsed = userData ? JSON.parse(userData) : null;
            const userBranch = userParsed?.username === 'superadmin' ? 'All' : (userParsed?.assigned_branch || 'All');

            const headers: any = { 'x-session-id': sessionId || '' };

            const [statsRes, leavesRes, empRes, annRes, alertsRes, attRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }),
                fetch('/api/leave?status=Approved', { headers }), // We need approved leaves for the tracker
                fetch('/api/employees', { headers }),
                fetch(`/api/announcements?is_active=true&branch=${encodeURIComponent(userBranch)}`, { headers }),
                fetch('/api/alerts', { headers }),
                fetch('/api/attendance', { headers })
            ]);

            if (statsRes.status === 401) {
                router.push('/login');
                return;
            }

            const statsData = await statsRes.json();
            const leavesData = await leavesRes.json();
            const empData = await empRes.json();
            const annData = await annRes.json();
            const alertsData = await alertsRes.json();
            const attData = await attRes.json();

            setStats(statsData);
            setLeaves(Array.isArray(leavesData) ? leavesData : []);
            setEmployees(Array.isArray(empData) ? empData : []);
            setAttendance(Array.isArray(attData) ? attData : []);
            setAnnouncements(Array.isArray(annData) ? annData : []);

            if (alertsData && Array.isArray(alertsData.alerts)) {
                const payrollAlerts = alertsData.alerts.filter((a: any) => a.type === 'PAYROLL_APPROVAL');
                setPendingReviews(payrollAlerts);
            }

            const recentlyHired = (Array.isArray(empData) ? empData : [])
                .sort((a: any, b: any) => new Date(b.date_hired).getTime() - new Date(a.date_hired).getTime())
                .slice(0, 4);
            setOnboarding(recentlyHired);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b' }}>
                    Loading...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="dashboard-container">

                {/* Header - Compact */}
                <div className="dashboard-header">
                    <div>
                        <h1>Good Morning, {user?.first_name || user?.username || 'Sarah'}</h1>
                        <p>Here's what's happening today.</p>
                    </div>
                </div>

                <div className="dashboard-content">

                    {/* Metrics Row */}
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-icon blue">👥</div>
                            <div className="metric-info">
                                <span className="label">Total Employees</span>
                                <span className="value">{stats?.totalEmployees || 0}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon purple">🏢</div>
                            <div className="metric-info">
                                <span className="label">Departments</span>
                                <span className="value">{stats?.totalDepartments || 0}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon green">✅</div>
                            <div className="metric-info">
                                <span className="label">Present Today</span>
                                <span className="value">{stats?.todayPresents || 0}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon orange">❌</div>
                            <div className="metric-info">
                                <span className="label">Absent Today</span>
                                <span className="value">{stats?.todayAbsents || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pending Reviews Alert */}
                    {pendingReviews.length > 0 && (
                        <div className="pending-reviews-section" style={{ marginBottom: '12px' }}>
                            <div className="card review-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}>
                                <div className="review-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ background: '#3b82f6', color: 'white', padding: '8px', borderRadius: '8px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1rem' }}>Pending Adjustments / Approvals</h3>
                                        <p style={{ margin: 0, color: '#1d4ed8', fontSize: '0.85rem' }}>You have {pendingReviews.length} payroll run{pendingReviews.length > 1 ? 's' : ''} awaiting your review.</p>
                                    </div>
                                    <button
                                        onClick={() => router.push('/payroll')}
                                        style={{ marginLeft: 'auto', background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Review Now
                                    </button>
                                </div>
                                <div className="review-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pendingReviews.map(alert => (
                                        <div key={alert.id} style={{ background: 'white', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                                            <span style={{ fontWeight: 600, color: '#334155' }}>{alert.message}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(alert.created_at).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="main-grid">

                        {/* Left Column: Tracker + Hires */}
                        <div className="left-column">
                            {/* Critical Attendance Limits */}
                            <div className="card tracker-card">
                                <CriticalAttendance
                                    employees={employees}
                                    attendance={attendance}
                                    leaves={leaves}
                                    className="critical-attendance-wrapper"
                                />
                            </div>

                            {/* Recent Hires - Compact list */}
                            <div className="card recent-hires-card">
                                <div className="card-header">
                                    <h3>Recent Hires</h3>
                                    <Link href="/employees" className="view-link">View All</Link>
                                </div>
                                <div className="hires-list">
                                    {onboarding.length > 0 ? onboarding.map((emp, i) => (
                                        <div key={i} className="hire-item">
                                            <div className="avatar small" style={{ background: `hsl(${emp.id * 50 % 360}, 60%, 90%)` }}>
                                                {emp.first_name[0]}{emp.last_name[0]}
                                            </div>
                                            <div className="hire-info">
                                                <div className="name">{emp.first_name} {emp.last_name}</div>
                                                <div className="role">{emp.position}</div>
                                            </div>
                                            <div className="date">{new Date(emp.date_hired).toLocaleDateString()}</div>
                                        </div>
                                    )) : <div className="no-data">No recent hires</div>}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Quick Actions + Announcements + Birthdays */}
                        <div className="right-column">

                            {/* Quick Actions */}
                            <div className="card quick-actions-card">
                                <h3>Quick Actions</h3>
                                <div className="actions-grid">
                                    <button onClick={() => router.push('/employees/add')} className="action-btn">
                                        <span>👤</span> Add Emp
                                    </button>
                                    <button onClick={() => router.push('/reports')} className="action-btn">
                                        <span>📄</span> Reports
                                    </button>
                                    <button onClick={() => router.push('/leave')} className="action-btn">
                                        <span>🏖️</span> Leaves
                                    </button>
                                    <button onClick={() => router.push('/attendance')} className="action-btn">
                                        <span>⏰</span> Attd.
                                    </button>
                                </div>
                            </div>

                            {/* Announcements (Flex Grow) */}
                            <div className="card announcements-card">
                                <div className="card-header">
                                    <h3>Announcements</h3>
                                    <Link href="/announcements" className="view-link">All</Link>
                                </div>
                                <div className="announcements-list">
                                    {announcements.length > 0 ? announcements.map((ann, i) => (
                                        <div key={i} className={`announcement-item ${ann.priority.toLowerCase()}`}>
                                            <div className="ann-top">
                                                <span className="badge">{ann.category}</span>
                                                <span className="date">{new Date(ann.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <h4>{ann.title}</h4>
                                            <p>{ann.content}</p>
                                        </div>
                                    )) : <div className="no-data">No active announcements</div>}
                                </div>
                            </div>

                            {/* Upcoming Birthdays */}
                            <div className="card birthdays-card">
                                <h3>Birthdays</h3>
                                <div className="birthdays-list">
                                    {stats?.upcomingBirthdays?.slice(0, 3).map((bday: any, i: number) => (
                                        <div key={i} className="birthday-item">
                                            <div className="avatar small" style={{ background: `hsl(${i * 120}, 70%, 85%)` }}>
                                                {bday.name.charAt(0)}
                                            </div>
                                            <div className="bday-info">
                                                <span className="name">{bday.name}</span>
                                                <span className="date">{new Date(bday.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <span className="days-left">{bday.daysUntil === 0 ? 'Today' : `${bday.daysUntil}d`}</span>
                                        </div>
                                    )) || <div className="no-data">No upcoming birthdays</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .dashboard-container {
                    padding: 0 16px 16px 0;
                    height: calc(100vh - 80px); /* Subtract approximate header height + padding */
                    display: flex;
                    flex-direction: column;
                    font-family: 'Inter', sans-serif;
                    overflow: hidden; /* Lock main scroll */
                }
                .dashboard-header {
                    margin-bottom: 12px;
                    flex-shrink: 0;
                }
                .dashboard-header h1 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }
                .dashboard-header p {
                    color: #64748b;
                    font-size: 0.8rem;
                    margin: 0;
                }
                
                .dashboard-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    min-height: 0; /* Important for flex child scrolling */
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    flex-shrink: 0;
                }
                .metric-card {
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .metric-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                }
                .metric-icon.blue { background: #eff6ff; color: #3b82f6; }
                .metric-icon.purple { background: #ede9fe; color: #7c3aed; }
                .metric-icon.green { background: #ecfdf5; color: #10b981; }
                .metric-icon.orange { background: #fff7ed; color: #f97316; }

                .metric-info .label {
                    font-size: 0.7rem;
                    font-weight: 500;
                    color: #64748b;
                    display: block;
                }
                .metric-info .value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #0f172a;
                }

                .main-grid {
                    flex: 1;
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 12px;
                    min-height: 0; /* Enable internal scrolling */
                }

                .left-column, .right-column {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    height: 100%;
                    min-height: 0;
                }

                /* Cards */
                .card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    flex-shrink: 0;
                }
                .card-header h3 {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }
                .view-link {
                    font-size: 0.7rem;
                    color: #3b82f6;
                    font-weight: 600;
                    text-decoration: none;
                }

                /* Tracker Card */
                .tracker-card {
                    flex: 3;
                    min-height: 0;
                    overflow: hidden;
                    padding: 0; /* Remove padding to let component handle it */
                    background: transparent; /* Component has its own logic/bg */
                    box-shadow: none; /* Component handles it */
                }
                .critical-attendance-wrapper {
                    height: 100%;
                }

                /* Hires */
                .recent-hires-card {
                    flex: 2; 
                    min-height: 0;
                    overflow: hidden;
                }
                .hires-list {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .hire-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .hire-info { flex: 1; min-width: 0; }
                .hire-info .name { font-size: 0.75rem; font-weight: 600; color: #334155; }
                .hire-info .role { font-size: 0.65rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .hire-item .date { font-size: 0.65rem; color: #94a3b8; }
                .avatar.small { width: 28px; height: 28px; font-size: 0.65rem; }

                /* Right Column Items */
                .quick-actions-card {
                    flex-shrink: 0;
                }
                .actions-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                .action-btn {
                    padding: 8px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-weight: 600;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    transition: all 0.2s;
                }
                .action-btn:hover { background: #f1f5f9; color: #0f172a; }

                .announcements-card {
                    flex: 3; /* Takes variable space */
                    min-height: 0;
                    overflow: hidden;
                }
                .announcements-list {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-right: 4px; /* Space for scrollbar */
                }
                .announcement-item {
                    border-left: 3px solid #cbd5e1;
                    padding-left: 8px;
                }
                .announcement-item.high { border-left-color: #ef4444; }
                .announcement-item h4 {
                    font-size: 0.8rem;
                    margin: 0 0 2px 0;
                    color: #0f172a;
                }
                .announcement-item p {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .ann-top {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.65rem;
                    margin-bottom: 2px;
                }
                .badge { background: #f1f5f9; padding: 1px 4px; border-radius: 4px; color: #64748b; font-weight: 600; }

                .birthdays-card {
                    flex: 2;
                    min-height: 0;
                    overflow: hidden;
                }
                .birthdays-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    overflow-y: auto;
                }
                .birthday-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                .birthday-item:last-child { border-bottom: none; }
                .bday-info { flex: 1; display: flex; flex-direction: column; }
                .bday-info .name { font-size: 0.75rem; font-weight: 600; color: #334155; }
                .bday-info .date { font-size: 0.65rem; color: #94a3b8; }
                .days-left { font-size: 0.65rem; font-weight: 600; color: #64748b; }

                /* Custom Scrollbar Styles */
                ::-webkit-scrollbar { width: 4px; height: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                .no-data {
                    text-align: center;
                    padding: 10px;
                    color: #94a3b8;
                    font-size: 0.75rem;
                    font-style: italic;
                }
            `}</style>
        </DashboardLayout>
    );
}
