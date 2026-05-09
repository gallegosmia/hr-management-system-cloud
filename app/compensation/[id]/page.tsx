'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CompensationTab from '@/components/employee/CompensationTab';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EmployeeCompensationPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const employeeId = parseInt(params.id);
    
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchEmployee();
    }, [employeeId]);

    const fetchEmployee = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/employees?id=${employeeId}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch employee details');
            }
            
            const data = await response.json();
            setEmployee(data);
        } catch (err: any) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !employee) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">
                    <div className="text-rose-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Employee Not Found</h2>
                    <p className="text-slate-500 mb-6">{error || 'The requested employee could not be found.'}</p>
                    <Link href="/compensation" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">
                        Back to Compensation List
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-[calc(100vh-64px)] bg-slate-50 pb-12">
                {/* Header/Breadcrumbs */}
                <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 shadow-sm">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => router.push('/compensation')}
                                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all"
                                title="Back to list"
                            >
                                ⬅️
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl border-2 border-white shadow-sm overflow-hidden">
                                    {employee.profile_picture ? (
                                        <img src={employee.profile_picture} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        `${employee.first_name[0]}${employee.last_name[0]}`
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 leading-tight">
                                        {employee.first_name} {employee.last_name}
                                    </h1>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs font-bold text-slate-400 font-mono tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                            {employee.employee_id}
                                        </span>
                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                                            {employee.position}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                                            {employee.branch} Branch
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="hidden md:block">
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employment Status</div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                    employee.employment_status === 'Regular' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                    employee.employment_status === 'Probationary' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                    {employee.employment_status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-w-7xl mx-auto px-8 py-8">
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden">
                        <CompensationTab 
                            employeeId={employee.id} 
                            employee={employee} 
                            onUpdate={fetchEmployee} 
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
