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
    status: 'Present' | 'Late' | 'Absent' | 'Half-Day' | 'On Leave' | 'No Work';
    remarks?: string;
}

// ... (inside the component)

const stats = {
    present: filteredAttendance.filter(a => a.status === 'Present').length,
    late: filteredAttendance.filter(a => a.status === 'Late').length,
    absent: filteredAttendance.filter(a => a.status === 'Absent').length,
    onLeave: filteredAttendance.filter(a => a.status === 'On Leave').length,
    noWork: filteredAttendance.filter(a => a.status === 'No Work').length
};

// ...

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Present': return 'badge-success';
        case 'Late': return 'badge-warning';
        case 'Absent': return 'badge-danger';
        case 'Half-Day': return 'badge-info';
        case 'On Leave': return 'badge-gray';
        case 'No Work': return 'badge-secondary';
        default: return 'badge-gray';
    }
};

// ... (inside the render return, stats grid)

<div className="stat-card">
    <div className="stat-card-header">
        <div>
            <div className="stat-card-value">{stats.noWork}</div>
            <div className="stat-card-label">No Work</div>
        </div>
        <div className="stat-card-icon" style={{ background: 'var(--gray-200)', color: 'var(--gray-600)' }}>
            🛑
        </div>
    </div>
</div>
                </div >
            )}

// ... (inside the table loop)

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
    <option value="No Work">No Work</option>
</select>
                                                ) : (
    <span className={`badge ${getStatusBadgeClass(att.status)}`}>
        {att.status}
    </span>
)}
                                            </td >
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
                                        </tr >
                                    );
                                })
                            )}
                        </tbody >
                    </table >
                </div >
            </div >
        </DashboardLayout >
    );
}
