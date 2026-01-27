'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import Modal from '@/components/Modal';

import PersonalInfoTab from '@/components/employee/PersonalInfoTab';
import FileList from '@/components/employee/FileList';
import EditEmployeeModal from '@/components/employee/EditEmployeeModal';

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
    contact_number?: string;
    email_address?: string;
    address?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
    civil_status?: string;
    profile_picture?: string;
    salary_info?: any;
    education?: any[];
    // Extended fields for UI (may be missing)
    gender?: string;
    place_of_birth?: string;
    blood_type?: string;
    religion?: string;
    citizen_id_address?: string;
    training_details?: string;
    disciplinary_details?: string;
}

export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [education, setEducation] = useState<any[]>([]);

    // Tab State
    const [activeTab, setActiveTab] = useState('Personal info');
    const tabs = ['Personal info', 'Payroll details', 'Documents', 'Payroll history', 'Medical history', 'Leave history', 'Attendance'];

    // Modal State
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editSection, setEditSection] = useState('');
    const [modalOpen, setModalOpen] = useState(false); // For alerts
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
    const [onConfirm, setOnConfirm] = useState<() => void>(() => { });

    // PDF & Stats State
    const [attendanceSummary, setAttendanceSummary] = useState({ late: 0, absent: 0, onLeave: 0, totalPaidLeaves: 0 });
    const [reportStartDate, setReportStartDate] = useState(format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'));
    const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [generatingProfile, setGeneratingProfile] = useState(false);

    // File Upload State
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [selectedDocType, setSelectedDocType] = useState('Contract');
    const [refreshFiles, setRefreshFiles] = useState(0);

    const showAlert = (message: string, title = 'System Message') => {
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

    // Fetch Data
    useEffect(() => {
        if (!params.id) return;

        const fetchData = async () => {
            try {
                // Fetch Employee
                const empRes = await fetch(`/api/employees?id=${params.id}`);
                const empData = await empRes.json();

                if (empRes.ok) {
                    // Fetch Education
                    try {
                        const eduRes = await fetch(`/api/employees/education?employee_id=${empData.id}`);
                        if (eduRes.ok) {
                            const eduData = await eduRes.json();
                            empData.education = eduData;
                            setEducation(eduData);
                        }
                    } catch (e) {
                        console.error('Failed to fetch education', e);
                    }
                    setEmployee(empData);

                    // Fetch Attendance Summary
                    if (empData.id) {
                        fetchAttendanceSummary(empData.id, reportStartDate, reportEndDate);
                    }
                } else {
                    showAlert('Failed to load employee data');
                }
            } catch (error) {
                console.error(error);
                showAlert('Network error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

    const fetchAttendanceSummary = async (empId: number, start: string, end: string) => {
        try {
            const res = await fetch(`/api/attendance/report/individual?employeeId=${empId}&start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                setAttendanceSummary({
                    late: data.summary.late || 0,
                    absent: data.summary.absent || 0,
                    onLeave: data.summary.present_on_leave || data.summary.onLeave || 0,
                    totalPaidLeaves: data.summary.totalPaidLeavesUsed || data.summary.paidLeavesUsed || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch attendance summary:', err);
        }
    };

    // Handlers
    const handleFileUpload = async () => {
        if (!pendingFile || !employee) return;

        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('employeeId', employee.employee_id);
        formData.append('documentType', selectedDocType);

        try {
            const res = await fetch('/api/employees/documents', { method: 'POST', body: formData });
            if (res.ok) {
                showAlert('File uploaded successfully');
                setPendingFile(null);
                setRefreshFiles(prev => prev + 1);
            } else {
                const data = await res.json();
                showAlert(`Upload failed: ${data.error || 'Unknown error'}`);
            }
        } catch (e) {
            showAlert('Upload failed due to network error');
        }
    };


    const handleEdit = (section: string) => {
        setEditSection(section);
        setEditModalOpen(true);
    };

    const handleSaveEdit = async (updatedData: Partial<Employee>) => {
        if (!employee) return;

        try {
            const res = await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: employee.id, ...updatedData })
            });

            if (res.ok) {
                setEmployee({ ...employee, ...updatedData });
                showAlert('Employee details updated successfully', 'Success');
                setEditModalOpen(false);
            } else {
                const data = await res.json();
                showAlert(`Failed to update: ${data.error}`);
            }
        } catch (error) {
            console.error('Update failed', error);
            showAlert('Failed to update due to network error');
        }
    };



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

            // Picture Placeholder if not available
            if (employee.profile_picture) {
                try {
                    doc.addImage(employee.profile_picture, 'JPEG', 28, yPos + 10, 30, 30);
                } catch (e) {
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

            // Save
            doc.save(`201_File_${employee.last_name}_${employee.employee_id}.pdf`);

        } catch (error) {
            console.error('Error generating profile PDF:', error);
            showAlert(`Failed to generate profile PDF: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setGeneratingProfile(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>Loading...</div>
            </DashboardLayout>
        );
    }

    if (!employee) {
        return (
            <DashboardLayout>
                <div style={{ padding: '2rem' }}>Employee not found.</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                message={modalMessage}
                type={modalType}
                onConfirm={onConfirm}
            />

            {employee && (
                <EditEmployeeModal
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    onSave={handleSaveEdit}
                    employee={employee}
                    section={editSection}
                />
            )}

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 2rem' }}>

                {/* Header / Breadcrumbs */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/employees" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
                        &larr; Back to Employees
                    </Link>
                    <button
                        onClick={generateProfilePDF}
                        disabled={generatingProfile}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: generatingProfile ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        {generatingProfile ? 'Generating...' : 'Download 201 File PDF'}
                    </button>
                </div>

                {/* Navbar/Tabs */}
                <div style={{
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '2rem',
                    display: 'flex',
                    gap: '2rem',
                    overflowX: 'auto'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '1rem 0',
                                border: 'none',
                                background: 'none',
                                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                                color: activeTab === tab ? '#2563eb' : '#6b7280',
                                fontWeight: activeTab === tab ? 600 : 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'Personal info' && (
                        <PersonalInfoTab employee={employee} onEdit={handleEdit} />
                    )}

                    {activeTab === 'Documents' && (
                        <div>
                            <div style={{
                                background: 'white',
                                padding: '1.5rem',
                                borderRadius: '16px',
                                border: '1px solid #f3f4f6',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>Upload Document</h3>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <select
                                        value={selectedDocType}
                                        onChange={(e) => setSelectedDocType(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    >
                                        <option value="Contract">Contract</option>
                                        <option value="Medical">Medical</option>
                                        <option value="Identification">Identification</option>
                                        <option value="Legal">Legal</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                                    />
                                    <button
                                        onClick={handleFileUpload}
                                        disabled={!pendingFile}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: pendingFile ? '#2563eb' : '#9ca3af',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: pendingFile ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        Upload
                                    </button>
                                </div>
                            </div>
                            <FileList
                                employeeId={employee.employee_id}
                                showAlert={showAlert}
                                showConfirm={showConfirm}
                                refreshTrigger={refreshFiles}
                            />
                        </div>
                    )}

                    {activeTab === 'Attendance' && (
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #f3f4f6', textAlign: 'center', color: '#6b7280' }}>
                            <p>Attendance Record functionality is available in the specific Attendance module.</p>
                            <Link href="/attendance" style={{ color: '#2563eb', fontWeight: 600 }}>Go to Attendance Module</Link>
                        </div>
                    )}

                    {/* Handlers for other tabs (Placeholders) */}
                    {['Payroll details', 'Payroll history', 'Medical history', 'Leave history'].includes(activeTab) && (
                        <div style={{ background: 'white', padding: '3rem', borderRadius: '16px', border: '1px solid #f3f4f6', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
                            <h3 style={{ color: '#111827' }}>{activeTab}</h3>
                            <p style={{ color: '#6b7280' }}>This section is currently under development.</p>
                        </div>
                    )}
                </div>

            </div>
        </DashboardLayout>
    );
}
