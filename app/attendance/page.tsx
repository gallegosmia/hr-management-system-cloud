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
    time_in?: string;
    time_out?: string;
    status: 'Present' | 'Late' | 'Absent' | 'Half-Day' | 'On Leave' | 'No Work';
    remarks?: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    branch?: string;
    position?: string; // Added for display
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
            styles = { bg: '#fff7ed', color: '#ea580c', icon: '⏰' }; // Orange-ish
            break;
        case 'Half-Day':
            styles = { bg: '#dbeafe', color: '#2563eb', icon: '🌓' };
            break;
        case 'On Leave':
            styles = { bg: '#e0e7ff', color: '#4f46e5', icon: '📅' };
            break;
        case 'No Work':
            styles = { bg: '#f3f4f6', color: '#9ca3af', icon: '🛑' };
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

export default function AttendancePage() {
    // --- State ---
    const today = new Date();
    const [startDate, setStartDate] = useState(format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')); // Start of month
    const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd')); // Today

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

    // --- Effects ---
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));

        if (userData) setUser(JSON.parse(userData));

        fetchEmployees();
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [startDate, endDate]);

    useEffect(() => {
        applyFilters();
    }, [attendance, searchTerm, employees, filterBranch]);

    // --- Data Fetching ---
    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            // Map basic data
            const activeEmployees = data.filter((emp: any) =>
                emp.employment_status !== 'Resigned' && emp.employment_status !== 'Terminated'
            );
            setEmployees(activeEmployees);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await fetch('/api/employees/branches');
            const data = await response.json();
            setBranches(data);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/attendance?start_date=${startDate}&end_date=${endDate}`);
            const data = await res.json();
            setAttendance(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...attendance];

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(r => {
                const emp = employees.find(e => e.id === r.employee_id);
                const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
                return name.includes(lower) || r.status.toLowerCase().includes(lower);
            });
        }

        if (filterBranch) {
            result = result.filter(r => {
                const emp = employees.find(e => e.id === r.employee_id);
                return emp?.branch === filterBranch;
            });
        }

        // Enrich with employee details for display if missing in record
        const enriched = result.map(r => {
            const emp = employees.find(e => e.id === r.employee_id);
            return {
                ...r,
                employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                department: emp?.department || '',
                position: emp?.position || ''
            };
        });

        setFilteredAttendance(enriched);
    };

    // --- Helpers ---
    const calculateSpent = (inTime?: string, outTime?: string) => {
        if (!inTime || !outTime) return '--';
        try {
            const start = parse(inTime, 'HH:mm', new Date());
            const end = parse(outTime, 'HH:mm', new Date());
            const diff = differenceInMinutes(end, start);
            if (isNaN(diff)) return '--';

            const hours = Math.floor(diff / 60);
            const minutes = diff % 60;
            return `${hours}h : ${minutes}m`;
        } catch {
            return '--';
        }
    };

    // --- Actions ---
    const handleSaveEdit = async () => {
        if (!editingRecord) return;

        try {
            // Re-use bulk save POST logic but for single record
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: editingRecord.date,
                    records: [editingRecord]
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
            const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' });
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
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text(`Attendance Report`, 14, 20);
        doc.setFontSize(12);
        doc.text(`${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`, 14, 28);

        const tableBody = filteredAttendance.map(row => [
            row.employee_name || '',
            row.date,
            row.time_in || '-',
            row.time_out || '-',
            row.status,
            row.remarks || ''
        ]);

        autoTable(doc, {
            head: [['Employee', 'Date', 'In', 'Out', 'Status', 'Remarks']],
            body: tableBody,
            startY: 35,
            styles: { fontSize: 8 }
        });

        doc.save('attendance_report.pdf');
    };

    const handleEditChange = (field: keyof AttendanceRecord, value: string) => {
        if (!editingRecord) return;

        const updated = { ...editingRecord, [field]: value };

        // Auto status logic (Preserve existing logic)
        if (field === 'time_in' && value) {
            const timeIn = new Date(`2000-01-01 ${value}`);
            const cutoff = new Date(`2000-01-01 08:00`);
            if (timeIn > cutoff) {
                updated.status = 'Late';
            } else if (updated.status === 'Absent' || updated.status === 'Late') {
                updated.status = 'Present';
            }
        }

        setEditingRecord(updated);
    };

    // --- Metrics ---
    const stats = {
        total: employees.length, // Total Active Employees
        present: filteredAttendance.filter(r => r.status === 'Present').length,
        absent: filteredAttendance.filter(r => r.status === 'Absent').length,
        remote: 0, // Placeholder
        late: filteredAttendance.filter(r => r.status === 'Late').length,
        halfLeave: filteredAttendance.filter(r => r.status === 'Half-Day').length,
        onLeave: filteredAttendance.filter(r => r.status === 'On Leave').length,
    };

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredAttendance.length / rowsPerPage);
    const paginatedRecords = filteredAttendance.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <DashboardLayout>
            <div style={{ padding: '0.5rem' }}>

                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Attendance</h1>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                                    borderRadius: '9999px', border: '1px solid #e5e7eb', outline: 'none', width: '200px'
                                }}
                            />
                        </div>

                        {/* Branch Filter */}
                        <div style={{ position: 'relative' }}>
                            <select
                                value={filterBranch}
                                onChange={(e) => setFilterBranch(e.target.value)}
                                style={{
                                    paddingLeft: '1rem', paddingRight: '2rem', paddingTop: '0.5rem', paddingBottom: '0.5rem',
                                    borderRadius: '9999px', border: '1px solid #e5e7eb', outline: 'none', appearance: 'none',
                                    backgroundColor: 'white', color: filterBranch ? '#1f2937' : '#9ca3af', fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">All Branches</option>
                                {branches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}>
                                ▼
                            </div>
                        </div>

                        {/* Date Range */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', border: '1px solid #e5e7eb' }}>
                            <CalendarIcon />
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.875rem', color: '#4b5563' }}
                            />
                            <span style={{ color: '#9ca3af' }}>–</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.875rem', color: '#4b5563' }}
                            />
                        </div>

                        {/* Generate Report */}
                        <button
                            onClick={handleGenerateReport}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                backgroundColor: '#facc15', color: '#422006', fontWeight: 600,
                                padding: '0.5rem 1.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(250, 204, 21, 0.2)'
                            }}
                        >
                            <DownloadIcon /> Generate Report
                        </button>
                    </div>
                </div>

                {/* Metrics Section */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    <MetricCard title="Total Employees" value={stats.total} icon="👥" color="#d97706" trend="+12.9%" />
                    <MetricCard title="Present" value={stats.present} icon="✔" color="#059669" trend="+43.6%" />
                    <MetricCard title="Absent" value={stats.absent} icon="✖" color="#dc2626" trend="+56.4%" />
                    <MetricCard title="Remote" value={stats.remote} icon="🏠" color="#7c3aed" trend="+23.9%" />
                    <MetricCard title="Late" value={stats.late} icon="⏰" color="#d97706" trend="+29.3%" />
                    <MetricCard title="Half Leave" value={stats.halfLeave} icon="🌓" color="#c026d3" trend="+3.4%" />
                    <MetricCard title="On Leave" value={stats.onLeave} icon="📅" color="#2563eb" trend="+12.9%" />
                </div>

                {/* Table Section */}
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: 'white', borderBottom: '1px solid #f3f4f6' }}>
                                <tr>
                                    {['Employee Name', 'Date', 'Check In', 'Check Out', 'Spent', 'Status', 'Remarks', 'Action'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                                ) : paginatedRecords.length === 0 ? (
                                    <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No attendance records found for this period.</td></tr>
                                ) : (
                                    paginatedRecords.map((record, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.2s' }} className="hover:bg-gray-50">
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>
                                                        {record.employee_name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'E'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>{record.employee_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{record.position || record.department || 'Employee'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem' }}>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                                            <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937' }}>{record.time_in || '--'}</td>
                                            <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937' }}>{record.time_out || '--'}</td>
                                            <td style={{ padding: '1rem', color: '#4b5563' }}>{calculateSpent(record.time_in, record.time_out)}</td>
                                            <td style={{ padding: '1rem' }}><StatusBadge status={record.status} /></td>
                                            <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {record.remarks || '-'}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="dropdown" style={{ position: 'relative', display: 'inline-block' }}>
                                                    <button
                                                        className="action-btn"
                                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem' }}
                                                        onClick={(e) => {
                                                            const menu = e.currentTarget.nextElementSibling as HTMLElement;
                                                            // Simple toggle logic, better handled by state but keeping it lightweight
                                                            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';

                                                            // Close others
                                                            document.querySelectorAll('.action-menu').forEach(el => {
                                                                if (el !== menu) (el as HTMLElement).style.display = 'none';
                                                            });
                                                        }}
                                                    >
                                                        <MoreVerticalIcon />
                                                    </button>
                                                    <div className="action-menu" style={{
                                                        display: 'none',
                                                        position: 'absolute', right: 0, top: '100%',
                                                        backgroundColor: 'white', minWidth: '120px',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                                        borderRadius: '8px', zIndex: 10, overflow: 'hidden',
                                                        border: '1px solid #f3f4f6'
                                                    }}>
                                                        <button
                                                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}
                                                            onClick={(e) => {
                                                                // Open details (reuse edit modal in read-only or similar)
                                                                setEditingRecord({ ...record });
                                                                setIsEditModalOpen(true);
                                                                (e.target as HTMLElement).parentElement!.style.display = 'none';
                                                            }}
                                                        >
                                                            👁 Details
                                                        </button>
                                                        <button
                                                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#2563eb' }}
                                                            onClick={(e) => {
                                                                setEditingRecord({ ...record });
                                                                setIsEditModalOpen(true);
                                                                (e.target as HTMLElement).parentElement!.style.display = 'none';
                                                            }}
                                                        >
                                                            ✎ Edit
                                                        </button>
                                                        <button
                                                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#dc2626' }}
                                                            onClick={(e) => {
                                                                if (record.id) handleDelete(record.id);
                                                                (e.target as HTMLElement).parentElement!.style.display = 'none';
                                                            }}
                                                        >
                                                            🗑 Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ padding: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredAttendance.length)} of {filteredAttendance.length}
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                style={{ padding: '0.25rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Prev
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        border: '1px solid',
                                        borderColor: currentPage === p ? '#facc15' : '#e5e7eb',
                                        borderRadius: '4px',
                                        background: currentPage === p ? '#facc15' : 'white',
                                        color: currentPage === p ? '#422006' : '#374151',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                style={{ padding: '0.25rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Next
                            </button>
                        </div>
                        <select
                            value={rowsPerPage}
                            onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #e5e7eb' }}
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {
                isEditModalOpen && editingRecord && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Attendance</h3>
                                <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Employee</label>
                                    <input type="text" value={editingRecord.employee_name} disabled style={{ width: '100%', padding: '0.5rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Check In</label>
                                        <input
                                            type="time"
                                            value={editingRecord.time_in || ''}
                                            onChange={e => handleEditChange('time_in', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Check Out</label>
                                        <input
                                            type="time"
                                            value={editingRecord.time_out || ''}
                                            onChange={e => handleEditChange('time_out', e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Status</label>
                                    <select
                                        value={editingRecord.status}
                                        onChange={e => handleEditChange('status', e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                    >
                                        <option value="Present">Present</option>
                                        <option value="Late">Late</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Half-Day">Half-Day</option>
                                        <option value="On Leave">On Leave</option>
                                        <option value="No Work">No Work</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Remarks</label>
                                    <textarea
                                        value={editingRecord.remarks || ''}
                                        onChange={e => handleEditChange('remarks', e.target.value)}
                                        rows={3}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleSaveEdit} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Global Styles for Dropdown/Misc */}
            <style jsx>{`
                .hover\\:bg-gray-50:hover { background-color: #f9fafb; }
            `}</style>
        </DashboardLayout >
    );
}
