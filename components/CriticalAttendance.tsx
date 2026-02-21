'use client';

import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays } from 'date-fns';

interface CriticalAttendanceProps {
    employees: any[];
    attendance: any[];
    leaves: any[];
    className?: string;
}

export default function CriticalAttendance({ employees, attendance, leaves, className }: CriticalAttendanceProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // 1. Process Data to find Critical Employees
    const criticalData = useMemo(() => {
        const now = new Date();
        const startMonth = startOfMonth(now);
        const endMonth = endOfMonth(now);
        const currentYear = now.getFullYear();

        return employees.map(emp => {
            // Count Lates (Current Month)
            const empAtt = attendance.filter(a => a.employee_id === emp.id);
            const latesCount = empAtt.filter(a => {
                const dateStr = a.date || a.timestamp;
                if (!dateStr) return false;

                // Parse date safely
                let d;
                try {
                    d = parseISO(dateStr);
                } catch (e) {
                    return false;
                }

                return isWithinInterval(d, { start: startMonth, end: endMonth }) &&
                    (a.status === 'Late' || a.status === 'late');
            }).length;

            // Count Leaves (Current Year - Approved)
            const empLeaves = leaves.filter(l => l.employee_id === emp.id);
            const leavesCount = empLeaves.reduce((acc, l) => {
                if (!l.start_date) return acc;
                const leaveYear = new Date(l.start_date).getFullYear();

                if (leaveYear === currentYear && l.status === 'Approved') {
                    // Calculate days if total_days is missing
                    if (l.total_days) {
                        return acc + Number(l.total_days);
                    } else if (l.start_date && l.end_date) {
                        const start = new Date(l.start_date);
                        const end = new Date(l.end_date);
                        const diff = differenceInDays(end, start) + 1;
                        return acc + Math.max(1, diff);
                    }
                    return acc + 1; // Fallback
                }
                return acc;
            }, 0);

            return {
                ...emp,
                stats: {
                    lates: latesCount,
                    latesLimit: 5, // Hardcoded per design
                    leaves: leavesCount,
                    leavesLimit: 5 // Hardcoded per design
                }
            };
        }).filter(emp => {
            // Show anyone with any lates/leaves or critical status
            return emp.stats.lates > 0 || emp.stats.leaves > 0;
        }).sort((a, b) => {
            // Sort by most critical first (sum of ratios)
            const scoreA = (a.stats.lates / a.stats.latesLimit) + (a.stats.leaves / a.stats.leavesLimit);
            const scoreB = (b.stats.lates / b.stats.latesLimit) + (b.stats.leaves / b.stats.leavesLimit);
            return scoreB - scoreA;
        });

    }, [employees, attendance, leaves]);

    // Filter by search
    const filteredData = criticalData.filter(emp =>
        (emp.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.last_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleAction = (action: string, empName?: string) => {
        if (empName) {
            alert(`${action} for ${empName}`);
        } else {
            alert(`${action} for ${selectedIds.size} employees`);
        }
    };

    return (
        <div className={`critical-attendance-container ${className || ''}`}>

            {/* Header / Filter Bar */}
            <div className="ca-header">
                <div>
                    <h2 className="title">Critical Attendance Limits</h2>
                    <p className="subtitle">Found {filteredData.length} employees who have reached the maximum threshold (5/5) for Lates and Leaves.</p>
                </div>
                <div className="ca-controls">
                    <div className="search-box">
                        <span className="icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="filter-btn">
                        <span>☰</span> Filter
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="ca-grid">
                {filteredData.map(emp => {
                    const latesPct = Math.min(100, (emp.stats.lates / emp.stats.latesLimit) * 100);
                    const leavesPct = Math.min(100, (emp.stats.leaves / emp.stats.leavesLimit) * 100);
                    const isSelected = selectedIds.has(emp.id);

                    return (
                        <div key={emp.id} className={`emp-card ${isSelected ? 'selected' : ''}`}>
                            <div className="card-top">
                                <div className="emp-profile">
                                    <div className="avatar" style={{ background: `hsl(${emp.id * 60}, 70%, 90%)`, color: `hsl(${emp.id * 60}, 70%, 30%)` }}>
                                        {/* Fallback to initials if no image */}
                                        {(emp.first_name || '?')[0]}{(emp.last_name || '?')[0]}
                                    </div>
                                    <div className="info">
                                        <h4>{emp.first_name} {emp.last_name}</h4>
                                        <div className="role">{emp.department} • {emp.position}</div>
                                    </div>
                                </div>
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelection(emp.id)}
                                    />
                                </div>
                            </div>

                            <div className="stats-section">
                                <div className="stat-row">
                                    <div className="stat-label">
                                        <span>LATES</span>
                                        <span className={emp.stats.lates >= emp.stats.latesLimit ? 'limit-reached' : ''}>
                                            {emp.stats.lates >= emp.stats.latesLimit ? '5/5 LIMIT REACHED' : `${emp.stats.lates}/5`}
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="fill" style={{
                                            width: `${latesPct}%`,
                                            background: emp.stats.lates >= emp.stats.latesLimit ? '#2563eb' : '#3b82f6'
                                        }}></div>
                                        <span className="pct-text" style={{
                                            left: '50%', transform: 'translateX(-50%)',
                                            color: 'white', fontWeight: 600, fontSize: '0.7rem'
                                        }}>
                                            {latesPct > 0 ? `${Math.round(latesPct)}%` : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="stat-row">
                                    <div className="stat-label">
                                        <span>LEAVES</span>
                                        <span className={emp.stats.leaves >= emp.stats.leavesLimit ? 'limit-reached' : ''}>
                                            {emp.stats.leaves >= emp.stats.leavesLimit ? '5/5 LIMIT REACHED' : `${emp.stats.leaves}/5`}
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="fill" style={{
                                            width: `${leavesPct}%`,
                                            background: '#60a5fa' // Lighter blue for leaves
                                        }}></div>
                                        <span className="pct-text" style={{
                                            left: '50%', transform: 'translateX(-50%)',
                                            color: 'white', fontWeight: 600, fontSize: '0.7rem'
                                        }}>
                                            {leavesPct > 0 ? `${Math.round(leavesPct)}%` : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="actions-section">
                                <button className="btn-notify" onClick={() => handleAction('Notify Manager', `${emp.first_name} ${emp.last_name}`)}>
                                    <span>📢</span> Notify Manager
                                </button>
                                <div className="btn-group">
                                    <button className="btn-meeting" onClick={() => handleAction('Meeting', `${emp.first_name} ${emp.last_name}`)}>
                                        <span>📅</span> Meeting
                                    </button>
                                    <button className="btn-notice" onClick={() => handleAction('Send Notice', `${emp.first_name} ${emp.last_name}`)}>
                                        Send Notice
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Batch Actions */}
            {selectedIds.size > 0 && (
                <div className="batch-actions-bar">
                    <span className="count">{selectedIds.size} selected for batch actions</span>
                    <div className="divider"></div>
                    <button className="batch-btn" onClick={() => handleAction('Batch Notice')}>Batch Notice</button>
                    <button className="batch-btn primary" onClick={() => handleAction('Batch Notify Managers')}>Notify Managers</button>
                </div>
            )}

            <style jsx>{`
                .critical-attendance-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #f8fafc; /* Matches dashboard bg usually */
                    padding: 0;
                    overflow: hidden;
                }
                
                .ca-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 20px;
                    flex-shrink: 0;
                }
                .title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 4px 0;
                }
                .subtitle {
                    font-size: 0.85rem;
                    color: #64748b;
                    margin: 0;
                }

                .ca-controls {
                    display: flex;
                    gap: 12px;
                }
                .search-box {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 250px;
                }
                .search-box input {
                    border: none;
                    outline: none;
                    font-size: 0.85rem;
                    width: 100%;
                    color: #334155;
                }
                .filter-btn {
                    background: #eff6ff;
                    color: #3b82f6;
                    border: 1px solid #dbeafe;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                }

                .ca-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 16px;
                    overflow-y: auto;
                    padding-right: 4px; /* Space for scrollbar */
                    padding-bottom: 80px; /* Space for floating bar */
                }

                .emp-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border: 1px solid #e2e8f0;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.2s;
                    position: relative;
                }
                .emp-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }
                .emp-card.selected {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }

                .card-top {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .emp-profile {
                    display: flex;
                    gap: 12px;
                }
                .avatar {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 1rem;
                }
                .info h4 {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                .role {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-top: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 130px;
                }
                .checkbox-wrapper input {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    border-radius: 4px;
                    border: 2px solid #cbd5e1;
                }

                .stats-section {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .stat-row {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .stat-label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                    letter-spacing: 0.05em;
                }
                .limit-reached {
                    color: #2563eb;
                }
                .progress-bar {
                    height: 24px;
                    background: #f1f5f9;
                    border-radius: 12px;
                    position: relative;
                    overflow: hidden;
                }
                .fill {
                    height: 100%;
                    border-radius: 12px;
                    transition: width 0.5s ease-out;
                }
                .pct-text {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%) translateX(-50%);
                    z-index: 2;
                }

                .actions-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-top: auto;
                }
                .btn-notify {
                    width: 100%;
                    padding: 10px;
                    background: #f59e0b;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 0.85rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: background 0.2s;
                }
                .btn-notify:hover { background: #d97706; }

                .btn-group {
                    display: flex;
                    gap: 10px;
                }
                .btn-meeting {
                    flex: 1;
                    padding: 8px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.8rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .btn-meeting:hover { background: #2563eb; }

                .btn-notice {
                    flex: 1;
                    padding: 8px;
                    background: #f1f5f9;
                    color: #475569;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.8rem;
                    cursor: pointer;
                }
                .btn-notice:hover { background: #e2e8f0; }

                .batch-actions-bar {
                    position: absolute;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    padding: 0 8px;
                    border-radius: 50px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    height: 56px;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid #e2e8f0;
                    z-index: 100;
                }
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .batch-actions-bar .count {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #334155;
                    padding: 0 20px;
                }
                .divider {
                    width: 1px;
                    height: 24px;
                    background: #e2e8f0;
                    margin-right: 8px;
                }
                .batch-btn {
                    height: 40px;
                    padding: 0 20px;
                    border-radius: 20px;
                    border: none;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    background: transparent;
                    color: #3b82f6;
                    margin-right: 4px;
                }
                .batch-btn:hover { background: #eff6ff; }
                .batch-btn.primary {
                    background: #fcd34d;
                    color: #92400e;
                }
                .batch-btn.primary:hover { background: #fbbf24; }

                /* Scrollbar */
                .ca-grid::-webkit-scrollbar { width: 6px; }
                .ca-grid::-webkit-scrollbar-track { background: transparent; }
                .ca-grid::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}
