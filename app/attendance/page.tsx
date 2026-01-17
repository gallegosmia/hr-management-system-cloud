'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceRecord {
    id?: number;
    employee_id: number;
    employee_name?: string;
    date: string;
    time_in?: string;
    time_out?: string;
    status: 'Present' | 'Late' | 'Absent' | 'Half-Day' | 'On Leave';
    remarks?: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    department: string;
    branch?: string;
}

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [departments, setDepartments] = useState<string[]>([]);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const isEmployee = user?.role === 'Employee';
    const canManageAttendance = user && ['Admin', 'HR', 'Manager', 'President', 'Vice President'].includes(user.role);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (employees.length > 0) {
            fetchAttendance();
        }
    }, [selectedDate, employees]);

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees');
            const data = await response.json();
            const activeEmployees = data.filter((emp: any) =>
                emp.employment_status !== 'Resigned' && emp.employment_status !== 'Terminated'
            );
            setEmployees(activeEmployees);

            if (activeEmployees.length === 0) {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await fetch('/api/employees/departments');
            const data = await response.json();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/attendance?date=${selectedDate}`);
            const data = await response.json();

            // Create attendance records for all employees
            const attendanceMap = new Map<number, AttendanceRecord>();
            data.forEach((att: AttendanceRecord) => {
                attendanceMap.set(att.employee_id, att);
            });

            const allAttendance: AttendanceRecord[] = employees.map(emp => {
                const existing = attendanceMap.get(emp.id);
                if (existing) return existing;

                return {
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`,
                    date: selectedDate,
                    time_in: '',
                    time_out: '',
                    status: 'Absent',
                    remarks: ''
                };
            });

            setAttendance(allAttendance);
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = (employeeId: number, field: string, value: string) => {
        setAttendance(prev => prev.map(att => {
            if (att.employee_id === employeeId) {
                const updated = { ...att, [field]: value };

                // Auto-detect late status
                if (field === 'time_in' && value) {
                    const timeIn = new Date(`2000-01-01 ${value}`);
                    const cutoff = new Date(`2000-01-01 08:01`); // 8:00 AM cutoff

                    if (timeIn > cutoff) {
                        updated.status = 'Late';
                    } else if (updated.status === 'Absent' || updated.status === 'Late') {
                        updated.status = 'Present';
                    }
                }

                return updated;
            }
            return att;
        }));
    };

    const handleClockAction = async (type: 'in' | 'out') => {
        if (!user?.employee_id) {
            alert('Your user account is not linked to an employee record.');
            return;
        }

        setSaving(true);
        try {
            const currentTime = format(new Date(), 'HH:mm');
            const empId = typeof user.employee_id === 'string' ? parseInt(user.employee_id) : user.employee_id;

            // Find current record
            const currentRecord = attendance.find(a => a.employee_id === empId);

            const record = {
                employee_id: empId,
                date: selectedDate,
                time_in: type === 'in' ? currentTime : (currentRecord?.time_in || ''),
                time_out: type === 'out' ? currentTime : (currentRecord?.time_out || ''),
                status: currentRecord?.status || 'Present',
                remarks: currentRecord?.remarks || ''
            };

            // If clocking in, auto-calculate status
            if (type === 'in') {
                const cutoff = new Date(`2000-01-01 08:01`);
                const timeIn = new Date(`2000-01-01 ${currentTime}`);
                if (timeIn > cutoff) {
                    record.status = 'Late';
                } else {
                    record.status = 'Present';
                }
            }

            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDate,
                    records: [record]
                })
            });

            if (response.ok) {
                alert(`Successfully clocked ${type}! Current time: ${currentTime}`);
                fetchAttendance();
            } else {
                alert('Failed to record attendance');
            }
        } catch (error) {
            console.error('Clock error:', error);
            alert('Error recording attendance');
        } finally {
            setSaving(false);
        }
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDate,
                    records: attendance
                })
            });

            if (response.ok) {
                alert('Attendance saved successfully!');
                fetchAttendance();
            } else {
                alert('Failed to save attendance');
            }
        } catch (error) {
            console.error('Failed to save attendance:', error);
            alert('Error saving attendance');
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Present': return 'badge-success';
            case 'Late': return 'badge-warning';
            case 'Absent': return 'badge-danger';
            case 'Half-Day': return 'badge-info';
            case 'On Leave': return 'badge-gray';
            default: return 'badge-gray';
        }
    };

    const filteredAttendance = attendance.filter(att => {
        if (user?.role === 'Employee') {
            return att.employee_id === user.employee_id || att.employee_id === parseInt(user.employee_id);
        }
        const emp = employees.find(e => e.id === att.employee_id);
        if (!emp) return false;
        if (filterDepartment && emp.department !== filterDepartment) return false;
        if (filterBranch && emp.branch !== filterBranch) return false;
        return true;
    });

    const stats = {
        present: filteredAttendance.filter(a => a.status === 'Present').length,
        late: filteredAttendance.filter(a => a.status === 'Late').length,
        absent: filteredAttendance.filter(a => a.status === 'Absent').length,
        onLeave: filteredAttendance.filter(a => a.status === 'On Leave').length
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('Daily Attendance Report', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Date: ${format(new Date(selectedDate), 'MMMM dd, yyyy')}`, 14, 30);
        doc.text(`Department: ${filterDepartment || 'All Departments'}`, 14, 36);
        doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 42);

        // Stats Summary
        doc.setDrawColor(200);
        doc.line(14, 48, 196, 48);
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text('Summary:', 14, 56);
        doc.setFontSize(10);
        doc.text(`Present: ${stats.present}`, 14, 62);
        doc.text(`Late: ${stats.late}`, 50, 62);
        doc.text(`Absent: ${stats.absent}`, 86, 62);
        doc.text(`On Leave: ${stats.onLeave}`, 122, 62);

        // Table
        const tableData = filteredAttendance.map(att => {
            const emp = employees.find(e => e.id === att.employee_id);
            return [
                emp?.employee_id || '',
                `${emp?.first_name} ${emp?.last_name}`,
                emp?.department || '',
                att.time_in || '-',
                att.time_out || '-',
                att.status,
                att.remarks || ''
            ];
        });

        autoTable(doc, {
            head: [['ID', 'Employee Name', 'Department', 'Time In', 'Time Out', 'Status', 'Remarks']],
            body: tableData,
            startY: 70,
            theme: 'striped',
            headStyles: { fillColor: [63, 81, 181] },
            styles: { fontSize: 9 },
            columnStyles: {
                5: { fontStyle: 'bold' }
            }
        });

        doc.save(`Attendance_Report_${selectedDate}.pdf`);
    };

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Daily Attendance</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Record and track employee attendance
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="form-input"
                                style={{ width: 'auto' }}
                            />
                            <button onClick={generatePDF} className="btn btn-secondary">
                                📄 Download PDF
                            </button>
                            {canManageAttendance && (
                                <button onClick={saveAttendance} disabled={saving} className="btn btn-primary">
                                    {saving ? 'Saving...' : '💾 Save Attendance'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee Clock In/Out */}
            {isEmployee && selectedDate === format(new Date(), 'yyyy-MM-dd') && (
                <div className="card mb-3" style={{ borderLeft: '4px solid var(--primary-600)' }}>
                    <div className="card-body" style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>🕒 Clock In / Out</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Record your attendance for today ({format(new Date(), 'MMMM dd, yyyy')})</p>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button
                                onClick={() => handleClockAction('in')}
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ background: '#10b981', borderColor: '#10b981' }}
                            >
                                Clock In
                            </button>
                            <button
                                onClick={() => handleClockAction('out')}
                                className="btn btn-secondary"
                                disabled={saving}
                                style={{ background: '#64748b' }}
                            >
                                Clock Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics */}
            {canManageAttendance && (
                <div className="stats-grid mb-3">
                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div>
                                <div className="stat-card-value">{stats.present}</div>
                                <div className="stat-card-label">Present</div>
                            </div>
                            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a' }}>
                                ✅
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div>
                                <div className="stat-card-value">{stats.late}</div>
                                <div className="stat-card-label">Late</div>
                            </div>
                            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
                                ⚠️
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div>
                                <div className="stat-card-value">{stats.absent}</div>
                                <div className="stat-card-label">Absent</div>
                            </div>
                            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#dc2626' }}>
                                ❌
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div>
                                <div className="stat-card-value">{stats.onLeave}</div>
                                <div className="stat-card-label">On Leave</div>
                            </div>
                            <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4f46e5' }}>
                                🏖️
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            {canManageAttendance && (
                <div className="card mb-3">
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.875rem' }}>Branch:</label>
                                <select
                                    value={filterBranch}
                                    onChange={(e) => setFilterBranch(e.target.value)}
                                    className="form-select"
                                    style={{ width: '200px' }}
                                >
                                    <option value="">All Branches</option>
                                    <option value="Ormoc Branch">Ormoc Branch</option>
                                    <option value="Naval Branch">Naval Branch</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.875rem' }}>Department:</label>
                                <select
                                    value={filterDepartment}
                                    onChange={(e) => setFilterDepartment(e.target.value)}
                                    className="form-select"
                                    style={{ width: '200px' }}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Showing {filteredAttendance.length} employees
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Status</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                                        Loading attendance...
                                    </td>
                                </tr>
                            ) : filteredAttendance.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendance.map(att => {
                                    const emp = employees.find(e => e.id === att.employee_id);
                                    if (!emp) return null;

                                    return (
                                        <tr key={att.employee_id}>
                                            <td><strong>{emp.employee_id}</strong></td>
                                            <td>{emp.first_name} {emp.last_name}</td>
                                            <td>{emp.department}</td>
                                            <td>
                                                <input
                                                    type="time"
                                                    value={att.time_in || ''}
                                                    onChange={(e) => handleAttendanceChange(att.employee_id, 'time_in', e.target.value)}
                                                    className="form-input"
                                                    style={{ width: '120px' }}
                                                    readOnly={!canManageAttendance}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="time"
                                                    value={att.time_out || ''}
                                                    onChange={(e) => handleAttendanceChange(att.employee_id, 'time_out', e.target.value)}
                                                    className="form-input"
                                                    style={{ width: '120px' }}
                                                    readOnly={!canManageAttendance}
                                                />
                                            </td>
                                            <td>
                                                {canManageAttendance ? (
                                                    <select
                                                        value={att.status}
                                                        onChange={(e) => handleAttendanceChange(att.employee_id, 'status', e.target.value)}
                                                        className={`badge ${getStatusBadgeClass(att.status)}`}
                                                        style={{ border: 'none', cursor: 'pointer', padding: 'var(--spacing-xs) var(--spacing-md)' }}
                                                    >
                                                        <option value="Present">Present</option>
                                                        <option value="Late">Late</option>
                                                        <option value="Absent">Absent</option>
                                                        <option value="Half-Day">Half-Day</option>
                                                        <option value="On Leave">On Leave</option>
                                                    </select>
                                                ) : (
                                                    <span className={`badge ${getStatusBadgeClass(att.status)}`}>
                                                        {att.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={att.remarks || ''}
                                                    onChange={(e) => handleAttendanceChange(att.employee_id, 'remarks', e.target.value)}
                                                    className="form-input"
                                                    placeholder="Optional notes"
                                                    style={{ width: '200px' }}
                                                    readOnly={!canManageAttendance}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
