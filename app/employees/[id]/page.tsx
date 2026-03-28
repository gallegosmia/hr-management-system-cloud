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
    const tabs = ['Overview', 'Performance', 'Attendance & Leaves'];

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

    const handleDownloadQR = () => {
        const svg = document.getElementById('attendance-qr-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width + 40;
            canvas.height = img.height + 40;
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20);

                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `QR_${employee?.employee_id || 'Attendance'}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            }
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        showAlert('QR Code download started', 'Success');
    };

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
                            <div className="relative mb-5 group cursor-pointer" onClick={() => { setEditSection('basic'); setEditModalOpen(true); }}>
                                <div className="w-40 h-40 rounded-2xl border-[6px] border-[#E0E7FF] shadow-inner overflow-hidden flex items-center justify-center bg-[#F1F5F9] relative">
                                    {employee.profile_picture ? (
                                        <img src={employee.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl font-bold text-slate-300">{employee.first_name[0]}{employee.last_name[0]}</span>
                                    )}

                                    {/* Upload Overlay */}
                                    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[2px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white mb-2">
                                            <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                                            <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-white text-xs font-bold uppercase tracking-wider">Upload Photo</span>
                                    </div>
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
                            <div className="w-full border-t border-gray-100 pt-6 space-y-4 relative group/work">
                                <button
                                    onClick={() => { setEditSection('work'); setEditModalOpen(true); }}
                                    className="absolute top-6 right-0 text-slate-300 hover:text-blue-600 opacity-0 group-hover/work:opacity-100 transition-opacity p-1"
                                    title="Edit Job Details"
                                >
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                </button>
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
                        <div onClick={handleDownloadQR} title="Click to download QR Code" className="p-0 rounded-[20px] overflow-hidden shadow-lg shadow-blue-500/20 cursor-pointer transition-transform hover:scale-[1.02] group/qr relative">
                            <div className="bg-[#1D4ED8] p-6 flex flex-row items-center gap-5 relative h-full">
                                {/* Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10 group-hover/qr:bg-white/20 transition-all"></div>
                                {/* Download Overlay Icon */}
                                <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-end pr-8 z-20">
                                    <div className="bg-white text-blue-700 p-2 rounded-full shadow-lg">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    </div>
                                </div>
                                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-lg shrink-0 z-10 p-2">
                                    {/* Real QR Code for Attendance */}
                                    <QRCodeSVG
                                        id="attendance-qr-svg"
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

                        {/* Back Button */}
                        <div className="flex justify-start">
                            <Link href="/employees" className="flex items-center gap-2 text-slate-500 hover:text-[#1D4ED8] transition-colors group">
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-200 group-hover:bg-blue-50 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-[#1D4ED8]"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                </div>
                                <span className="text-sm font-bold">Return to Masterlist</span>
                            </Link>
                        </div>

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
                                <div className="hidden md:flex bg-white rounded-lg border border-gray-100 p-1 shadow-sm items-center">
                                    <button className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#1D4ED8] hover:bg-slate-50 rounded-md flex items-center gap-2 transition-colors">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        This Month
                                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="ml-1 opacity-50">
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/compensation/${employee.id}`}
                                        className="h-10 px-4 bg-emerald-500 rounded-lg border border-emerald-600 shadow-md shadow-emerald-500/30 flex items-center justify-center text-white hover:bg-emerald-600 transition-colors gap-2 text-xs font-bold"
                                        title="Manage Compensation"
                                    >
                                        <span>💳</span> Manage Pay
                                    </Link>
                                    <button
                                        onClick={() => { setEditSection('basic'); setEditModalOpen(true); }}
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
                                    <div className="bg-white rounded-[20px] p-8 shadow-sm group">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
                                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-[#0F172A]">Current Info</h3>
                                            </div>
                                            {/* Edit Sections Dropdown / Buttons */}
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditSection('contact'); setEditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit Contact Info">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                </button>
                                                <button onClick={() => { setEditSection('address'); setEditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit Address">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                </button>
                                                <button onClick={() => { setEditSection('emergency'); setEditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit Emergency Contact">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </button>
                                            </div>
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
                                            <div className="col-span-2 bg-[#EFF6FF] p-5 rounded-xl border border-[#DBEAFE] relative group/emergency">
                                                <button
                                                    onClick={() => { setEditSection('emergency'); setEditModalOpen(true); }}
                                                    className="absolute top-4 right-4 text-blue-300 hover:text-blue-600 opacity-0 group-hover/emergency:opacity-100 transition-opacity"
                                                >
                                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                                </button>
                                                <p className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wide mb-2 flex items-center gap-1">
                                                    Emergency Contact
                                                </p>
                                                <p className="text-sm font-bold text-[#0F172A]">{employee.emergency_contact_name || 'Not set'} <span className="font-normal text-slate-500">({employee.emergency_contact_relationship || 'Contact'})</span></p>
                                                <p className="text-xs text-slate-500 mt-1 font-medium">{employee.emergency_contact_number}</p>
                                            </div>
                                            <div className="col-span-2 relative group/address">
                                                <button
                                                    onClick={() => { setEditSection('address'); setEditModalOpen(true); }}
                                                    className="absolute top-0 right-0 text-slate-300 hover:text-blue-600 opacity-0 group-hover/address:opacity-100 transition-opacity"
                                                >
                                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                                                </button>
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
