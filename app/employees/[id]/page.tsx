'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import Modal from '@/components/Modal';
import { QRCodeSVG } from 'qrcode.react';

// Components
import PersonalInfoTab from '@/components/employee/PersonalInfoTab';
import FileList from '@/components/employee/FileList';
import EditEmployeeModal from '@/components/employee/EditEmployeeModal';
import AttendanceTab from '@/components/employee/AttendanceTab';
import LeaveHistoryTab from '@/components/employee/LeaveHistoryTab';
import TrainingsTab from '@/components/employee/TrainingsTab';
import ViolationsTab from '@/components/employee/ViolationsTab';
import CompensationTab from '@/components/employee/CompensationTab';
import AttendanceAndLeaveTab from '@/components/employee/AttendanceAndLeaveTab';

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
    gender?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    emergency_contact_relationship?: string;
}

export default function EmployeeProfileDashboard() {
    const params = useParams();
    const router = useRouter();

    // Data State
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // UI State
    const [activeTab, setActiveTab] = useState('Overview');
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editSection, setEditSection] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
    const [onConfirm, setOnConfirm] = useState<() => void>(() => { });

    // Tabs Configuration
    const tabs = ['Overview', 'Performance', 'Payroll & Benefits', 'Attendance & Leaves'];

    // --- Data Fetching ---
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    useEffect(() => {
        if (!params.id) return;
        const fetchData = async () => {
            try {
                const sessionId = localStorage.getItem('sessionId');
                const res = await fetch(`/api/employees?id=${params.id}`, {
                    headers: { 'x-session-id': sessionId || '' }
                });
                if (res.ok) {
                    const data = await res.json();
                    setEmployee(data);
                } else {
                    showAlert('Failed to load employee profile');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.id]);

    // --- Actions ---
    const showAlert = (message: string, title = 'System Message') => {
        setModalTitle(title);
        setModalMessage(message);
        setModalType('alert');
        setModalOpen(true);
    };

    const handleSaveEdit = async (updatedData: Partial<Employee>) => {
        if (!employee) return;
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId || '' },
                body: JSON.stringify({ id: employee.id, ...updatedData })
            });

            if (res.ok) {
                setEmployee({ ...employee, ...updatedData });
                setEditModalOpen(false);
                showAlert('Profile updated successfully', 'Success');
            } else {
                showAlert('Update failed');
            }
        } catch (error) {
            showAlert('Network error during update');
        }
    };

    const getTenure = (dateHired: string) => {
        if (!dateHired) return { display: 'New Hire', years: 0 };
        const start = new Date(dateHired);
        const end = new Date();
        const years = differenceInYears(end, start);
        const months = differenceInMonths(end, start) % 12;
        return {
            display: years > 0 ? `${years} Years` : '0',
            years: years + (months / 12)
        };
    };

    if (loading) return <DashboardLayout><div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div></DashboardLayout>;
    if (!employee) return <DashboardLayout><div className="p-8 text-center text-gray-500">Employee not found</div></DashboardLayout>;

    const tenure = getTenure(employee.date_hired);

    return (
        <DashboardLayout>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} message={modalMessage} type={modalType} onConfirm={onConfirm} />

            <EditEmployeeModal
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSaveEdit}
                employee={employee}
                section={editSection}
            />

            {/* MAIN CONTAINER: Centered, Max-Width 1200px */}
            <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-800 flex justify-center p-6 md:p-8">
                <div className="w-full max-w-[1240px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* --- LEFT COLUMN: IDENTITY CARD (FIXED) --- */}
                    <aside className="lg:col-span-4 sticky top-6 space-y-4">
                        <div className="bg-white rounded-[20px] shadow-sm p-8 flex flex-col items-center text-center">

                            {/* Avatar */}
                            <div className="relative mb-5 group cursor-pointer" onClick={() => { setEditSection('personal'); setEditModalOpen(true); }}>
                                <div className="w-40 h-40 rounded-2xl border-[6px] border-[#E0E7FF] shadow-inner overflow-hidden flex items-center justify-center bg-[#F1F5F9]">
                                    {employee.profile_picture ? (
                                        <img src={employee.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-bold text-slate-300">{employee.first_name[0]}{employee.last_name[0]}</span>
                                    )}
                                </div>
                                <div className={`absolute bottom-3 right-3 w-6 h-6 border-[3px] border-white rounded-full ${employee.employment_status === 'Resigned' ? 'bg-gray-400' : 'bg-[#10B981]'}`}></div>
                            </div>

                            {/* Identity Info */}
                            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">{employee.first_name} {employee.last_name}</h1>
                            <p className="text-[#3B82F6] font-bold text-sm mb-5">{employee.position}</p>

                            <div className="flex flex-wrap gap-2 justify-center mb-8">
                                <span className="px-3 py-1 bg-[#EFF6FF] text-[#1D4ED8] text-[10px] font-bold rounded-lg uppercase tracking-wide">
                                    {employee.department}
                                </span>
                                <span className="px-3 py-1 bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold rounded-lg uppercase tracking-wide">
                                    ID: #{employee.employee_id}
                                </span>
                            </div>

                            {/* Details List */}
                            <div className="w-full border-t border-gray-100 pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-medium">Position</span>
                                    <span className="font-bold text-slate-700 truncate max-w-[140px]" title={employee.position}>{employee.position}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-medium">Department</span>
                                    <span className="font-bold text-slate-700 truncate max-w-[140px]" title={employee.department}>{employee.department}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400 font-medium">Office</span>
                                    <span className="font-bold text-slate-700 truncate max-w-[140px]">{employee.branch || 'Headquarters'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attendance QR Card */}
                        <div className="p-0 rounded-[20px] overflow-hidden shadow-lg shadow-blue-500/20 cursor-pointer transition-transform hover:scale-[1.02]">
                            <div className="bg-[#1D4ED8] p-6 flex flex-row items-center gap-5 relative h-full">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>

                                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg shrink-0 z-10 p-2">
                                    {/* Real QR Code for Attendance */}
                                    <QRCodeSVG
                                        value={employee.employee_id || 'UNKNOWN'}
                                        size={64}
                                        fgColor="#1e3a8a"
                                        bgColor="#ffffff"
                                        level="H"
                                    />
                                </div>
                                <div className="z-10">
                                    <h3 className="font-bold text-white text-lg leading-tight mb-1">Attendance QR</h3>
                                    <p className="text-blue-100 text-[11px] font-medium leading-tight opacity-80 max-w-[120px]">Scan at kiosk for daily time in/out logging.</p>
                                </div>
                            </div>
                        </div>
                    </aside>


                    {/* --- RIGHT COLUMN: CONTENT AREA --- */}
                    <main className="lg:col-span-8 w-full space-y-6">

                        {/* HEADER: Tabs + Actions */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            {/* Tabs */}
                            <div className="flex space-x-1 bg-transparent">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`
                                            px-6 py-2.5 rounded-lg text-sm font-bold transition-all
                                            ${activeTab === tab
                                                ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-500/20'
                                                : 'text-slate-500 hover:text-slate-800 hover:bg-white'}
                                        `}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Action Buttons (Edit / Share / View Mode) */}
                            <div className="flex items-center gap-3">
                                <div className="hidden md:flex bg-white rounded-lg border border-gray-100 p-1 shadow-sm">
                                    <button className="px-3 py-1.5 text-xs font-bold text-[#1D4ED8] bg-[#EFF6FF] rounded-md flex items-center gap-2">
                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z" /></svg>
                                        Grid
                                    </button>
                                    <button className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 rounded-md flex items-center gap-2 transition-colors">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                        Focus
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setEditSection('personal'); setEditModalOpen(true); }}
                                        className="w-10 h-10 bg-[#1D4ED8] rounded-lg border border-blue-700 shadow-md shadow-blue-500/30 flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
                                    >
                                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                    </button>
                                    <button className="w-10 h-10 bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- TAB CONTENT --- */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                            {/* OVERVIEW TAB */}
                            {activeTab === 'Overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* 1. Current Info Card */}
                                    <div className="bg-white rounded-[20px] p-8 shadow-sm">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
                                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-[#0F172A]">Current Info</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</p>
                                                <p className="text-sm font-semibold text-slate-800 truncate" title={employee.email_address}>{employee.email_address || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Phone</p>
                                                <p className="text-sm font-semibold text-slate-800">{employee.contact_number || '-'}</p>
                                            </div>
                                            <div className="col-span-2 bg-[#EFF6FF] p-5 rounded-xl border border-[#DBEAFE]">
                                                <p className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wide mb-2 flex items-center gap-1">
                                                    ! Emergency Contact
                                                </p>
                                                <p className="text-sm font-bold text-[#0F172A]">{employee.emergency_contact_name || 'Not set'} <span className="font-normal text-slate-500">({employee.emergency_contact_relationship || 'Contact'})</span></p>
                                                <p className="text-xs text-slate-500 mt-1 font-medium">{employee.emergency_contact_number}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Address</p>
                                                <p className="text-sm font-semibold text-slate-800 line-clamp-2" title={employee.address}>{employee.address || '-'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Career Path Card */}
                                    <div className="bg-white rounded-[20px] p-8 shadow-sm">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
                                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-[#0F172A]">Career Path</h3>
                                        </div>

                                        <div className="mb-8 flex items-center gap-4 bg-transparent">
                                            <div className="w-[72px] h-[72px] bg-[#EFF6FF] rounded-xl flex flex-col items-center justify-center text-center">
                                                <span className="text-2xl font-bold text-[#1D4ED8] leading-none tracking-tight">{Math.floor(tenure.years * 10) / 10}</span>
                                                <span className="text-[9px] font-bold text-[#60A5FA] uppercase mt-0.5 tracking-wide">Years</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#0F172A] text-sm mb-0.5">Total Tenure</p>
                                                <p className="text-xs text-slate-400 font-medium">Joined {format(new Date(employee.date_hired), 'MMMM dd, yyyy')}</p>
                                                <div className="w-32 bg-gray-100 h-1.5 mt-2 rounded-full overflow-hidden">
                                                    <div className="bg-[#1D4ED8] h-full w-2/3 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                                            <div className="relative">
                                                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-[#1D4ED8] border-2 border-white ring-4 ring-[#EFF6FF]"></div>
                                                <p className="text-[11px] font-bold text-[#1D4ED8] mb-1">{format(new Date(employee.date_hired), 'yyyy')} - Present</p>
                                                <p className="font-bold text-[#0F172A] text-sm">{employee.position}</p>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">Current Role</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Docs & Certs Card */}
                                    <div className="bg-white rounded-[20px] p-8 shadow-sm lg:col-span-1">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
                                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-[#0F172A]">Docs & Certs</h3>
                                            </div>
                                            <button onClick={() => setActiveTab('Documents')} className="text-xs font-bold text-[#1D4ED8] hover:underline">View All</button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center p-4 rounded-xl border border-gray-100 bg-white hover:bg-slate-50 transition-colors group">
                                                <div className="w-8 h-8 rounded bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                                                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                                </div>
                                                <div className="ml-4 min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-[#0F172A] truncate">Employment Contract.pdf</p>
                                                    <p className="text-[10px] text-[#22C55E] font-bold uppercase mt-0.5">Verified</p>
                                                </div>
                                                <button className="text-slate-300 hover:text-[#1D4ED8]"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" /></svg></button>
                                            </div>
                                            <div className="flex items-center p-4 rounded-xl border border-gray-100 bg-white hover:bg-slate-50 transition-colors group">
                                                <div className="w-8 h-8 rounded bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
                                                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
                                                </div>
                                                <div className="ml-4 min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-[#0F172A] truncate">Professional Certification</p>
                                                    <p className="text-[10px] text-[#22C55E] font-bold uppercase mt-0.5">Verified</p>
                                                </div>
                                                <button className="text-slate-300 hover:text-[#1D4ED8]"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg></button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Recent Activities */}
                                    <div className="bg-white rounded-[20px] p-8 shadow-sm lg:col-span-1 flex flex-col">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
                                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-[#0F172A]">Recent Activities</h3>
                                        </div>

                                        <div className="space-y-6 flex-1">
                                            <div className="flex gap-4">
                                                <div className="mt-1.5 w-2 h-2 rounded-full bg-[#3B82F6] shrink-0 ring-4 ring-[#EFF6FF]"></div>
                                                <div>
                                                    <p className="font-bold text-sm text-[#0F172A] leading-tight">Performance Review Completed</p>
                                                    <p className="text-xs text-slate-500 mt-1">Rating: 4.8/5.0 — "Excellent Leadership"</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wide">2 Days Ago</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-200 shrink-0"></div>
                                                <div>
                                                    <p className="font-bold text-sm text-[#0F172A] leading-tight">New Module: Data Security 101</p>
                                                    <p className="text-xs text-slate-500 mt-1">Completed training course with 100% score</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-wide">Last Week</p>
                                                </div>
                                            </div>
                                        </div>


                                    </div>

                                </div>
                            )}

                            {/* OTHER TABS - Content Wrappers */}
                            {activeTab === 'Performance' && (
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-gray-50">Training & Development</h3>
                                        <TrainingsTab employeeId={employee.id} />
                                    </div>
                                    <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-gray-50">Disciplinary Records</h3>
                                        <ViolationsTab employeeId={employee.id} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Payroll & Benefits' && (
                                <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
                                    <CompensationTab employeeId={employee.id} employee={employee} onUpdate={() => window.location.reload()} />
                                </div>
                            )}

                            {activeTab === 'Attendance & Leaves' && (
                                <AttendanceAndLeaveTab employeeId={employee.id} />
                            )}

                            {/* Hidden/Direct Access for File Management Full View */}
                            {activeTab === 'Documents' && (
                                <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-gray-50">Document Repository</h3>
                                    <FileList employeeId={employee.employee_id} showAlert={showAlert} showConfirm={(msg, action) => {
                                        setModalTitle('Confirm'); setModalMessage(msg); setModalType('confirm'); setOnConfirm(() => action); setModalOpen(true);
                                    }} refreshTrigger={0} />
                                </div>
                            )}

                        </div>
                    </main>

                </div>
            </div >
        </DashboardLayout >
    );
}
