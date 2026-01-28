'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function AddEmployeePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        employee_id: '',
        last_name: '',
        first_name: '',
        middle_name: '',
        department: '',
        position: '',
        branch: '',
        employment_status: 'Probationary',
        date_hired: new Date().toISOString().split('T')[0],
        date_of_birth: '',
        contact_number: '',
        email_address: '',
        address: '',
        sss_number: '',
        philhealth_number: '',
        pagibig_number: '',
        tin: '',
        civil_status: 'Single',
        remarks: '',
        training_details: '',
        disciplinary_details: '',
        personal_info_complete: 0,
        preemployment_req_complete: 0,
        government_docs_complete: 0,
        employment_records_complete: 0,
        attendance_records_complete: 0,
        payroll_records_complete: 0,
        disciplinary_records: 0,
        training_records: 0,
        separation_records: 0,
        gender: '',
        religion: '',
        emergency_contact_name: '',
        emergency_contact_number: ''
    });

    // Education State
    const [education, setEducation] = useState([{
        level: 'College',
        school_name: '',
        degree_course: '',
        year_graduated: '',
        honors_awards: ''
    }]);

    const handleEducationChange = (index: number, field: string, value: string) => {
        setEducation(prev => {
            const newEdu = [...prev];
            (newEdu[index] as any)[field] = value;
            return newEdu;
        });
    };

    const handleAddEducation = () => {
        setEducation(prev => [...prev, {
            level: 'College',
            school_name: '',
            degree_course: '',
            year_graduated: '',
            honors_awards: ''
        }]);
    };

    const handleRemoveEducation = (index: number) => {
        setEducation(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const fetchNextId = async () => {
            const year = formData.date_hired.split('-')[0];
            try {
                const res = await fetch(`/api/employees/next-id?year=${year}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData(prev => ({ ...prev, employee_id: data.nextId }));
                }
            } catch (err) {
                console.error('Failed to fetch next ID:', err);
            }
        };
        fetchNextId();
    }, [formData.date_hired]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Save Education Records
                if (education.length > 0 && education.some(e => e.school_name)) {
                    await fetch('/api/employees/education', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employee_id: data.id,
                            education: education.filter(e => e.school_name) // Filter out empty entries
                        })
                    });
                }
                router.push(`/employees/${data.id}`);
            } else {
                setError(data.error || 'Failed to create employee');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title">
                            <span>➕</span>
                            Add New Employee
                        </div>
                        <Link href="/employees" className="btn btn-secondary btn-sm">
                            ← Back to List
                        </Link>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card-body">
                        {error && (
                            <div style={{
                                background: 'var(--danger-50)',
                                color: 'var(--danger-700)',
                                padding: 'var(--spacing-md)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-lg)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)'
                            }}>
                                <span>⚠️</span>
                                {error}
                            </div>
                        )}

                        {/* Employee Profile Section */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-xl)'
                        }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.125rem' }}>
                                📝 Employee Profile
                            </h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label form-label-required">Employee ID</label>
                                    <input
                                        type="text"
                                        name="employee_id"
                                        value={formData.employee_id}
                                        onChange={handleChange}
                                        required
                                        readOnly
                                        className="form-input"
                                        placeholder="Generating..."
                                        style={{ background: 'var(--gray-50)', fontWeight: 'bold', cursor: 'not-allowed' }}
                                    />
                                    <div className="form-help">Automated ID based on hiring year and sequence</div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">Last Name</label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                        placeholder="Dela Cruz"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">First Name</label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                        placeholder="Juan"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Middle Name</label>
                                    <input
                                        type="text"
                                        name="middle_name"
                                        value={formData.middle_name}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="Santos"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">Civil Status</label>
                                    <select
                                        name="civil_status"
                                        value={formData.civil_status}
                                        onChange={handleChange}
                                        required
                                        className="form-select"
                                    >
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Widowed">Widowed</option>
                                        <option value="Separated">Separated</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Gender</label>
                                    <select
                                        name="gender"
                                        value={(formData as any).gender}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Religion</label>
                                    <input
                                        type="text"
                                        name="religion"
                                        value={(formData as any).religion}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="e.g. Roman Catholic"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                        placeholder="e.g., Human Resources, IT, Finance"
                                        list="departments"
                                    />
                                    <datalist id="departments">
                                        <option value="Human Resources" />
                                        <option value="Information Technology" />
                                        <option value="Finance" />
                                        <option value="Operations" />
                                        <option value="Sales & Marketing" />
                                        <option value="Administration" />
                                    </datalist>
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">Position</label>
                                    <input
                                        type="text"
                                        name="position"
                                        value={formData.position}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                        placeholder="e.g., HR Manager, Software Developer"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Branch</label>
                                    <select
                                        name="branch"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        className="form-select"
                                    >
                                        <option value="">Not Assigned</option>
                                        <option value="Ormoc Branch">Ormoc Branch</option>
                                        <option value="Naval Branch">Naval Branch</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">Employment Status</label>
                                    <select
                                        name="employment_status"
                                        value={formData.employment_status}
                                        onChange={handleChange}
                                        required
                                        className="form-select"
                                    >
                                        <option value="Probationary">Probationary</option>
                                        <option value="Regular">Regular</option>
                                        <option value="Contractual">Contractual</option>
                                        <option value="Resigned">Resigned</option>
                                        <option value="Terminated">Terminated</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label form-label-required">Date Hired</label>
                                    <input
                                        type="date"
                                        name="date_hired"
                                        value={formData.date_hired}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleChange}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Educational Attainment Section */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-xl)'
                        }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.125rem' }}>
                                🎓 Educational Attainment
                            </h3>

                            {education.map((edu, index) => (
                                <div key={index} style={{
                                    background: 'var(--bg-primary)',
                                    padding: 'var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-md)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600' }}>Entry #{index + 1}</h4>
                                        {education.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEducation(index)}
                                                className="text-danger"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                                            >
                                                × Remove
                                            </button>
                                        )}
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Level</label>
                                            <select
                                                className="form-select"
                                                value={edu.level}
                                                onChange={(e) => handleEducationChange(index, 'level', e.target.value)}
                                            >
                                                <option value="Elementary">Elementary</option>
                                                <option value="High School">High School</option>
                                                <option value="Senior High">Senior High</option>
                                                <option value="Vocational">Vocational</option>
                                                <option value="College Level">College Level</option>
                                                <option value="College">College</option>
                                                <option value="Post Graduate">Post Graduate</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">School Name</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={edu.school_name}
                                                onChange={(e) => handleEducationChange(index, 'school_name', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Degree / Course</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={edu.degree_course}
                                                onChange={(e) => handleEducationChange(index, 'degree_course', e.target.value)}
                                                placeholder="Optional for Elem/HS"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Year Graduated</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={edu.year_graduated}
                                                onChange={(e) => handleEducationChange(index, 'year_graduated', e.target.value)}
                                                placeholder="YYYY"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Honors / Awards</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={edu.honors_awards}
                                                onChange={(e) => handleEducationChange(index, 'honors_awards', e.target.value)}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddEducation}
                                className="btn btn-sm btn-secondary"
                                style={{ width: '100%' }}
                            >
                                + Add Another Education Record
                            </button>
                        </div>

                        {/* Contact Information Section */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-xl)'
                        }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.125rem' }}>
                                📞 Contact Information
                            </h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Contact Number</label>
                                    <input
                                        type="tel"
                                        name="contact_number"
                                        value={formData.contact_number}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="+63 912 345 6789"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="text"
                                        name="email_address"
                                        value={formData.email_address}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="juan.delacruz@company.com or N/A"
                                    />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                                <label className="form-label">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={(formData as any).address || ''}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="123 Example Street, City, Province"
                                />
                            </div>

                            <div style={{ marginTop: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>🚨 Emergency Contact</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Contact Name</label>
                                        <input
                                            type="text"
                                            name="emergency_contact_name"
                                            value={(formData as any).emergency_contact_name}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Contact Number</label>
                                        <input
                                            type="tel"
                                            name="emergency_contact_number"
                                            value={(formData as any).emergency_contact_number}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Phone Number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Government & Statutory Details Section */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-xl)'
                        }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.125rem' }}>
                                🇵🇭 Government & Statutory Details
                            </h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">SSS Number</label>
                                    <input
                                        type="text"
                                        name="sss_number"
                                        value={formData.sss_number}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="34-1234567-8"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">PhilHealth Number</label>
                                    <input
                                        type="text"
                                        name="philhealth_number"
                                        value={formData.philhealth_number}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="12-345678901-2"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Pag-IBIG Number</label>
                                    <input
                                        type="text"
                                        name="pagibig_number"
                                        value={formData.pagibig_number}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="1234-5678-9012"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">TIN</label>
                                    <input
                                        type="text"
                                        name="tin"
                                        value={formData.tin}
                                        onChange={handleChange}
                                        className="form-input"
                                        placeholder="123-456-789-000"
                                    />
                                </div>
                            </div>
                        </div>


                        {/* 201 Information Section */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-xl)'
                        }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.125rem' }}>
                                📄 201 Information
                            </h3>
                            <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label className="form-label">Trainings & Certificates</label>
                                <textarea
                                    name="training_details"
                                    value={formData.training_details}
                                    onChange={handleChange}
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="List down trainings, seminars, and certificates earned..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Violations & Warnings</label>
                                <textarea
                                    name="disciplinary_details"
                                    value={formData.disciplinary_details}
                                    onChange={handleChange}
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="Record any disciplinary actions, violations, or warnings..."
                                />
                            </div>
                        </div>

                        {/* Remarks Section */}
                        <div className="form-group">
                            <label className="form-label">Remarks / HR Notes</label>
                            <textarea
                                name="remarks"
                                value={formData.remarks}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="Additional notes or comments..."
                            />
                        </div>
                    </div>

                    <div className="card-footer">
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
                            <Link href="/employees" className="btn btn-secondary">
                                Cancel
                            </Link>
                            <button type="submit" disabled={loading} className="btn btn-primary">
                                {loading ? 'Creating...' : 'Create Employee'}
                            </button>
                        </div>
                    </div>
                </form >
            </div >
        </DashboardLayout >
    );
}
