'use client';

import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format, differenceInMinutes, parse } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
interface AttendanceRecord {
    id?: number;
    employee_id: number;
    employee_name?: string;
    department?: string;
    position?: string;
    date: string;
    // Legacy fields
    time_in?: string;
    time_out?: string;
    // 4-Checkpoint fields
    morning_in?: string;
    morning_out?: string;
    afternoon_in?: string;
    afternoon_out?: string;
    morning_hours?: number;
    afternoon_hours?: number;
    total_hours?: number;
    status: 'Present' | 'Late' | 'Absent' | 'Half-Day' | 'On Leave' | 'No Work' | 'Sick Leave' | 'Vacation Leave' | 'Birthday Leave' | 'Official Business' | 'Holiday';
    remarks?: string;
    is_locked?: boolean;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    branch?: string;
    position?: string;
    employment_status?: string;
}

// --- Icons ---
const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const CalendarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);

const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

const MoreVerticalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="5" r="1"></circle>
        <circle cx="12" cy="19" r="1"></circle>
    </svg>
);

// --- Components ---
const MetricCard = ({ title, value, icon, color, trend }: { title: string, value: string | number, icon: any, color: string, trend?: string }) => (
    <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        flex: 1,
        minWidth: '140px'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: '#1f2937' }}>{value}</span>
            {trend && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>{trend}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
            <span style={{ color }}>{icon}</span> {title}
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    let styles = { bg: '#f3f4f6', color: '#4b5563', icon: '•' };

    switch (status) {
        case 'Present':
            styles = { bg: '#dcfce7', color: '#16a34a', icon: '✔' };
            break;
        case 'Absent':
            styles = { bg: '#fee2e2', color: '#dc2626', icon: '✖' };
            break;
        case 'Late':
            styles = { bg: '#fff7ed', color: '#ea580c', icon: 'â°' };
            break;
        case 'Half-Day':
            styles = { bg: '#fef3c7', color: '#d97706', icon: '🌓' };
            break;
        case 'On Leave':
            styles = { bg: '#e0e7ff', color: '#4f46e5', icon: '📅' };
            break;
        case 'No Work':
            styles = { bg: '#f3f4f6', color: '#9ca3af', icon: '🛑' };
            break;
        case 'Sick Leave':
            styles = { bg: '#fee2e2', color: '#b91c1c', icon: '🤒' };
            break;
        case 'Vacation Leave':
            styles = { bg: '#ecfdf5', color: '#047857', icon: 'ðŸ–ï¸' };
            break;
        case 'Birthday Leave':
            styles = { bg: '#fdf2f8', color: '#be185d', icon: '🎂' };
            break;
        case 'Official Business':
            styles = { bg: '#eff6ff', color: '#1d4ed8', icon: '💼' };
            break;
        case 'Holiday':
            styles = { bg: '#faf5ff', color: '#7e22ce', icon: '🎉' };
            break;
    }

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: styles.bg,
            color: styles.color
        }}>
            {styles.icon} {status}
        </span>
    );
};

// Checkpoint Cell Component
const CheckpointCell = ({ time, label }: { time?: string, label: string }) => {
    const formatTime = (t?: string) => {
        if (!t) return null;
        try {
            const [hours, minutes] = t.split(':');
            const h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        } catch {
            return t;
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            minWidth: '60px'
        }}>
            <span style={{
                fontSize: '0.6rem',
                color: '#9ca3af',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: '0.125rem'
            }}>{label}</span>
            {time ? (
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#16a34a',
                    background: '#dcfce7',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '4px'
                }}>{formatTime(time)}</span>
            ) : (
                <span style={{
                    fontSize: '0.75rem',
                    color: '#d1d5db',
                    fontWeight: 500
                }}>--:--</span>
            )}
        </div>
    );
};

export default function AttendancePage() {
    // --- State ---
    const today = new Date();
    const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));

    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Editing State
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Filter State
    const [branches, setBranches] = useState<string[]>([]);
    const [filterBranch, setFilterBranch] = useState('');

    // User State
    const [user, setUser] = useState<any>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [leaveBalance, setLeaveBalance] = useState<number | null>(null);
    const [latesCount, setLatesCount] = useState<number | null>(null);

    const [departments, setDepartments] = useState<string[]>([]);
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // --- Effects ---
    useEffect(() => {
        if (editingRecord?.employee_id) {
            const sessionId = localStorage.getItem('sessionId');
            fetch(`/api/employees?id=${editingRecord.employee_id}`, {
                headers: { 'x-session-id': sessionId || '' }
            })
                .then(res => res.json())
                .then(data => {
                    setLeaveBalance(data.leave_balance !== undefined ? data.leave_balance : null);
                    setLatesCount(data.lates_this_month !== undefined ? data.lates_this_month : 0);
                })
                .catch(() => {
                    setLeaveBalance(null);
                    setLatesCount(null);
                });
        } else {
            setLeaveBalance(null);
            setLatesCount(null);
        }
    }, [editingRecord?.employee_id]);
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        fetchEmployees();
        fetchBranches();
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (user && user.role === 'HR' && user.assigned_branch) {
            setFilterBranch(user.assigned_branch);
        }
    }, [user]);

    useEffect(() => {
        fetchAttendance();
    }, [startDate, endDate, filterBranch]);

    useEffect(() => {
        applyFilters();
    }, [attendance, searchTerm, employees, filterBranch, filterDepartment, filterStatus]);

    // --- Data Fetching ---
    const fetchEmployees = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/employees', {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
            if (!res.ok) {
                console.error('Failed to fetch employees');
                setEmployees([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setEmployees(data);
            } else {
                console.error('Employees data is not an array:', data);
                setEmployees([]);
            }
        } catch (err) {
            console.error(err);
            setEmployees([]);
        }
    };

    const fetchBranches = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees/branches', {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (!response.ok) {
                setBranches([]);
                return;
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                setBranches(data);
            } else {
                setBranches([]);
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
            setBranches([]);
        }
    };

    const fetchDepartments = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees/departments', {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (!response.ok) {
                setDepartments([]);
                return;
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                setDepartments(data);
            } else {
                setDepartments([]);
            }
        } catch (error) {
            console.error('Failed to fetch departments:', error);
            setDepartments([]);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?start_date=${startDate}&end_date=${endDate}&branch=${filterBranch}&t=${new Date().getTime()}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (!res.ok) {
                console.error('Failed to fetch attendance');
                setAttendance([]);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setAttendance(data);
            } else {
                console.error('Attendance data is not an array:', data);
                setAttendance([]);
            }
        } catch (err) {
            console.error(err);
            setAttendance([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = Array.isArray(attendance) ? [...attendance] : [];
        const normalize = (b: string | undefined | null) => (b || '').replace(/\s*branch\s*$/i, '').trim().toUpperCase();

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(r => {
                const emp = employees.find(e => String(e.id) === String(r.employee_id));
                const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
                const status = r.status ? r.status.toLowerCase() : '';
                const dept = emp?.department?.toLowerCase() || '';
                return name.includes(lower) || status.includes(lower) || dept.includes(lower);
            });
        }

        if (user?.role === 'Employee') {
            result = result.filter(r => String(r.employee_id) === String(user.employee_id));
        }

        if (user?.role === 'HR' && user.assigned_branch) {
            const normalizedAssigned = normalize(user.assigned_branch);
            result = result.filter(r => {
                const emp = employees.find(e => String(e.id) === String(r.employee_id));
                return normalize(emp?.branch) === normalizedAssigned;
            });
        }

        // --- Restored UI Filters ---
        if (filterBranch && filterBranch !== 'All Branches' && user?.role !== 'HR') {
            const normalizedFilter = normalize(filterBranch);
            result = result.filter(r => {
                const emp = employees.find(e => String(e.id) === String(r.employee_id));
                return normalize(emp?.branch) === normalizedFilter;
            });
        }

        if (filterDepartment && filterDepartment !== 'All Departments') {
            result = result.filter(r => {
                const emp = employees.find(e => String(e.id) === String(r.employee_id));
                return emp?.department === filterDepartment;
            });
        }

        if (filterStatus && filterStatus !== 'All Statuses') {
            result = result.filter(r => r.status === filterStatus);
        }

        const enriched = result.map(r => {
            const emp = employees.find(e => String(e.id) === String(r.employee_id));
            return {
                ...r,
                employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                department: emp?.department || '',
                position: emp?.position || '',
                branch: emp?.branch || ''
            };
        });

        setFilteredAttendance(enriched);
        setCurrentPage(1); // Reset to first page when any filter changes
    };

    // --- Helpers ---
    const calculateTotalHours = (record: AttendanceRecord) => {
        if (record.total_hours) {
            return `${Number(record.total_hours).toFixed(1)}h`;
        }
        // Fallback to legacy calculation
        if (!record.time_in || !record.time_out) return '--';
        try {
            const start = parse(record.time_in, 'HH:mm', new Date());
            const end = parse(record.time_out, 'HH:mm', new Date());
            const diff = differenceInMinutes(end, start);
            if (isNaN(diff)) return '--';
            const hours = (diff / 60).toFixed(1);
            return `${hours}h`;
        } catch {
            return '--';
        }
    };

    // --- Actions ---
    const handleAdd = () => {
        setEditingRecord({
            employee_id: 0,
            date: startDate, // Sync with chosen date filter
            status: 'Present',
            remarks: ''
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    date: editingRecord.date,
                    records: [{
                        ...editingRecord,
                        // Include 4-checkpoint fields
                        morning_in: editingRecord.morning_in,
                        morning_out: editingRecord.morning_out,
                        afternoon_in: editingRecord.afternoon_in,
                        afternoon_out: editingRecord.afternoon_out
                    }]
                })
            });

            if (res.ok) {
                alert('Record updated successfully');
                setIsEditModalOpen(false);
                fetchAttendance();
            } else {
                alert('Failed to update record');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating record');
        }
    };

    const handleDelete = async (id?: number) => {
        if (!id) return;
        if (!confirm('Are you sure you want to delete this attendance record?')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/attendance?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                fetchAttendance();
            } else {
                alert('Failed to delete');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateReport = () => {
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text(`Attendance Report (4-Checkpoint)`, 14, 20);
        doc.setFontSize(12);
        doc.text(`${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`, 14, 28);

        const tableBody = filteredAttendance.map(row => [
            row.employee_name || '',
            row.date,
            row.morning_in || '-',
            row.morning_out || '-',
            row.afternoon_in || '-',
            row.afternoon_out || '-',
            row.total_hours ? `${Number(row.total_hours).toFixed(1)}h` : '-',
            row.status,
            row.remarks || ''
        ]);

        autoTable(doc, {
            head: [['Employee', 'Date', 'AM In', 'AM Out', 'PM In', 'PM Out', 'Total', 'Status', 'Remarks']],
            body: tableBody,
            startY: 35,
            styles: { fontSize: 8 }
        });

        doc.save('attendance_report_4checkpoint.pdf');
    };

    const handleEditChange = (field: keyof AttendanceRecord, value: string) => {
        if (!editingRecord) return;

        let updates: any = { [field]: value };

        // Auto-detect Status based on Time
        // Rule: 8:01+ = Late, 12:00+ = Half-Day
        if (field === 'morning_in') {
            if (value) {
                if (value >= '12:00') {
                    updates.status = 'Half-Day';
                } else if (value >= '08:01') {
                    updates.status = 'Late';
                } else {
                    updates.status = 'Present';
                }
            } else {
                // If Morning In is cleared
                // If Afternoon In is also empty (checking current state), set Absent
                if (!editingRecord.afternoon_in) {
                    updates.status = 'Absent';
                }
            }
        }

        setEditingRecord(prev => prev ? ({ ...prev, ...updates }) : null);
    };

    // --- Metrics ---
    const stats = {
        total: employees.length,
        present: filteredAttendance.filter(r => r.status === 'Present').length,
        absent: filteredAttendance.filter(r => r.status === 'Absent').length,
        late: filteredAttendance.filter(r => r.status === 'Late').length,
        halfDay: filteredAttendance.filter(r => r.status === 'Half-Day').length,
        onLeave: filteredAttendance.filter(r => r.status === 'On Leave').length,
    };

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredAttendance.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedRecords = filteredAttendance.slice(startIndex, startIndex + rowsPerPage);

    const [viewMode, setViewMode] = useState('list');

    return (
        <DashboardLayout>
            <div style={{ padding: '16px', fontFamily: "'Inter', sans-serif" }}>
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', margin: 0, letterSpacing: '-0.025em' }}>Attendance</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '4px' }}>View and manage daily attendance records.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleAdd}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: '#f97316', color: 'white', border: 'none', // Orange accent from image
                                padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
                                fontSize: '0.875rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <span>+</span> Add Record
                        </button>
                    </div>
                </div>

                {/* Metrics Section - Kept as is, but styled cleaner */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Helper for Metric Cards */}
                    {[
                        { title: "Total Employees", value: stats.total, color: "#f97316", icon: "👥" },
                        { title: "Present", value: stats.present, color: "#10b981", icon: "✅" },
                        { title: "Absent", value: stats.absent, color: "#ef4444", icon: "❌" },
                        { title: "Late", value: stats.late, color: "#f59e0b", icon: "⏰" },
                        { title: "Half-Day", value: stats.halfDay, color: "#a855f7", icon: "🌓" },
                        { title: "On Leave", value: stats.onLeave, color: "#3b82f6", icon: "🏖️" }
                    ].map((m, i) => (
                        <div key={i} style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>{m.value}</span>
                                <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>{m.icon}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>{m.title}</div>
                        </div>
                    ))}
                </div>

                {/* Main Content Card (Toolbar + Table) */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                    {/* Toolbar Styled to match image */}
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316' }}>
                            <span style={{ background: '#fff7ed', padding: '8px', borderRadius: '8px' }}>👤</span>
                            <span style={{ fontWeight: 600, color: '#1f2937' }}>Attendance List</span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* View Toggle */}
                            <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                                <button
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: viewMode === 'list' ? 'white' : 'transparent',
                                        boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                        color: viewMode === 'list' ? '#f97316' : '#6b7280', fontWeight: 600, fontSize: '0.875rem'
                                    }}
                                >
                                    List View
                                </button>
                                <button
                                    onClick={() => setViewMode('card')}
                                    style={{
                                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                        background: viewMode === 'card' ? '#f97316' : 'transparent',
                                        boxShadow: viewMode === 'card' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                        color: viewMode === 'card' ? 'white' : '#6b7280', fontWeight: 600, fontSize: '0.875rem'
                                    }}
                                >
                                    Card View
                                </button>
                            </div>

                            {/* Search */}
                            <div style={{ position: 'relative', width: '240px' }}>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        fontSize: '0.875rem',
                                        background: '#f9fafb'
                                    }}
                                />
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>🔍</span>
                            </div>

                            {/* Filter Button */}
                            <button style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 16px', borderRadius: '8px',
                                border: '1px solid #e5e7eb', background: 'white',
                                fontSize: '0.875rem', fontWeight: 600, color: '#4b5563',
                                cursor: 'pointer'
                            }}>
                                <span>⚙️</span> Filter
                            </button>

                            {/* Sort Button */}
                            <button style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 16px', borderRadius: '8px',
                                border: '1px solid #e5e7eb', background: 'white',
                                fontSize: '0.875rem', fontWeight: 600, color: '#4b5563',
                                cursor: 'pointer'
                            }}>
                                <span>⇅</span> Sort
                            </button>

                            <button
                                onClick={handleGenerateReport}
                                style={{
                                    padding: '10px 16px', borderRadius: '8px',
                                    border: '1px solid #e5e7eb', background: 'white',
                                    fontSize: '0.875rem', fontWeight: 600, color: '#4b5563',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <DownloadIcon /> Export
                            </button>
                        </div>
                    </div>


                    {/* Secondary Filters for functionality (Keeping functional "arrangement") */}
                    <div style={{ padding: '8px 16px', background: '#fcfcfc', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', overflowX: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Date:</span>
                            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setEndDate(e.target.value) }} style={{ border: 'none', fontSize: '0.875rem' }} />
                        </div>
                        {user?.role !== 'Employee' && (
                            <>
                                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} disabled={user?.role === 'HR'}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', background: 'white' }}>
                                    {user?.role !== 'HR' && <option value="">All Branches</option>}
                                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
                                    style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', background: 'white' }}>
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </>
                        )}
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', background: 'white' }}>
                            <option value="">All Status</option>
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>

                    {/* Content Area */}
                    {loading ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
                    ) : paginatedRecords.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No records found.</div>
                    ) : viewMode === 'list' ? (
                        /* LIST VIEW TABLE */
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>AM Checkpoints</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>PM Checkpoints</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRecords.map((record, idx) => (
                                        <tr key={idx} style={{ transition: 'background-color 0.2s' }} className="hover:bg-gray-50">
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px', height: '40px', borderRadius: '50%',
                                                        background: '#e0e7ff', color: '#4338ca',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: '0.875rem'
                                                    }}>
                                                        {record.employee_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'E'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>{record.employee_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{record.department || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#4b5563', fontSize: '0.875rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '1rem', color: '#9ca3af' }}>📅</span>
                                                    {format(new Date(record.date), 'MMM dd, yyyy')}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>In</span>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{record.morning_in || '--:--'}</span>
                                                    </div>
                                                    <div style={{ width: '1px', height: '24px', background: '#e5e7eb' }}></div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Out</span>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{record.morning_out || '--:--'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>In</span>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{record.afternoon_in || '--:--'}</span>
                                                    </div>
                                                    <div style={{ width: '1px', height: '24px', background: '#e5e7eb' }}></div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' }}>Out</span>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>{record.afternoon_out || '--:--'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                                {/* Styled Badge */}
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', padding: '4px 12px',
                                                    borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                                                    background: record.status === 'Present' ? '#ecfdf5' : record.status === 'Absent' ? '#fef2f2' : '#fff7ed',
                                                    color: record.status === 'Present' ? '#059669' : record.status === 'Absent' ? '#dc2626' : '#d97706'
                                                }}>
                                                    <span style={{
                                                        width: '6px', height: '6px', borderRadius: '50%',
                                                        marginRight: '6px',
                                                        background: 'currentColor'
                                                    }}></span>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => { setEditingRecord({ ...record }); setIsEditModalOpen(true); }}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}
                                                >
                                                    ✏️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* CARD VIEW GRID */
                        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                            {paginatedRecords.map((record, idx) => (
                                <div key={idx} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '16px',
                                    padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
                                    transition: 'box-shadow 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            background: record.status === 'Present' ? '#ecfdf5' : record.status === 'Absent' ? '#fef2f2' : '#fff7ed',
                                            color: record.status === 'Present' ? '#059669' : record.status === 'Absent' ? '#dc2626' : '#d97706'
                                        }}>
                                            {record.status}
                                        </span>
                                        <button onClick={() => { setEditingRecord({ ...record }); setIsEditModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>⋮</button>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '56px', height: '56px', borderRadius: '50%',
                                            background: '#e0e7ff', color: '#4338ca',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '1.25rem'
                                        }}>
                                            {record.employee_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'E'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{record.employee_name}</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{record.department}</div>
                                        </div>
                                    </div>

                                    <div style={{ height: '1px', background: '#f3f4f6', margin: '0 -20px' }}></div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Date</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{format(new Date(record.date), 'MMM dd, yyyy')}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Payroll Code</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{record.employee_id || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', background: '#f9fafb', borderRadius: '8px', padding: '12px', justifyContent: 'space-around' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>AM In</div>
                                            <div style={{ fontWeight: 700, color: '#111827' }}>{record.morning_in || '-'}</div>
                                        </div>
                                        <div style={{ width: '1px', background: '#e5e7eb' }}></div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '2px' }}>PM Out</div>
                                            <div style={{ fontWeight: 700, color: '#111827' }}>{record.afternoon_out || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer / Pagination matching image */}
                    <div style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        borderTop: '1px solid #f3f4f6'
                    }}>
                        <div>
                            Showing {Math.min(startIndex + 1, filteredAttendance.length)} to {Math.min(startIndex + rowsPerPage, filteredAttendance.length)} of {filteredAttendance.length} entries
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>{"<"}</button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = i + 1;
                                return (
                                    <button key={p}
                                        onClick={() => setCurrentPage(p)}
                                        style={{
                                            width: '32px', height: '32px',
                                            border: p === currentPage ? '1px solid #f97316' : '1px solid #e5e7eb',
                                            background: p === currentPage ? '#fff7ed' : 'white',
                                            color: p === currentPage ? '#f97316' : '#6b7280',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: p === currentPage ? 700 : 400
                                        }}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>{">"}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal remains unchanged */}
            {isEditModalOpen && editingRecord && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px', padding: '24px',
                        width: '90%', maxWidth: '500px',
                        maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#1f2937' }}>
                            {editingRecord.id ? 'Edit Attendance' : 'Add Checkpoints'}
                        </h2>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {/* Employee Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Employee</label>
                                {editingRecord.id ? (
                                    <input type="text" value={editingRecord.employee_name || ''} disabled style={{ width: '100%', padding: '0.5rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#6b7280' }} />
                                ) : (
                                    <select
                                        value={editingRecord.employee_id || ''}
                                        onChange={e => {
                                            const empId = Number(e.target.value);
                                            const emp = employees.find(em => em.id === empId);
                                            setEditingRecord(prev => prev ? ({
                                                ...prev,
                                                employee_id: empId,
                                                employee_name: emp ? `${emp.first_name} ${emp.last_name}` : ''
                                            }) : null);
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                    >
                                        <option value="">Select Employee</option>
                                        {employees
                                            .filter(emp => emp.employment_status !== 'Resigned' && emp.employment_status !== 'Terminated')
                                            .map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                                            ))}
                                    </select>
                                )}
                                {leaveBalance !== null && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: leaveBalance > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                        Remaining Leave Balance: {leaveBalance} days
                                    </div>
                                )}
                                {latesCount !== null && (
                                    <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: latesCount >= 5 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                                        Lates This Month: {latesCount}
                                        {latesCount >= 5 && <span style={{ marginLeft: '0.5rem', background: '#fee2e2', color: '#dc2626', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.7rem' }}>âš ï¸ Warning: Excessive</span>}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Date</label>
                                <input
                                    type="date"
                                    value={editingRecord.date || ''}
                                    onChange={e => handleEditChange('date', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        backgroundColor: !editingRecord.id ? '#f9fafb' : 'white'
                                    }}
                                />
                                {!editingRecord.id && <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>Inherited from your active date filter.</div>}
                            </div>

                            {/* 4 Checkpoints */}
                            <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>Checkpoints</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#059669', marginBottom: '0.25rem' }}>🌅 Morning In</label>
                                        <input
                                            type="time"
                                            autoFocus={!editingRecord.id}
                                            value={editingRecord.morning_in || ''}
                                            onChange={e => handleEditChange('morning_in', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#0891b2', marginBottom: '0.25rem' }}>☀️ Morning Out</label>
                                        <input
                                            type="time"
                                            value={editingRecord.morning_out || ''}
                                            onChange={e => handleEditChange('morning_out', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', marginBottom: '0.25rem' }}>🌤️ Afternoon In</label>
                                        <input
                                            type="time"
                                            value={editingRecord.afternoon_in || ''}
                                            onChange={e => handleEditChange('afternoon_in', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: '#c026d3', marginBottom: '0.25rem' }}>🌙 Afternoon Out</label>
                                        <input
                                            type="time"
                                            value={editingRecord.afternoon_out || ''}
                                            onChange={e => handleEditChange('afternoon_out', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Status</label>
                                <select
                                    value={editingRecord.status || 'Present'}
                                    onChange={e => handleEditChange('status', e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                >
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Half-Day">Half-Day</option>
                                    <option value="On Leave">On Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Vacation Leave">Vacation Leave</option>
                                    <option value="Birthday Leave">Birthday Leave</option>
                                    <option value="Official Business">Official Business</option>
                                    <option value="Holiday">Holiday</option>
                                    <option value="No Work">No Work</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Remarks</label>
                                <textarea
                                    value={editingRecord.remarks || ''}
                                    onChange={e => handleEditChange('remarks', e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={editingRecord.is_locked}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: editingRecord.is_locked ? '#9ca3af' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: editingRecord.is_locked ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
            `}</style>
        </DashboardLayout>
    );
}
