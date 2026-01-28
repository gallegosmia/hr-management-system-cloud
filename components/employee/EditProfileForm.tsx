import React, { useState, useRef, useEffect } from 'react';

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    date_of_birth?: string;
    gender?: string;
    civil_status?: string;
    email_address?: string;
    contact_number?: string;
    address?: string;
    employment_status?: string;
    religion?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    profile_picture?: string;
    [key: string]: any;
}

interface EditProfileFormProps {
    employee: Employee;
    onSave: (updatedData: any) => Promise<void>;
    onCancel: () => void;
}

export default function EditProfileForm({ employee, onSave, onCancel }: EditProfileFormProps) {
    const [formData, setFormData] = useState({
        first_name: employee.first_name || '',
        middle_name: employee.middle_name || '',
        last_name: employee.last_name || '',
        date_of_birth: employee.date_of_birth ? new Date(employee.date_of_birth).toISOString().split('T')[0] : '',
        gender: employee.gender || '',
        civil_status: employee.civil_status || '',
        religion: employee.religion || '',
        email_address: employee.email_address || '',
        contact_number: employee.contact_number || '',
        address: employee.address || '',
        employment_status: employee.employment_status || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_number: employee.emergency_contact_number || '',
        profile_picture: employee.profile_picture || '',
        branch: employee.branch || ''
    });

    const [branches, setBranches] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await fetch('/api/employees/branches');
                if (response.ok) {
                    const data = await response.json();
                    setBranches(data);
                }
            } catch (error) {
                console.error('Failed to fetch branches:', error);
            }
        };
        fetchBranches();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profile_picture: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Basic Validation
            if (!formData.first_name || !formData.last_name) {
                throw new Error("First Name and Last Name are required.");
            }
            if (formData.email_address && formData.email_address.toLowerCase() !== 'n/a' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address)) {
                throw new Error("Invalid email address format (or use 'N/A' if not available).");
            }

            await onSave(formData);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            padding: '2rem',
            maxWidth: '1000px',
            margin: '0 auto',
            border: '1px solid #e5e7eb'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Edit Profile</h2>
            </div>

            {error && (
                <div style={{
                    padding: '1rem',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '3rem', flexDirection: 'row-reverse', alignItems: 'flex-start' }}>

                {/* Avatar Section (Right Side) */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#f3f4f6',
                        border: '4px solid white',
                        boxShadow: '0 0 0 1px #e5e7eb'
                    }}>
                        {formData.profile_picture ? (
                            <img
                                src={formData.profile_picture}
                                alt="Profile"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#9ca3af', fontWeight: 600 }}>
                                {formData.first_name?.[0]}{formData.last_name?.[0]}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            marginTop: '-40px',
                            marginRight: '-120px',
                            background: '#3b82f6',
                            color: 'white',
                            border: '2px solid white',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            zIndex: 20
                        }}
                    >
                        ✏️
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/*"
                    />
                </div>

                {/* Form Fields (Left Side) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Name Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>First Name</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Last Name</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Middle Name</label>
                        <input
                            type="text"
                            name="middle_name"
                            value={formData.middle_name}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                        />
                    </div>

                    {/* Contact Info Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Email Address</label>
                            <input
                                type="text"
                                name="email_address"
                                value={formData.email_address}
                                onChange={handleChange}
                                placeholder="N/A"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Contact Number</label>
                            <input
                                type="tel"
                                name="contact_number"
                                value={formData.contact_number}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                            />
                        </div>
                    </div>

                    {/* Details Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Date of Birth</label>
                            <input
                                type="date"
                                name="date_of_birth"
                                value={formData.date_of_birth}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                            />
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', background: 'white' }}
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Civil Status</label>
                            <select
                                name="civil_status"
                                value={formData.civil_status}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', background: 'white' }}
                            >
                                <option value="">Select Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                                <option value="Divorced">Divorced</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Religion</label>
                            <input
                                type="text"
                                name="religion"
                                value={formData.religion}
                                onChange={handleChange}
                                placeholder="e.g. Roman Catholic"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Residential Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Employment Status</label>
                        <select
                            name="employment_status"
                            value={formData.employment_status}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', background: 'white' }}
                        >
                            <option value="">Select Status</option>
                            <option value="Regular">Regular</option>
                            <option value="Probationary">Probationary</option>
                            <option value="Contractual">Contractual</option>
                            <option value="Resigned">Resigned</option>
                            <option value="Terminated">Terminated</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Branch Assigned</label>
                        <select
                            name="branch"
                            value={formData.branch}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', background: 'white' }}
                        >
                            <option value="">Not Assigned</option>
                            {branches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ padding: '1rem 0', borderTop: '1px solid #f3f4f6', marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>Emergency Contact Person</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Contact Name</label>
                                <input
                                    type="text"
                                    name="emergency_contact_name"
                                    value={formData.emergency_contact_name}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Contact Number</label>
                                <input
                                    type="tel"
                                    name="emergency_contact_number"
                                    value={formData.emergency_contact_number}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: '#2563eb',
                                color: 'white',
                                padding: '0.75rem 2rem',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                background: 'white',
                                color: '#374151',
                                padding: '0.75rem 2rem',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>

                </div>
            </form>
        </div>
    );
}
