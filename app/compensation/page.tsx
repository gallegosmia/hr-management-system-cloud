'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    position: string;
    department: string;
    branch?: string;
    employment_status: string;
    salary_info?: any;
}

export default function CompensationPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();

            // Filter only active employees
            const activeEmployees = data.filter((emp: Employee) =>
                emp.employment_status !== 'Resigned'
            );

            setEmployees(activeEmployees);

            // Extract unique departments
            const uniqueDepts = Array.from(new Set(activeEmployees.map((e: Employee) => e.department))) as string[];
            setDepartments(uniqueDepts.sort());
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch =
            emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.position.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesDepartment = !departmentFilter || emp.department === departmentFilter;

        return matchesSearch && matchesDepartment;
    });

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 className="card-title">💰 Compensation & Benefits</h2>
                            <p className="card-subtitle">Manage employee salaries, allowances, and deductions</p>
                        </div>
                    </div>
                </div>

                <div className="card-body">
                    <div className="form-row" style={{ marginBottom: '1.5rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <input
                                type="text"
                                placeholder="Search by name, ID, or position..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
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
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Position</th>
                                    <th>Department</th>
                                    <th>Branch</th>
                                    <th style={{ textAlign: 'right' }}>Basic Salary</th>
                                    <th style={{ textAlign: 'right' }}>Daily Rate</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                            No employees found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id}>
                                            <td style={{ fontFamily: 'monospace' }}>{emp.employee_id}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{emp.last_name}, {emp.first_name}</div>
                                            </td>
                                            <td>{emp.position}</td>
                                            <td>{emp.department}</td>
                                            <td>{emp.branch || '-'}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                                {emp.salary_info?.basic_salary
                                                    ? `₱${emp.salary_info.basic_salary.toLocaleString()}`
                                                    : <span style={{ color: 'var(--text-tertiary)' }}>Not set</span>
                                                }
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                                {emp.salary_info?.daily_rate
                                                    ? `₱${emp.salary_info.daily_rate.toLocaleString()}`
                                                    : <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                                                }
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {emp.salary_info?.basic_salary ? (
                                                    <span className="badge badge-success">Configured</span>
                                                ) : (
                                                    <span className="badge badge-warning">Pending</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <Link
                                                    href={`/compensation/${emp.id}`}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    {emp.salary_info?.basic_salary ? '✏️ Edit' : '➕ Set Up'}
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span className="badge badge-success">
                                {employees.filter(e => e.salary_info?.basic_salary).length} Configured
                            </span>
                            <span className="badge badge-warning">
                                {employees.filter(e => !e.salary_info?.basic_salary).length} Pending
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
