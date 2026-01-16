'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function TransportationAllowancePage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('All');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        // Set default to current month and year
        const now = new Date();
        setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'));
        setSelectedYear(String(now.getFullYear()));
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [selectedBranch]);

    const fetchEmployees = async () => {
        try {
            const response = await fetch('/api/employees');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    // Filter only active employees
                    let activeEmployees = data.filter((emp: any) =>
                        emp.employment_status !== 'Resigned' && emp.employment_status !== 'Terminated'
                    );

                    if (selectedBranch !== 'All') {
                        activeEmployees = activeEmployees.filter((emp: any) => emp.branch === selectedBranch);
                    }

                    setEmployees(activeEmployees);
                } else {
                    console.error('Fetched data is not an array:', data);
                    setEmployees([]);
                }
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        const printContainer = document.querySelector('.transportation-print-container');
        if (printContainer) {
            (printContainer as HTMLElement).style.display = 'block';
            window.print();
            (printContainer as HTMLElement).style.display = 'none';
        }
    };

    const monthName = selectedMonth ? new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleDateString('en-US', { month: 'long' }) : '';
    const totalAmount = employees.length * 400;

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Loading...</p>
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
                            <span>🚗</span>
                            Transportation Allowance
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowPreview(true)}
                                className="btn btn-secondary btn-sm"
                                disabled={!selectedMonth || !selectedYear || employees.length === 0}
                            >
                                👁️ View Receipt
                            </button>
                            <button
                                onClick={generatePDF}
                                className="btn btn-primary btn-sm"
                                disabled={!selectedMonth || !selectedYear || employees.length === 0}
                            >
                                📄 Generate PDF Form
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card-body">
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{
                            background: 'var(--primary-50)',
                            padding: 'var(--spacing-md)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                <strong>ℹ️ Transportation Allowance Policy:</strong> Each employee receives ₱400.00 transportation allowance on the 10th of every month.
                            </p>
                        </div>

                        <div className="form-row" style={{ maxWidth: '600px' }}>
                            <div className="form-group">
                                <label className="form-label">Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="form-select"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Branch</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => {
                                        setSelectedBranch(e.target.value);
                                        // Trigger refetch or re-filter
                                        // Since we fetch all, we should probably refetch to apply filter properly or move filtering client side
                                        // For now, let's just trigger effect by adding it to dependency, but effect is []
                                        // Better: make fetchEmployees depend on selectedBranch or filter client side.
                                        // Let's modify useEffect to depend on selectedBranch
                                    }}
                                    className="form-select"
                                >
                                    <option value="All">All Branches</option>
                                    <option value="Ormoc Branch">Ormoc Branch</option>
                                    <option value="Naval Branch">Naval Branch</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>No.</th>
                                    <th>Employee Name</th>
                                    <th>Position</th>
                                    <th>Department</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(employees || []).map((emp, idx) => (
                                    <tr key={emp.id}>
                                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>
                                                {emp.last_name}, {emp.first_name} {emp.middle_name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {emp.employee_id}
                                            </div>
                                        </td>
                                        <td>{emp.position}</td>
                                        <td>{emp.department}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                            ₱400.00
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: 'var(--gray-50)', fontWeight: 700 }}>
                                    <td colSpan={4} style={{ textAlign: 'right', padding: '1rem' }}>
                                        TOTAL ({employees.length} employees):
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '1rem', fontFamily: 'monospace', fontSize: '1.125rem', color: 'var(--primary-700)' }}>
                                        ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div
                    className="no-print"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            padding: '40px',
                            borderRadius: '12px',
                            width: '100%',
                            maxWidth: '1000px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            position: 'relative',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowPreview(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                border: 'none',
                                background: '#eee',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                cursor: 'pointer'
                            }}
                        >
                            ×
                        </button>

                        <div className="payroll-register-page">
                            <div className="payslip-header">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Melann Lending Investor Corporation</h2>
                                <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>TRANSPORTATION ALLOWANCE ACKNOWLEDGMENT RECEIPT</p>
                                <p style={{ fontSize: '0.875rem' }}>
                                    For the Month of: <strong>{monthName} {selectedYear}</strong>
                                </p>
                                <p style={{ fontSize: '0.875rem' }}>
                                    Distribution Date: <strong>{monthName} 10, {selectedYear}</strong>
                                </p>
                            </div>

                            <table className="payroll-register-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>No.</th>
                                        <th>Employee Name</th>
                                        <th>Position</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th className="signature-col" style={{ textAlign: 'center', width: '200px' }}>Signature / Date Received</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((emp, idx) => (
                                        <tr key={emp.id}>
                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>
                                                    {emp.last_name}, {emp.first_name} {emp.middle_name}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#666' }}>{emp.employee_id}</div>
                                            </td>
                                            <td>{emp.position}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>₱400.00</td>
                                            <td className="signature-col" style={{ borderBottom: '1px solid #333' }}></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ fontWeight: 700, background: '#f0f0f0' }}>
                                        <td colSpan={3} style={{ textAlign: 'right' }}>GRAND TOTAL ({employees.length} employees):</td>
                                        <td style={{ textAlign: 'right', fontSize: '1rem' }}>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.875rem', marginBottom: '2.5rem' }}>Prepared By:</p>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>MARILYN RELOBA</div>
                                    <div style={{ borderTop: '1px solid #333', width: '200px', marginTop: '0.25rem' }}></div>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Branch Manager</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', marginBottom: '2.5rem' }}>Reviewed By:</p>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>VICTORIO RELOBA JR.</div>
                                    <div style={{ borderTop: '1px solid #333', width: '200px', marginTop: '0.25rem' }}></div>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Operations Manager</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', marginBottom: '2.5rem' }}>Approved By:</p>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>ANNA LIZA RODRIGUEZ</div>
                                    <div style={{ borderTop: '1px solid #333', width: '200px', marginTop: '0.25rem' }}></div>
                                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Executive Vice President</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '3rem', fontSize: '0.75rem', color: '#666' }}>
                                <p><strong>Note:</strong> This transportation allowance is provided to assist employees with their daily commute expenses.
                                    By signing above, you acknowledge receipt of ₱400.00 for {monthName} {selectedYear}.</p>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    generatePDF();
                                }}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 2rem' }}
                            >
                                🖨️ Print Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Container (Hidden on screen) */}
            <div className="transportation-print-container" style={{ display: 'none' }}>
                <div className="payroll-register-page">
                    <div className="payslip-header">
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Melann Lending Investor Corporation</h2>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>TRANSPORTATION ALLOWANCE ACKNOWLEDGMENT RECEIPT</p>
                        <p style={{ fontSize: '0.875rem' }}>
                            For the Month of: <strong>{monthName} {selectedYear}</strong>
                        </p>
                        <p style={{ fontSize: '0.875rem' }}>
                            Distribution Date: <strong>{monthName} 10, {selectedYear}</strong>
                        </p>
                    </div>

                    <table className="payroll-register-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>No.</th>
                                <th>Employee Name</th>
                                <th>Position</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th className="signature-col" style={{ textAlign: 'center', width: '200px' }}>Signature / Date Received</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, idx) => (
                                <tr key={emp.id}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 700 }}>
                                            {emp.last_name}, {emp.first_name} {emp.middle_name}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: '#666' }}>{emp.employee_id}</div>
                                    </td>
                                    <td>{emp.position}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₱400.00</td>
                                    <td className="signature-col" style={{ borderBottom: '1px solid #333' }}></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 700, background: '#f0f0f0' }}>
                                <td colSpan={3} style={{ textAlign: 'right' }}>GRAND TOTAL ({employees.length} employees):</td>
                                <td style={{ textAlign: 'right', fontSize: '1rem' }}>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                        <div>
                            <p style={{ fontSize: '0.875rem', marginBottom: '2.5rem' }}>Prepared By:</p>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>MARILYN RELOBA</div>
                            <div style={{ borderTop: '1px solid #333', width: '200px', marginTop: '0.25rem' }}></div>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Branch Manager</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', marginBottom: '2.5rem' }}>Reviewed By:</p>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>VICTORIO RELOBA JR.</div>
                            <div style={{ borderTop: '1px solid #333', width: '200px', marginTop: '0.25rem' }}></div>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Operations Manager</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', marginBottom: '2.5rem' }}>Approved By:</p>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>ANNA LIZA RODRIGUEZ</div>
                            <div style={{ borderTop: '1px solid #333', width: '200px', marginTop: '0.25rem' }}></div>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Executive Vice President</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem', fontSize: '0.75rem', color: '#666' }}>
                        <p><strong>Note:</strong> This transportation allowance is provided to assist employees with their daily commute expenses.
                            By signing above, you acknowledge receipt of ₱400.00 for {monthName} {selectedYear}.</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .transportation-print-container,
                    .transportation-print-container * {
                        visibility: visible;
                    }
                    .transportation-print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .payroll-register-page {
                        page-break-after: always;
                        padding: 2rem;
                    }
                    .payslip-header {
                        text-align: center;
                        margin-bottom: 2rem;
                        border-bottom: 2px solid #333;
                        padding-bottom: 1rem;
                    }
                    .payroll-register-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 0.75rem;
                    }
                    .payroll-register-table th,
                    .payroll-register-table td {
                        border: 1px solid #333;
                        padding: 0.5rem;
                    }
                    .payroll-register-table th {
                        background: #f0f0f0;
                        font-weight: 700;
                    }
                    .signature-col {
                        min-height: 40px;
                    }
                }
            `}</style>
        </DashboardLayout>
    );
}
