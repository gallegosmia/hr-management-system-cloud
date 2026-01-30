import React, { useState, useEffect } from 'react';

interface Employee {
    id: number;
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    branch?: string;
    employment_status: string;
    date_hired: string;
    date_of_birth?: string;
    place_of_birth?: string;
    gender?: string;
    civil_status?: string;
    contact_number?: string;
    email_address?: string;
    address?: string;
    citizen_id_address?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
    religion?: string;
    blood_type?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    emergency_contact_relationship?: string;
    emergency_contact_address?: string;
    education?: {
        level: string;
        school_name: string;
        degree_course?: string;
        year_graduated: string;
        honors_awards?: string;
    }[];
}

interface EditEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedData: Partial<Employee>) => Promise<void>;
    employee: Employee;
    section: string;
}

// Helper Component for consistent styling
const FormGroup = ({ label, children, fullWidth }: { label: string, children: React.ReactElement, fullWidth?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.2rem' }}>{label}</label>
        {React.cloneElement(children, {
            style: {
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0', // Lighter border as per image
                borderRadius: '8px',
                fontSize: '0.95rem',
                background: '#ffffff',
                color: '#1f2937',
                transition: 'border-color 0.2s',
                outline: 'none',
                ...children.props.style
            }
        })}
    </div>
);

export default function EditEmployeeModal({ isOpen, onClose, onSave, employee, section }: EditEmployeeModalProps) {
    const [formData, setFormData] = useState<Partial<Employee>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (employee) {
            setFormData({ ...employee });
        }
    }, [employee, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation for Education Level if in education section
            if (section === 'education') {
                const invalid = (formData.education || []).some(edu => !edu.level || edu.level.trim() === '');
                if (invalid) {
                    alert('Education Level is required for all records.');
                    setLoading(false);
                    return;
                }
            }

            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderFields = () => {
        switch (section) {
            case 'basic':
                return (
                    <>
                        <FormGroup label="First Name">
                            <input name="first_name" value={formData.first_name || ''} onChange={handleChange} required />
                        </FormGroup>
                        <FormGroup label="Middle Name">
                            <input name="middle_name" value={formData.middle_name || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Last Name">
                            <input name="last_name" value={formData.last_name || ''} onChange={handleChange} required />
                        </FormGroup>
                        <FormGroup label="Date of Birth">
                            <input type="date" name="date_of_birth" value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Place of Birth">
                            <input name="place_of_birth" value={formData.place_of_birth || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Gender">
                            <select name="gender" value={formData.gender || ''} onChange={handleChange}>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </FormGroup>
                        <FormGroup label="Civil Status">
                            <select name="civil_status" value={formData.civil_status || ''} onChange={handleChange}>
                                <option value="">Select Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                            </select>
                        </FormGroup>
                    </>
                );
            case 'contact':
                return (
                    <>
                        <FormGroup label="Email Address">
                            <input type="text" name="email_address" value={formData.email_address || ''} onChange={handleChange} placeholder="N/A" />
                        </FormGroup>
                        <FormGroup label="Mobile Number">
                            <input name="contact_number" value={formData.contact_number || ''} onChange={handleChange} />
                        </FormGroup>
                    </>
                );
            case 'address':
                return (
                    <>
                        <FormGroup label="Current Residence" fullWidth>
                            <input name="address" value={formData.address || ''} onChange={handleChange} placeholder="Street/Barangay/City" />
                        </FormGroup>
                        <FormGroup label="Citizen ID Address" fullWidth>
                            <input name="citizen_id_address" value={formData.citizen_id_address || ''} onChange={handleChange} placeholder="Matches residential address if blank" />
                        </FormGroup>
                    </>
                );
            case 'emergency':
                return (
                    <>
                        <FormGroup label="Contact Person Name">
                            <input name="emergency_contact_name" value={formData.emergency_contact_name || ''} onChange={handleChange} placeholder="Full Name" />
                        </FormGroup>
                        <FormGroup label="Contact Number">
                            <input name="emergency_contact_number" value={formData.emergency_contact_number || ''} onChange={handleChange} placeholder="Mobile or Phone Number" />
                        </FormGroup>
                        <FormGroup label="Relationship">
                            <input name="emergency_contact_relationship" value={formData.emergency_contact_relationship || ''} onChange={handleChange} placeholder="e.g. Spouse / Parent" />
                        </FormGroup>
                        <FormGroup label="Full Address">
                            <input name="emergency_contact_address" value={formData.emergency_contact_address || ''} onChange={handleChange} placeholder="Barangay, City, Province" />
                        </FormGroup>
                    </>
                );
            case 'ids':
                return (
                    <>
                        <FormGroup label="SSS Number">
                            <input name="sss_number" value={formData.sss_number || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="PhilHealth Number">
                            <input name="philhealth_number" value={formData.philhealth_number || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Pag-IBIG Number">
                            <input name="pagibig_number" value={formData.pagibig_number || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="TIN">
                            <input name="tin" value={formData.tin || ''} onChange={handleChange} />
                        </FormGroup>
                    </>
                );
            case 'education':
                return (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {(formData.education || []).map((edu, index) => (
                            <div key={index} style={{
                                padding: '1.5rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                position: 'relative',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1.5rem',
                                background: '#f8fafc'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newEdu = [...(formData.education || [])];
                                        newEdu.splice(index, 1);
                                        setFormData({ ...formData, education: newEdu });
                                    }}
                                    style={{
                                        position: 'absolute', top: '-10px', right: '-10px',
                                        background: '#fee2e2', color: '#dc2626',
                                        border: '1px solid #fecaca', borderRadius: '50%',
                                        width: '28px', height: '28px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontSize: '12px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    ✕
                                </button>
                                <FormGroup label="Education Level">
                                    <select
                                        value={edu.level || ''}
                                        onChange={(e) => {
                                            const newEdu = [...(formData.education || [])];
                                            newEdu[index] = { ...edu, level: e.target.value };
                                            setFormData({ ...formData, education: newEdu });
                                        }}
                                        required
                                    >
                                        <option value="">Select Level</option>
                                        <option value="Elementary">Elementary</option>
                                        <option value="High School Graduate">High School Graduate</option>
                                        <option value="College Level">College Level</option>
                                        <option value="College Graduate">College Graduate</option>
                                    </select>
                                </FormGroup>
                                <FormGroup label="School Name">
                                    <input
                                        value={edu.school_name || ''}
                                        onChange={(e) => {
                                            const newEdu = [...(formData.education || [])];
                                            newEdu[index] = { ...edu, school_name: e.target.value };
                                            setFormData({ ...formData, education: newEdu });
                                        }}
                                    />
                                </FormGroup>
                                <FormGroup label="Degree/Course">
                                    <input
                                        value={edu.degree_course || ''}
                                        onChange={(e) => {
                                            const newEdu = [...(formData.education || [])];
                                            newEdu[index] = { ...edu, degree_course: e.target.value };
                                            setFormData({ ...formData, education: newEdu });
                                        }}
                                    />
                                </FormGroup>
                                <FormGroup label="Year Graduated">
                                    <input
                                        value={edu.year_graduated || ''}
                                        onChange={(e) => {
                                            const newEdu = [...(formData.education || [])];
                                            newEdu[index] = { ...edu, year_graduated: e.target.value };
                                            setFormData({ ...formData, education: newEdu });
                                        }}
                                    />
                                </FormGroup>
                                <FormGroup label="Honors / Awards (Optional)">
                                    <input
                                        value={edu.honors_awards || ''}
                                        onChange={(e) => {
                                            const newEdu = [...(formData.education || [])];
                                            newEdu[index] = { ...edu, honors_awards: e.target.value };
                                            setFormData({ ...formData, education: newEdu });
                                        }}
                                    />
                                </FormGroup>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                const newEdu = [...(formData.education || []), { level: '', school_name: '', degree_course: '', year_graduated: '', honors_awards: '' }];
                                setFormData({ ...formData, education: newEdu });
                            }}
                            style={{
                                padding: '1rem',
                                background: 'white',
                                border: '2px dashed #e2e8f0',
                                borderRadius: '12px',
                                color: '#64748b',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            + Add Education Record
                        </button>
                    </div>
                );
            case 'work':
                return (
                    <>
                        <FormGroup label="Position">
                            <input name="position" value={formData.position || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Department">
                            <input name="department" value={formData.department || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Branch">
                            <input name="branch" value={formData.branch || ''} onChange={handleChange} />
                        </FormGroup>
                        <FormGroup label="Status">
                            <select name="employment_status" value={formData.employment_status || ''} onChange={handleChange}>
                                <option value="Regular">Regular</option>
                                <option value="Probationary">Probationary</option>
                                <option value="Contractual">Contractual</option>
                                <option value="Resigned">Resigned</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </FormGroup>
                        <FormGroup label="Date Hired">
                            <input type="date" name="date_hired" value={formData.date_hired ? new Date(formData.date_hired).toISOString().split('T')[0] : ''} onChange={handleChange} />
                        </FormGroup>
                    </>
                );
            default:
                return <p>No fields defined for this section.</p>;
        }
    };

    const getTitle = () => {
        switch (section) {
            case 'basic': return 'Edit Basic Information';
            case 'contact': return 'Edit Contact Details';
            case 'address': return 'Edit Address';
            case 'ids': return 'Edit Government IDs';
            case 'work': return 'Edit Employment Details';
            case 'education': return 'Edit Educational Background';
            case 'emergency': return 'Edit Emergency Contact';
            default: return 'Edit Employee';
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white', borderRadius: '32px', padding: '3rem',
                width: '100%', maxWidth: '850px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                maxHeight: '90vh', overflowY: 'auto',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
                        {getTitle()}
                    </h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {renderFields()}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '3.5rem' }}>
                        <button type="button" onClick={onClose}
                            style={{
                                padding: '0.875rem 3rem',
                                background: '#f8fafc',
                                border: '2px solid #2563eb',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                color: '#2563eb',
                                fontWeight: 700,
                                fontSize: '1rem',
                                transition: 'all 0.2s'
                            }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            style={{
                                padding: '0.875rem 3rem',
                                background: '#2563eb',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '1rem',
                                boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
                                transition: 'all 0.2s'
                            }}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
