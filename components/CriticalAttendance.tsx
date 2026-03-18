'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Donut Chart Component
const AttendanceDonut = ({ value, max, color, label }: { value: number, max: number, color: string, label: string }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / max, 1);
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke="#e2e8f0"
                        strokeWidth="6"
                        fill="transparent"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke={color}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-slate-800 leading-none">{value}/{max}</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">LIMIT</span>
                </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 mt-2">{label}</span>
        </div>
    );
};

interface CriticalAttendanceProps {
    employees?: any[];
    attendance?: any[];
    leaves?: any[];
    className?: string;
}

export default function CriticalAttendance({ employees: initialEmployees, attendance, leaves, className }: CriticalAttendanceProps) {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<any[]>([]);
    const [criticalEmployees, setCriticalEmployees] = useState<any[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCount, setFilteredCount] = useState(0);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const processData = (emps: any[], atts: any[], lvs: any[]) => {
        const processed = emps.map((emp: any) => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const employeeAttendance = Array.isArray(atts) ? atts.filter((a: any) => a.employee_id === emp.id) : [];
            const latesCount = employeeAttendance.filter((a: any) => {
                const d = new Date(a.date);
                return d.getMonth() === currentMonth &&
                    d.getFullYear() === currentYear &&
                    (a.status === 'Late' || a.status === 'late');
            }).length;

            const baseCredits = emp.leave_credits !== undefined && emp.leave_credits !== null ? Number(emp.leave_credits) : 5;
            const currentBalance = emp.leave_balance !== undefined && emp.leave_balance !== null ? Number(emp.leave_balance) : baseCredits;
            const leavesCount = Math.max(0, baseCredits - currentBalance);

            return {
                ...emp,
                lates: latesCount,
                leaves: leavesCount
            };
        });

        setEmployees(processed);
        setLoading(false);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');

            const [empRes, attRes, leaveRes] = await Promise.all([
                fetch('/api/employees', { headers: { 'x-session-id': sessionId || '' } }),
                fetch('/api/attendance', { headers: { 'x-session-id': sessionId || '' } }),
                fetch('/api/leave', { headers: { 'x-session-id': sessionId || '' } })
            ]);

            const emps = await empRes.json();
            const atts = await attRes.json();
            const leavesData = await leaveRes.json();

            if (!Array.isArray(emps)) { setEmployees([]); return; }
            processData(emps, atts, leavesData);

        } catch (error) {
            console.error("Dashboard Data Error:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialEmployees && initialEmployees.length > 0) {
            processData(initialEmployees, attendance || [], leaves || []);
        } else {
            fetchData();
        }
    }, [initialEmployees, attendance, leaves]);

    useEffect(() => {
        if (!employees.length) {
            setCriticalEmployees([]);
            return;
        }

        const critical = employees.filter(emp => {
            const isLateCritical = (emp.lates || 0) >= 5;
            const isLeaveCritical = (emp.leaves || 0) >= 5;
            return isLateCritical || isLeaveCritical;
        }).map(emp => ({
            ...emp,
            lates: emp.lates || 0,
            leaves: emp.leaves || 0
        }));

        setCriticalEmployees(critical);
    }, [employees]);

    useEffect(() => {
        let result = [...criticalEmployees];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.first_name?.toLowerCase().includes(q) ||
                e.last_name?.toLowerCase().includes(q) ||
                e.role?.toLowerCase().includes(q)
            );
        }

        setFilteredEmployees(result);
        setFilteredCount(result.length);
    }, [searchQuery, criticalEmployees]);

    const handleBatchWarning = () => {
        alert(`Sending Batch Warning to ${selectedEmployees.length} employees...`);
        setSelectedEmployees([]);
    };

    const handleBatchNotify = () => {
        alert(`Notifying supervisors for ${selectedEmployees.length} employees...`);
        setSelectedEmployees([]);
    };

    const toggleSelection = (id: number) => {
        if (selectedEmployees.includes(id)) {
            setSelectedEmployees(selectedEmployees.filter(x => x !== id));
        } else {
            setSelectedEmployees([...selectedEmployees, id]);
        }
    };

    const handleIssueViolation = async (emp: any, actionType: string) => {
        setOpenMenuId(null);
        if (!confirm(`Are you sure you want to issue a ${actionType} to ${emp.first_name} ${emp.last_name}?`)) return;

        try {
            const payload = actionType === 'Letter of Violation'
                ? {
                    type: 'violation',
                    employee_id: emp.id,
                    violation_type: 'Attendance/Tardiness',
                    severity: 'Major',
                    incident_date: new Date().toISOString().split('T')[0],
                    description: `Issued Letter of Violation due to excessive tardiness (${emp.lates} lates).`,
                    action_taken: actionType,
                    status: 'Active'
                }
                : {
                    type: 'warning',
                    employee_id: emp.id,
                    warning_type: actionType,
                    warning_date: new Date().toISOString().split('T')[0],
                    reason: `Excessive tardiness (${emp.lates} lates accumulation).`,
                    status: 'Active'
                };

            const res = await fetch('/api/employees/violations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`Successfully issued ${actionType} to ${emp.first_name}.`);
            } else {
                const data = await res.json();
                alert(`Failed to issue ${actionType}: ${data.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while issuing the action.');
        }
    };

    return (
        <div className={`flex flex-col h-full space-y-4 ${className || ''}`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-red-500">
                            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </span>
                        Critical Attendance Limits
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Found {filteredCount} employees exceeding or approaching attendance thresholds.
                    </p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600"
                        />
                        <svg className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-4 scrollbar-thin">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-[16px] p-6 border border-slate-100 shadow-sm animate-pulse h-80"></div>
                        ))}
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-[16px] border border-dashed border-slate-200">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">All Good!</h3>
                        <p className="text-sm text-slate-500">No employees have reached critical attendance levels.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredEmployees.map(emp => {
                            const isLateCritical = emp.lates >= 5;
                            const isLeaveCritical = emp.leaves >= 5;
                            const isHighRisk = isLateCritical || isLeaveCritical;

                            return (
                                <div key={emp.id} className="bg-white rounded-[16px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] relative group hover:-translate-y-1 transition-all duration-300">
                                    {/* Red Accent Line */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FF4D4F] rounded-l-[16px]"></div>

                                    <div className="p-4 pl-6">
                                        {/* Card Header with Checkbox & Menu */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#FFF1F0] text-[#FF4D4F]">
                                                    • ACTION REQUIRED
                                                </span>
                                                {/* Selection Checkbox */}
                                                <button
                                                    onClick={() => toggleSelection(emp.id)}
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedEmployees.includes(emp.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-transparent hover:border-blue-400'}`}
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                            </div>
                                            <div className="relative z-20">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === emp.id ? null : emp.id);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded relative z-10"
                                                >
                                                    <svg className="w-6 h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                                                </button>

                                                {openMenuId === emp.id && (
                                                    <>
                                                        {/* Invisible overlay to catch outside clicks */}
                                                        <div
                                                            className="fixed inset-0 z-40"
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                                        />

                                                        {/* Menu items */}
                                                        <div
                                                            className="absolute right-0 top-8 mt-1 w-56 bg-white rounded-lg shadow-2xl py-1 z-[100] border border-slate-200"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disciplinary Actions</span>
                                                            </div>

                                                            <button
                                                                onClick={() => handleIssueViolation(emp, 'Warning Violation')}
                                                                className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700"
                                                                disabled={emp.lates < 5}
                                                                title={emp.lates < 5 ? "Requires at least 5 lates" : ""}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${emp.lates >= 5 ? 'bg-yellow-400' : 'bg-slate-300'}`}></div>
                                                                    Warning Violation
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${emp.lates >= 5 ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>5+ Lates</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleIssueViolation(emp, 'Verbal Warning')}
                                                                className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-600 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700"
                                                                disabled={emp.lates < 10}
                                                                title={emp.lates < 10 ? "Requires at least 10 lates" : ""}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${emp.lates >= 10 ? 'bg-orange-400' : 'bg-slate-300'}`}></div>
                                                                    Verbal Warning
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${emp.lates >= 10 ? 'text-orange-600 bg-orange-50' : 'text-slate-400 bg-slate-100'}`}>10+ Lates</span>
                                                            </button>

                                                            <button
                                                                onClick={() => handleIssueViolation(emp, 'Letter of Violation')}
                                                                className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700"
                                                                disabled={emp.lates <= 10}
                                                                title={emp.lates <= 10 ? "Requires more than 10 lates" : ""}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${emp.lates > 10 ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                                                    Letter of Violation
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${emp.lates > 10 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-100'}`}>&gt;10 Lates</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* User Profile */}
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${emp.first_name} ${emp.last_name}`}
                                                        alt="avatar"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FF4D4F] rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-sm">!</div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{emp.first_name} {emp.last_name}</h3>
                                                <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-wide opacity-80">{emp.role} • {emp.department}</p>
                                            </div>
                                        </div>

                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Attendance Thresholds</h4>

                                        {/* Donut Charts */}
                                        <div className="flex justify-around items-center mb-5">
                                            <AttendanceDonut
                                                value={emp.lates}
                                                max={5}
                                                color="#FF4D4F" // Red
                                                label="Late Arrivals"
                                            />
                                            <AttendanceDonut
                                                value={emp.leaves}
                                                max={5}
                                                color="#FAAD14" // Amber/Yellow
                                                label="Total Leaves"
                                            />
                                        </div>

                                        {/* Critical Warning Box */}
                                        {isHighRisk && (
                                            <div className="bg-[#FFF1F0] rounded-lg p-3 flex gap-2 mb-4 relative overflow-hidden">
                                                <div className="text-[#FF4D4F] mt-0.5 shrink-0 z-10">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </div>
                                                <div className="z-10">
                                                    <h5 className="text-sm font-bold text-[#cf1322]">Critical Threshold Reached</h5>
                                                    <p className="text-xs text-[#cf1322]/80 mt-1 leading-relaxed font-medium">
                                                        This employee has exceeded the allowed attendance policy limits. A formal warning is now mandatory per HR policy.
                                                    </p>
                                                </div>
                                                {/* Decorative Background Icon */}
                                                <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-[#ffccc7] opacity-20 transform rotate-12" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Use Full Width Buttons */}
                                        <div className="flex gap-3 mb-4">
                                            <button
                                                onClick={() => alert(`Warning sent to ${emp.first_name}`)}
                                                className="flex-1 py-2.5 bg-[#1890FF] hover:bg-[#096dd9] text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Send Warning
                                            </button>
                                            <button
                                                onClick={() => alert(`Manager notified for ${emp.first_name}`)}
                                                className="flex-1 py-2.5 bg-[#13C2C2] hover:bg-[#08979c] text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-teal-100"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                                Notify Manager
                                            </button>
                                        </div>

                                        <div className="text-center">
                                            <Link href={`/employees/${emp.id}`} className="text-[11px] text-slate-400 font-bold hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors group-hover:text-blue-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                View Full Employee Records
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Batch Action Bar */}
            {selectedEmployees.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#001529] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-bounce-in border border-slate-800">
                    <span className="font-bold text-sm bg-blue-600 px-2 py-0.5 rounded-md text-white shadow-sm">{selectedEmployees.length} selected</span>
                    <div className="h-5 w-px bg-slate-600 mx-2"></div>
                    <button onClick={handleBatchWarning} className="hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Batch Warning
                    </button>
                    <button onClick={handleBatchNotify} className="hover:text-teal-400 transition-colors flex items-center gap-2 text-sm font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                        Notify Managers
                    </button>
                    <button onClick={() => setSelectedEmployees([])} className="text-slate-500 hover:text-white ml-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
        </div>
    );
}
