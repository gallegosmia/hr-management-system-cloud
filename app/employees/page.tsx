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
            const response = await fetch('/api/employees');
            const data = await response.json();
            setEmployees(data);
            setFilteredEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
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
            const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' });
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
            const response = await fetch('/api/employees/departments');
            const data = await response.json();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await fetch('/api/employees/branches');
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0, marginBottom: '0.5rem' }}>Employee</h1>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>• Active {activeCount}</span>
                            <span style={{ color: '#6b7280' }}>• Inactive {inactiveCount}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>

                        <button onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                            <span>📄</span> Export
                        </button>
                        <Link href="/employees/add" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#065f46', color: 'white', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', border: 'none' }}>
                            <span>+</span> Add Employee
                        </Link>
                    </div>
                </div>

                {/* Filters Section */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* Search */}
                    <div style={{ position: 'relative', minWidth: '300px' }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid #e5e7eb',
                                outline: 'none',
                                background: 'white'
                            }}
                        />
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
                    </div>

                    {/* Filter Buttons (Simulated Dropdowns) */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <select
                            value={departments.includes(departmentFilter) ? departmentFilter : ''}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="">Role / Dept</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="">Status</option>
                            <option value="Regular">Regular</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                        </select>

                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="">Branch</option>
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>

                        <button style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: '#f3f4f6', color: '#4b5563', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚡</span> Advance Filter
                        </button>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* View Toggles */}
                        <div style={{ display: 'flex', gap: '2px', background: '#e5e7eb', padding: '2px', borderRadius: '6px' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '4px 12px',
                                    background: viewMode === 'grid' ? 'white' : 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    color: viewMode === 'grid' ? '#111827' : '#6b7280',
                                    fontWeight: 600,
                                    fontSize: '0.8rem'
                                }}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '4px 12px',
                                    background: viewMode === 'list' ? 'white' : 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    color: viewMode === 'list' ? '#111827' : '#6b7280',
                                    fontWeight: 600,
                                    fontSize: '0.8rem'
                                }}
                            >
                                List
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
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1.5rem',
                        paddingBottom: '2rem'
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
