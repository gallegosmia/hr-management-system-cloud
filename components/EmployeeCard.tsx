
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    department: string;
    position: string;
    employment_status: string;
    email_address?: string;
    contact_number?: string;
    date_hired: string;
    profile_picture?: string;
}

interface EmployeeCardProps {
    employee: Employee;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {
    const router = useRouter();
    const isActive = employee.employment_status !== 'Resigned' && employee.employment_status !== 'Terminated';

    return (
        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            height: '100%',
            cursor: 'pointer'
        }}
            onClick={() => router.push(`/employees/${employee.id}`)}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = '#f1f5f9';
            }}>

            {/* Subtle Background Accent */}
            <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#f0fdf4',
                opacity: 0.6,
                zIndex: 0
            }} />

            {/* Status Badge - Placement Unchanged (Top Left) */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
                    color: isActive ? '#059669' : '#dc2626',
                    border: '1px solid ' + (isActive ? '#d1fae5' : '#fee2e2'),
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? '#10b981' : '#ef4444',
                    }}></span>
                    {isActive ? 'Active' : 'Offline'}
                </span>
            </div>

            {/* Profile Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: '#64748b',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    overflow: 'hidden',
                    border: '3px solid white',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                }}>
                    {employee.profile_picture ? (
                        <img
                            src={employee.profile_picture}
                            alt={employee.first_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ color: '#059669' }}>
                            {employee.first_name[0]}{employee.last_name[0]}
                        </span>
                    )}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0, textAlign: 'center' }}>
                    {employee.first_name} {employee.last_name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#059669', margin: '0.25rem 0 0', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {employee.position}
                </p>
            </div>

            {/* Details Section */}
            <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.8rem',
                color: '#475569',
                border: '1px solid #f1f5f9',
                zIndex: 1
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>ID</span>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>{employee.employee_id}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>DEPT</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{employee.department}</span>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span style={{ opacity: 0.6 }}>✉</span>
                    <span style={{ color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {employee.email_address || 'N/A'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ opacity: 0.6 }}>☏</span>
                    <span>{employee.contact_number || 'N/A'}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', zIndex: 1 }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                    Hired: {new Date(employee.date_hired).toLocaleDateString()}
                </span>
                <span
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'white',
                        textDecoration: 'none',
                        background: '#10b981',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#059669';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#10b981';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    VIEW FILE
                </span>
            </div>
        </div>
    );
};

export default EmployeeCard;
