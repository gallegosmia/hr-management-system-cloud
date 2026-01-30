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
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch('/api/employees', {
                headers: {
                    'x-session-id': sessionId || ''
                }
            });
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
            setEmployees([]);
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
                <div className="card-header" style={{ background: 'white', borderBottom: '1px solid var(--gray-200)', padding: '1.5rem 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                            <span style={{
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                padding: '0.5rem',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                marginRight: '0.75rem',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                            }}>🚗</span>
                            <span style={{ background: 'linear-gradient(90deg, var(--gray-900), var(--gray-600))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Transportation Allowance
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowPreview(true)}
                                className="btn btn-secondary"
                                style={{ borderRadius: '10px', padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}
                                disabled={!selectedMonth || !selectedYear || employees.length === 0}
                            >
                                <span style={{ marginRight: '0.5rem' }}>👁️</span> View Acknowledgment
                            </button>
                            <button
                                onClick={generatePDF}
                                className="btn btn-primary"
                                style={{ borderRadius: '10px', padding: '0.625rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' }}
                                disabled={!selectedMonth || !selectedYear || employees.length === 0}
                            >
                                <span style={{ marginRight: '0.5rem' }}>📄</span> Export PDF Receipt
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card-body">
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div className="glass-effect" style={{
                            padding: '1.25rem 1.75rem',
                            borderRadius: 'var(--radius-lg)',
                            marginBottom: '2rem',
                            borderLeft: '4px solid var(--primary-500)',
                            background: 'white',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--primary-800)' }}>Allowance Policy Details</h4>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                        Each employee receives a fixed <strong>₱400.00</strong> transportation allowance, distributed on the 10th of every month.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="form-row" style={{
                            background: '#f8fafc',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--gray-200)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)' }}>Payroll Month</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="form-select"
                                    style={{ background: 'white', fontWeight: 500 }}
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
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)' }}>Fiscal Year</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                    className="form-select"
                                    style={{ background: 'white', fontWeight: 500 }}
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-500)' }}>Specific Branch</label>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => {
                                        setSelectedBranch(e.target.value);
                                    }}
                                    className="form-select"
                                    style={{ background: 'white', fontWeight: 500 }}
                                >
                                    <option value="All">All Branches</option>
                                    <option value="Ormoc Branch">Ormoc Branch</option>
                                    <option value="Naval Branch">Naval Branch</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="table-container" style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <table className="table">
                            <thead>
                                <tr style={{ background: 'var(--gray-50)' }}>
                                    <th style={{ width: '60px', textAlign: 'center' }}>No.</th>
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
                                <tr style={{ background: 'var(--gray-900)', color: 'white' }}>
                                    <td colSpan={4} style={{ textAlign: 'right', padding: '1.25rem', fontWeight: 500, border: 'none' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', marginRight: '0.5rem' }}>TOTAL FOR {employees.length} EMPLOYEES:</span>
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '1.25rem', fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 800, border: 'none', color: 'var(--warning-500)' }}>
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
