'use client';

import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import Modal from '@/components/Modal';
import EmployeeCard from '@/components/EmployeeCard';

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
    file_completion_status: string;
    contact_number?: string;
    email_address?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
    civil_status?: string;
    profile_picture?: string;
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Adjusted for fixed screen height to fit comfortably

    const [departments, setDepartments] = useState<string[]>([]);
    const [branches, setBranches] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'alert' | 'confirm'>('alert');
    const [onConfirm, setOnConfirm] = useState<() => void>(() => { });
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setCurrentUser(user);
                if (user.role === 'Employee') {
                    window.location.href = '/profile';
                    return;
                }
                // Force branch filter for HR
                if (user.role === 'HR' && user.assigned_branch) {
                    setBranchFilter(user.assigned_branch);
                }
            } catch (e) {
                console.error("Auth check failed", e);
            }
        }
        fetchEmployees();
        fetchDepartments();
        fetchBranches();
    }, []);

    useEffect(() => {
        filterEmployees();
    }, [employees, searchQuery, departmentFilter, branchFilter, statusFilter]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, departmentFilter, branchFilter, statusFilter]);

    const fetchEmployees = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees', {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }
                throw new Error('Failed to fetch employees');
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                setEmployees(data);
                setFilteredEmployees(data);
            } else {
                setEmployees([]);
                setFilteredEmployees([]);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
            setEmployees([]);
            setFilteredEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: number, name: string) => {
        setModalTitle('Confirm Delete');
        setModalMessage(`Are you sure you want to delete ${name}? This action cannot be undone.`);
        setModalType('confirm');
        setSelectedEmployeeId(id);
        setOnConfirm(() => () => performDelete(id));
        setModalOpen(true);
    };

    const performDelete = async (id: number) => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/employees?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
            if (res.ok) {
                setEmployees(prev => prev.filter(e => e.id !== id));
                setFilteredEmployees(prev => prev.filter(e => e.id !== id));
            } else {
                const data = await res.json();
                alert(`Delete failed: ${data.error}`);
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete due to network error');
        }
    };

    const fetchDepartments = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees/departments', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees/branches', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();
            setBranches(data);
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        }
    };

    const filterEmployees = () => {
        let filtered = employees;

        if (searchQuery) {
            const query = searchQuery.trim().toLowerCase();
            if (query) {
                filtered = filtered.filter(emp => {
                    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
                    const altFullName = `${emp.last_name}, ${emp.first_name}`.toLowerCase();
                    const email = (emp.email_address || '').toLowerCase();
                    const empId = emp.employee_id.toLowerCase();

                    return empId.includes(query) ||
                        emp.last_name.toLowerCase().includes(query) ||
                        emp.first_name.toLowerCase().includes(query) ||
                        fullName.includes(query) ||
                        altFullName.includes(query) ||
                        email.includes(query) ||
                        emp.department.toLowerCase().includes(query) ||
                        emp.position.toLowerCase().includes(query);
                });
            }
        }

        if (departmentFilter) {
            filtered = filtered.filter(emp => emp.department === departmentFilter);
        }

        if (branchFilter) {
            const filterNorm = branchFilter.trim().toUpperCase().replace(' BRANCH', '');
            filtered = filtered.filter(emp => {
                if (!emp.branch) return false;
                const empNorm = emp.branch.trim().toUpperCase().replace(' BRANCH', '');
                return empNorm === filterNorm;
            });
        }

        if (statusFilter) {
            filtered = filtered.filter(emp => emp.employment_status === statusFilter);
        }

        setFilteredEmployees(filtered);
    };

    const exportToPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const date = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('Digital 201 File Masterlist', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${date}`, 14, 30);
        doc.text(`Total Employees: ${filteredEmployees.length}`, 14, 36);

        const tableData = filteredEmployees.map(emp => [
            emp.employee_id,
            `${emp.last_name}, ${emp.first_name}`,
            emp.department,
            emp.position,
            emp.branch || '-',
            emp.employment_status,
            new Date(emp.date_hired).toLocaleDateString('en-PH'),
            emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-PH') : '-',
            emp.contact_number || '-',
            emp.email_address || '-',
            emp.sss_number || '-',
            emp.philhealth_number || '-',
            emp.pagibig_number || '-',
            emp.tin || '-',
            emp.civil_status || '-',
            emp.file_completion_status
        ]);

        autoTable(doc, {
            startY: 45,
            head: [['ID', 'Name', 'Dept', 'Position', 'Branch', 'Status', 'Hired', 'Birthday', 'Contact', 'Email', 'SSS', 'P.H', 'P.I', 'TIN', 'Civil', '201 Status']],
            body: tableData,
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 7, cellPadding: 1 },
            margin: { top: 45 },
            theme: 'grid'
        });

        doc.save(`201_File_Masterlist_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const activeCount = employees.filter(e => e.employment_status !== 'Resigned' && e.employment_status !== 'Terminated').length;
    const inactiveCount = employees.length - activeCount;

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', width: '100%' }}>
                    <div className="loader"></div>
                    <style jsx>{`
                        .loader {
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #3b82f6;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
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

            {/* Main Locked Container */}
            <div style={{
                height: 'calc(100vh - 40px)', // Fixed height to fit viewport (adjusting for layout padding)
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: '#f8fafc',
                padding: '16px 24px',
                fontFamily: "'Inter', sans-serif"
            }}>

                {/* --- HEADER SECTION (New Design) --- */}
                <div style={{ flexShrink: 0, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{
                                fontSize: '24px',
                                fontWeight: '800',
                                color: '#111827',
                                margin: '0 0 4px 0',
                                letterSpacing: '-0.5px'
                            }}>
                                Staff Registry
                            </h1>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                                Centralized 201 file management.
                            </p>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '13px', fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                                    Active {activeCount}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d1d5db' }}></span>
                                    Inactive {inactiveCount}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={exportToPDF} style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                color: '#374151',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                                <span>📄</span> Export
                            </button>
                            <Link href="/employees/add" style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: '#3b82f6',
                                color: '#ffffff',
                                border: '1px solid #2563eb',
                                fontSize: '14px',
                                fontWeight: '600',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                <span>+</span> Add Employee
                            </Link>
                        </div>
                    </div>
                </div>

                {/* --- FILTERS BAR (New Design) --- */}
                <div style={{
                    background: '#ffffff',
                    padding: '10px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    flexShrink: 0
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search employee name, ID or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#f9fafb',
                                color: '#374151',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Department Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '10px 32px 10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#f9fafb',
                                color: '#374151',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '140px'
                            }}
                        >
                            <option value="">All Depts</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Status Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '10px 32px 10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#f9fafb',
                                color: '#374151',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                outline: 'none',
                                minWidth: '140px'
                            }}
                        >
                            <option value="">All Status</option>
                            <option value="Regular">Regular</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', background: '#f9fafb', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '6px',
                                border: 'none',
                                background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
                                color: viewMode === 'grid' ? 'white' : '#9ca3af',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex'
                            }}
                        >
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" /></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '6px',
                                border: 'none',
                                background: viewMode === 'list' ? '#3b82f6' : 'transparent',
                                color: viewMode === 'list' ? 'white' : '#9ca3af',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex'
                            }}
                        >
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" /></svg>
                        </button>
                    </div>
                </div>

                {/* --- CONTENT AREA (Locked/Scrollable) --- */}
                <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #f3f4f6',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>

                    {/* Scrollable Content */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>

                        {viewMode === 'grid' ? (
                            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                                {paginatedEmployees.map(emp => (
                                    <EmployeeCard key={emp.id} employee={emp} />
                                ))}
                                {paginatedEmployees.length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                                        No employees found.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 10 }}>
                                    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <th style={headerStyle}>EMPLOYEE</th>
                                        <th style={headerStyle}>EMPLOYEE ID</th>
                                        <th style={headerStyle}>POSITION / DEPT</th>
                                        <th style={headerStyle}>BRANCH</th>
                                        <th style={headerStyle}>STATUS</th>
                                        <th style={{ ...headerStyle, textAlign: 'center' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedEmployees.map((emp) => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.2s' }} className="hover-row">
                                            <td style={cellStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{
                                                        width: '42px', height: '42px', borderRadius: '50%',
                                                        background: '#e0e7ff', color: '#4f46e5',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '14px', fontWeight: 'bold', overflow: 'hidden'
                                                    }}>
                                                        {emp.profile_picture ? (
                                                            <img src={emp.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            `${emp.first_name[0]}${emp.last_name[0]}`
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                                                            {emp.first_name} {emp.last_name}
                                                        </div>
                                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                            {emp.email_address || 'No email provided'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={cellStyle}>
                                                <span style={{ fontSize: '14px', color: '#374151', fontFamily: 'monospace', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px' }}>
                                                    {emp.employee_id}
                                                </span>
                                            </td>
                                            <td style={cellStyle}>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{emp.position}</div>
                                                    <div style={{ fontSize: '11px', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px' }}>{emp.department}</div>
                                                </div>
                                            </td>
                                            <td style={cellStyle}>
                                                <span style={{ fontSize: '14px', color: '#374151' }}>{emp.branch || 'Main Office'}</span>
                                            </td>
                                            <td style={cellStyle}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    ...getStatusStyle(emp.employment_status)
                                                }}>
                                                    {emp.employment_status}
                                                </span>
                                            </td>
                                            <td style={{ ...cellStyle, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <Link href={`/employees/${emp.id}`} style={{
                                                        padding: '6px', color: '#3b82f6', borderRadius: '4px',
                                                        display: 'flex', alignItems: 'center'
                                                    }} title="View Profile">
                                                        View
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedEmployees.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>
                                                No employees found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Footer (Fixed at bottom of container) */}
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#ffffff',
                        flexShrink: 0
                    }}>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            Showing <span style={{ fontWeight: '600', color: '#111827' }}>{((currentPage - 1) * itemsPerPage) + 1}</span> to <span style={{ fontWeight: '600', color: '#111827' }}>{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span> of <span style={{ fontWeight: '600', color: '#111827' }}>{filteredEmployees.length}</span> results
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Previous */}
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={paginationBtnStyle}
                            >
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>

                            {/* Page Numbers - Simplified for robustness */}
                            {[...Array(totalPages)].map((_, i) => {
                                const p = i + 1;
                                // Basic logic to show limited pages
                                if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            style={{
                                                ...paginationBtnStyle,
                                                background: currentPage === p ? '#3b82f6' : '#ffffff',
                                                color: currentPage === p ? '#ffffff' : '#374151',
                                                borderColor: currentPage === p ? '#3b82f6' : '#e5e7eb'
                                            }}
                                        >
                                            {p}
                                        </button>
                                    );
                                } else if (p === currentPage - 2 || p === currentPage + 2) {
                                    return <span key={p} style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', fontSize: '12px' }}>...</span>
                                }
                                return null;
                            })}

                            {/* Next */}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                style={paginationBtnStyle}
                            >
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>

                </div>

                <style jsx>{`
                    .hover-row:hover {
                        background-color: #f8fafc !important;
                    }
                `}</style>

            </div>
        </DashboardLayout>
    );
}

const headerStyle: React.CSSProperties = {
    padding: '16px 24px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
};

const cellStyle: React.CSSProperties = {
    padding: '16px 24px',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f9fafb'
};

const paginationBtnStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#374151',
    fontWeight: '500',
    transition: 'all 0.2s'
};

function getStatusStyle(status: string) {
    switch (status) {
        case 'Regular':
            return { background: '#ecfdf5', color: '#059669' }; // Green
        case 'Probationary':
            return { background: '#ecfdf5', color: '#059669' }; // Green (as per image)
        case 'Resigned':
        case 'Terminated':
            return { background: '#f3f4f6', color: '#6b7280' }; // Grey
        case 'Contractual':
            return { background: '#eff6ff', color: '#3b82f6' }; // Blue
        default:
            return { background: '#f3f4f6', color: '#374151' };
    }
}
