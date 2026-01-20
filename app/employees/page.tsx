'use client';

import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(emp =>
                emp.employee_id.toLowerCase().includes(query) ||
                emp.last_name.toLowerCase().includes(query) ||
                emp.first_name.toLowerCase().includes(query) ||
                emp.department.toLowerCase().includes(query) ||
                emp.position.toLowerCase().includes(query)
            );
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



    const getEmploymentStatusBadge = (status: string) => {
        switch (status) {
            case 'Regular': return 'badge-success';
            case 'Probationary': return 'badge-warning';
            case 'Contractual': return 'badge-info';
            case 'Resigned': return 'badge-gray';
            case 'Terminated': return 'badge-danger';
            default: return 'badge-gray';
        }
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
                    <p style={{ color: 'var(--text-secondary)' }}>Loading employees...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Digital 201 File Masterlist</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                {filteredEmployees.length} of {employees.length} employees
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                            <button onClick={exportToPDF} className="btn btn-outline">
                                <span>📄</span>
                                Export to PDF
                            </button>
                            <Link href="/employees/add" className="btn btn-primary">
                                <span>➕</span>
                                Add Employee
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-3">
                <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div>
                            <input
                                type="text"
                                placeholder="🔍 Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div>
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="form-select"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="form-select"
                            >
                                <option value="">All Branches</option>
                                {branches.map(branch => (
                                    <option key={branch} value={branch}>{branch}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="form-select"
                            >
                                <option value="">All Employment Status</option>
                                <option value="Regular">Regular</option>
                                <option value="Probationary">Probationary</option>
                                <option value="Contractual">Contractual</option>
                                <option value="Resigned">Resigned</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>

                    </div>
                </div>
            </div>

            {/* Employee Table */}
            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Position</th>
                                <th>Employment Status</th>
                                <th>Date Hired</th>

                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                        {searchQuery || departmentFilter || statusFilter
                                            ? 'No employees match your filters'
                                            : 'No employees found. Add your first employee to get started.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map(employee => (
                                    <tr key={employee.id}>
                                        <td>
                                            <strong>{employee.employee_id}</strong>
                                        </td>
                                        <td>
                                            <div>
                                                <strong>{employee.last_name}, {employee.first_name}</strong>
                                                {employee.middle_name && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {employee.middle_name}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>{employee.department}</td>
                                        <td>{employee.position}</td>
                                        <td>
                                            <span className={`badge ${getEmploymentStatusBadge(employee.employment_status)}`}>
                                                {employee.employment_status}
                                            </span>
                                        </td>
                                        <td>{new Date(employee.date_hired).toLocaleDateString('en-PH')}</td>

                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                                <Link href={`/employees/${employee.id}`} className="btn btn-sm btn-primary">
                                                    View/Upload
                                                </Link>
                                                <Link href={`/employees/${employee.id}/edit`} className="btn btn-sm btn-secondary">
                                                    Edit
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
