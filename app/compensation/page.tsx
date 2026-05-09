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
            <div className="p-6 bg-[#f8fafc] min-h-[calc(100vh-64px)] font-sans relative">
                {/* Header Section */}
                <div className="mb-6">
                    <div className="text-xs font-semibold text-blue-600 mb-2 tracking-wide uppercase">Compensation {'>'} Employee List</div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compensation & Benefits</h1>
                            <p className="text-slate-500 text-sm mt-1">Manage and monitor employee salary structures and policies.</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/compensation/gov-configs" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Gov Configs
                            </Link>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {/* Card 1: Total Employees */}
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Employees</div>
                        <div className="text-2xl font-bold text-slate-900">{employees.length}</div>
                    </div>
                    {/* Card 2: Active Status */}
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Status</div>
                        <div className="text-2xl font-bold text-slate-900">
                            {employees.filter(e => e.employment_status !== 'Resigned' && e.employment_status !== 'Terminated').length}
                        </div>
                    </div>
                    {/* Card 3: Configured Pay -> "Configured" */}
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Configured Pay</div>
                        <div className="text-2xl font-bold text-slate-900">
                            {employees.filter(e => e.salary_info && (e.salary_info.daily_rate || e.salary_info.monthly_salary)).length}
                        </div>
                    </div>
                    {/* Card 4: Pending Config -> "Pending" */}
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pending Config</div>
                        <div className="text-2xl font-bold text-slate-900">
                            {employees.filter(e => !e.salary_info || (!e.salary_info.daily_rate && !e.salary_info.monthly_salary)).length}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="relative w-64">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                    >
                        <option value="">All Status</option>
                        <option value="Regular">Regular</option>
                        <option value="Probationary">Probationary</option>
                        <option value="Contractual">Contractual</option>
                        <option value="Active">Active</option>
                    </select>
                </div>

                {/* Main Table Area */}
                <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 overflow-hidden mb-24">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-white">
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Employee</th>
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Employee ID</th>
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Department</th>
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Salary/Rate</th>
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-left">Frequency</th>
                                    <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {emp.profile_picture ? (
                                                        <img src={emp.profile_picture} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-slate-500 text-sm">{emp.first_name[0]}{emp.last_name[0]}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 leading-snug">{emp.first_name} {emp.last_name}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{emp.first_name.toLowerCase()}.{emp.last_name.toLowerCase()}@talentflow.com</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {emp.employee_id}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {emp.department}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                emp.employment_status === 'Regular' ? 'bg-emerald-50 text-emerald-600' :
                                                emp.employment_status === 'Probationary' ? 'bg-amber-50 text-amber-600' :
                                                emp.employment_status === 'Contractual' ? 'bg-blue-50 text-blue-600' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {emp.employment_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`text-sm font-bold ${getSalaryDisplay(emp) === 'Not Configured' ? 'text-rose-400 italic font-medium' : 'text-slate-900'}`}>
                                                {getSalaryDisplay(emp) !== 'Not Configured' ? `₱${getSalaryDisplay(emp).replace('₱', '')}` : 'Not Configured'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-left">
                                            <span className="text-sm font-medium text-slate-600">
                                                {getRateType(emp) || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/compensation/${emp.id}`}
                                                className="inline-flex items-center justify-center px-4 py-1.5 border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-300 rounded-full text-xs font-semibold transition-all"
                                            >
                                                Manage
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {paginatedEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                            No employees found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="px-6 py-5 flex items-center justify-between border-t border-slate-100 bg-white">
                            <div className="text-sm text-slate-500">
                                Showing <span className="font-bold text-slate-700">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span> of <span className="font-bold text-slate-700">{filteredEmployees.length}</span> employees
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-50"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>
                                
                                <button className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 text-white font-semibold shadow-sm">
                                    {currentPage}
                                </button>
                                
                                {currentPage < totalPages && (
                                    <button onClick={() => setCurrentPage(currentPage + 1)} className="w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 font-medium transition-colors">
                                        {currentPage + 1}
                                    </button>
                                )}
                                
                                {currentPage + 1 < totalPages && (
                                    <div className="w-8 h-8 flex items-center justify-center text-slate-400 tracking-widest">
                                        ...
                                    </div>
                                )}
                                
                                {currentPage < totalPages && currentPage + 1 !== totalPages && (
                                    <button onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 font-medium transition-colors">
                                        {totalPages}
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 disabled:opacity-50"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Action Button (Matches image bottom right) */}
                <button className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </DashboardLayout>
    );
}
