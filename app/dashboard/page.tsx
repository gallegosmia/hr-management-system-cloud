'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [onboarding, setOnboarding] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

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
            const [statsRes, leavesRes, empRes] = await Promise.all([
                fetch('/api/dashboard/stats'),
                fetch('/api/leave?status=Approved'),
                fetch('/api/employees')
            ]);

            const statsData = await statsRes.json();
            const leavesData = await leavesRes.json();
            const empData = await empRes.json();

            setStats(statsData);
            setLeaves(leavesData.slice(0, 10)); // Limit to 10 for timeline

            // Get last 4 hired employees for onboarding
            const recentlyHired = empData
                .sort((a: any, b: any) => new Date(b.date_hired).getTime() - new Date(a.date_hired).getTime())
                .slice(0, 4);
            setOnboarding(recentlyHired);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAiSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setAiLoading(true);
        // Simple mock AI response logic based on current system data
        setTimeout(() => {
            const query = searchQuery.toLowerCase();
            if (query.includes('employee') || query.includes('who')) {
                setAiResponse(`Found ${stats?.totalEmployees || 0} active employees. You can manage them in the Employees tab.`);
            } else if (query.includes('leave') || query.includes('off')) {
                setAiResponse(`There are currently ${stats?.pendingLeaves || 0} pending leave requests requiring your attention.`);
            } else if (query.includes('birthday')) {
                setAiResponse(`The next birthday is ${stats?.upcomingBirthdays?.[0]?.name || 'not soon'}.`);
            } else {
                setAiResponse("I'm Melann's AI assistant. I can help you find employees, check leave statuses, or generate reports.");
            }
            setAiLoading(false);
        }, 800);
    };

    // Helper for timeline calculation
    const getDaysInMonth = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    };

    const days = Array.from({ length: 16 }, (_, i) => i + 1); // Showing first 16 days for simplicity

    if (loading) {
        return (
            <DashboardLayout>
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Fetching real-time data...</p>
                </div>
                <style jsx>{`
                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 60vh;
                        color: #64748b;
                    }
                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 3px solid #e2e8f0;
                        border-top-color: #6366f1;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 1rem;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="dashboard-wrapper">
                {/* Section: Summary Metrics Card Row */}
                <div className="metrics-grid">
                    <div className="metric-card glass-effect">
                        <div className="metric-info">
                            <span className="metric-label">Total Employees</span>
                            <h3 className="metric-value">{stats?.totalEmployees || 0}</h3>
                            <div className={`metric-trend ${stats?.comparisons?.employees?.positive ? 'up' : 'down'}`}>
                                {stats?.comparisons?.employees?.positive ? '↑' : '↓'} {stats?.comparisons?.employees?.value}%
                                <span className="trend-label"> vs last year</span>
                            </div>
                        </div>
                        <div className="metric-icon employees-icon">👥</div>
                        <Link href="/employees" className="metric-details">Details ↗</Link>
                    </div>

                    <div className="metric-card glass-effect">
                        <div className="metric-info">
                            <span className="metric-label">Departments</span>
                            <h3 className="metric-value">{stats?.totalDepartments || 0}</h3>
                            <div className="metric-trend none">
                                Company Divisions
                            </div>
                        </div>
                        <div className="metric-icon dept-icon">🏢</div>
                        <Link href="/employees" className="metric-details">View ↗</Link>
                    </div>

                    <div className="metric-card glass-effect">
                        <div className="metric-info">
                            <span className="metric-label">Today Presents</span>
                            <h3 className="metric-value">{stats?.todayPresents || 0}</h3>
                            <div className={`metric-trend ${stats?.comparisons?.attendance?.positive ? 'up' : 'down'}`}>
                                {stats?.comparisons?.attendance?.positive ? '↑' : '↓'} {stats?.comparisons?.attendance?.value}%
                                <span className="trend-label"> vs average</span>
                            </div>
                        </div>
                        <div className="metric-icon present-icon">✅</div>
                        <Link href="/attendance" className="metric-details">Attendance ↗</Link>
                    </div>

                    <div className="metric-card glass-effect">
                        <div className="metric-info">
                            <span className="metric-label">Today Absents</span>
                            <h3 className="metric-value">{stats?.todayAbsents || 0}</h3>
                            <div className="metric-trend down">
                                {stats?.todayAbsents > 0 ? '⚠️' : '✨'} System tracking
                            </div>
                        </div>
                        <div className="metric-icon absent-icon">❌</div>
                        <Link href="/leave" className="metric-details">Leaves ↗</Link>
                    </div>
                </div>

                {/* Section 1: Planned Absences Timeline (REAL DATA) */}
                <section className="section-absences glass-effect">
                    <div className="section-header">
                        <div className="header-title">
                            <h2>Planned Absences</h2>
                            <span className="subtitle">Approved Leaves for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                        </div>
                        <div className="header-actions">
                            <div className="date-display">
                                <span className="calendar-icon">📅</span>
                                <span>{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <button className="view-all-btn" onClick={() => window.location.href = '/leave'}>Manage Leaves ↗</button>
                        </div>
                    </div>

                    <div className="absences-timeline-container">
                        <div className="timeline-grid-header">
                            <div className="empty-corner"></div>
                            <div className="days-row">
                                {days.map(d => {
                                    const today = new Date().getDate();
                                    return (
                                        <div key={d} className={`day-col ${d === today ? 'today' : ''}`}>
                                            <span className="day-name">{new Date(new Date().getFullYear(), new Date().getMonth(), d).toLocaleString('default', { weekday: 'short' })}</span>
                                            <span className="day-num">{d}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="timeline-body">
                            {leaves.length > 0 ? (
                                // Group leaves by employee to show rows
                                Array.from(new Set(leaves.map(l => l.employee_id))).slice(0, 5).map(empId => {
                                    const empLeaves = leaves.filter(l => l.employee_id === empId);
                                    const empName = empLeaves[0].employee_name;
                                    const dept = empLeaves[0].department;

                                    return (
                                        <div key={empId} className="employee-row">
                                            <div className="employee-info">
                                                <div className="emp-photo" style={{ background: `hsl(${empId * 40 % 360}, 70%, 60%)` }}>
                                                    {empName.split(' ').map((n: any) => n[0]).join('')}
                                                </div>
                                                <div className="emp-text">
                                                    <Link href={`/employees/${empId}`} className="name">{empName}</Link>
                                                    <div className="role">{dept}</div>
                                                </div>
                                            </div>
                                            <div className="timeline-slots">
                                                {days.map((_, i) => (
                                                    <div key={i} className={`slot-cell`}></div>
                                                ))}
                                                {empLeaves.map((l, idx) => {
                                                    const start = new Date(l.start_date).getDate();
                                                    const end = new Date(l.end_date).getDate();
                                                    if (start > 16) return null;

                                                    const width = Math.min(end - start + 1, 16 - start + 1);
                                                    const typeClass = l.leave_type.toLowerCase().includes('sick') ? 'sick-leave' :
                                                        l.leave_type.toLowerCase().includes('vacation') ? 'vacation-leave' : 'paid-leave';

                                                    return (
                                                        <div key={idx} className={`leave-block ${typeClass}`}
                                                            style={{
                                                                left: `calc(${(start - 1) * 6.25}% + 2px)`,
                                                                width: `calc(${width * 6.25}% - 4px)`
                                                            }}>
                                                            <span className="l-text">{l.leave_type}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    No approved absences for this period
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Bottom Row: Three columns */}
                <div className="bottom-grid">
                    {/* Column 1: Future Events (Birthdays from Real Data) */}
                    <div className="grid-item glass-effect">
                        <div className="item-header">
                            <h3>Upcoming Birthdays</h3>
                            <span className="view-link">Next 30 Days</span>
                        </div>
                        <div className="events-list">
                            {stats?.upcomingBirthdays?.slice(0, 3).map((bday: any, i: number) => (
                                <div key={i} className={`event-card ${bday.daysUntil === 0 ? 'active' : ''}`}>
                                    {bday.daysUntil === 0 && <div className="corner-tag">TODAY! 🎈</div>}
                                    <h4>{bday.name}</h4>
                                    <p>{bday.department} • Birthday Celebration</p>
                                    <div className="event-meta">
                                        <div className="meta-pill">📅 {new Date(bday.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</div>
                                        <div className="meta-pill" style={{ color: bday.daysUntil === 0 ? '#b45309' : '#1e293b' }}>
                                            {bday.daysUntil === 0 ? 'Happening Now' : `In ${bday.daysUntil} day${bday.daysUntil > 1 ? 's' : ''}`}
                                        </div>
                                    </div>
                                </div>
                            )) || (
                                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>No birthdays soon</p>
                                )}

                            {/* Anniversaries/Events Mock if needed */}
                            <div className="event-card">
                                <h4>Monthly Staff Meeting</h4>
                                <p>Conference Room A • All Staff</p>
                                <div className="event-meta">
                                    <div className="meta-pill">📅 Jan 30</div>
                                    <div className="meta-pill">🕒 09:00 AM</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Onboarding (REAL DATA - Recently Hired) */}
                    <div className="grid-item glass-effect">
                        <div className="item-header">
                            <h3>Recent Hires</h3>
                            <Link href="/employees" className="view-link">View All ↗</Link>
                        </div>
                        <div className="onboarding-grid">
                            {onboarding.length > 0 ? onboarding.map((emp, i) => (
                                <div key={i} className="onboard-card">
                                    <div className="onboard-avatar" style={{ background: `hsl(${emp.id * 50 % 360}, 60%, 90%)` }}>
                                        {emp.first_name[0]}{emp.last_name[0]}
                                    </div>
                                    <div className="onboard-name">{emp.first_name} {emp.last_name}</div>
                                    <div className="onboard-role">{emp.position}</div>
                                    <div className="onboard-stats">
                                        Joined {new Date(emp.date_hired).toLocaleDateString()}
                                    </div>
                                    <div className="progress-bar-mini">
                                        <div className="fill" style={{ width: `${emp.file_completion_status === 'Complete' ? 100 : emp.file_completion_status === 'Partial' ? 60 : 30}%` }}></div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b' }}>No recent hires found</p>
                            )}
                        </div>
                    </div>

                    {/* Column 3: AI Assistant (FUNCTIONAL) */}
                    <div className="grid-item glass-effect no-padding welcome-widget-container">
                        <div className="welcome-widget">
                            <div className="glass-orbit-container">
                                <div className="glass-sphere"></div>
                            </div>
                            <h2>Welcome, {user?.username?.split(' ')[0] || 'Member'}</h2>
                            {aiResponse ? (
                                <div className="ai-bubble-response glass-effect">
                                    <p>{aiResponse}</p>
                                    <button className="clear-ai" onClick={() => setAiResponse('')}>Ask another question</button>
                                </div>
                            ) : (
                                <p className="help-text">What can I help with today?</p>
                            )}

                            <div className="action-grid">
                                <button className="action-btn" onClick={() => window.location.href = '/employees/add'}>👤 Add new employee</button>
                                <button className="action-btn" onClick={() => window.location.href = '/reports'}>📄 Generate reports</button>
                                <button className="action-btn" onClick={() => window.location.href = '/leave'}>🏖️ Manage leave</button>
                            </div>

                            <div className="ask-container">
                                <form onSubmit={handleAiSubmit} className="ask-box">
                                    <input
                                        type="text"
                                        placeholder="Type 'birthday', 'who is here', etc."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <div className="ask-icons">
                                        <span className="icon">📎</span>
                                        <button type="submit" className="create-submit-btn" disabled={aiLoading}>
                                            {aiLoading ? 'Thinking...' : 'Search ↗'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .dashboard-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 30px;
                    padding-bottom: 40px;
                }

                /* Metrics Grid Styles */
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                }

                .metric-card {
                    padding: 24px;
                    border-radius: 28px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    min-height: 140px;
                }

                .metric-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.08);
                }

                .metric-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .metric-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #64748b;
                    letter-spacing: -0.01em;
                }

                .metric-value {
                    font-size: 2.25rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0;
                    letter-spacing: -0.03em;
                }

                .metric-trend {
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 8px;
                }

                .metric-trend.up { color: #10b981; }
                .metric-trend.down { color: #ef4444; }
                .metric-trend.none { color: #94a3b8; }

                .trend-label {
                    font-weight: 500;
                    color: #94a3b8;
                }

                .metric-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.04);
                }

                .employees-icon { background: #eff6ff; }
                .dept-icon { background: #f5f3ff; }
                .present-icon { background: #ecfdf5; }
                .absent-icon { background: #fff1f2; }

                .metric-details {
                    position: absolute;
                    bottom: 20px;
                    right: 24px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #3b82f6;
                    text-decoration: none;
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.2s;
                }

                .metric-card:hover .metric-details {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .section-absences {
                    border-radius: 32px;
                    padding: 30px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                }

                .header-title h2 { font-size: 1.75rem; margin: 0; color: #1e293b; }
                .subtitle { font-size: 0.875rem; color: #64748b; font-weight: 500; }

                .date-display {
                    background: white;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border: 1px solid #f1f5f9;
                }

                .view-all-btn {
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    border: none;
                    background: #f1f5f9;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .absences-timeline-container { overflow-x: auto; }
                .timeline-grid-header { display: flex; margin-bottom: 10px; }
                .empty-corner { min-width: 220px; }
                .days-row { display: flex; flex: 1; }

                .day-col {
                    flex: 1;
                    min-width: 60px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    color: #94a3b8;
                    font-size: 0.75rem;
                }

                .day-col.today .day-num {
                    background: #3b82f6;
                    color: white;
                    border-radius: 6px;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .timeline-body { display: flex; flex-direction: column; gap: 15px; }
                .employee-row { display: flex; align-items: center; height: 60px; position: relative; }
                .employee-info { min-width: 220px; display: flex; align-items: center; gap: 12px; }

                .emp-photo {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 0.8rem;
                }

                .emp-text .name { font-weight: 600; font-size: 0.9375rem; color: #1e293b; text-decoration: none; }
                .emp-text .role { font-size: 0.75rem; color: #64748b; }

                .timeline-slots {
                    display: flex;
                    flex: 1;
                    height: 100%;
                    background: rgba(248, 250, 252, 0.5);
                    border-radius: 12px;
                    position: relative;
                }

                .slot-cell { flex: 1; border-right: 1px solid rgba(226, 232, 240, 0.4); }

                .leave-block {
                    position: absolute;
                    height: 28px;
                    top: 16px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    padding: 0 8px;
                    font-size: 0.65rem;
                    font-weight: 700;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    z-index: 5;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .paid-leave { background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; }
                .sick-leave { background: #3b82f6; color: white; }
                .vacation-leave { background: #10b981; color: white; }

                .bottom-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
                .grid-item { border-radius: 32px; padding: 24px; display: flex; flex-direction: column; }
                .no-padding { padding: 0; }
                .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .item-header h3 { margin: 0; font-size: 1.25rem; color: #1e293b; }
                .view-link { font-size: 0.75rem; font-weight: 600; color: #64748b; text-decoration: none; }

                .events-list { display: flex; flex-direction: column; gap: 15px; }
                .event-card { padding: 16px; border-radius: 20px; background: white; border: 1px solid #f1f5f9; position: relative; }
                .event-card.active { background: linear-gradient(135deg, #fef9c3 0%, #fde68a 100%); border-color: #fde68a; }
                .corner-tag { position: absolute; top: 10px; right: 10px; padding: 4px 8px; background: white; border-radius: 8px; font-size: 0.65rem; font-weight: 700; color: #b45309; }
                .event-card h4 { margin: 0 0 5px 0; font-size: 0.9rem; color: #1e293b; }
                .event-card p { font-size: 0.75rem; color: #64748b; margin: 0 0 10px 0; }
                .event-meta { display: flex; gap: 6px; }
                .meta-pill { background: white; padding: 4px 8px; border-radius: 8px; font-size: 0.65rem; font-weight: 600; color: #1e293b; border: 1px solid rgba(0,0,0,0.03); }

                .onboarding-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .onboard-card { padding: 14px; background: white; border-radius: 20px; border: 1px solid #f1f5f9; text-align: center; }
                .onboard-avatar { width: 40px; height: 40px; border-radius: 12px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1e293b; font-size: 0.8rem; }
                .onboard-name { font-size: 0.8rem; font-weight: 600; color: #1e293b; }
                .onboard-role { font-size: 0.7rem; color: #64748b; margin-bottom: 8px; }
                .onboard-stats { font-size: 0.6rem; background: #f8fafc; padding: 2px 6px; border-radius: 6px; margin-bottom: 8px; }
                .progress-bar-mini { height: 3px; background: #f1f5f9; border-radius: 2px; overflow: hidden; }
                .progress-bar-mini .fill { height: 100%; background: #64748b; }

                .welcome-widget { padding: 30px; height: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; position: relative; z-index: 5; }
                .glass-orbit-container { margin-bottom: 20px; position: relative; }
                .glass-sphere { width: 80px; height: 80px; background: radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6); border-radius: 50%; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4); }
                .welcome-widget h2 { font-size: 1.5rem; margin: 0 0 8px 0; color: #1e293b; }
                .help-text { font-size: 0.9rem; color: #64748b; margin-bottom: 25px; }

                .ai-bubble-response { padding: 15px; border-radius: 16px; font-size: 0.875rem; color: #1e293b; background: #eff6ff; margin-bottom: 20px; position: relative; border: 1px solid #dbeafe; }
                .clear-ai { background: none; border: none; font-size: 0.7rem; color: #3b82f6; text-decoration: underline; cursor: pointer; margin-top: 8px; font-weight: 600; }

                .action-grid { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-bottom: 20px; }
                .action-btn { padding: 10px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; font-size: 0.8rem; font-weight: 500; color: #1e293b; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
                .action-btn:hover { background: #f1f5f9; }

                .ask-container { width: 100%; margin-top: auto; }
                .ask-box { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
                .ask-box input { border: none; outline: none; font-size: 0.875rem; padding: 4px 0; color: #1e293b; }
                .ask-icons { display: flex; align-items: center; justify-content: space-between; }
                .create-submit-btn { padding: 6px 14px; background: #3b82f6; border: none; border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: white; cursor: pointer; }
                .create-submit-btn:disabled { opacity: 0.6; }

                @media (max-width: 1200px) { .bottom-grid { grid-template-columns: 1fr; } }
            `}</style>
        </DashboardLayout>
    );
}
