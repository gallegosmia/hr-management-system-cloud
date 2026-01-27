
import React from 'react';

interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    employment_status: string;
    date_of_birth?: string;
    contact_number?: string;
    email_address?: string;
    address?: string; // Residential Address
    civil_status?: string; // Marital Status
    profile_picture?: string;

    // Fields that might be missing or need placeholders
    gender?: string;
    place_of_birth?: string;
    blood_type?: string;
    religion?: string;
    citizen_id_address?: string;

    // Related data
    education?: Education[];
}

interface Education {
    level: string;
    school_name: string;
    degree_course?: string;
    year_graduated: string;
    grade?: string; // GPA
}

interface PersonalInfoTabProps {
    employee: Employee;
    onEdit: (section: string) => void;
}

const InfoRow = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div style={{ display: 'flex', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
        <span style={{ width: '140px', color: '#111827', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#6b7280', flex: 1 }}>{value || '-'}</span>
    </div>
);

const CardHeader = ({ title, onEdit }: { title: string, onEdit: () => void }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
        <button
            onClick={onEdit}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '4px'
            }}
            title="Edit"
        >
            ✏️
        </button>
    </div>
);

const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid #f3f4f6',
        height: '100%',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
        {children}
    </div>
);

export default function PersonalInfoTab({ employee, onEdit }: PersonalInfoTabProps) {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch { return dateStr; }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Basic Information */}
            <Card>
                <CardHeader title="Basic information" onEdit={() => onEdit('basic')} />
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '2rem' }}>

                    {/* Left Column: Avatar & Main Details */}
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: '#f3f4f6',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            color: '#9ca3af',
                            fontWeight: 600
                        }}>
                            {employee.profile_picture ?
                                <img src={employee.profile_picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span>{employee.first_name?.[0]}{employee.last_name?.[0]}</span>
                            }
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem 0' }}>
                                {employee.first_name} {employee.last_name}
                            </h2>
                            <p style={{ color: '#6b7280', margin: '0 0 1rem 0', fontWeight: 500 }}>
                                {employee.employee_id}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>♂️</span> {employee.gender || 'Gender not set'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>✉️</span> {employee.email_address || 'No email'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📞</span> {employee.contact_number || 'No contact'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Key Attributes */}
                    <div>
                        <InfoRow label="Place of birth" value={employee.place_of_birth} />
                        <InfoRow label="Birth date" value={formatDate(employee.date_of_birth)} />
                        <InfoRow label="Blood type" value={employee.blood_type} />
                        <InfoRow label="Marital Status" value={employee.civil_status} />
                        <InfoRow label="Religion" value={employee.religion} />
                    </div>
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Address */}
                <Card>
                    <CardHeader title="Address" onEdit={() => onEdit('address')} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>Citizen ID address</span>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
                                {employee.citizen_id_address || 'Same as residential'}
                            </span>
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>Residential address</span>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
                                {employee.address || 'Not set'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Emergency Contact */}
                <Card>
                    <CardHeader title="Emergency contact" onEdit={() => onEdit('emergency')} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Placeholder Content since data is missing */}
                        <InfoRow label="Name" value="Not set" />
                        <InfoRow label="Relationship" value="-" />
                        <InfoRow label="Phone number" value="-" />
                    </div>
                </Card>

                {/* Education */}
                <Card>
                    <CardHeader title="Education" onEdit={() => onEdit('education')} />

                    {(!employee.education || employee.education.length === 0) ? (
                        <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.875rem' }}>No education records.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {employee.education.map((edu, idx) => (
                                <div key={idx} style={{ position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
                                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                                        {edu.level} - {edu.school_name}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                        {edu.degree_course}
                                    </div>
                                    {edu.grade && (
                                        <div style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '0.25rem' }}>
                                            GPA: {edu.grade}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                        {edu.year_graduated}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Family */}
                <Card>
                    <CardHeader title="Family" onEdit={() => onEdit('family')} />
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, color: '#374151' }}>Family type</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, color: '#374151' }}>Person name</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Placeholder Data */}
                            <tr><td colSpan={2} style={{ padding: '0.75rem', textAlign: 'center', color: '#9ca3af' }}>No family records found.</td></tr>
                        </tbody>
                    </table>
                </Card>

            </div>
        </div>
    );
}
