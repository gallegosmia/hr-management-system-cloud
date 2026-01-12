'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface LeaveRequest {
    id: number;
    employee_id: number;
    employee_name: string;
    department: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason: string;
    status: string;
    created_at: string;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
}

export default function LeavePage() {
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');
    const [user, setUser] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        leave_type: 'Vacation Leave',
        start_date: '',
        end_date: '',
        reason: '',
        vacation_reason: '',
        other_reason: ''
    });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [leaveDaysUsed, setLeaveDaysUsed] = useState(0);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            if (parsedUser.role === 'Employee' && parsedUser.employee_id) {
                const empId = parsedUser.employee_id.toString();
                setFormData(prev => ({ ...prev, employee_id: empId }));
                fetchLeaveDaysUsed(empId);
            }
        }
        fetchRequests();
        fetchEmployees();
    }, []);

    const fetchRequests = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const parsedUser = JSON.parse(userData);

            let url = '/api/leave';
            if (parsedUser.role === 'Employee' && parsedUser.employee_id) {
                url += `?employee_id=${parsedUser.employee_id}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees');
            const data = await response.json();
            setEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const fetchLeaveDaysUsed = async (employeeId: string) => {
        if (!employeeId) {
            setLeaveDaysUsed(0);
            return;
        }
        try {
            const start = '2020-01-01';
            const end = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/attendance/report/individual?employeeId=${employeeId}&start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                setLeaveDaysUsed(data.summary.paidLeavesUsed);
            }
        } catch (err) {
            console.error('Failed to fetch leave days used:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.start_date || !formData.end_date) return;

        const start = parseISO(formData.start_date);
        const end = parseISO(formData.end_date);
        const days = differenceInBusinessDays(end, start) + 1;

        try {
            const url = '/api/leave';
            const method = editingId ? 'PUT' : 'POST';

            // Combine vacation reason with general reason
            let combinedReason = formData.reason;
            if (formData.leave_type === 'Vacation Leave' && formData.vacation_reason) {
                if (formData.vacation_reason === 'Other') {
                    combinedReason = `Other: ${formData.other_reason}${formData.reason ? ' | ' + formData.reason : ''}`;
                } else {
                    combinedReason = `${formData.vacation_reason}${formData.reason ? ' | ' + formData.reason : ''}`;
                }
            }

            const body = {
                employee_id: parseInt(formData.employee_id),
                leave_type: formData.leave_type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                reason: combinedReason,
                days_count: days > 0 ? days : 0
            };

            if (editingId) {
                (body as any).id = editingId;
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                    employee_id: '',
                    leave_type: 'Vacation Leave',
                    start_date: '',
                    end_date: '',
                    reason: '',
                    vacation_reason: '',
                    other_reason: ''
                });
                fetchRequests();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to submit leave request');
            }
        } catch (error) {
            console.error('Failed to create request:', error);
            alert('A network error occurred while submitting the request.');
        }
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        if (user?.role === 'Employee' && status !== 'Cancelled') {
            alert('Employees are only allowed to cancel their own requests.');
            return;
        }

        let remarks = '';
        if (status === 'Rejected') {
            const input = prompt('Please enter remarks for rejection (Required):');
            if (input === null) return; // Cancelled
            if (input.trim() === '') {
                alert('Remarks are required for rejection.');
                return;
            }
            remarks = input;
        }

        try {
            const response = await fetch('/api/leave', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    status,
                    approver_id: user?.id || 1,
                    approver_role: user?.role || 'Admin',
                    remarks
                })
            });

            if (response.ok) {
                fetchRequests();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to permanently delete this leave request?')) return;

        try {
            const response = await fetch(`/api/leave?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchRequests();
            } else {
                alert('Failed to delete request');
            }
        } catch (error) {
            console.error('Failed to delete request:', error);
        }
    };

    const handleDownloadPDF = (req: LeaveRequest) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Title
        doc.setFillColor(200, 200, 200);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('LEAVE APPLICATION FORM', pageWidth / 2, 8, { align: 'center' });

        // Employee Information
        let yPos = 22;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Employee Name:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.line(55, yPos + 1, 190, yPos + 1);
        doc.text(req.employee_name, 57, yPos);

        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Position:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.line(55, yPos + 1, 190, yPos + 1);
        doc.text(req.department, 57, yPos);

        // Type of Leave with checkboxes
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Type of Leave:', 20, yPos);

        const leaveTypes = ['VACATION', 'SICK', 'EMERGENCY'];
        let xPos = 60;
        leaveTypes.forEach(type => {
            const isChecked = req.leave_type.toUpperCase().includes(type);
            doc.rect(xPos, yPos - 3, 4, 4, isChecked ? 'F' : 'S');
            doc.setFont('helvetica', 'normal');
            doc.text(type, xPos + 6, yPos);
            xPos += 45;
        });

        // If VACATION, Please Check
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('If VACATION, Please Check:', 20, yPos);

        const vacationReasons = [
            { label: 'Birthday', value: 'Birthday' },
            { label: 'Wedding/Kasal', value: 'Wedding' },
            { label: 'Travel', value: 'Travel' },
            { label: 'Burial/Lubong/Burol', value: 'Burial' },
            { label: 'Fiesta', value: 'Fiesta' },
            { label: 'Christening/Bunyag', value: 'Christening' }
        ];

        yPos += 5;
        vacationReasons.forEach(reason => {
            const isChecked = req.reason && req.reason.includes(reason.value);
            doc.rect(25, yPos - 3, 4, 4, isChecked ? 'F' : 'S');
            doc.setFont('helvetica', 'normal');
            doc.text(reason.label, 31, yPos);
            yPos += 5;
        });

        // Other Reason - Only show if there's content
        // Extract the actual reason content (excluding vacation reason keywords and approval remarks)
        let displayReason = '';
        if (req.reason) {
            // Check if it's an "Other" vacation reason
            if (req.reason.includes('Other:')) {
                const parts = req.reason.split('|');
                const otherPart = parts[0].replace('Other:', '').trim();
                const additionalNotes = parts[1] ? parts[1].trim() : '';
                displayReason = otherPart + (additionalNotes ? ' | ' + additionalNotes : '');
            }
            // Check if it has additional notes with a vacation reason
            else if (req.reason.includes('|') && !req.reason.includes('Approved')) {
                const parts = req.reason.split('|');
                // Only show the additional notes part (second part)
                displayReason = parts[1] ? parts[1].trim() : '';
            }
            // If it's just a regular reason (not a vacation leave or no additional notes)
            else if (!['Birthday', 'Travel', 'Wedding', 'Christening', 'Fiesta', 'Burial'].some(v => req.reason.includes(v))) {
                displayReason = req.reason;
            }
        }

        // Only show OTHER REASON section if there's actual content
        if (displayReason) {
            yPos += 2;
            doc.setFont('helvetica', 'bold');
            doc.text('OTHER REASON:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.line(20, yPos + 2, 190, yPos + 2);

            const splitReason = doc.splitTextToSize(displayReason, 165);
            doc.text(splitReason, 22, yPos + 6);
            yPos += (splitReason.length * 5) + 6;
            doc.line(20, yPos, 190, yPos);
        }

        // Leave Dates
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Date of Leave:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.line(55, yPos + 1, 190, yPos + 1);
        doc.text(format(parseISO(req.start_date), 'MMMM d, yyyy'), 57, yPos);

        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Date of Application:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.line(55, yPos + 1, 190, yPos + 1);
        doc.text(format(parseISO(req.created_at || new Date().toISOString()), 'MMMM d, yyyy'), 57, yPos);

        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('No. of Days Applied:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.line(55, yPos + 1, 190, yPos + 1);
        doc.text(req.days_count.toString(), 57, yPos);

        // Person Notified
        yPos += 12;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('PERSON NOTIFIED:', 20, yPos);
        doc.setFontSize(11);
        doc.text('MARILYN O. RELOBA', pageWidth / 2, yPos, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Branch Manager', pageWidth / 2, yPos + 4, { align: 'center' });

        // Remarks
        yPos += 12;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('REMARKS:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.line(20, yPos + 2, 190, yPos + 2);

        // Display remarks if available
        const remarksText = (req as any).remarks || '';
        if (remarksText) {
            const splitRemarks = doc.splitTextToSize(remarksText, 165);
            doc.text(splitRemarks, 22, yPos + 6);
            yPos += (splitRemarks.length * 5) + 6;
        } else {
            yPos += 10;
        }
        doc.line(20, yPos, 190, yPos);

        // Signature of Applicant
        yPos += 20;
        doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
        doc.setFontSize(9);
        doc.text('SIGNATURE OF APPLICANT', pageWidth / 2, yPos + 5, { align: 'center' });

        // Approved By
        yPos += 15;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('APPROVED BY:', 20, yPos);

        yPos += 8;
        doc.setFontSize(11);
        doc.text('ANNA LIZA R. RODRIGUEZ', pageWidth / 2, yPos, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Executive Vice-President', pageWidth / 2, yPos + 4, { align: 'center' });

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')} | Request ID: ${req.id}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save(`Leave_Application_${req.employee_name.replace(/\s+/g, '_')}_${req.id}.pdf`);
    };

    const handleEdit = (req: LeaveRequest) => {
        setFormData({
            employee_id: req.employee_id.toString(),
            leave_type: req.leave_type,
            start_date: req.start_date.split('T')[0],
            end_date: req.end_date.split('T')[0],
            reason: req.reason || '',
            vacation_reason: '',
            other_reason: ''
        });
        setEditingId(req.id);
        setShowForm(true);
        fetchLeaveDaysUsed(req.employee_id.toString());
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Approved') return 'badge-success';
        if (status === 'Rejected') return 'badge-danger';
        if (status === 'Cancelled') return 'badge-gray';
        if (status.startsWith('Pending')) return 'badge-warning';
        return 'badge-gray';
    };

    const filteredRequests = filterStatus === 'All'
        ? requests
        : requests.filter(r => {
            if (filterStatus === 'Pending') return r.status.toLowerCase().includes('pending');
            return r.status === filterStatus;
        });

    return (
        <DashboardLayout>
            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Leave Management</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                Track and approve employee leave requests
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (showForm) {
                                    setEditingId(null);
                                    setFormData({
                                        employee_id: '',
                                        leave_type: 'Vacation Leave',
                                        start_date: '',
                                        end_date: '',
                                        reason: '',
                                        vacation_reason: '',
                                        other_reason: ''
                                    });
                                }
                                setShowForm(!showForm);
                            }}
                            className="btn btn-primary"
                        >
                            {showForm ? 'Cancel' : '➕ File Leave Request'}
                        </button>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="card mb-3" style={{ animation: 'slideDown 0.3s ease' }}>
                    <div className="card-header">
                        <div className="card-title">{editingId ? 'Edit Leave Request' : 'File New Leave Request'}</div>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Employee</label>
                                    <select
                                        className="form-select"
                                        value={formData.employee_id}
                                        onChange={e => {
                                            setFormData({ ...formData, employee_id: e.target.value });
                                            fetchLeaveDaysUsed(e.target.value);
                                        }}
                                        required
                                        disabled={user?.role === 'Employee'}
                                    >
                                        <option value="">Select Employee</option>
                                        {user?.role === 'Employee' ? (
                                            employees.filter(e => e.id === Number(user.employee_id)).map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.last_name}, {emp.first_name}
                                                </option>
                                            ))
                                        ) : (
                                            employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.last_name}, {emp.first_name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {formData.employee_id && (
                                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: leaveDaysUsed >= 5 ? 'var(--danger-600)' : 'var(--text-secondary)' }}>
                                            Paid Leaves Used: <strong>{leaveDaysUsed} / 5 days</strong>
                                            {leaveDaysUsed >= 5 && ' (Limit Reached)'}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Leave Type</label>
                                    <select
                                        className="form-select"
                                        value={formData.leave_type}
                                        onChange={e => setFormData({ ...formData, leave_type: e.target.value })}
                                    >
                                        <option>Vacation Leave</option>
                                        <option>Sick Leave</option>
                                        <option>Emergency Leave</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            {formData.leave_type === 'Vacation Leave' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Vacation Reason</label>
                                        <select
                                            className="form-select"
                                            value={formData.vacation_reason}
                                            onChange={e => setFormData({ ...formData, vacation_reason: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Reason</option>
                                            <option value="Birthday">Birthday</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Wedding">Wedding</option>
                                            <option value="Christening">Christening</option>
                                            <option value="Fiesta">Fiesta</option>
                                            <option value="Burial">Burial</option>
                                            <option value="Other">Other Reason</option>
                                        </select>
                                    </div>
                                    {formData.vacation_reason === 'Other' && (
                                        <div className="form-group">
                                            <label className="form-label">Please Specify Other Reason</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.other_reason}
                                                onChange={e => setFormData({ ...formData, other_reason: e.target.value })}
                                                placeholder="Specify your reason..."
                                                required
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="form-group">
                                <label className="form-label">Additional Notes (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Any additional information..."
                                    style={{ minHeight: '80px' }}
                                />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {user?.role === 'Employee' && !user?.employee_id ? (
                                    <div className="alert alert-danger" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                                        <strong>Notice:</strong> Your account is not yet linked to an employee record.
                                        Please contact HR to link your account so you can file leave requests.
                                    </div>
                                ) : (
                                    <button
                                        type="submit"
                                        className="btn btn-success"
                                        disabled={(leaveDaysUsed >= 5 && !editingId) || (user?.role === 'Employee' && !user?.employee_id)}
                                        title={leaveDaysUsed >= 5 && !editingId ? "Employee has reached the 5-day leave limit" : ""}
                                    >
                                        {editingId ? 'Update Request' : (leaveDaysUsed >= 5 ? 'Limit Reached' : 'Submit Request')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>Filter Status:</span>
                        {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Dates</th>
                                <th>Days</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center p-4">Loading...</td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-4">No leave requests found</td></tr>
                            ) : (
                                filteredRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{req.employee_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {req.department}
                                            </div>
                                        </td>
                                        <td>{req.leave_type}</td>
                                        <td>
                                            <div>{format(parseISO(req.start_date), 'MMM d, yyyy')}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                to {format(parseISO(req.end_date), 'MMM d, yyyy')}
                                            </div>
                                        </td>
                                        <td>{req.days_count}</td>
                                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {req.reason}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {req.status.startsWith('Pending') && (['Admin', 'HR', 'Manager', 'President', 'Vice President'].includes(user?.role)) && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'Approved')}
                                                            className="btn btn-sm btn-success btn-icon"
                                                            title="Approve"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                                                            className="btn btn-sm btn-danger btn-icon"
                                                            title="Reject"
                                                        >
                                                            ✕
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(req)}
                                                            className="btn btn-sm btn-primary btn-icon"
                                                            title="Edit"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDownloadPDF(req)}
                                                    className="btn btn-sm btn-info btn-icon"
                                                    title="Download PDF"
                                                >
                                                    📄
                                                </button>
                                                {req.status.startsWith('Pending') && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(req.id, 'Cancelled')}
                                                        className="btn btn-sm btn-warning btn-icon"
                                                        title="Cancel Leave Request"
                                                    >
                                                        🚫
                                                    </button>
                                                )}
                                                {(['Admin', 'HR', 'Manager', 'President', 'Vice President'].includes(user?.role)) && (
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="btn btn-sm btn-secondary btn-icon"
                                                        title="Delete"
                                                        style={{ color: 'var(--danger-600)' }}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
