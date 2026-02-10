'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [onboarding, setOnboarding] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
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

            const headers = { 'x-session-id': sessionId || '' };

            const [statsRes, leavesRes, empRes, annRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }),
                fetch('/api/leave?status=Approved', { headers }),
                fetch('/api/employees', { headers }),
                fetch(`/api/announcements?is_active=true&branch=${encodeURIComponent(userBranch)}`, { headers })
            ]);

            if (statsRes.status === 401) {
                router.push('/login');
                return;
            }

            const statsData = await statsRes.json();
            const leavesData = await leavesRes.json();
            const empData = await empRes.json();
            const annData = await annRes.json();
            const employees = Array.isArray(empData) ? empData : [];

            setStats(statsData);
            setLeaves(Array.isArray(leavesData) ? leavesData : []);
            setAnnouncements(Array.isArray(annData) ? annData : []);

            const recentlyHired = employees
                .sort((a: any, b: any) => new Date(b.date_hired).getTime() - new Date(a.date_hired).getTime())
                .slice(0, 4);
            setOnboarding(recentlyHired);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

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

                    <div className="main-grid">

                        {/* Left Column: Timeline + Hires */}
                        <div className="left-column">
                            {/* Timeline - Takes more space */}
                            <div className="card timeline-card">
                                <div className="card-header">
                                    <h3>Planned Absences</h3>
                                    <Link href="/leave" className="view-link">View All</Link>
                                </div>
                                <div className="timeline-wrapper">
                                    <div className="timeline-container">
                                        <div className="timeline-dates">
                                            <div className="spacer"></div>
                                            {days.map((d, i) => (
                                                <div key={i} className={`date-col ${i === 0 ? 'today' : ''}`}>
                                                    <span className="day-name">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                                    <span className="day-num">{d.getDate()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="timeline-body">
                                            {leaves.length > 0 ? (
                                                Array.from(new Set(leaves.map(l => l.employee_id))).slice(0, 8).map(empId => {
                                                    const empLeaves = leaves.filter(l => l.employee_id === empId);
                                                    const empName = empLeaves[0].employee_name;
                                                    return (
                                                        <div key={empId} className="timeline-row">
                                                            <div className="employee-info">
                                                                <div className="avatar" style={{ background: `hsl(${empId * 40 % 360}, 70%, 85%)` }}>
                                                                    {empName.charAt(0)}
                                                                </div>
                                                                <span className="name">{empName.split(' ')[0]}</span>
                                                            </div>
                                                            <div className="timeline-track">
                                                                {days.map((d, i) => {
                                                                    const dayTime = d.setHours(0, 0, 0, 0);
                                                                    const activeLeave = empLeaves.find(l => {
                                                                        const start = new Date(l.start_date).setHours(0, 0, 0, 0);
                                                                        const end = new Date(l.end_date).setHours(0, 0, 0, 0);
                                                                        return dayTime >= start && dayTime <= end;
                                                                    });

                                                                    if (activeLeave) {
                                                                        const isStart = new Date(activeLeave.start_date).setHours(0, 0, 0, 0) === dayTime;
                                                                        const isEnd = new Date(activeLeave.end_date).setHours(0, 0, 0, 0) === dayTime;
                                                                        const typeClass = activeLeave.leave_type.toLowerCase().includes('sick') ? 'sick' : 'vacation';
                                                                        return <div key={i} className={`timeline-cell active ${typeClass} ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''}`} title={activeLeave.leave_type}></div>;
                                                                    }
                                                                    return <div key={i} className="timeline-cell"></div>;
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="no-data">No upcoming leaves scheduled.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
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

                /* Timeline */
                .timeline-card {
                    flex: 3;
                    min-height: 0;
                    overflow: hidden;
                }
                .timeline-wrapper {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .timeline-container {
                    overflow-x: auto;
                    overflow-y: auto;
                    flex: 1;
                }
                .timeline-dates {
                    display: flex;
                    margin-bottom: 6px;
                    position: sticky;
                    top: 0;
                    background: white;
                    z-index: 10;
                    padding-bottom: 4px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .spacer { width: 120px; flex-shrink: 0; }
                .date-col {
                    flex: 1;
                    min-width: 32px;
                    text-align: center;
                    padding: 2px;
                }
                .date-col.today { background: #eff6ff; border-radius: 4px; }
                .day-name { font-size: 0.6rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; display: block; }
                .day-num { font-size: 0.75rem; color: #334155; font-weight: 700; }

                .timeline-body {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .timeline-row {
                    display: flex;
                    align-items: center;
                }
                .employee-info {
                    width: 120px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .avatar {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.7rem;
                    color: #334155;
                }
                .employee-info .name {
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #334155;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .timeline-track {
                    flex: 1;
                    display: flex;
                    gap: 3px;
                }
                .timeline-cell {
                    flex: 1;
                    height: 24px;
                    background: #f8fafc;
                    border-radius: 4px;
                    min-width: 32px;
                }
                .timeline-cell.sick { background: #fca5a5; }
                .timeline-cell.vacation { background: #93c5fd; }
                .timeline-cell.active { border: 1px solid rgba(0,0,0,0.05); }

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
