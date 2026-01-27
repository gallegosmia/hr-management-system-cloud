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
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
}

interface EditEmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedData: Partial<Employee>) => Promise<void>;
    employee: Employee;
    section: string;
}

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
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save', error);
            // Parent handles error alert
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
                        <div className="form-group">
                            <label>First Name</label>
                            <input name="first_name" value={formData.first_name || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Middle Name</label>
                            <input name="middle_name" value={formData.middle_name || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Last Name</label>
                            <input name="last_name" value={formData.last_name || ''} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Place of Birth</label>
                            <input name="place_of_birth" value={formData.place_of_birth || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Gender</label>
                            <select name="gender" value={formData.gender || ''} onChange={handleChange}>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Civil Status</label>
                            <select name="civil_status" value={formData.civil_status || ''} onChange={handleChange}>
                                <option value="">Select Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Widowed">Widowed</option>
                                <option value="Separated">Separated</option>
                            </select>
                        </div>
                    </>
                );
            case 'contact':
                return (
                    <>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" name="email_address" value={formData.email_address || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Mobile Number</label>
                            <input name="contact_number" value={formData.contact_number || ''} onChange={handleChange} />
                        </div>
                    </>
                );
            case 'address':
                return (
                    <div className="form-group full-width">
                        <label>Current Address</label>
                        <input name="address" value={formData.address || ''} onChange={handleChange} />
                    </div>
                );
            case 'ids':
                return (
                    <>
                        <div className="form-group">
                            <label>SSS Number</label>
                            <input name="sss_number" value={formData.sss_number || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>PhilHealth Number</label>
                            <input name="philhealth_number" value={formData.philhealth_number || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Pag-IBIG Number</label>
                            <input name="pagibig_number" value={formData.pagibig_number || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>TIN</label>
                            <input name="tin" value={formData.tin || ''} onChange={handleChange} />
                        </div>
                    </>
                );
            case 'work': // For potential future use or if we add an edit button for main details
                return (
                    <>
                        <div className="form-group">
                            <label>Position</label>
                            <input name="position" value={formData.position || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Department</label>
                            <input name="department" value={formData.department || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Branch</label>
                            <input name="branch" value={formData.branch || ''} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select name="employment_status" value={formData.employment_status || ''} onChange={handleChange}>
                                <option value="Regular">Regular</option>
                                <option value="Probationary">Probationary</option>
                                <option value="Contractual">Contractual</option>
                                <option value="Resigned">Resigned</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>
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
            default: return 'Edit Employee';
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', borderRadius: '12px', padding: '2rem',
                width: '100%', maxWidth: '600px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#111827' }}>
                    {getTitle()}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {renderFields()}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={onClose}
                            style={{ padding: '0.75rem 1.5rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            style={{ padding: '0.75rem 1.5rem', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white' }}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>

                <style jsx>{`
                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .form-group.full-width {
                        grid-column: 1 / -1;
                    }
                    label {
                        font-size: 0.875rem;
                        font-weight: 500;
                        color: #374151;
                    }
                    input, select {
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 6px;
                        font-size: 1rem;
                    }
                `}</style>
            </div>
        </div>
    );
}
