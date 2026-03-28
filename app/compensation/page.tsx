'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { formatCurrency } from '@/lib/payroll-calculations';

interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    department: string;
    position: string;
    branch?: string;
    employment_status: string;
    salary_info?: {
        daily_rate?: number | string;
        monthly_salary?: number | string;
        basic_salary?: number | string;
        allowances?: any[];
        deductions?: any[];
    };
    profile_picture?: string;
}

export default function CompensationPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, []);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = employees.filter(emp => {
            const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
            const matchesSearch = fullName.includes(query) || emp.employee_id.toLowerCase().includes(query);
            const matchesDept = departmentFilter === '' || emp.department === departmentFilter;
            const matchesStatus = statusFilter === '' || emp.employment_status === statusFilter;
            return matchesSearch && matchesDept && matchesStatus;
        });
        setFilteredEmployees(filtered);
        setCurrentPage(1);
    }, [searchQuery, departmentFilter, statusFilter, employees]);

    const fetchEmployees = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees', {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setEmployees(data);
                setFilteredEmployees(data);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
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

    const getSalaryDisplay = (emp: Employee) => {
        if (!emp.salary_info) return 'Not Configured';
        const info = emp.salary_info;
        const rate = info.daily_rate || info.monthly_salary || info.basic_salary;
        if (!rate) return 'Not Configured';
        return formatCurrency(Number(rate));
    };

    const getRateType = (emp: Employee) => {
        if (!emp.salary_info) return '';
        if (emp.salary_info.daily_rate) return 'Daily';
        if (emp.salary_info.monthly_salary || emp.salary_info.basic_salary) return 'Monthly';
        return '';
    };

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6 bg-slate-50 min-h-[calc(100vh-64px)] font-sans">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Compensation & Benefits</h1>
                        <p className="text-slate-500 mt-1">Manage employee salary structures, allowances, and deduction policies.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/compensation/gov-configs" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                            <span>🏛️</span> Gov Contribution Settings
                        </Link>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Employees</div>
                        <div className="text-3xl font-black text-slate-900">{employees.length}</div>
                        <div className="mt-2 text-xs text-emerald-600 font-medium">Active Registry</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Configured Pay</div>
                        <div className="text-3xl font-black text-slate-900">
                            {employees.filter(e => e.salary_info && (e.salary_info.daily_rate || e.salary_info.monthly_salary)).length}
                        </div>
                        <div className="mt-2 text-xs text-blue-600 font-medium">Employees with pay settings</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Config</div>
                        <div className="text-3xl font-black text-rose-600">
                            {employees.filter(e => !e.salary_info || (!e.salary_info.daily_rate && !e.salary_info.monthly_salary)).length}
                        </div>
                        <div className="mt-2 text-xs text-rose-500 font-medium">Requires attention</div>
                    </div>
                </div>

                {/* Main Filter & Table Area */}
                <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                    {/* Filters Bar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center">
                        <div className="relative flex-1 min-w-[300px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input
                                type="text"
                                placeholder="Search employee name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">All Status</option>
                            <option value="Regular">Regular</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Active">Active</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-center">Department</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Base Rate</th>
                                    <th className="px-6 py-4 text-center">Type</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden border border-blue-100">
                                                    {emp.profile_picture ? (
                                                        <img src={emp.profile_picture} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        `${emp.first_name[0]}${emp.last_name[0]}`
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900 leading-tight">{emp.first_name} {emp.last_name}</div>
                                                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">{emp.employee_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{emp.department}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                                emp.employment_status === 'Regular' ? 'bg-emerald-50 text-emerald-600' :
                                                emp.employment_status === 'Probationary' ? 'bg-amber-50 text-amber-600' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {emp.employment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-sm font-black ${getSalaryDisplay(emp) === 'Not Configured' ? 'text-rose-400 italic' : 'text-slate-900'}`}>
                                                {getSalaryDisplay(emp)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded tracking-wider">
                                                {getRateType(emp)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/compensation/${emp.id}`}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm hover:shadow-blue-200"
                                            >
                                                Manage
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                            No employees found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                            <div className="text-xs text-slate-500 font-medium">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 transition-all hover:bg-slate-50"
                                >
                                    ◀
                                </button>
                                <div className="flex items-center px-4 text-sm font-bold text-slate-700">
                                    {currentPage} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 transition-all hover:bg-slate-50"
                                >
                                    ▶
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
