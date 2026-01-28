
import React from 'react';
import Link from 'next/link';

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
    const isActive = employee.employment_status !== 'Resigned' && employee.employment_status !== 'Terminated';
    const statusColor = isActive ? '#10b981' : '#6b7280'; // Green for active, Gray for inactive

    // Randomized placeholder avatar color
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#a78bfa', '#f472b6'];
    const avatarColor = colors[employee.id % colors.length];

    return (
        <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
            borderRadius: '24px',
            padding: '1.75rem',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            overflow: 'hidden'
        }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = '#166534';
                e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(22, 101, 52, 0.15), 0 0 0 1px rgba(22, 101, 52, 0.2)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0, 0, 0, 0.05), 0 0 1px rgba(0, 0, 0, 0.05)';
            }}>
            {/* Subtle Tech Pattern Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'radial-gradient(#166534 0.5px, transparent 0.5px)',
                backgroundSize: '24px 24px',
                opacity: 0.03,
                pointerEvents: 'none'
            }} />

            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 1 }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    backgroundColor: isActive ? '#f0fdf4' : '#fef2f2',
                    color: isActive ? '#166534' : '#991b1b',
                    border: '1px solid ' + (isActive ? '#bbf7d0' : '#fecaca'),
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? '#22c55e' : '#ef4444',
                        boxShadow: '0 0 6px ' + (isActive ? '#22c55e' : '#ef4444')
                    }}></span>
                    {isActive ? 'Active' : 'Offline'}
                </span>
            </div>

            {/* Profile Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    color: '#1e293b',
                    fontWeight: 600,
                    marginBottom: '1.25rem',
                    overflow: 'hidden',
                    border: '4px solid white',
                    boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)',
                    position: 'relative'
                }}>
                    {employee.profile_picture ? (
                        <img
                            src={employee.profile_picture}
                            alt={employee.first_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span style={{ color: '#166534' }}>
                            {employee.first_name[0]}{employee.last_name[0]}
                        </span>
                    )}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, textAlign: 'center', letterSpacing: '-0.5px' }}>
                    {employee.first_name} {employee.last_name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#14532d', margin: '0.35rem 0 0', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {employee.position}
                </p>
            </div>

            {/* Details Glass Box */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '20px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                fontSize: '0.85rem',
                color: '#475569',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)',
                zIndex: 1
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
                    <span style={{ color: '#166534' }}>#_</span>
                    <span style={{ fontFamily: 'monospace' }}>{employee.employee_id}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ opacity: 0.4, fontSize: '0.7rem', fontWeight: 800 }}>DEPT</span>
                    <span style={{ fontWeight: 600 }}>{employee.department}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <span style={{ opacity: 0.4 }}>✉</span>
                    <a href={`mailto:${employee.email_address}`} style={{ color: '#115e59', textDecoration: 'none', fontWeight: 500 }}>
                        {employee.email_address || 'NOT_SPECIFIED'}
                    </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ opacity: 0.4 }}>☏</span>
                    <span style={{ fontSize: '0.8rem' }}>{employee.contact_number || '+00 000 0000'}</span>
                </div>
            </div>

            {/* Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', zIndex: 1 }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                    Hired: {new Date(employee.date_hired).toLocaleDateString()}
                </span>
                <Link
                    href={`/employees/${employee.id}`}
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: 'white',
                        textDecoration: 'none',
                        background: '#166534',
                        padding: '8px 18px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(22, 101, 52, 0.25)',
                        transition: 'all 0.3s',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#14532d';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(20, 83, 45, 0.3)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#166534';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 101, 52, 0.25)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    VIEW FILE
                </Link>
            </div>
        </div>
    );
};

export default EmployeeCard;
