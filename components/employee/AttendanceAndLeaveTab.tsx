'use client';

import React, { useState, useEffect } from 'react';
import AttendanceTab from './AttendanceTab';
import LeaveHistoryTab from './LeaveHistoryTab';

interface CombinedTabProps {
    employeeId: number;
}

export default function AttendanceAndLeaveTab({ employeeId }: CombinedTabProps) {
    const [subTab, setSubTab] = useState<'Attendance' | 'Leave'>('Attendance');

    return (
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                <h3 className="text-lg font-bold text-slate-800">Attendance & Leave Management</h3>

                {/* Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setSubTab('Attendance')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${subTab === 'Attendance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Attendance
                    </button>
                    <button
                        onClick={() => setSubTab('Leave')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${subTab === 'Leave' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Leave Credits
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in duration-300">
                {subTab === 'Attendance' ? (
                    <AttendanceTab employeeId={employeeId} />
                ) : (
                    <LeaveHistoryTab employeeId={employeeId} />
                )}
            </div>
        </div>
    );
}
