
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
}

interface EmployeeCardProps {
    employee: Employee;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee }) => {
    const isActive = employee.employment_status !== 'Resigned' && employee.employment_status !== 'Terminated';
    const statusColor = isActive ? '#10b981' : '#6b7280'; // Green for active, Gray for inactive
    const statusBg = isActive ? '#ecfdf5' : '#f3f4f6';
    const statusTextColor = isActive ? '#065f46' : '#374151';

    // Randomized placeholder avatar color
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#a78bfa', '#f472b6'];
    const avatarColor = colors[employee.id % colors.length];

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            border: '1px solid #f3f4f6',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
            {/* Status Badge */}
            <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: statusBg,
                    color: statusTextColor
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor }}></span>
                    {isActive ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Menu */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}>
                •••
            </div>

            {/* Profile Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: 'white',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    overflow: 'hidden'
                }}>
                    {/* Placeholder for now since we don't have image URL in interface yet */}
                    {employee.first_name[0]}{employee.last_name[0]}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0, textAlign: 'center' }}>
                    {employee.first_name} {employee.last_name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0', textAlign: 'center' }}>
                    {employee.position}
                </p>
            </div>

            {/* Details Box */}
            <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.875rem',
                color: '#4b5563'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    <span>#</span> {employee.employee_id}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💼</span> {employee.department}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span>✉️</span>
                    <a href={`mailto:${employee.email_address}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {employee.email_address || 'No email'}
                    </a>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📞</span> {employee.contact_number || 'No contact'}
                </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Joined {new Date(employee.date_hired).toLocaleDateString()}
                </span>
                <Link
                    href={`/employees/${employee.id}`}
                    style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#1f2937',
                        textDecoration: 'none',
                        borderBottom: '1px solid transparent',
                        transition: 'border-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderBottomColor = '#1f2937'}
                    onMouseOut={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
                >
                    View details &gt;
                </Link>
            </div>
        </div>
    );
};

export default EmployeeCard;
