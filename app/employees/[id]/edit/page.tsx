'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function EditEmployeePage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        employee_id: '',
        last_name: '',
        first_name: '',
        middle_name: '',
        department: '',
        position: '',
        employment_status: '',
        date_hired: '',
        date_of_birth: '',
        contact_number: '',
        email_address: '',
        sss_number: '',
        philhealth_number: '',
        pagibig_number: '',
        tin: '',
        civil_status: '',
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
        salary_info: {
            basic_salary: 0,
            allowances: {
                special: 0
            },
            daily_rate: 0,
            hourly_rate: 0,
            pay_frequency: 'Semi-Monthly',
            deductions: {
                sss_contribution: 0,
                philhealth_contribution: 0,
                pagibig_contribution: 0,
                company_cash_fund: 0,
                company_loan: { balance: 0, amortization: 0 },
                sss_loan: { balance: 0, amortization: 0 },
                pagibig_loan: { balance: 0, amortization: 0 },
                cash_advance: 0,
                other_deductions: [] as { name: string; amount: number }[]
            }
        }
    });

    useEffect(() => {
        if (params.id) {
            fetchEmployee();
        }
    }, [params.id]);

    const fetchEmployee = async () => {
        try {
            const response = await fetch(`/api/employees?id=${params.id}`);
            const data = await response.json();

            if (response.ok) {
                setFormData({
                    employee_id: data.employee_id || '',
                    last_name: data.last_name || '',
                    first_name: data.first_name || '',
                    middle_name: data.middle_name || '',
                    department: data.department || '',
                    position: data.position || '',
                    employment_status: data.employment_status || 'Probationary',
                    date_hired: data.date_hired || '',
                    date_of_birth: data.date_of_birth || '',
                    contact_number: data.contact_number || '',
                    email_address: data.email_address || '',
                    sss_number: data.sss_number || '',
                    philhealth_number: data.philhealth_number || '',
                    pagibig_number: data.pagibig_number || '',
                    tin: data.tin || '',
                    civil_status: data.civil_status || 'Single',
                    remarks: data.remarks || '',
                    training_details: data.training_details || '',
                    disciplinary_details: data.disciplinary_details || '',
                    salary_info: {
                        basic_salary: data.salary_info?.basic_salary || 0,
                        daily_rate: data.salary_info?.daily_rate || 0,
                        hourly_rate: data.salary_info?.hourly_rate || 0,
                        pay_frequency: data.salary_info?.pay_frequency || 'Semi-Monthly',
                        allowances: {
                            special: data.salary_info?.allowances?.special ||
                                (data.salary_info?.allowances?.rice || 0) +
                                (data.salary_info?.allowances?.laundry || 0) +
                                (data.salary_info?.allowances?.clothing || 0) +
                                (data.salary_info?.allowances?.other || 0)
                        },
                        deductions: {
                            sss_contribution: data.salary_info?.deductions?.sss_contribution || 0,
                            philhealth_contribution: data.salary_info?.deductions?.philhealth_contribution || 0,
                            pagibig_contribution: data.salary_info?.deductions?.pagibig_contribution || 0,
                            company_cash_fund: data.salary_info?.deductions?.company_cash_fund || 0,
                            company_loan: {
                                balance: data.salary_info?.deductions?.company_loan?.balance || 0,
                                amortization: data.salary_info?.deductions?.company_loan?.amortization || 0
                            },
                            sss_loan: {
                                balance: data.salary_info?.deductions?.sss_loan?.balance || 0,
                                amortization: data.salary_info?.deductions?.sss_loan?.amortization || 0
                            },
                            pagibig_loan: {
                                balance: data.salary_info?.deductions?.pagibig_loan?.balance || 0,
                                amortization: data.salary_info?.deductions?.pagibig_loan?.amortization || 0
                            },
                            cash_advance: data.salary_info?.deductions?.cash_advance || 0,
                            other_deductions: data.salary_info?.deductions?.other_deductions || []
                        }
                    },
                    personal_info_complete: data.personal_info_complete || 0,
                    preemployment_req_complete: data.preemployment_req_complete || 0,
                    government_docs_complete: data.government_docs_complete || 0,
                    employment_records_complete: data.employment_records_complete || 0,
                    attendance_records_complete: data.attendance_records_complete || 0,
                    payroll_records_complete: data.payroll_records_complete || 0,
                    disciplinary_records: data.disciplinary_records || 0,
                    training_records: data.training_records || 0,
                    separation_records: data.separation_records || 0
                });
            } else {
                setError('Failed to fetch employee details');
            }
        } catch (err) {
            setError('An error occurred while fetching employee details');
        } finally {
            setLoading(false);
        }
    };

    const handleDeductionChange = (category: string, field: string | null, value: any) => {
        const numValue = parseFloat(value) || 0;
        setFormData(prev => {
            const newDeductions = { ...prev.salary_info.deductions } as any;

            if (field) {
                newDeductions[category] = {
                    ...newDeductions[category],
                    [field]: numValue
                };
            } else {
                newDeductions[category] = numValue;
            }

            return {
                ...prev,
                salary_info: {
                    ...prev.salary_info,
                    deductions: newDeductions
                }
            };
        });
    };

    const handleAddOtherDeduction = () => {
        setFormData(prev => ({
            ...prev,
            salary_info: {
                ...prev.salary_info,
                deductions: {
                    ...prev.salary_info.deductions,
                    other_deductions: [
                        ...(prev.salary_info.deductions.other_deductions || []),
                        { name: '', amount: 0 }
                    ]
                }
            }
        }));
    };

    const handleRemoveOtherDeduction = (index: number) => {
        setFormData(prev => ({
            ...prev,
            salary_info: {
                ...prev.salary_info,
                deductions: {
                    ...prev.salary_info.deductions,
                    other_deductions: prev.salary_info.deductions.other_deductions.filter((_, i) => i !== index)
                }
            }
        }));
    };

    const handleOtherDeductionChange = (index: number, field: 'name' | 'amount', value: any) => {
        setFormData(prev => {
            const newOthers = [...(prev.salary_info.deductions.other_deductions || [])];
            newOthers[index] = {
                ...newOthers[index],
                [field]: field === 'amount' ? (parseFloat(value) || 0) : value
            };
            return {
                ...prev,
                salary_info: {
                    ...prev.salary_info,
                    deductions: {
                        ...prev.salary_info.deductions,
                        other_deductions: newOthers
                    }
                }
            };
        });
    };

    const handleSalaryChange = (field: string, value: any, nestedField?: string) => {
        if (nestedField) {
            setFormData(prev => ({
                ...prev,
                salary_info: {
                    ...prev.salary_info,
                    allowances: {
                        ...prev.salary_info.allowances,
                        [nestedField]: parseFloat(value) || 0
                    }
                }
            }));
        } else {
            setFormData(prev => {
                const newSalaryInfo = { ...prev.salary_info, [field]: value };

                // Auto-calculate daily/hourly if basic salary changes
                if (field === 'basic_salary') {
                    const basic = parseFloat(value) || 0;
                    newSalaryInfo.daily_rate = parseFloat((basic / 30).toFixed(2));
                    newSalaryInfo.hourly_rate = parseFloat((basic / 30 / 8).toFixed(2));
                }

                // Auto-calculate basic salary if daily rate changes
                if (field === 'daily_rate') {
                    const daily = parseFloat(value) || 0;
                    newSalaryInfo.basic_salary = parseFloat((daily * 30).toFixed(2));
                    newSalaryInfo.hourly_rate = parseFloat((daily / 8).toFixed(2));
                }

                return { ...prev, salary_info: newSalaryInfo };
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const response = await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: parseInt(params.id as string),
                    ...formData
                })
            });

            const data = await response.json();

            if (response.ok) {
                router.push(`/employees/${params.id}`);
            } else {
                setError(data.error || 'Failed to update employee');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading employee details...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title">
                            <span>✏️</span>
                            Edit Employee
                        </div>
                        <Link href={`/employees/${params.id}`} className="btn btn-secondary btn-sm">
                            ← Cancel
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
                                        className="form-input"
                                    />
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
                                    <label className="form-label form-label-required">Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
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
                                    />
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
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        name="email_address"
                                        value={formData.email_address}
                                        onChange={handleChange}
                                        className="form-input"
                                    />
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
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 201 File Checklist Section */}
                        <div style={{
                            background: 'var(--bg-secondary)',
                            padding: 'var(--spacing-lg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-xl)'
                        }}>
                            <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.125rem' }}>
                                📋 Digital 201 File Checklist
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                                {[
                                    { name: 'personal_info_complete', label: 'Personal Information Complete' },
                                    { name: 'preemployment_req_complete', label: 'Pre-Employment Requirements Complete' },
                                    { name: 'government_docs_complete', label: 'Government Documents Complete' },
                                    { name: 'employment_records_complete', label: 'Employment Records Complete' },
                                    { name: 'attendance_records_complete', label: 'Attendance Records Complete' },
                                    { name: 'payroll_records_complete', label: 'Payroll Records Complete' },
                                    { name: 'disciplinary_records', label: 'Violations & Warnings' },
                                    { name: 'training_records', label: 'Training & Certificate Records' },
                                    { name: 'separation_records', label: 'Separation Records' },
                                ].map((item) => (
                                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                        <input
                                            type="checkbox"
                                            id={item.name}
                                            checked={(formData as any)[item.name] === 1}
                                            onChange={(e) => setFormData({ ...formData, [item.name]: e.target.checked ? 1 : 0 })}
                                            style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor={item.name} style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                                            {item.label}
                                        </label>
                                    </div>
                                ))}
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
                            />
                        </div>
                    </div>

                    <div className="card-footer">
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
                            <Link href={`/employees/${params.id}`} className="btn btn-secondary">
                                Cancel
                            </Link>
                            <button type="submit" disabled={saving} className="btn btn-primary">
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
