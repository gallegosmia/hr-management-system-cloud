'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    branch?: string;
    employment_status: string;
    date_hired: string;
    date_of_birth?: string;
    date_separated?: string;
    contact_number?: string;
    email_address?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
    civil_status?: string;
    personal_info_complete: number;
    preemployment_req_complete: number;
    government_docs_complete: number;
    employment_records_complete: number;
    attendance_records_complete: number;
    payroll_records_complete: number;
    disciplinary_records: number;
    training_records: number;
    separation_records: number;
    file_completion_status: string;
    last_updated: string;
    remarks?: string;
    training_details?: string;
    disciplinary_details?: string;
}

function FileList({ employeeId }: { employeeId: string }) {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const res = await fetch(`/api/employees/documents?employeeId=${employeeId}`);
                if (res.ok) {
                    const data = await res.json();
                    setFiles(data);
                }
            } catch (err) {
                console.error('Failed to fetch files:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [employeeId]);

    if (loading) return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading files...</p>;
    if (files.length === 0) return <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No documents uploaded yet.</p>;

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
            {files.map((file) => (
                <div
                    key={file.filename}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                            {file.type} - {file.filename.split('_').slice(2).join('_')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                        <a
                            href={`${file.url}&view=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        >
                            👁️ View
                        </a>
                        <a
                            href={file.url}
                            download
                            className="btn btn-sm btn-outline"
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        >
                            ⬇️ Download
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [attendanceSummary, setAttendanceSummary] = useState({ late: 0, absent: 0, onLeave: 0, totalPaidLeaves: 0 });

    useEffect(() => {
        if (params.id) {
            fetchEmployee();
            fetchAttendanceSummary();
        }
    }, [params.id]);

    const fetchAttendanceSummary = async () => {
        try {
            const start = '2020-01-01'; // Broad range for summary
            const end = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/attendance/report/individual?employeeId=${params.id}&start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceSummary({
                    late: data.summary.late,
                    absent: data.summary.absent,
                    onLeave: data.summary.onLeave,
                    totalPaidLeaves: data.summary.paidLeavesUsed
                });
            }
        } catch (err) {
            console.error('Failed to fetch attendance summary:', err);
        }
    };

    const fetchEmployee = async () => {
        try {
            const response = await fetch(`/api/employees?id=${params.id}`);
            const data = await response.json();
            setEmployee(data);
        } catch (error) {
            console.error('Failed to fetch employee:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChecklistUpdate = async (field: string, value: number) => {
        if (!employee) return;

        setUpdating(true);
        try {
            const response = await fetch('/api/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: employee.id,
                    checklist: { [field]: value }
                })
            });

            if (response.ok) {
                await fetchEmployee(); // Refresh data
            }
        } catch (error) {
            console.error('Failed to update checklist:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/employees?id=${employee?.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                router.push('/employees');
            } else {
                alert('Failed to delete employee');
            }
        } catch (error) {
            console.error('Failed to delete employee:', error);
            alert('An error occurred while deleting the employee');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid var(--primary-200)',
                        borderTopColor: 'var(--primary-600)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading employee...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!employee) {
        return (
            <DashboardLayout>
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
                        <h2>Employee Not Found</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)' }}>
                            The employee you're looking for doesn't exist.
                        </p>
                        <Link href="/employees" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                            Back to Employee List
                        </Link>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const fullName = `${employee.first_name} ${employee.middle_name ? employee.middle_name + ' ' : ''}${employee.last_name}`;

    const checklistItems = [
        { field: 'personal_info_complete', label: 'Personal Information Complete', value: employee.personal_info_complete },
        { field: 'preemployment_req_complete', label: 'Pre-Employment Requirements Complete', value: employee.preemployment_req_complete },
        { field: 'government_docs_complete', label: 'Government Documents Complete', value: employee.government_docs_complete },
        { field: 'employment_records_complete', label: 'Employment Records Complete', value: employee.employment_records_complete },
        { field: 'attendance_records_complete', label: 'Attendance Records Complete', value: employee.attendance_records_complete },
        { field: 'payroll_records_complete', label: 'Payroll Records Complete', value: employee.payroll_records_complete },
        { field: 'disciplinary_records', label: 'Violations & Warnings', value: employee.disciplinary_records },
        { field: 'training_records', label: 'Training & Certificate Records', value: employee.training_records },
        { field: 'separation_records', label: 'Separation Records', value: employee.separation_records },
    ];

    const completedCount = checklistItems.filter(item => item.value === 1).length;
    const completionPercentage = Math.round((completedCount / checklistItems.length) * 100);

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                                <h2 style={{ margin: 0 }}>{fullName}</h2>
                                <span className={`badge ${employee.employment_status === 'Regular' ? 'badge-success' :
                                    employee.employment_status === 'Probationary' ? 'badge-warning' :
                                        employee.employment_status === 'Contractual' ? 'badge-info' : 'badge-gray'
                                    }`}>
                                    {employee.employment_status}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                {employee.employee_id} • {employee.position} • {employee.department}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button
                                onClick={handleDelete}
                                className="btn btn-danger"
                                style={{ background: 'var(--danger-600)', color: 'white', border: 'none' }}
                            >
                                🗑️ Delete
                            </button>
                            <Link href={`/employees/${employee.id}/edit`} className="btn btn-primary">
                                ✏️ Edit
                            </Link>
                            <Link href="/employees" className="btn btn-secondary">
                                ← Back
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {/* Employee Information */}
                <div>
                    {/* Basic Info */}
                    <div className="card mb-3">
                        <div className="card-header">
                            <div className="card-title">
                                <span>👤</span>
                                Employee Information
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Full Name
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{fullName}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Employee ID
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.employee_id}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Department
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.department}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Position
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.position}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Branch
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.branch || 'Not Assigned'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Civil Status
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.civil_status || 'Not Specified'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Date Hired
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{new Date(employee.date_hired).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                </div>
                                <div className="detail-item">
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Date of Birth
                                    </div>
                                    <div style={{ fontWeight: '600' }}>
                                        {employee.date_of_birth
                                            ? new Date(employee.date_of_birth).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                                            : 'Not Specified'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="card mb-3">
                        <div className="card-header">
                            <div className="card-title">
                                <span>📞</span>
                                Contact Information
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Contact Number
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.contact_number || 'Not provided'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Email Address
                                    </div>
                                    <div style={{ fontWeight: '600' }}>{employee.email_address || 'Not provided'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Government Details */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span>🇵🇭</span>
                                Government & Statutory Details
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        SSS Number
                                    </div>
                                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{employee.sss_number || 'Not provided'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        PhilHealth Number
                                    </div>
                                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{employee.philhealth_number || 'Not provided'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        Pag-IBIG Number
                                    </div>
                                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{employee.pagibig_number || 'Not provided'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                        TIN
                                    </div>
                                    <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>{employee.tin || 'Not provided'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branch Assignment */}
                    <div className="card mb-3">
                        <div className="card-header">
                            <div className="card-title">
                                <span>🏢</span>
                                Branch Assignment
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: '600', display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                                    Assign Employee to Branch
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 'var(--spacing-md)',
                                        background: employee.branch === 'Ormoc Branch' ? 'var(--primary-50)' : 'var(--bg-secondary)',
                                        border: `2px solid ${employee.branch === 'Ormoc Branch' ? 'var(--primary-500)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="branch"
                                            value="Ormoc Branch"
                                            checked={employee.branch === 'Ormoc Branch'}
                                            onChange={async (e) => {
                                                try {
                                                    const response = await fetch('/api/employees', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            id: employee.id,
                                                            branch: e.target.value
                                                        })
                                                    });
                                                    if (response.ok) {
                                                        await fetchEmployee();
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to update branch:', error);
                                                }
                                            }}
                                            style={{ marginRight: 'var(--spacing-sm)', width: '20px', height: '20px' }}
                                        />
                                        <span style={{ fontWeight: employee.branch === 'Ormoc Branch' ? '600' : '500' }}>
                                            Ormoc Branch
                                        </span>
                                    </label>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 'var(--spacing-md)',
                                        background: employee.branch === 'Naval Branch' ? 'var(--primary-50)' : 'var(--bg-secondary)',
                                        border: `2px solid ${employee.branch === 'Naval Branch' ? 'var(--primary-500)' : 'var(--border-color)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}>
                                        <input
                                            type="radio"
                                            name="branch"
                                            value="Naval Branch"
                                            checked={employee.branch === 'Naval Branch'}
                                            onChange={async (e) => {
                                                try {
                                                    const response = await fetch('/api/employees', {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            id: employee.id,
                                                            branch: e.target.value
                                                        })
                                                    });
                                                    if (response.ok) {
                                                        await fetchEmployee();
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to update branch:', error);
                                                }
                                            }}
                                            style={{ marginRight: 'var(--spacing-sm)', width: '20px', height: '20px' }}
                                        />
                                        <span style={{ fontWeight: employee.branch === 'Naval Branch' ? '600' : '500' }}>
                                            Naval Branch
                                        </span>
                                    </label>
                                </div>
                                {employee.branch && (
                                    <div style={{
                                        marginTop: 'var(--spacing-md)',
                                        padding: 'var(--spacing-sm)',
                                        background: 'var(--success-50)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.75rem',
                                        color: 'var(--success-700)',
                                        textAlign: 'center'
                                    }}>
                                        ✓ Employee assigned to {employee.branch}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attendance Summary */}
                    <div className="card mb-3">
                        <div className="card-header">
                            <div className="card-title">
                                <span>📅</span>
                                Attendance Summary
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', textAlign: 'center' }}>
                                <div style={{ padding: 'var(--spacing-sm)', background: 'var(--warning-50)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--warning-700)' }}>{attendanceSummary.late}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--warning-600)' }}>Total Lates</div>
                                </div>
                                <div style={{ padding: 'var(--spacing-sm)', background: 'var(--danger-50)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger-700)' }}>{attendanceSummary.absent}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger-600)' }}>Total Absents</div>
                                </div>
                                <div style={{ padding: 'var(--spacing-sm)', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-700)' }}>{attendanceSummary.onLeave}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)' }}>Total Leaves</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'var(--spacing-md)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Paid Leaves Used: <strong>{attendanceSummary.totalPaidLeaves} / 5 days</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 201 File Checklist */}
                <div>
                    <div className="card mb-4">
                        <div className="card-header">
                            <div className="card-title">
                                <span>📁</span>
                                Digital 201 Folder (Uploads)
                            </div>
                            <div className="card-subtitle">
                                Upload and manage scanned requirements
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: '600', display: 'block', marginBottom: 'var(--spacing-sm)' }}>
                                    Upload New Document
                                </label>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                    <select
                                        id="docType"
                                        className="form-input"
                                        style={{ width: 'auto', minWidth: '150px' }}
                                    >
                                        <option value="Medical">Medical</option>
                                        <option value="NBI">NBI Clearance</option>
                                        <option value="SSS">SSS ID/E1</option>
                                        <option value="PhilHealth">PhilHealth ID/MDR</option>
                                        <option value="Pag-IBIG">Pag-IBIG ID/MDF</option>
                                        <option value="Contract">Contract / Appointment</option>
                                        <option value="Training">Training & Certificates</option>
                                        <option value="Disciplinary">Violations & Warnings</option>
                                        <option value="Resume">Resume / CV</option>
                                        <option value="Other">Other Document</option>
                                    </select>
                                    <input
                                        type="file"
                                        id="fileInput"
                                        className="form-input"
                                        style={{ width: 'auto' }}
                                        accept=".pdf"
                                    />
                                    <button
                                        onClick={async () => {
                                            const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                                            const docType = (document.getElementById('docType') as HTMLSelectElement).value;
                                            if (!fileInput.files?.[0]) return alert('Please select a file');

                                            const file = fileInput.files[0];
                                            if (file.type !== 'application/pdf') {
                                                return alert('Only PDF files are allowed for the Digital 201 File.');
                                            }

                                            const formData = new FormData();
                                            formData.append('file', file);
                                            formData.append('employeeId', employee.employee_id);
                                            formData.append('documentType', docType);

                                            const res = await fetch('/api/employees/documents', {
                                                method: 'POST',
                                                body: formData
                                            });
                                            if (res.ok) {
                                                alert('Uploaded successfully!');
                                                fileInput.value = '';
                                                // Trigger a refresh of the file list
                                                window.location.reload();
                                            } else {
                                                alert('Upload failed');
                                            }
                                        }}
                                        className="btn btn-primary"
                                    >
                                        📤 Upload
                                    </button>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-lg)' }}>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                                    Uploaded Files
                                </h4>
                                <div id="fileList">
                                    {/* This would ideally be populated via a separate state, but for now we'll show a placeholder or use a quick fetch */}
                                    <FileList employeeId={employee.employee_id} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">
                                <span>📋</span>
                                201 File Document Tracking
                            </div>
                            <div className="card-subtitle">
                                Track completion status of all required documents
                            </div>
                        </div>
                        <div className="card-body">
                            {/* Completion Status */}
                            <div style={{
                                background: employee.file_completion_status === 'Complete' ? 'var(--success-50)' :
                                    employee.file_completion_status === 'Partial' ? 'var(--warning-50)' : 'var(--danger-50)',
                                padding: 'var(--spacing-lg)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-lg)',
                                border: `2px solid ${employee.file_completion_status === 'Complete' ? 'var(--success-500)' :
                                    employee.file_completion_status === 'Partial' ? 'var(--warning-500)' : 'var(--danger-500)'
                                    }`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--spacing-xs)' }}>
                                            Overall Completion Status
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                                            {completionPercentage}%
                                        </div>
                                    </div>
                                    <span className={`badge ${employee.file_completion_status === 'Complete' ? 'badge-success' :
                                        employee.file_completion_status === 'Partial' ? 'badge-warning' : 'badge-danger'
                                        }`} style={{ fontSize: '1rem', padding: 'var(--spacing-sm) var(--spacing-lg)' }}>
                                        {employee.file_completion_status}
                                    </span>
                                </div>
                                <div style={{
                                    height: '12px',
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    borderRadius: 'var(--radius-full)',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${completionPercentage}%`,
                                        background: employee.file_completion_status === 'Complete' ? 'var(--success-500)' :
                                            employee.file_completion_status === 'Partial' ? 'var(--warning-500)' : 'var(--danger-500)',
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', marginTop: 'var(--spacing-sm)', opacity: 0.8 }}>
                                    {completedCount} of {checklistItems.length} items completed
                                </div>
                            </div>

                            {/* Checklist Items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {checklistItems.map((item) => (
                                    <div
                                        key={item.field}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: 'var(--spacing-md)',
                                            background: item.value === 1 ? 'var(--success-50)' : 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${item.value === 1 ? 'var(--success-500)' : 'var(--border-color)'}`,
                                            transition: 'all var(--transition-fast)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => handleChecklistUpdate(item.field, item.value === 1 ? 0 : 1)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: item.value === 1 ? 'var(--success-500)' : 'white',
                                                border: `2px solid ${item.value === 1 ? 'var(--success-500)' : 'var(--gray-300)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                fontWeight: '700'
                                            }}>
                                                {item.value === 1 && '✓'}
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            color: item.value === 1 ? 'var(--success-700)' : 'var(--text-secondary)'
                                        }}>
                                            {item.value === 1 ? 'YES' : 'NO'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {updating && (
                                <div style={{
                                    marginTop: 'var(--spacing-md)',
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--primary-50)',
                                    color: 'var(--primary-700)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.75rem',
                                    textAlign: 'center'
                                }}>
                                    Updating checklist...
                                </div>
                            )}

                            <div style={{
                                marginTop: 'var(--spacing-lg)',
                                padding: 'var(--spacing-md)',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <strong>Last Updated:</strong> {new Date(employee.last_updated).toLocaleString('en-PH')}
                            </div>
                        </div>
                    </div>

                    {(employee.training_details || employee.disciplinary_details) && (
                        <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
                            <div className="card-header">
                                <div className="card-title">
                                    <span>📄</span>
                                    201 Information
                                </div>
                            </div>
                            <div className="card-body">
                                {employee.training_details && (
                                    <div style={{
                                        marginBottom: 'var(--spacing-md)',
                                        padding: 'var(--spacing-md)',
                                        background: 'var(--primary-50)',
                                        borderLeft: '4px solid var(--primary-500)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--primary-700)',
                                            fontWeight: '700',
                                            marginBottom: 'var(--spacing-xs)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-xs)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.025em'
                                        }}>
                                            <span>🎓</span>
                                            Trainings & Certificates
                                        </div>
                                        <p style={{
                                            whiteSpace: 'pre-wrap',
                                            margin: 0,
                                            fontSize: '0.875rem',
                                            color: 'var(--primary-900)',
                                            lineHeight: '1.6',
                                            fontWeight: '500'
                                        }}>
                                            {employee.training_details}
                                        </p>
                                    </div>
                                )}
                                {employee.disciplinary_details && (
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        background: '#fff1f2',
                                        borderLeft: '4px solid #e11d48',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: '#e11d48',
                                            fontWeight: '700',
                                            marginBottom: 'var(--spacing-xs)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-xs)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.025em'
                                        }}>
                                            <span>⚠️</span>
                                            Violations & Warnings
                                        </div>
                                        <p style={{
                                            whiteSpace: 'pre-wrap',
                                            margin: 0,
                                            fontSize: '0.875rem',
                                            color: '#9f1239',
                                            lineHeight: '1.6',
                                            fontWeight: '500'
                                        }}>
                                            {employee.disciplinary_details}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {employee.remarks && (
                        <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
                            <div className="card-header">
                                <div className="card-title">
                                    <span>📝</span>
                                    HR Notes & Remarks
                                </div>
                            </div>
                            <div className="card-body">
                                <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.875rem' }}>{employee.remarks}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </DashboardLayout>
    );
}
