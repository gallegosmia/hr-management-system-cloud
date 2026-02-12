/**
 * Payroll Run Details Page
 * View and edit payroll run with all payslips
 * Optimized for 1366×768 screens
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { formatCurrency } from '@/lib/payroll-calculations';
import { downloadExcelExport, downloadRegisterPDF } from '@/lib/payroll-export';
import PayslipBatchPrint from '@/components/PayslipBatchPrint';
import PayslipViewModal from '@/components/PayslipViewModal';

interface PayrollRun {
    id: number;
    run_number: string;
    branch: string;
    payroll_period_start: string;
    payroll_period_end: string;
    cutoff_day: number;
    status: string;
    created_by_name: string;
    approved_by_name?: string;
    created_at: string;
    approved_at?: string;
    workflow_stage?: number;
    current_reviewer_role?: string;
    hr_review_status?: string;
    hr_review_date?: string;
    operations_review_status?: string;
    operations_review_date?: string;
    evp_review_status?: string;
    evp_review_date?: string;
    return_remarks?: string;
}

interface User {
    id: number;
    username: string;
    role: string;
}

interface Payslip {
    id: number;
    employee_id: number;
    employee_number: string;
    first_name: string;
    last_name: string;
    department: string;
    position: string;
    branch: string;
    monthly_salary: number;
    daily_rate: number;
    payroll_days: number;
    basic_pay: number;
    regular_allowance: number;
    special_allowance: number;
    holiday_pay: number;
    other_earnings: number;
    gross_pay: number;
    // 15th cutoff deductions
    phic?: number;
    pagibig?: number;
    pagibig_loan?: number;
    company_funds?: number;
    // 30th cutoff deductions
    sss?: number;
    sss_loan?: number;
    // Both cutoffs
    company_loan: number;
    cash_advance: number;
    other_deductions: number;
    total_deductions: number;
    net_pay: number;
}

export default function PayrollRunDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCell, setEditingCell] = useState<{ payslipId: number; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [payslipToView, setPayslipToView] = useState<Payslip | null>(null);
    const [permissions, setPermissions] = useState({
        canEdit: false,
        canApprove: false,
        canLock: false,
        canDelete: false
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    // Approval Logic
    const [user, setUser] = useState<User | null>(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnRemarks, setReturnRemarks] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showBatchPrint, setShowBatchPrint] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        if (payrollRun) {
            document.title = `Payroll ${payrollRun.run_number} | HR System`;
        } else {
            document.title = 'Payroll Details | HR System';
        }
    }, [payrollRun]);

    // Fetches audit logs for the current payroll run
    const fetchAuditLogs = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const res = await fetch(`/api/payroll/runs/${params.id}/audit`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Error fetching audit logs:', err);
        }
    };

    useEffect(() => {
        fetchPayrollRun();
        fetchPermissions();
        fetchAuditLogs();
    }, [params.id]);

    const fetchPayrollRun = async () => {
        try {
            setLoading(true);
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${params.id}`, {
                headers: { 'x-session-id': sessionId || '' }
            });
            const data = await response.json();

            if (response.ok) {
                setPayrollRun(data.payrollRun);
                const sortedPayslips = (data.payslips || []).sort((a: Payslip, b: Payslip) => {
                    return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);
                });
                setPayslips(sortedPayslips);
            } else {
                alert(`Error: ${data.error}`);
                router.push('/payroll');
            }
        } catch (error) {
            console.error('Error fetching payroll run:', error);
            alert('Failed to load payroll run');
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await fetch('/api/auth/session');
            const data = await response.json();
            if (data.user) {
                setUser(data.user);
                const canEdit = ['Super Admin', 'Admin', 'HR', 'President', 'Vice President'].includes(data.user.role);
                const canApprove = ['Super Admin', 'President', 'Vice President'].includes(data.user.role);
                const canLock = ['Super Admin', 'President', 'Vice President'].includes(data.user.role);
                const canDelete = data.user.role === 'Super Admin';

                setPermissions({ canEdit, canApprove, canLock, canDelete });
            }
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    const handleCellClick = (payslipId: number, field: string, currentValue: any) => {
        if (!permissions.canEdit || payrollRun?.status === 'APPROVED' || payrollRun?.status === 'locked') return;

        setEditingCell({ payslipId, field });
        setEditValue(currentValue?.toString() || '0');
    };

    const handleCellBlur = async () => {
        if (!editingCell) return;

        const payslip = payslips.find(p => p.id === editingCell.payslipId);
        if (!payslip) return;

        const newValue = parseFloat(editValue);
        if (isNaN(newValue) || newValue < 0) {
            alert('Please enter a valid number');
            setEditingCell(null);
            return;
        }

        // Update payslip
        try {
            const sessionId = localStorage.getItem('sessionId');
            const updateData: any = {};

            if (editingCell.field === 'payroll_days') {
                updateData.payrollDays = newValue;
            } else if (['regular_allowance', 'special_allowance', 'holiday_pay'].includes(editingCell.field)) {
                updateData.allowances = {
                    [editingCell.field.replace('_allowance', '').replace('holiday_pay', 'holiday')]: newValue
                };
            } else {
                // Deductions
                const deductionMap: any = {
                    phic: 'phic',
                    pagibig: 'pagibig',
                    pagibig_loan: 'pagibigLoan',
                    company_funds: 'companyFunds',
                    sss: 'sss',
                    sss_loan: 'sssLoan',
                    company_loan: 'companyLoan',
                    cash_advance: 'cashAdvance',
                    other_deductions: 'other'
                };
                updateData.deductions = {
                    [deductionMap[editingCell.field]]: newValue
                };
            }

            const response = await fetch(`/api/payroll/runs/${params.id}/payslips/${editingCell.payslipId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok) {
                // Update local state
                setPayslips(prev => prev.map(p =>
                    p.id === editingCell.payslipId ? { ...p, ...data.payslip } : p
                ));
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error updating payslip:', error);
            alert('Failed to update payslip');
        }

        setEditingCell(null);
    };

    const handleApprove = async () => {
        const actionText = (payrollRun?.workflow_stage || 0) === 0 ? 'finalize and submit for review' : 'approve';
        if (!confirm(`Are you sure you want to ${actionText} this payroll run?`)) return;

        try {
            setProcessing(true);
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${params.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({ action: 'approve' })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || 'Action successful!');
                fetchPayrollRun();
                fetchAuditLogs(); // Refresh audit logs after action
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error in approval workflow:', error);
            alert('Failed to process approval');
        } finally {
            setProcessing(false);
        }
    };

    const handleReturn = async () => {
        if (!returnRemarks.trim()) {
            alert('Please provide remarks for returning the payroll.');
            return;
        }

        try {
            setProcessing(true);
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${params.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({
                    action: 'return',
                    remarks: returnRemarks
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Payroll returned successfully.');
                setShowReturnModal(false);
                setReturnRemarks('');
                fetchPayrollRun();
                fetchAuditLogs(); // Refresh audit logs after action
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error returning payroll:', error);
            alert('Failed to return payroll');
        } finally {
            setProcessing(false);
        }
    };

    const handleLock = async () => {
        if (!confirm('Are you sure you want to lock this payroll run? This action cannot be undone.')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${params.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({ action: 'lock' })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Payroll locked successfully!');
                fetchPayrollRun();
                fetchAuditLogs(); // Refresh audit logs after action
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error locking payroll:', error);
            alert('Failed to lock payroll');
        }
    };

    const handlePrintBatch = () => {
        setShowBatchPrint(true);
        setTimeout(() => {
            window.print();
            setShowBatchPrint(false);
        }, 500);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this payroll run? This action cannot be undone.')) return;

        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${params.id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId || '' }
            });

            const data = await response.json();

            if (response.ok) {
                alert('Payroll run deleted successfully!');
                router.push('/payroll');
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error deleting payroll:', error);
            alert('Failed to delete payroll');
        }
    };

    const handleExportPDF = async () => {
        try {
            const sessionId = localStorage.getItem('sessionId');
            const response = await fetch(`/api/payroll/runs/${params.id}/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId || ''
                },
                body: JSON.stringify({ format: 'pdf' })
            });

            const data = await response.json();

            if (response.ok) {
                downloadRegisterPDF(data.data);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Failed to export to PDF');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: { [key: string]: string } = {
            draft: 'bg-purple-100 text-purple-700',
            approved: 'bg-green-100 text-green-700',
            locked: 'bg-blue-100 text-blue-700'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const formatPeriod = (start: string, end: string) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
    };

    // Filter payslips
    const filteredPayslips = payslips.filter(p => {
        const search = searchTerm.toLowerCase();
        return (
            (p.last_name || '').toLowerCase().includes(search) ||
            (p.first_name || '').toLowerCase().includes(search) ||
            (p.position || '').toLowerCase().includes(search) ||
            (p.employee_number || '').toLowerCase().includes(search)
        );
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredPayslips.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPayslips = filteredPayslips.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Calculate totals for all columns
    const totalDays = filteredPayslips.reduce((sum, p) => sum + (p.payroll_days || 0), 0);
    const totalBasicPay = filteredPayslips.reduce((sum, p) => sum + (p.basic_pay || 0), 0);
    const totalRegAllow = filteredPayslips.reduce((sum, p) => sum + (p.regular_allowance || 0), 0);
    const totalSpclAllow = filteredPayslips.reduce((sum, p) => sum + (p.special_allowance || 0), 0);
    // existing totals
    const totalEmployees = filteredPayslips.length;
    const totalGrossPay = filteredPayslips.reduce((sum, p) => sum + (p.gross_pay || 0), 0);
    const totalDeductions = filteredPayslips.reduce((sum, p) => sum + (p.total_deductions || 0), 0);
    const totalNetPay = filteredPayslips.reduce((sum, p) => sum + (p.net_pay || 0), 0);
    const totalPercent = 4.2;

    // Get deduction columns based on cutoff
    const getDeductionColumns = () => {
        if (!payrollRun) return [];

        const cutoff = payrollRun.cutoff_day;

        if (cutoff === 15) {
            return [
                { key: 'phic', label: 'PHIC' },
                { key: 'pagibig', label: 'PAG-IBIG' },
                { key: 'pagibig_loan', label: <>PAG-IBIG<br />LN</> },
                { key: 'company_loan', label: <>CO.<br />LOAN</> },
                { key: 'cash_advance', label: <>CASH<br />ADV</> },
                { key: 'company_funds', label: <>CO.<br />FUNDS</> }
            ];
        } else {
            return [
                { key: 'sss', label: 'SSS' },
                { key: 'sss_loan', label: 'SSS LN' },
                { key: 'company_loan', label: 'LOANS' },
                { key: 'cash_advance', label: 'CASH ADV' },
                { key: 'other_deductions', label: 'OTHER' }
            ];
        }
    };

    // Helper for deduction totals
    const getDeductionTotal = (key: string) => {
        return filteredPayslips.reduce((sum, p) => sum + ((p as any)[key] || 0), 0);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Loading payroll run...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!payrollRun) {
        return (
            <DashboardLayout>
                <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p>Payroll run not found</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className={`page-wrapper ${showBatchPrint ? 'batch-mode' : ''}`}>
                {/* Header & Breadcrumbs */}
                <div className="premium-header">
                    <div className="breadcrumb-nav">
                        <Link href="/payroll">Payroll</Link>
                        <span className="chevron">›</span>
                        <span className="current">Approval Queue</span>
                    </div>

                    <div className="header-main-row">
                        <div className="title-section-new">
                            <h1 className="page-title-new">
                                {payrollRun.run_number}
                            </h1>
                        </div>

                        <div className="header-controls">
                            <div className={`status-badge-premium ${payrollRun.status.toLowerCase().replace(/ /g, '-')}`}>
                                <span className="dot"></span>
                                {payrollRun.status.toUpperCase()}
                            </div>

                            <div className="header-user-actions">
                                <button className="icon-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    <span className="notification-dot"></span>
                                </button>
                                <div className="user-avatar-premium">
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Redesigned Approval Tracker (Top Timeline) */}
                <div className="premium-tracker-section">
                    <div className="tracker-timeline">
                        {[
                            { label: 'HR OFFICER', role: 'HR Officer', stage: 1, name: 'Marilyn Reloba', status: payrollRun.hr_review_status, date: payrollRun.hr_review_date },
                            { label: 'OPERATIONS MANAGER', role: 'Operations Manager', stage: 2, name: 'Victorio Reloba Jr.', status: payrollRun.operations_review_status, date: payrollRun.operations_review_date },
                            { label: 'EVP', role: 'Executive Vice President', stage: 3, name: 'Anna Liza Rodriguez', status: payrollRun.evp_review_status, date: payrollRun.evp_review_date },
                            { label: 'FINAL APPROVAL', role: 'Finance Board', stage: 4, name: 'Finance Board', status: payrollRun.status === 'APPROVED' ? 'Approved' : 'Pending' }
                        ].map((step, i) => {
                            const isCurrent = payrollRun.workflow_stage === step.stage;
                            const isPast = (payrollRun.workflow_stage || 0) > step.stage;
                            const isReturned = step.status === 'Returned';
                            const isApproved = step.status === 'Approved' || (step.stage === 4 && payrollRun.status === 'APPROVED');

                            return (
                                <div key={step.label} className="timeline-step-container">
                                    {i > 0 && <div className={`timeline-line ${isPast || isCurrent ? 'active' : ''}`}></div>}
                                    <div className="timeline-step">
                                        <div className={`step-icon-circle ${isApproved ? 'approved' : isCurrent ? 'current' : ''}`}>
                                            {isApproved ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            ) : isCurrent ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            )}
                                        </div>
                                        <div className="step-content-box">
                                            <div className="step-header-label">{step.label}</div>
                                            <div className="step-person-name">{step.name}</div>
                                            <div className={`step-status-text ${isApproved ? 'approved' : isCurrent ? 'current' : ''}`}>
                                                {isApproved ? `Approved: ${step.date ? new Date(step.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Done'}`
                                                    : isCurrent ? 'AWAITING ACTION' : 'Pending Previous'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {payrollRun.return_remarks && (
                        <div className="return-remarks-banner-new">
                            <span className="remarks-label">Return Reason:</span> {payrollRun.return_remarks}
                        </div>
                    )}
                </div>

                {/* Main Two-Column Layout */}
                <div className="redesigned-grid-container">
                    {/* Left Column: Table & Summary */}
                    <div className="left-column-content">
                        {/* Redesigned Summary Cards */}
                        <div className="premium-summary-grid">
                            <div className="premium-card">
                                <div className="card-info">
                                    <div className="card-title">TOTAL NET PAY</div>
                                    <div className="card-main-value">{formatCurrency(totalNetPay)}</div>
                                    <div className="card-trend upward">↗ 2.4% vs last month</div>
                                </div>
                            </div>
                            <div className="premium-card">
                                <div className="card-info">
                                    <div className="card-title">GROSS AMOUNT</div>
                                    <div className="card-main-value">{formatCurrency(totalGrossPay)}</div>
                                    <div className="card-sub-info">Inclusive of bonuses</div>
                                </div>
                            </div>
                            <div className="premium-card">
                                <div className="card-info">
                                    <div className="card-title">DEDUCTIONS</div>
                                    <div className="card-main-value">{formatCurrency(totalDeductions)}</div>
                                    <div className="card-sub-info">{((totalDeductions / (totalGrossPay || 1)) * 100).toFixed(1)}% Tax rate avg</div>
                                </div>
                            </div>
                            <div className="premium-card">
                                <div className="card-info">
                                    <div className="card-title">HEADCOUNT</div>
                                    <div className="card-main-value">{totalEmployees}</div>
                                    <div className="card-sub-info">4 new joiners added</div>
                                </div>
                            </div>
                        </div>

                        {/* Table Card */}
                        <div className="main-card-new">
                            <div className="card-header-new">
                                <h2 className="section-title">Employee Payroll Breakdown</h2>
                                <div className="search-wrapper">
                                    <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    <input
                                        type="text"
                                        placeholder="Search employee name or ID..."
                                        className="search-input"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="table-container-new">
                                <table className="payroll-table">
                                    <thead>
                                        <tr>
                                            <th className="th-employee">EMPLOYEE DETAILS</th>
                                            <th className="th-center" style={{ width: '40px' }}>DAYS</th>
                                            <th className="th-right" style={{ width: '80px' }}>BASIC</th>
                                            <th className="th-right" style={{ width: '60px' }}>REG.<br />ALW.</th>
                                            <th className="th-right" style={{ width: '60px' }}>SPCL.<br />ALW.</th>
                                            <th className="th-right text-green-600" style={{ width: '90px' }}>GROSS<br />PAY</th>
                                            {getDeductionColumns().map(col => (
                                                <th key={col.key} className="th-right th-deduction" style={{ width: '70px' }}>{col.label}</th>
                                            ))}
                                            <th className="th-right text-red-600" style={{ width: '90px' }}>TOTAL<br />DED.</th>
                                            <th className="th-right text-indigo-600" style={{ width: '95px' }}>NET PAY</th>
                                            <th className="th-center" style={{ width: '50px' }}>VIEW</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedPayslips.length > 0 ? paginatedPayslips.map((payslip, index) => (
                                            <tr key={payslip.id}>
                                                <td className="td-employee">
                                                    <div className="employee-info">
                                                        <div className="employee-name">{payslip.last_name}, {payslip.first_name}</div>
                                                        <div className="employee-meta">
                                                            ID: {payslip.employee_number}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Days */}
                                                <td
                                                    className="td-center td-editable"
                                                    onClick={() => handleCellClick(payslip.id, 'payroll_days', payslip.payroll_days)}
                                                >
                                                    {editingCell?.payslipId === payslip.id && editingCell?.field === 'payroll_days' ? (
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleCellBlur}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                                                            autoFocus
                                                            className="cell-input"
                                                        />
                                                    ) : (
                                                        <span className="font-medium">{payslip.payroll_days.toFixed(2)}</span>
                                                    )}
                                                </td>

                                                <td className="td-right">{formatCurrency(payslip.basic_pay).replace('₱', '')}</td>

                                                {/* Allowances */}
                                                <td
                                                    className="td-right td-editable"
                                                    onClick={() => handleCellClick(payslip.id, 'regular_allowance', payslip.regular_allowance)}
                                                >
                                                    {editingCell?.payslipId === payslip.id && editingCell?.field === 'regular_allowance' ? (
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleCellBlur}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                                                            autoFocus
                                                            className="cell-input"
                                                        />
                                                    ) : (
                                                        formatCurrency(payslip.regular_allowance || 0).replace('₱', '')
                                                    )}
                                                </td>

                                                <td
                                                    className="td-right td-editable"
                                                    onClick={() => handleCellClick(payslip.id, 'special_allowance', payslip.special_allowance)}
                                                >
                                                    {editingCell?.payslipId === payslip.id && editingCell?.field === 'special_allowance' ? (
                                                        <input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onBlur={handleCellBlur}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                                                            autoFocus
                                                            className="cell-input"
                                                        />
                                                    ) : (
                                                        formatCurrency(payslip.special_allowance || 0).replace('₱', '')
                                                    )}
                                                </td>

                                                <td className="td-right text-green-600 font-bold">
                                                    {formatCurrency(payslip.gross_pay).replace('₱', '')}
                                                </td>

                                                {/* Deductions Dynamic */}
                                                {getDeductionColumns().map(col => (
                                                    <td
                                                        key={col.key}
                                                        className="td-right td-editable text-gray-500"
                                                        onClick={() => handleCellClick(payslip.id, col.key, (payslip as any)[col.key])}
                                                    >
                                                        {editingCell?.payslipId === payslip.id && editingCell?.field === col.key ? (
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={handleCellBlur}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                                                                autoFocus
                                                                className="cell-input"
                                                            />
                                                        ) : (
                                                            formatCurrency((payslip as any)[col.key] || 0).replace('₱', '')
                                                        )}
                                                    </td>
                                                ))}

                                                <td className="td-right text-red-600 font-bold">
                                                    {formatCurrency(payslip.total_deductions).replace('₱', '')}
                                                </td>

                                                <td className="td-right text-indigo-600 font-bold">
                                                    {formatCurrency(payslip.net_pay).replace('₱', '')}
                                                </td>

                                                <td className="td-center">
                                                    <button
                                                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 font-medium"
                                                        onClick={() => setPayslipToView(payslip)}
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={15} style={{ padding: '48px 32px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                                    <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                                                        {searchTerm ? 'No matching employees found' : 'No employee records found'}
                                                    </div>
                                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                                        {searchTerm
                                                            ? `We couldn't find any results for "${searchTerm}"`
                                                            : 'This payroll run appears to be empty.'}
                                                    </div>
                                                    {!searchTerm && payslips.length === 0 && (
                                                        <button
                                                            onClick={() => fetchPayrollRun()}
                                                            style={{ marginTop: '16px', color: '#4f46e5', fontWeight: '500', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
                                                        >
                                                            Tap to Refresh
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="table-summary-row">
                                        <tr>
                                            <td className="td-employee font-bold">TOTAL SUMMARY ({totalEmployees} EMP)</td>
                                            <td className="td-center font-bold">{totalDays.toFixed(2)}</td>
                                            <td className="td-right font-bold">{formatCurrency(totalBasicPay).replace('₱', '')}</td>
                                            <td className="td-right font-bold">{formatCurrency(totalRegAllow).replace('₱', '')}</td>
                                            <td className="td-right font-bold">{formatCurrency(totalSpclAllow).replace('₱', '')}</td>
                                            <td className="td-right font-bold text-green-600">{formatCurrency(totalGrossPay).replace('₱', '')}</td>
                                            {getDeductionColumns().map(col => (
                                                <td key={col.key} className="td-right font-bold text-gray-600">
                                                    {formatCurrency(getDeductionTotal(col.key)).replace('₱', '')}
                                                </td>
                                            ))}
                                            <td className="td-right font-bold text-red-600">{formatCurrency(totalDeductions).replace('₱', '')}</td>
                                            <td className="td-right font-bold text-indigo-600">{formatCurrency(totalNetPay).replace('₱', '')}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="table-footer-new">
                                <div className="footer-info">
                                    Showing <span className="font-medium">{filteredPayslips.length > 0 ? startIndex + 1 : 0}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredPayslips.length)}</span> of <span className="font-medium">{filteredPayslips.length}</span> employees
                                </div>
                                <div className="pagination-controls-new">
                                    <button
                                        className="page-btn-square"
                                        disabled={currentPage === 1}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            className={`page-num-square ${currentPage === i + 1 ? 'active' : ''}`}
                                            onClick={() => handlePageChange(i + 1)}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        className="page-btn-square"
                                        disabled={currentPage === totalPages}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar Actions & Audit */}
                    <div className="right-sidebar-new">
                        {/* Approval Action Panel */}
                        <div className="sidebar-card-new">
                            <h3 className="sidebar-title">Actions Panel</h3>

                            <div className="action-buttons-stack">
                                {/* Workflow Approval / Finalize */}
                                {(payrollRun.status === 'DRAFT' || payrollRun.status === 'RETURNED TO PREPARER') && permissions.canEdit && (
                                    <button onClick={handleApprove} className="primary-action-btn" disabled={processing}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        FINALIZE & SUBMIT
                                    </button>
                                )}

                                {/* Reviewer Action Buttons */}
                                {payrollRun.status !== 'APPROVED' && payrollRun.status !== 'locked' && (
                                    (payrollRun.workflow_stage === 1 && (user?.role === 'HR' || user?.role === 'Super Admin')) ||
                                    (payrollRun.workflow_stage === 2 && (user?.role === 'Admin' || user?.role === 'Super Admin')) ||
                                    (payrollRun.workflow_stage === 3 && (['President', 'Vice President'].includes(user?.role || '') || user?.role === 'Super Admin'))
                                ) && (
                                        <>
                                            <button onClick={handleApprove} className="approve-btn" disabled={processing}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                APPROVE PAYROLL
                                            </button>
                                            <button onClick={() => setShowReturnModal(true)} className="return-btn" disabled={processing}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                RETURN FOR CORRECTION
                                            </button>
                                        </>
                                    )}

                                {payrollRun.status === 'APPROVED' && permissions.canLock && (
                                    <button onClick={handleLock} className="primary-action-btn black" disabled={processing}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        LOCK & ARCHIVE
                                    </button>
                                )}

                                <div className="divider-h"></div>

                                <button onClick={handlePrintBatch} className="secondary-action-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    PRINT REGISTER
                                </button>
                                <button onClick={handleExportPDF} className="secondary-action-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    DOWNLOAD SUMMARY
                                </button>

                                {payrollRun.status !== 'locked' && permissions.canDelete && (
                                    <button onClick={handleDelete} className="danger-action-link">
                                        Delete this payroll run
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Audit Trail Panel */}
                        <div className="sidebar-card-new mt-24">
                            <h3 className="sidebar-title">Audit Trail</h3>
                            <div className="audit-list">
                                {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                                    <div key={idx} className="audit-item">
                                        <div className="audit-dot"></div>
                                        <div className="audit-content">
                                            <div className="audit-action">{log.action.replace(/_/g, ' ')}</div>
                                            <div className="audit-user">by {log.username}</div>
                                            <div className="audit-time">{new Date(log.performed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.performed_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-audit">No audit logs found</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Batch Print Component */}
                {showBatchPrint && payrollRun && (
                    <div className="print-only-batch">
                        <PayslipBatchPrint payslips={payslips.map(p => ({
                            ...p,
                            run_number: payrollRun.run_number,
                            payroll_period_start: payrollRun.payroll_period_start,
                            payroll_period_end: payrollRun.payroll_period_end,
                            cutoff_day: payrollRun.cutoff_day,
                            payroll_status: payrollRun.status
                        }))} />
                    </div>
                )}

                {/* Single Payslip View Modal */}
                {payslipToView && (
                    <PayslipViewModal
                        payslip={payslipToView}
                        payrollRun={payrollRun}
                        onClose={() => setPayslipToView(null)}
                    />
                )}

                {/* Return Remarks Modal */}
                {showReturnModal && (
                    <div className="modal-overlay">
                        <div className="return-modal">
                            <h3>Return Payroll</h3>
                            <p>Please provide a reason for returning this payroll for correction.</p>
                            <textarea
                                value={returnRemarks}
                                onChange={(e) => setReturnRemarks(e.target.value)}
                                placeholder="Enter remarks here..."
                                className="remarks-textarea"
                                rows={4}
                            />
                            <div className="modal-actions">
                                <button onClick={() => setShowReturnModal(false)} className="btn-cancel">Cancel</button>
                                <button onClick={handleReturn} className="btn-confirm-return" disabled={processing}>
                                    {processing ? 'Processing...' : 'Return Payroll'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .approval-tracker {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .tracker-steps {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }
                .tracker-step-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .tracker-step {
                    flex: 1;
                    padding: 12px;
                    border-radius: 8px;
                    text-align: center;
                    position: relative;
                    min-height: 60px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .step-label {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                }
                .step-status {
                    font-size: 10px;
                    margin-top: 4px;
                    color: #6b7280;
                }
                .step-current-tag {
                    position: absolute;
                    top: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #4f46e5;
                    color: white;
                    font-size: 8px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .tracker-line {
                    height: 2px;
                    flex: 0 0 20px;
                }
                .return-remarks-banner {
                    margin-top: 16px;
                    padding: 12px 16px;
                    background: #fff1f2;
                    border-left: 4px solid #ef4444;
                    color: #991b1b;
                    font-size: 13px;
                    border-radius: 4px;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .return-modal {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    width: 400px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                }
                .return-modal h3 { margin: 0 0 12px; font-size: 18px; }
                .remarks-textarea {
                    width: 100%;
                    margin: 16px 0;
                    padding: 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    resize: none;
                }
                .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
                .btn-cancel { background: #f3f4f6; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
                .btn-confirm-return { background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
                @media print {
                    /* Always hide layout elements: Sidebar and Top Header */
                    aside.main-sidebar,
                    header.premium-header {
                        display: none !important;
                    }

                    /* Layout Resets for Print */
                    .premium-dashboard-container {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .main-viewport {
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                    }
                    .scroll-content {
                        overflow: visible !important;
                    }

                    /* Batch Mode Specifics */
                    .batch-mode .page-header, 
                    .batch-mode .summary-grid, 
                    .batch-mode .main-card {
                        display: none !important;
                    }
                    .print-only-batch {
                        display: block !important;
                        width: 100%;
                    }
                }

                .page-wrapper {
                    padding: 24px;
                    background-color: #f3f4f6;
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                }
                
                /* Header Styles */
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    background: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .back-link {
                    color: #6b7280;
                    padding: 8px;
                    border-radius: 50%;
                }
                .back-link:hover {
                    background-color: #f3f4f6;
                }
                .page-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111827;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .meta-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: #6b7280;
                    margin-top: 4px;
                }
                .meta-dot { color: #d1d5db; }
                
                .header-actions {
                    display: flex;
                    gap: 12px;
                }
                .action-btn-primary {
                    background: #4f46e5;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 14px;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .action-btn-primary:hover { opacity: 0.9; }
                .action-btn-secondary {
                    background: white;
                    color: #374151;
                    border: 1px solid #d1d5db;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .action-btn-secondary:hover { background: #f9fafb; }
                .action-btn-danger {
                    background: #fee2e2;
                    color: #ef4444;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid #fecaca;
                    cursor: pointer;
                }
                .action-btn-danger:hover { background: #fef2f2; }

                /* Summary Cards */
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 24px;
                    margin-bottom: 24px;
                }
                .summary-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .card-icon-wrapper {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .card-content { flex: 1; }
                .card-label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
                .card-value { font-size: 24px; font-weight: 700; line-height: 1.2; margin-bottom: 4px; }
                .card-subtext { font-size: 12px; font-weight: 500; }
                .card-link { font-size: 12px; color: #4f46e5; text-decoration: underline; }
                .text-dark { color: #111827; }

                /* Main Table Card */
                .main-card {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 300px); /* Fill remaining space */
                }
                .card-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .section-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
                .search-wrapper {
                    position: relative;
                    width: 300px;
                }
                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9ca3af;
                }
                .search-input {
                    width: 100%;
                    padding: 8px 12px 8px 36px;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    font-size: 14px;
                    outline: none;
                }
                .search-input:focus { border-color: #4f46e5; }

                /* Table Styles */
                .table-container {
                    overflow-x: auto;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    margin-top: 16px;
                    width: 100%; /* ensure full width use */
                }
                .batch-view-container {
                    padding: 24px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    margin-top: 24px;
                    overflow-x: auto;
                }
                .payroll-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    font-size: 13px;
                }
                .payroll-table thead th {
                    background: #f9fafb;
                    color: #4b5563;
                    font-weight: 600;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 12px 16px;
                    border-bottom: 2px solid #f3f4f6;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    text-align: inherit; /* Ensure alignment from specific classes */
                }
                .payroll-table tbody tr {
                    transition: background 0.1s;
                }
                .payroll-table tbody tr:hover {
                    background-color: #f8fafc;
                }
                .payroll-table td {
                    padding: 12px 16px;
                    border-bottom: 1px solid #f3f4f6;
                    vertical-align: middle;
                }
                .th-center, .td-center { text-align: center; }
                .th-right, .td-right { text-align: right; }
                .th-employee, .td-employee { text-align: left; }
                
                .employee-info {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                }
                .employee-name {
                    font-weight: 600;
                    color: #111827;
                }
                .employee-meta {
                    font-size: 11px;
                    color: #9ca3af;
                }
                
                .td-editable { 
                    cursor: pointer; 
                }
                .td-editable:hover { 
                    background-color: #eff6ff;
                    box-shadow: inset 0 0 0 1px #3b82f6;
                }
                .cell-input {
                    width: 100%;
                    padding: 4px 8px;
                    border: 2px solid #3b82f6;
                    border-radius: 4px;
                    font-size: 13px;
                    outline: none;
                    text-align: inherit;
                }
                
                .table-summary-row td {
                    background: #f9fafb;
                    border-top: 2px solid #e5e7eb;
                    border-bottom: none;
                    font-size: 12px;
                    padding: 16px;
                }
                
                .text-green-600 { color: #059669; }
                .text-red-600 { color: #dc2626; }
                .text-indigo-600 { color: #4f46e5; }
                .font-bold { font-weight: 700; }

                /* Scrollbar */
                .table-container::-webkit-scrollbar { width: 6px; height: 6px; }
                .table-container::-webkit-scrollbar-track { background: transparent; }
                .table-container::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
                .table-container::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
                .premium-header {
                    margin-bottom: 32px;
                }
                .breadcrumb-nav {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 12px;
                }
                .breadcrumb-nav a {
                    text-decoration: none;
                    color: #6b7280;
                }
                .breadcrumb-nav a:hover { color: #4f46e5; }
                .chevron { font-size: 16px; margin: 0 4px; color: #d1d5db; }
                .current { color: #111827; font-weight: 500; }
                
                .header-main-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .page-title-new {
                    font-size: 24px;
                    font-weight: 700;
                    color: #111827;
                    letter-spacing: -0.01em;
                }
                .header-controls {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .status-badge-premium {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 16px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 600;
                    background: #f0f9ff;
                    color: #0369a1;
                    border: 1px solid #bae6fd;
                }
                .status-badge-premium.approved { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
                .status-badge-premium.draft { background: #f5f3ff; color: #6d28d9; border-color: #ddd6fe; }
                .status-badge-premium.locked { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
                .status-badge-premium .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                }
                
                .header-user-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .icon-button {
                    position: relative;
                    background: none;
                    border: none;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 4px;
                }
                .notification-dot {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 8px;
                    height: 8px;
                    background: #f43f5e;
                    border: 2px solid white;
                    border-radius: 50%;
                }
                .user-avatar-premium {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #fde68a;
                    color: #92400e;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 14px;
                }
                .premium-tracker-section {
                    background: white;
                    padding: 32px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .tracker-timeline {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                }
                .timeline-step-container {
                    flex: 1;
                    display: flex;
                    align-items: flex-start;
                }
                .timeline-line {
                    height: 2px;
                    background: #e5e7eb;
                    flex: 1;
                    margin-top: 24px;
                    margin-right: -12px;
                    margin-left: -12px;
                }
                .timeline-line.active { background: #10b981; }
                
                .timeline-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    z-index: 1;
                    width: 140px;
                }
                .step-icon-circle {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #9ca3af;
                    margin-bottom: 12px;
                    transition: all 0.3s;
                }
                .step-icon-circle.approved {
                    background: #10b981;
                    border-color: #10b981;
                    color: white;
                }
                .step-icon-circle.current {
                    background: #3b82f6;
                    border-color: #3b82f6;
                    color: white;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                
                .step-content-box {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .step-header-label {
                    font-size: 10px;
                    font-weight: 700;
                    color: #3b82f6;
                    letter-spacing: 0.05em;
                }
                .step-person-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: #111827;
                }
                .step-status-text {
                    font-size: 11px;
                    color: #9ca3af;
                }
                .step-status-text.approved { color: #10b981; font-weight: 500; }
                .step-status-text.current { color: #3b82f6; font-weight: 500; }
                
                .return-remarks-banner-new {
                    margin-top: 20px;
                    padding: 12px 16px;
                    background: #fff1f2;
                    border-radius: 8px;
                    color: #991b1b;
                    font-size: 13px;
                    border-left: 4px solid #ef4444;
                }
                .remarks-label { font-weight: 700; }

                /* Summary Cards Redesign */
                .premium-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 24px;
                    margin-bottom: 32px;
                }
                .premium-card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border: 1px solid #f3f4f6;
                }
                .card-title {
                    font-size: 11px;
                    font-weight: 600;
                    color: #6b7280;
                    letter-spacing: 0.05em;
                    margin-bottom: 8px;
                }
                .card-main-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 8px;
                    letter-spacing: -0.02em;
                }
                .card-trend {
                    font-size: 12px;
                    font-weight: 500;
                }
                .card-trend.upward { color: #10b981; }
                .card-sub-info {
                    font-size: 12px;
                    color: #9ca3af;
                }
                /* Two-Column Layout */
                .redesigned-grid-container {
                    display: grid;
                    grid-template-columns: 1fr 320px;
                    gap: 32px;
                    align-items: flex-start;
                }
                .left-column-content {
                    min-width: 0; /* Important for flex/grid items to shrink */
                }
                
                .main-card-new {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .card-header-new {
                    padding: 24px;
                    border-bottom: 1px solid #f3f4f6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .table-container-new {
                    overflow-x: auto;
                    padding: 0 24px;
                }
                .table-footer-new {
                    padding: 20px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #f3f4f6;
                }
                .pagination-controls-new {
                    display: flex;
                    gap: 8px;
                }

                /* Sidebar Styles */
                .right-sidebar-new {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .sidebar-card-new {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border: 1px solid #f3f4f6;
                }
                .sidebar-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .action-buttons-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .primary-action-btn {
                    width: 100%;
                    padding: 12px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
                }
                .primary-action-btn:hover { background: #2563eb; transform: translateY(-1px); }
                .primary-action-btn.black { background: #111827; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                
                .approve-btn {
                    width: 100%;
                    padding: 12px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .approve-btn:hover { background: #059669; }
                
                .return-btn {
                    width: 100%;
                    padding: 12px;
                    background: #fff1f2;
                    color: #e11d48;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .return-btn:hover { background: #ffe4e6; }
                
                .secondary-action-btn {
                    width: 100%;
                    padding: 10px;
                    background: white;
                    color: #374151;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .secondary-action-btn:hover { background: #f9fafb; border-color: #9ca3af; }
                
                .divider-h { height: 1px; background: #f3f4f6; margin: 8px 0; }
                
                .danger-action-link {
                    background: none;
                    border: none;
                    color: #9ca3af;
                    font-size: 12px;
                    text-decoration: underline;
                    cursor: pointer;
                    margin-top: 12px;
                    text-align: center;
                }
                .danger-action-link:hover { color: #f43f5e; }

                /* Audit Trail List */
                .audit-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .audit-item {
                    display: flex;
                    gap: 12px;
                    position: relative;
                }
                .audit-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #3b82f6;
                    margin-top: 4px;
                    flex-shrink: 0;
                    z-index: 1;
                }
                .audit-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .audit-action {
                    font-size: 13px;
                    font-weight: 600;
                    color: #111827;
                    text-transform: capitalize;
                }
                .audit-user {
                    font-size: 12px;
                    color: #6b7280;
                }
                .audit-time {
                    font-size: 10px;
                    color: #9ca3af;
                }
                .empty-audit { font-size: 12px; color: #9ca3af; font-style: italic; text-align: center; padding: 20px 0; }
                .mt-24 { margin-top: 24px; }
            `}</style>
        </DashboardLayout>
    );
}
