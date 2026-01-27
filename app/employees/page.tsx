'use client';

import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
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
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [departments, setDepartments] = useState<string[]>([]);
    const [branches, setBranches] = useState<string[]>([]);

    useEffect(() => {
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
                        {/* View Toggles (Visual Only) */}
                        <div style={{ display: 'flex', gap: '2px', background: '#e5e7eb', padding: '2px', borderRadius: '6px' }}>
                            <button style={{ padding: '4px 8px', background: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>GridView</button>
                            <button style={{ padding: '4px 8px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#6b7280' }}>List</button>
                        </div>
                    </div>
                </div>

                {/* Employee Grid */}
                {filteredEmployees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                        <p>No employees found matching your filters.</p>
                    </div>
                ) : (
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
                )}

            </div>
        </DashboardLayout>
    );
}
