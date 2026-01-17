'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import Modal from '@/components/Modal';

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
    address?: string;
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
    profile_picture?: string;
    salary_info?: any;
    education?: Education[];
}

interface Education {
    id: number;
    employee_id: number;
    level: string;
    school_name: string;
    degree_course?: string;
    year_graduated: string;
    honors_awards?: string;
}

function LeaveCreditsWidget({ used, total = 5 }: { used: number, total?: number }) {
    const percentage = Math.min((used / total) * 100, 100);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{
            background: 'white',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)'
        }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke="var(--gray-200)"
                        strokeWidth="8"
                    />
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke={percentage > 80 ? 'var(--danger-500)' : 'var(--success-500)'}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{used}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>USED</div>
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Paid Leaves</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>Service Incentive Leave</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {total - used} days remaining
                </div>
            </div>
        </div>
    );
}

function FileList({ employeeId, showAlert, showConfirm, refreshTrigger }: {
    employeeId: string;
    showAlert: (msg: string) => void;
    showConfirm: (msg: string, onConfirmAction: () => void) => void;
    refreshTrigger?: number;
}) {
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

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
    }, [employeeId, refreshTrigger]);

    const tabs = ['All', 'Medical', 'Legal', 'Identification', 'Employment', 'Other'];

    const getCategory = (type: string) => {
        if (['Medical'].includes(type)) return 'Medical';
        if (['NBI'].includes(type)) return 'Legal';
        if (['SSS', 'PhilHealth', 'Pag-IBIG', 'TIN'].includes(type)) return 'Identification';
        if (['Contract', 'Resume', 'Training', 'Disciplinary'].includes(type)) return 'Employment';
        return 'Other';
    };

    const filteredFiles = files.filter(f => activeTab === 'All' || getCategory(f.type) === activeTab);

    // ... existing handlers ...

    const handleDelete = (filename: string) => {
        showConfirm('Are you sure you want to delete this file?', async () => {
            try {
                const res = await fetch(`/api/employees/documents?employeeId=${employeeId}&filename=${filename}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    setFiles(prev => prev.filter(f => f.filename !== filename));
                    showAlert('File deleted successfully');
                } else {
                    showAlert('Failed to delete file');
                }
            } catch (err) {
                console.error('Delete error:', err);
                showAlert('An error occurred');
            }
        });
    };

    if (loading) return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading files...</p>;
    if (files.length === 0) return <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No documents uploaded yet.</p>;

    return (
        <div>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)', overflowX: 'auto', paddingBottom: '4px' }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            border: 'none',
                            background: activeTab === tab ? 'var(--primary-500)' : 'var(--bg-secondary)',
                            color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                {filteredFiles.map((file) => (
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
                            <button
                                onClick={() => handleDelete(file.filename)}
                                className="btn btn-sm"
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.75rem',
                                    background: 'white',
                                    color: 'var(--danger-500)',
                                    border: '1px solid var(--danger-500)',
                                    cursor: 'pointer'
                                }}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}



export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('Melann Lending');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
    const [onConfirm, setOnConfirm] = useState<() => void>(() => { });

    const showAlert = (message: string, title = 'Melann Lending') => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType('alert');
        setModalOpen(true);
    };

    const showConfirm = (message: string, onConfirmAction: () => void, title = 'Confirm Action') => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType('confirm');
        setOnConfirm(() => onConfirmAction);
        setModalOpen(true);
    };

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [attendanceSummary, setAttendanceSummary] = useState({ late: 0, absent: 0, onLeave: 0, totalPaidLeaves: 0 });

    // New state for report generation
    const [reportStartDate, setReportStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')); // Jan 1st of current year
    const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd')); // Today
    const [education, setEducation] = useState<Education[]>([]);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [generatingProfile, setGeneratingProfile] = useState(false);
    const [showEducationModal, setShowEducationModal] = useState(false);
    const [educationForm, setEducationForm] = useState<Partial<Education>>({
        level: 'College',
        school_name: '',
        degree_course: '',
        year_graduated: '',
        honors_awards: ''
    });
    const [refreshFiles, setRefreshFiles] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [selectedDocType, setSelectedDocType] = useState('Contract');

    const handleFileSelect = (file: File) => {
        if (file.type !== 'application/pdf') {
            showAlert('Only PDF files are allowed.');
            return;
        }
        setPendingFile(file);
    };

    const confirmUpload = async () => {
        if (!pendingFile || !employee) return;

        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('employeeId', employee.employee_id);
        formData.append('documentType', selectedDocType);

        try {
            const res = await fetch('/api/employees/documents', { method: 'POST', body: formData });

            let data;
            try {
                data = await res.json();
            } catch (e) {
                // If response is not JSON
                data = { error: res.statusText || 'Unknown error occurred' };
            }

            if (res.ok) {
                showAlert('Uploaded successfully!');
                setRefreshFiles(prev => prev + 1);
                setPendingFile(null); // Reset
            } else {
                showAlert(`Upload failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(error);
            showAlert('An error occurred during upload. Please check your connection.');
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !employee) return;

        if (file.size > 5 * 1024 * 1024) {
            showAlert('File size too large. Max 5MB.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('employeeId', employee.id.toString());

        try {
            const res = await fetch('/api/employees/upload-photo', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setEmployee(prev => prev ? { ...prev, profile_picture: data.url } : null);
                showAlert('Profile picture updated successfully!');
            } else {
                const err = await res.json();
                showAlert(err.error || 'Failed to upload photo');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('An error occurred during upload');
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

    const fetchAttendanceSummary = async () => {
        try {
            const start = '2020-01-01'; // Broad range to catch all history
            const end = '2030-12-31';   // Future buffer
            const res = await fetch(`/api/attendance/report/individual?employeeId=${params.id}&start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceSummary({
                    late: data.summary.late,
                    absent: data.summary.absent,
                    onLeave: data.summary.present_on_leave || data.summary.onLeave, // Fallback to onLeave if present_on_leave is missing
                    totalPaidLeaves: data.summary.totalPaidLeavesUsed || data.summary.paidLeavesUsed // Fallback to paidLeavesUsed if totalPaidLeavesUsed is missing
                });
            });
        }
        } catch (err) {
        console.error('Failed to fetch attendance summary:', err);
    }
};

const fetchEducation = async () => {
    try {
        const response = await fetch(`/api/employees/education?employee_id=${params.id}`);
        if (response.ok) {
            const data = await response.json();
            setEducation(data);
        }
    } catch (error) {
        console.error('Failed to fetch education:', error);
    }
}

useEffect(() => {
    if (employee?.id) {
        fetchEducation();
    }
}, [employee?.id]);

useEffect(() => {
    if (params.id) {
        fetchEmployee();
        fetchAttendanceSummary();
    }
}, [params.id]);

const generateProfilePDF = async () => {
    if (!employee) return;
    setGeneratingProfile(true);

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const primaryColor = [33, 150, 243] as [number, number, number]; // Blue

        // Helper for date formatting
        const formatDate = (dateStr?: string) => {
            if (!dateStr) return '-';
            try {
                return format(new Date(dateStr), 'MMM dd, yyyy');
            } catch (e) {
                return dateStr;
            }
        };

        // Helper for section headers
        const addSectionHeader = (text: string, y: number) => {
            doc.setFontSize(14);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(text, 14, y);
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(14, y + 2, pageWidth - 14, y + 2);
            doc.setFont('helvetica', 'normal');
            return y + 10;
        };

        // --- HEADER ---
        // Branding Bar
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 20, 'F');

        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.text('EMPLOYEE 201 PROFILE', pageWidth / 2, 13, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 28);
        doc.text('CONFIDENTIAL', pageWidth - 14, 28, { align: 'right' });

        // --- PROFILE PICTURE & BASIC INFO ---
        let yPos = 35;

        // Profile Box Background
        doc.setDrawColor(220);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, yPos, pageWidth - 28, 50, 3, 3, 'FD');

        // Picture
        if (employee.profile_picture) {
            try {
                doc.addImage(employee.profile_picture, 'JPEG', 28, yPos + 10, 30, 30);
            } catch (e) {
                console.error('Error adding image to PDF:', e);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text('Photo Error', 28, yPos + 25);
            }
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text('No Photo', 28, yPos + 25);
        }

        // Name & ID
        doc.setTextColor(40);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(`${employee.last_name}, ${employee.first_name} ${employee.middle_name || ''}`, 70, yPos + 12);

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.setFont('helvetica', 'normal');

        const infoStartX = 70;
        const infoGapY = 6;
        let currentInfoY = yPos + 20;

        doc.text(`ID Reference:`, infoStartX, currentInfoY);
        doc.setFont('helvetica', 'bold');
        doc.text(`${employee.employee_id}`, infoStartX + 30, currentInfoY);
        currentInfoY += infoGapY;

        doc.setFont('helvetica', 'normal');
        doc.text(`Department:`, infoStartX, currentInfoY);
        doc.setFont('helvetica', 'bold');
        doc.text(`${employee.department}`, infoStartX + 30, currentInfoY);
        currentInfoY += infoGapY;

        doc.setFont('helvetica', 'normal');
        doc.text(`Position:`, infoStartX, currentInfoY);
        doc.setFont('helvetica', 'bold');
        doc.text(`${employee.position}`, infoStartX + 30, currentInfoY);
        currentInfoY += infoGapY;

        doc.setFont('helvetica', 'normal');
        doc.text(`Status:`, infoStartX, currentInfoY);
        doc.setFont('helvetica', 'bold');
        const statusColor = (employee.employment_status === 'Active' || employee.employment_status === 'Regular') ? [0, 128, 0] : [80, 80, 80];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(`${employee.employment_status}`, infoStartX + 30, currentInfoY);

        yPos += 60;

        // --- PERSONAL INFORMATION ---
        yPos = addSectionHeader('Personal Information', yPos);

        autoTable(doc, {
            startY: yPos,
            body: [
                ['Date Hired', formatDate(employee.date_hired)],
                ['Date of Birth', formatDate(employee.date_of_birth)],
                ['Contact Number', employee.contact_number || '-'],
                ['Email Address', employee.email_address || '-'],
                ['Address', employee.address || '-'],
                ['Civil Status', employee.civil_status || '-'],
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3, textColor: 50 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 247, 250] } }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // --- GOVERNMENT IDS ---
        yPos = addSectionHeader('Government & Statutory', yPos);

        autoTable(doc, {
            startY: yPos,
            body: [
                ['SSS Number', employee.sss_number || '-'],
                ['PhilHealth Number', employee.philhealth_number || '-'],
                ['Pag-IBIG Number', employee.pagibig_number || '-'],
                ['TIN', employee.tin || '-'],
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3, textColor: 50 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 247, 250] } }
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;

        // --- EDUCATIONAL ATTAINMENT ---
        yPos = addSectionHeader('Educational Attainment', yPos);

        if (education.length > 0) {
            const eduRows = education.map(edu => [
                edu.level,
                edu.school_name,
                edu.degree_course || '-',
                edu.year_graduated,
                edu.honors_awards || '-'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Level', 'School', 'Degree/Course', 'Year', 'Honors']],
                body: eduRows,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3, textColor: 50 },
                alternateRowStyles: { fillColor: [250, 250, 250] }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('No education records recorded.', 14, yPos + 5);
            yPos += 15;
        }

        // --- COMPENSATION & BENEFITS ---
        if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }
        yPos = addSectionHeader('Compensation & Benefits', yPos);

        if (employee.salary_info) {
            const salary = employee.salary_info;
            autoTable(doc, {
                startY: yPos,
                body: [
                    ['Basic Salary', `P ${salary.basic_salary?.toLocaleString() || '0.00'}`],
                    ['Daily Rate', `P ${salary.daily_rate?.toLocaleString() || '0.00'}`],
                    ['Pay Frequency', salary.pay_frequency || '-'],
                    ['Special Allowance', `P ${salary.allowances?.special?.toLocaleString() || '0.00'}`],
                ],
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: 255 },
                styles: { fontSize: 10, cellPadding: 3, textColor: 50 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 247, 250] } }
            });
            yPos = (doc as any).lastAutoTable.finalY + 15;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('No salary information available.', 14, yPos + 5);
            yPos += 15;
        }

        // --- ATTENDANCE SUMMARY ---
        if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }
        yPos = addSectionHeader('Attendance Summary (YTD)', yPos);

        autoTable(doc, {
            startY: yPos,
            body: [
                ['Total Lates', attendanceSummary.late.toString()],
                ['Total Absences', attendanceSummary.absent.toString()],
                ['Total Leaves Taken', attendanceSummary.onLeave.toString()],
                ['Paid Leaves Used', `${attendanceSummary.totalPaidLeaves} / 5`],
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3, textColor: 50 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 247, 250] } }
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // --- TRAININGS & CERTIFICATES ---
        if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }
        yPos = addSectionHeader('Trainings & Certificates', yPos);

        if (employee.training_details) {
            doc.setFontSize(10);
            doc.setTextColor(50);
            const splitText = doc.splitTextToSize(employee.training_details, pageWidth - 28);
            doc.text(splitText, 14, yPos + 5);
            yPos += (splitText.length * 5) + 15;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('No training records available.', 14, yPos + 5);
            yPos += 15;
        }

        // --- VIOLATIONS & WARNINGS ---
        if (yPos > pageHeight - 60) { doc.addPage(); yPos = 20; }
        yPos = addSectionHeader('Violations & Warnings', yPos);

        if (employee.disciplinary_details) {
            doc.setFontSize(10);
            doc.setTextColor(50);
            const splitText = doc.splitTextToSize(employee.disciplinary_details, pageWidth - 28);
            doc.text(splitText, 14, yPos + 5);
            yPos += (splitText.length * 5) + 15;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('No disciplinary records available.', 14, yPos + 5);
            yPos += 15;
        }

        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        doc.save(`201_File_${employee.last_name}_${employee.employee_id}.pdf`);

    } catch (error) {
        console.error('Error generating profile PDF:', error);
        showAlert(`Failed to generate profile PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setGeneratingProfile(false);
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


const handleDelete = () => {
    showConfirm('Are you sure you want to delete this employee? This action cannot be undone.', async () => {
        try {
            const response = await fetch(`/api/employees?id=${employee?.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                router.push('/employees');
            } else {
                showAlert('Failed to delete employee');
            }
        } catch (error) {
            console.error('Failed to delete employee:', error);
            showAlert('An error occurred while deleting the employee');
        }
    }, 'Delete Employee');
};

const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/employees/education', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...educationForm, employee_id: employee?.id })
        });

        if (res.ok) {
            setShowEducationModal(false);
            setEducationForm({
                level: 'College',
                school_name: '',
                degree_course: '',
                year_graduated: '',
                honors_awards: ''
            });
            fetchEducation();
        } else {
            alert('Failed to add education record');
        }
    } catch (error) {
        console.error('Failed to add education:', error);
    }
};

const handleDeleteEducation = (id: number) => {
    showConfirm('Delete this education record?', async () => {
        try {
            const res = await fetch(`/api/employees/education?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchEducation();
        } catch (error) {
            console.error('Failed to delete education:', error);
        }
    }, 'Delete Education');
};

const generateAttendanceReport = async () => {
    if (!employee) return;
    setGeneratingReport(true);

    try {
        // Fetch detailed records
        const res = await fetch(`/api/attendance?employee_id=${employee.id}&start_date=${reportStartDate}&end_date=${reportEndDate}`);
        if (!res.ok) throw new Error('Failed to fetch attendance records');

        const records: any[] = await res.json();

        // Sort records by date descending
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text('Individual Attendance Report', 14, 20);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Employee: ${employee.first_name} ${employee.last_name} (${employee.employee_id})`, 14, 30);
        doc.text(`Department: ${employee.department}`, 14, 36);
        doc.text(`Period: ${format(new Date(reportStartDate), 'MMM dd, yyyy')} to ${format(new Date(reportEndDate), 'MMM dd, yyyy')}`, 14, 42);
        doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 48);

        // Summary for the period
        const periodStats = {
            present: records.filter(r => r.status === 'Present').length,
            late: records.filter(r => r.status === 'Late').length,
            absent: records.filter(r => r.status === 'Absent').length,
            onLeave: records.filter(r => r.status === 'On Leave').length,
            halfDay: records.filter(r => r.status === 'Half-Day').length
        };

        doc.setDrawColor(200);
        doc.line(14, 54, 196, 54);
        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.text(`Summary for selected period:`, 14, 60);
        doc.text(`Present: ${periodStats.present}   Late: ${periodStats.late}   Absent: ${periodStats.absent}   On Leave: ${periodStats.onLeave}`, 14, 66);

        // Table
        const tableData = records.map(att => [
            format(new Date(att.date), 'MMM dd, yyyy (EEE)'),
            att.time_in || '-',
            att.time_out || '-',
            att.status,
            att.remarks || ''
        ]);

        autoTable(doc, {
            startY: 75,
            head: [['Date', 'Time In', 'Time Out', 'Status', 'Remarks']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 10 },
            columnStyles: {
                0: { fontStyle: 'bold' }
            }
        });

        doc.save(`Attendance_${employee.last_name}_${reportStartDate}_to_${reportEndDate}.pdf`);

    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate attendance report');
    } finally {
        setGeneratingReport(false);
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
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={employee.profile_picture || "/images/profile_placeholder.png"}
                                alt="Profile"
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '4px solid white',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    backgroundColor: 'var(--gray-100)'
                                }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src !== window.location.origin + "/images/profile_placeholder.png") {
                                        target.src = "/images/profile_placeholder.png";
                                    }
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    background: 'var(--primary-600)',
                                    color: 'white',
                                    border: '2px solid white',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                title="Update Profile Picture"
                            >
                                📷
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handlePhotoUpload}
                            />
                        </div>                            <div>
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
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button
                            onClick={handleDelete}
                            className="btn btn-danger"
                            style={{ background: 'var(--danger-600)', color: 'white', border: 'none' }}
                        >
                            🗑️ Delete
                        </button>
                        <button
                            onClick={generateProfilePDF}
                            disabled={generatingProfile}
                            className="btn btn-secondary"
                            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                        >
                            {generatingProfile ? '⏳ Generating...' : '📄 Export 201 File'}
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
                                <div style={{ fontWeight: '600' }}>{employee.contact_number || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                    Email Address
                                </div>
                                <div style={{ fontWeight: '600' }}>{employee.email_address || '-'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                                    Address
                                </div>
                                <div style={{ fontWeight: '600' }}>{employee.address || '-'}</div>
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





                {/* Attendance Summary */}
                <div className="card mb-3">
                    <div className="card-header">
                        <div className="card-title">
                            <span>📅</span>
                            Attendance Summary
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <input
                                type="date"
                                value={reportStartDate}
                                onChange={(e) => setReportStartDate(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: 'auto' }}
                            />
                            <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                            <input
                                type="date"
                                value={reportEndDate}
                                onChange={(e) => setReportEndDate(e.target.value)}
                                className="form-input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: 'auto' }}
                            />
                            <button
                                onClick={generateAttendanceReport}
                                disabled={generatingReport}
                                className="btn btn-sm btn-outline"
                            >
                                {generatingReport ? '⏳' : '📥 Report'}
                            </button>
                        </div>
                    </div>
                    <div className="card-body">
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <LeaveCreditsWidget used={attendanceSummary.totalPaidLeaves} total={5} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', textAlign: 'center' }}>
                            <div style={{ padding: 'var(--spacing-sm)', background: 'var(--danger-50)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger-700)' }}>{attendanceSummary.late}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--danger-600)' }}>Total Lates</div>
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

                            <div
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDragActive(false);

                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                                style={{
                                    border: `2px dashed ${dragActive ? 'var(--primary-500)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--spacing-lg)',
                                    textAlign: 'center',
                                    background: dragActive ? 'var(--primary-50)' : 'var(--bg-secondary)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>☁️</div>
                                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                        Drag & Drop your file here
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                        or click to browse
                                    </div>
                                </div>

                                {pendingFile ? (
                                    <div style={{
                                        marginTop: 'var(--spacing-md)',
                                        padding: 'var(--spacing-md)',
                                        background: '#fff',
                                        border: '1px solid var(--primary-200)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--spacing-md)',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <span style={{ fontSize: '1.5rem' }}>📄</span>
                                            <span style={{ fontWeight: '500' }}>{pendingFile.name}</span>
                                            <button
                                                onClick={() => setPendingFile(null)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                                            >
                                                ❌
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', width: '100%', justifyContent: 'center' }}>
                                            <select
                                                value={selectedDocType}
                                                onChange={(e) => setSelectedDocType(e.target.value)}
                                                className="form-input"
                                                style={{ width: 'auto', minWidth: '200px' }}
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
                                            <button
                                                onClick={confirmUpload}
                                                className="btn btn-primary"
                                            >
                                                Upload Now
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="file"
                                            id="fileInput"
                                            style={{ display: 'none' }}
                                            accept=".pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileSelect(file);
                                                e.target.value = ''; // Reset input
                                            }}
                                        />
                                        <button
                                            onClick={() => document.getElementById('fileInput')?.click()}
                                            className="btn btn-primary"
                                        >
                                            Browse Files
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-lg)' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                                Uploaded Files
                            </h4>
                            <div id="fileList">
                                <FileList employeeId={employee.employee_id} showAlert={showAlert} showConfirm={showConfirm} refreshTrigger={refreshFiles} />
                            </div>
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
        {
            showEducationModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                        <div className="card-header">
                            <div className="card-title">Add Educational Attainment</div>
                            <button onClick={() => setShowEducationModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleAddEducation}>
                                <div className="form-group">
                                    <label className="form-label">Level</label>
                                    <select
                                        className="form-input"
                                        value={educationForm.level}
                                        onChange={e => setEducationForm({ ...educationForm, level: e.target.value })}
                                        required
                                    >
                                        <option value="Elementary">Elementary</option>
                                        <option value="High School">High School</option>
                                        <option value="Senior High">Senior High</option>
                                        <option value="Vocational">Vocational</option>
                                        <option value="College Level">College Level</option>
                                        <option value="College">College</option>
                                        <option value="Post Graduate">Post Graduate</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">School Name</label>
                                    <input
                                        className="form-input"
                                        value={educationForm.school_name}
                                        onChange={e => setEducationForm({ ...educationForm, school_name: e.target.value })}
                                        required
                                        placeholder="e.g. University of the Philippines"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Degree / Course</label>
                                    <input
                                        className="form-input"
                                        value={educationForm.degree_course}
                                        onChange={e => setEducationForm({ ...educationForm, degree_course: e.target.value })}
                                        placeholder="e.g. BS Computer Science (Optional for Elem/HS)"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Year Graduated</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        value={educationForm.year_graduated}
                                        onChange={e => setEducationForm({ ...educationForm, year_graduated: e.target.value })}
                                        required
                                        placeholder="YYYY"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Honors / Awards</label>
                                    <input
                                        className="form-input"
                                        value={educationForm.honors_awards}
                                        onChange={e => setEducationForm({ ...educationForm, honors_awards: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                                    <button type="button" onClick={() => setShowEducationModal(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )
        }
        <Modal
            isOpen={modalOpen}
            title={modalTitle}
            message={modalMessage}
            onClose={() => setModalOpen(false)}
            type={modalType}
            onConfirm={onConfirm}
        />
    </DashboardLayout >
);
}
