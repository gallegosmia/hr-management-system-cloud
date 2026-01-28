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
import AttendanceTab from '@/components/employee/AttendanceTab';
import LeaveHistoryTab from '@/components/employee/LeaveHistoryTab';
import PayrollHistoryTab from '@/components/employee/PayrollHistoryTab';
import PayrollDetailsTab from '@/components/employee/PayrollDetailsTab';

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

    const [user, setUser] = useState<any>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState('Personal info');
    const [tabs, setTabs] = useState(['Personal info', 'Payroll details', 'Documents', 'Payroll history', 'Leave history', 'Attendance']);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                if (parsedUser.role === 'Employee') {
                    setTabs(['Personal info', 'Documents', 'Payroll history', 'Leave history', 'Attendance']);
                }
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    }, []);

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
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
                // Security Check for Employees
                const userData = localStorage.getItem('user');
                const loggedUser = userData ? JSON.parse(userData) : null;
                if (loggedUser && loggedUser.role === 'Employee' && params.id !== String(loggedUser.employee_id)) {
                    router.push('/dashboard');
                    return;
                }

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

    const handleDeleteEmployee = async () => {
        if (!employee) return;

        showConfirm(
            `Are you sure you want to delete ${employee.first_name} ${employee.last_name}? This action cannot be undone.`,
            async () => {
                try {
                    const res = await fetch(`/api/employees?id=${employee.id}`, { method: 'DELETE' });
                    if (res.ok) {
                        router.push('/employees');
                    } else {
                        const data = await res.json();
                        showAlert(`Delete failed: ${data.error}`);
                    }
                } catch (error) {
                    console.error('Delete failed', error);
                    showAlert('Failed to delete due to network error');
                }
            },
            'Confirm Delete'
        );
    };

    const handleUpdatePayrollDetails = async (salaryInfo: any) => {
        if (!employee) return;
        try {
            const res = await fetch('/api/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: employee.id, salary_info: salaryInfo })
            });

            if (res.ok) {
                setEmployee({ ...employee, salary_info: salaryInfo });
                showAlert('Payroll details updated successfully', 'Success');
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
                    ['Gender', employee.gender || '-'],
                    ['Religion', (employee as any).religion || '-'],
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

            // --- EMERGENCY CONTACT ---
            yPos = addSectionHeader('Emergency Contact', yPos);
            autoTable(doc, {
                startY: yPos,
                body: [
                    ['Contact Name', (employee as any).emergency_contact_name || 'Not set'],
                    ['Contact Number', (employee as any).emergency_contact_number || '-'],
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

            <div className="employee-branded-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        background: '#fbbf24',
                        color: '#064e3b',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1.5rem',
                        boxShadow: '0 0 15px rgba(251, 191, 36, 0.4)'
                    }}>M</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.02em' }}>Melann Lending</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 500 }}>Investor Corporation</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{format(currentTime, 'EEEE, MMMM dd, yyyy')}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>at {format(currentTime, 'HH:mm:ss a')} PST</div>
                </div>
            </div>

            <div className="employee-201-bg" style={{ minHeight: 'calc(100vh - 70px)', padding: '2rem 0' }}>
                <div className="employee-201-pattern"></div>

                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 1.5rem',
                    textAlign: 'center',
                    marginBottom: '3rem'
                }}>
                    <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        Employee 201 File Information
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.125rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        "Lend. Empower. Grow."
                    </p>
                </div>

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', padding: '0 1rem 2rem' }}>

                    {/* Header / Breadcrumbs */}
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Link href="/employees" style={{
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '0.925rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>←</span> Return to Masterlist
                        </Link>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {user && user.role !== 'Employee' && (
                                <>
                                    <button
                                        onClick={handleDeleteEmployee}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            background: '#fef2f2',
                                            color: '#dc2626',
                                            border: '1px solid #fee2e2',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        <span>🗑️</span> Delete Employee
                                    </button>
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
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <span>📄</span> {generatingProfile ? 'Generating...' : 'Download 201 File PDF'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Navbar/Tabs */}
                    <div style={{
                        background: 'white',
                        padding: '0 1.5rem',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        border: '1px solid var(--gray-200)',
                        marginBottom: '2rem',
                        display: 'flex',
                        gap: '2.5rem',
                        overflowX: 'auto',
                        position: 'sticky',
                        top: '70px',
                        zIndex: 40
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '1.25rem 0',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: activeTab === tab ? '3px solid var(--primary-600)' : '3px solid transparent',
                                    color: activeTab === tab ? 'var(--primary-700)' : 'var(--gray-500)',
                                    fontWeight: activeTab === tab ? 700 : 500,
                                    cursor: 'pointer',
                                    fontSize: '0.925rem',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div>
                        {activeTab === 'Personal info' && (
                            <PersonalInfoTab
                                employee={employee}
                                onEdit={handleEdit}
                                onSave={handleSaveEdit}
                            />
                        )}

                        {activeTab === 'Documents' && (
                            <div>
                                {user && user.role !== 'Employee' && (
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
                                )}
                                <FileList
                                    employeeId={employee.employee_id}
                                    showAlert={showAlert}
                                    showConfirm={showConfirm}
                                    refreshTrigger={refreshFiles}
                                />
                            </div>
                        )}

                        {activeTab === 'Attendance' && (
                            <AttendanceTab employeeId={employee.id} />
                        )}

                        {activeTab === 'Leave history' && (
                            <LeaveHistoryTab employeeId={employee.id} />
                        )}

                        {activeTab === 'Payroll history' && (
                            <PayrollHistoryTab employeeId={employee.id} />
                        )}

                        {activeTab === 'Payroll details' && (
                            <PayrollDetailsTab
                                employee={employee}
                                onUpdate={handleUpdatePayrollDetails}
                            />
                        )}
                    </div>

                </div>
            </div>

            <style jsx global>{`
                .employee-201-bg {
                    background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
                    background-attachment: fixed;
                    position: relative;
                    overflow: hidden;
                }
                .employee-201-pattern {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    opacity: 0.15;
                    pointer-events: none;
                    background-image: 
                        linear-gradient(45deg, #fbbf24 25%, transparent 25%), 
                        linear-gradient(-45deg, #fbbf24 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #fbbf24 75%), 
                        linear-gradient(-45deg, transparent 75%, #fbbf24 75%);
                    background-size: 100px 100px;
                    background-position: 0 0, 0 50px, 50px 50px, 50px 0;
                    z-index: 0;
                }
                .employee-branded-header {
                    background: rgba(6, 78, 59, 0.95);
                    backdrop-filter: blur(10px);
                    border-bottom: 2px solid #fbbf24;
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: white;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
            `}</style>
        </DashboardLayout>
    );
}
