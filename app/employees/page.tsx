'use client';

import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import EmployeeCard from '@/components/EmployeeCard';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [departments, setDepartments] = useState<string[]>([]);
    const [branches, setBranches] = useState<string[]>([]);

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
                if (user.role === 'Employee') {
                    window.location.href = '/profile';
                    return;
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
                    // Session invalid or unauthorized, redirect to login
                    localStorage.removeItem('sessionId');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }
                throw new Error('Failed to fetch employees');
            }

            const data = await response.json();

            // Ensure data is an array
            if (Array.isArray(data)) {
                setEmployees(data);
                setFilteredEmployees(data);
            } else {
                console.error('Invalid data format received:', data);
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

                // Relevance sorting for local results
                filtered.sort((a, b) => {
                    const aFull = `${a.first_name} ${a.last_name}`.toLowerCase();
                    const bFull = `${b.first_name} ${b.last_name}`.toLowerCase();
                    const aExact = a.employee_id.toLowerCase() === query || (a.email_address || '').toLowerCase() === query || aFull === query;
                    const bExact = b.employee_id.toLowerCase() === query || (b.email_address || '').toLowerCase() === query || bFull === query;

                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    return 0;
                });
            }
        }

        if (departmentFilter) {
            filtered = filtered.filter(emp => emp.department === departmentFilter);
        }

        if (branchFilter) {
            filtered = filtered.filter(emp => emp.branch === branchFilter);
        }

        if (statusFilter) {
            filtered = filtered.filter(emp => emp.employment_status === statusFilter);
        }

        setFilteredEmployees(filtered);
    };

    const exportToPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const date = new Date().toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Add Title
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('Digital 201 File Masterlist', 14, 22);

        // Add Subtitle/Date
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${date}`, 14, 30);
        doc.text(`Total Employees: ${filteredEmployees.length}`, 14, 36);

        // Define Table Data
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

        // Generate Table
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

        // Save PDF
        doc.save(`201_File_Masterlist_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // --- Stats ---
    const activeCount = employees.filter(e => e.employment_status !== 'Resigned' && e.employment_status !== 'Terminated').length;
    const inactiveCount = employees.length - activeCount;

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #3b82f6',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: '#6b7280' }}>Loading employees...</p>
                    <style jsx>{`
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
            <div style={{ padding: '0 0.5rem' }}>

                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Staff Registry</h1>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '4px 0 0 0' }}>Centralized 201 file management and directory services.</p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginTop: '8px', fontWeight: 600 }}>
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                                Active {activeCount}
                            </span>
                            <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9ca3af' }}></span>
                                Inactive {inactiveCount}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', fontWeight: 600, color: '#4b5563', cursor: 'pointer', fontSize: '0.875rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <span>📄</span> Export
                        </button>
                        <Link href="/employees/add" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', background: '#10b981', color: 'white', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', border: 'none', fontSize: '0.875rem', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
                            <span>+</span> REGISTER NEW EMPLOYEE
                        </Link>
                    </div>
                </div>

                {/* Filters Section */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    background: '#ffffff',
                    padding: '1rem',
                    borderRadius: '16px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>

                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                        <input
                            type="text"
                            placeholder="Search by name, ID or position..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.625rem 1rem 0.625rem 2.5rem',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                background: '#f8fafc',
                                fontSize: '0.875rem',
                                color: '#1e293b',
                                transition: 'all 0.2s'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem' }}>🔍</span>
                    </div>

                    {/* Filter Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select
                            value={departments.includes(departmentFilter) ? departmentFilter : ''}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            style={{ padding: '0.625rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', outline: 'none', minWidth: '160px' }}
                        >
                            <option value="">ALL DEPARTMENTS</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '0.625rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="">ALL STATUS</option>
                            <option value="Regular">Regular</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                        </select>

                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            style={{ padding: '0.625rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', outline: 'none', minWidth: '140px' }}
                        >
                            <option value="">ALL BRANCHES</option>
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>

                        <button style={{ padding: '0.625rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#4b5563', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚡</span> Filters
                        </button>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* View Toggles */}
                        <div style={{ display: 'flex', gap: '2px', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '4px 8px',
                                    background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                                    border: 'none',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    color: viewMode === 'grid' ? '#10b981' : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="Grid View"
                            >
                                <span style={{ fontSize: '1.2rem' }}>⊞</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '4px 8px',
                                    background: viewMode === 'list' ? '#ffffff' : 'transparent',
                                    border: 'none',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    color: viewMode === 'list' ? '#10b981' : '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="List View"
                            >
                                <span style={{ fontSize: '1.2rem' }}>≡</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Rendering */}
                {filteredEmployees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                        <p>No employees found matching your filters.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1rem',
                        paddingBottom: '1.5rem'
                    }}>
                        {filteredEmployees.map(emp => (
                            <EmployeeCard key={emp.id} employee={emp} />
                        ))}
                    </div>
                ) : (
                    <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600, fontSize: '0.875rem' }}>Employee</th>
                                        <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600, fontSize: '0.875rem' }}>ID</th>
                                        <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600, fontSize: '0.875rem' }}>Position / Dept</th>
                                        <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600, fontSize: '0.875rem' }}>Branch</th>
                                        <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                                        <th style={{ padding: '1rem', color: '#4b5563', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.map(emp => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        background: '#e5e7eb',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        color: '#4b5563',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {emp.profile_picture ? (
                                                            <img src={emp.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <>{emp.first_name[0]}{emp.last_name[0]}</>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#111827' }}>{emp.first_name} {emp.last_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{emp.email_address}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>{emp.employee_id}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{emp.position}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{emp.department}</div>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>{emp.branch || 'N/A'}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    padding: '0.25rem 0.625rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: (emp.employment_status === 'Resigned' || emp.employment_status === 'Terminated') ? '#f3f4f6' : '#ecfdf5',
                                                    color: (emp.employment_status === 'Resigned' || emp.employment_status === 'Terminated') ? '#374151' : '#065f46'
                                                }}>
                                                    {emp.employment_status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <Link href={`/employees/${emp.id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                                                        View detail
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(emp.id, `${emp.first_name} ${emp.last_name}`)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            fontSize: '1rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '4px'
                                                        }}
                                                        title="Delete Employee"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
