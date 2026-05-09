'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CriticalAttendance from '@/components/CriticalAttendance';

interface DashboardStats {
    totalEmployees: number;
    totalDepartments: number;
    todayPresents: number;
    todayAbsents: number;
    upcomingBirthdays?: Array<{
        id?: number;
        name?: string;
        date?: string;
        daysUntil?: number;
    }>;
}

function parseStoredJson<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    const storedValue = localStorage.getItem(key);
    if (!storedValue) return null;

    try {
        return JSON.parse(storedValue) as T;
    } catch (error) {
        console.warn(`Invalid JSON found in localStorage for "${key}"`, error);
        localStorage.removeItem(key);
        return null;
    }
}

function getInitials(firstName?: string, lastName?: string) {
    const initials = `${firstName?.trim()?.charAt(0) || ''}${lastName?.trim()?.charAt(0) || ''}`.trim();
    return initials || '--';
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [onboarding, setOnboarding] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = parseStoredJson<any>('user');
        if (storedUser) {
            if (storedUser.role === 'Employee') {
                router.push('/profile');
                return;
            }
            setUser(storedUser);
        }
        fetchDashboardData();
    }, [router]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const userParsed = parseStoredJson<any>('user');
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

            const [statsData, leavesData, empData, annData, alertsData, attData] = await Promise.all([
                statsRes.ok ? statsRes.json() : Promise.resolve(null),
                leavesRes.ok ? leavesRes.json() : Promise.resolve([]),
                empRes.ok ? empRes.json() : Promise.resolve([]),
                annRes.ok ? annRes.json() : Promise.resolve([]),
                alertsRes.ok ? alertsRes.json() : Promise.resolve({ alerts: [] }),
                attRes.ok ? attRes.json() : Promise.resolve([])
            ]);

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
                .filter((emp: any) => emp?.date_hired)
                .sort((a: any, b: any) => new Date(b.date_hired).getTime() - new Date(a.date_hired).getTime())
                .slice(0, 4);
            setOnboarding(recentlyHired);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const upcomingBirthdays = Array.isArray(stats?.upcomingBirthdays)
        ? stats.upcomingBirthdays.filter((bday) => Boolean(bday?.name && bday?.date)).slice(0, 3)
        : [];
    const canAddEmployee = user?.role === 'HR' || user?.role === 'Admin' || user?.username === 'superadmin';

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

                {/* Mobile Quick Actions - visible only on phones */}
                <div className="mobile-quick-actions">
                    {canAddEmployee && (
                        <button onClick={() => router.push('/employees/add')} className="m-quick-btn add-emp">
                            <span className="icon">+</span>
                            <span>Add Employee</span>
                        </button>
                    )}
                    <button onClick={() => router.push('/attendance/kiosk')} className="m-quick-btn scan-att">
                        <span className="icon">📷</span>
                        <span>Open Scanner</span>
                    </button>
                </div>

                {user?.role === 'HR' && new Date().getDate() >= 10 && new Date().getDate() <= 15 && (
                    <div style={{ background: '#fdfbc8', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#854d0e', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '1.2rem' }}>🏛️</div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Government Contributions Due</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>It is between the 10th and 15th of the month. Please remember to generate the SSS, Pag-IBIG, and PhilHealth contributions.</p>
                        </div>
                        <button
                            onClick={() => router.push('/gov-contributions/generate')}
                            style={{ marginLeft: 'auto', background: '#ca8a04', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                            Generate Now
                        </button>
                    </div>
                )}

                <div className="dashboard-content">

                    {/* Metrics Row */}
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <div className="metric-icon blue">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                            </div>
                            <div className="metric-info">
                                <span className="label">Total Employees</span>
                                <span className="value">{stats?.totalEmployees || 0}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon purple">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
                            </div>
                            <div className="metric-info">
                                <span className="label">Departments</span>
                                <span className="value">{stats?.totalDepartments || 0}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon green">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            </div>
                            <div className="metric-info">
                                <span className="label">Present Today</span>
                                <span className="value">{stats?.todayPresents || 0}</span>
                            </div>
                        </div>

                        <div className="metric-card">
                            <div className="metric-icon orange">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                            </div>
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
                                            <div className="avatar small" style={{ background: `hsl(${emp.id * 50 % 360}, 60%, 90%)`, color: `hsl(${emp.id * 50 % 360}, 60%, 40%)` }}>
                                                {getInitials(emp.first_name, emp.last_name)}
                                            </div>
                                            <div className="hire-info">
                                                <div className="name">{[emp.first_name, emp.last_name].filter(Boolean).join(' ').toUpperCase() || 'UNNAMED EMPLOYEE'}</div>
                                                <div className="role">{emp.position || 'No position assigned'}</div>
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
                                    {canAddEmployee && (
                                        <button onClick={() => router.push('/employees/add')} className="action-btn">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                                            <span>Add Emp</span>
                                        </button>
                                    )}
                                    <button onClick={() => router.push('/reports')} className="action-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="4" height="7"/><rect x="15" y="4" width="4" height="13"/></svg>
                                        <span>Reports</span>
                                    </button>
                                    <button onClick={() => router.push('/leave')} className="action-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="9" y1="15" x2="15" y2="15"></line><line x1="12" y1="12" x2="12" y2="18"></line></svg>
                                        <span>Leaves</span>
                                    </button>
                                    <button onClick={() => router.push('/attendance')} className="action-btn">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        <span>Attd.</span>
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
                                        <div key={i} className={`announcement-item ${(ann.priority || 'normal').toString().toLowerCase()}`}>
                                            <div className="ann-top">
                                                <span className="badge">{ann.category || 'Announcement'}</span>
                                                <span className="date">{new Date(ann.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <h4>{ann.title || 'Untitled announcement'}</h4>
                                            <p>{ann.content || 'No content available.'}</p>
                                        </div>
                                    )) : <div className="no-data flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="opacity-50"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg>
                                        No active announcements
                                    </div>}
                                </div>
                            </div>

                            {/* Upcoming Birthdays */}
                            <div className="card birthdays-card">
                                <h3>Birthdays</h3>
                                <div className="birthdays-list">
                                    {upcomingBirthdays.length > 0 ? upcomingBirthdays.map((bday, i: number) => (
                                        <div key={i} className="birthday-item">
                                            <div className="avatar small" style={{ background: `hsl(${i * 120}, 70%, 85%)` }}>
                                                {(bday.name || '?').charAt(0)}
                                            </div>
                                            <div className="bday-info">
                                                <span className="name">{bday.name?.toUpperCase()}</span>
                                                <span className="date">{new Date(bday.date || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <span className="days-left">{bday.daysUntil === 0 ? 'Today' : `${bday.daysUntil}d`}</span>
                                        </div>
                                    )) : <div className="no-data">No upcoming birthdays</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .dashboard-container {
                    padding: 0 16px 16px 0;
                    height: calc(100vh - 80px);
                    display: flex;
                    flex-direction: column;
                    font-family: 'Inter', sans-serif;
                    overflow: hidden;
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
                    gap: 16px;
                    min-height: 0;
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    flex-shrink: 0;
                }
                .metric-card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .metric-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }
                .metric-icon.blue { background: #e0f2fe; color: #0284c7; }
                .metric-icon.purple { background: #e0e7ff; color: #4f46e5; }
                .metric-icon.green { background: #dcfce7; color: #16a34a; }
                .metric-icon.orange { background: #fee2e2; color: #dc2626; }

                .metric-info .label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: block;
                    margin-bottom: 4px;
                }
                .metric-info .value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1;
                }

                .main-grid {
                    flex: 1;
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 12px;
                    min-height: 0;
                }

                .left-column, .right-column {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    height: 100%;
                    min-height: 0;
                }

                .card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    padding: 24px;
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
                    font-size: 1rem;
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

                .tracker-card {
                    flex: 3;
                    min-height: 0;
                    overflow: hidden;
                    padding: 0;
                    background: transparent;
                    box-shadow: none;
                }
                .critical-attendance-wrapper {
                    height: 100%;
                }

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

                .quick-actions-card {
                    flex-shrink: 0;
                    padding: 20px;
                }
                .quick-actions-card h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 16px;
                    margin-top: 0;
                }
                .actions-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .action-btn {
                    padding: 16px 12px;
                    background: white;
                    border: 1px solid #f1f5f9;
                    border-radius: 12px;
                    font-weight: 600;
                    color: #0f172a;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
                }
                .action-btn:hover { border-color: #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.04); }

                .announcements-card {
                    flex: 3;
                    min-height: 0;
                    overflow: hidden;
                }
                .announcements-list {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-right: 4px;
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
                    padding: 20px;
                }
                .birthdays-card h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 16px;
                    margin-top: 0;
                }
                .birthdays-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    overflow-y: auto;
                }
                .birthday-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid #f8fafc;
                }
                .birthday-item:last-child { border-bottom: none; }
                .bday-info { flex: 1; display: flex; flex-direction: column; }
                .bday-info .name { font-size: 0.8rem; font-weight: 700; color: #0f172a; }
                .bday-info .date { font-size: 0.7rem; color: #64748b; margin-top: 2px; }
                .days-left { 
                    font-size: 0.7rem; 
                    font-weight: 700; 
                    color: #475569; 
                    background: #f1f5f9;
                    padding: 4px 8px;
                    border-radius: 12px;
                }

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

                .mobile-quick-actions {
                    display: none; /* Hide on desktop by default */
                }

                /* Mobile Layout Upgrades */
                @media (max-width: 1024px) {
                    .metrics-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 768px) {
                    .dashboard-container {
                        padding: 0 0 16px 0;
                        height: auto;
                        min-height: calc(100vh - 80px);
                        overflow-y: auto;
                    }
                    .mobile-quick-actions {
                        display: flex;
                        gap: 12px;
                        margin-bottom: 16px;
                    }
                    .m-quick-btn {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 12px;
                        border-radius: 12px;
                        border: none;
                        font-family: 'Inter', sans-serif;
                        font-weight: 700;
                        font-size: 0.8rem;
                        color: white;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .m-quick-btn .icon {
                        font-size: 1.5rem;
                    }
                    .m-quick-btn.add-emp {
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    }
                    .m-quick-btn.scan-att {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    }
                    .main-grid {
                        grid-template-columns: 1fr;
                        display: flex;
                        flex-direction: column;
                    }
                    .left-column {
                        height: auto;
                    }
                    .right-column {
                        height: auto;
                    }
                    .card {
                        overflow: visible;
                    }
                    .hires-list, .announcements-list, .birthdays-list {
                        overflow: visible;
                    }
                    .tracker-card {
                        min-height: 400px;
                    }
                }

                @media (max-width: 480px) {
                    .metrics-grid {
                        grid-template-columns: 1fr;
                    }
                    .actions-grid {
                        grid-template-columns: 1fr;
                    }
                    .dashboard-header h1 {
                        font-size: 1.1rem;
                    }
                }
            `}</style>
        </DashboardLayout>
    );
}
