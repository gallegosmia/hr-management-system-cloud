/**
 * PayslipDetailModal
 * Displays detailed payslip information in a modal
 * Designed to match PayFlow Pro specifications
 * Hidden during print
 */

import React from 'react';
import { formatCurrency } from '@/lib/payroll-calculations';

interface PayslipDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    payslip: any; // Using any for flexibility, but should match Payslip interface
    employee: any;
    run: any;
}

export default function PayslipDetailModal({ isOpen, onClose, payslip, employee, run }: PayslipDetailModalProps) {
    if (!isOpen || !payslip) return null;

    // Helper to safely get nested values
    const safeVal = (val: any) => parseFloat(val || 0);

    const parsedOtherDeductionsBreakdown = (() => {
        try {
            if (!payslip.other_deductions_breakdown) return null;
            const parsed = typeof payslip.other_deductions_breakdown === 'string'
                ? JSON.parse(payslip.other_deductions_breakdown)
                : payslip.other_deductions_breakdown;
            return Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            return null;
        }
    })();


    // Calculate Totals (if not pre-calculated)
    const earnings = [
        { label: 'Basic Pay', amount: safeVal(payslip.basic_pay) },
        { label: 'Special Allowance', amount: safeVal(payslip.special_allowance || payslip.allowances?.special) },
        { label: 'Regular Allowance', amount: safeVal(payslip.allowances?.regular) },
        { label: 'Overtime', amount: safeVal(payslip.overtime_pay) },
        { label: 'Bonuses', amount: safeVal(payslip.bonuses) },
    ].filter(e => e.amount > 0);

    const taxes = [
        { label: 'Withholding Tax', amount: safeVal(payslip.deductions?.tax) },
    ].filter(t => t.amount > 0);

    // Group Statutory Deductions
    const statutory = [
        { label: 'SSS Contribution', amount: safeVal(payslip.sss || payslip.deductions?.sss_contribution) },
        { label: 'PhilHealth', amount: safeVal(payslip.phic || payslip.deductions?.philhealth_contribution) },
        { label: 'Pag-IBIG', amount: safeVal(payslip.pagibig || payslip.deductions?.pagibig_contribution) },
    ].filter(d => d.amount > 0);

    // Other Deductions
    const companyLoanDeduction = safeVal(payslip.company_loan || payslip.deductions?.company_loan?.amortization || payslip.deductions?.company_loan);
    const otherDeductions = [
        { label: 'SSS Loan', amount: safeVal(payslip.sss_loan || payslip.deductions?.sss_loan?.amortization || payslip.deductions?.sss_loan) },
        { label: 'Pag-IBIG Loan', amount: safeVal(payslip.pagibig_loan || payslip.deductions?.pagibig_loan?.amortization || payslip.deductions?.pagibig_loan) },
        { label: 'Company Loan', amount: companyLoanDeduction },
        { label: 'Cash Advance', amount: safeVal(payslip.cash_advance || payslip.deductions?.cash_advance) },
        { label: 'Company Funds', amount: safeVal(payslip.company_funds) },
        ...(parsedOtherDeductionsBreakdown
            ? parsedOtherDeductionsBreakdown.map((d: any) => ({
                label: `${d.name || d.note || 'Other Deduction'}${d.balance ? ` (Bal: ${formatCurrency(d.balance)})` : ''}`,
                amount: safeVal(d.amount)
            }))
            : Array.isArray(payslip.deductions?.other_deductions)
                ? payslip.deductions.other_deductions.map((d: any) => ({
                    label: d.note || d.name || 'Other',
                    amount: safeVal(d.amount)
                }))
                : safeVal(payslip.other_deductions) > 0
                    ? [{ label: 'Other Deductions', amount: safeVal(payslip.other_deductions) }]
                    : []
        )
    ].filter(d => d.amount > 0);

    const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalTaxes = taxes.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = statutory.reduce((sum, item) => sum + item.amount, 0) + otherDeductions.reduce((sum, item) => sum + item.amount, 0);

    // Net Pay should ideally come from DB, but we verify here
    const netPay = safeVal(payslip.net_pay);

    // Calculate Loan Balance Display
    // If not released, the balance fetched is likely the 'starting' balance. 
    // We should show the 'ending' balance (Starting - Deduction).
    let loanBalanceDisplay = safeVal(payslip.company_loan_balance || employee?.company_loan_balance || employee?.ledger_balance);
    // Assuming 'RELEASED' is the status where loans are updated. 
    // If status is DRAFT, APPROVED, etc., we subtract the current deduction to show projected ending balance.
    // Note: status might be uppercase or lowercase depending on where it comes from, ensuring case-insensitivity or checking specific known statuses.
    const isReleased = run?.status?.toUpperCase().includes('RELEASED');

    if (!isReleased && loanBalanceDisplay > 0 && companyLoanDeduction > 0) {
        loanBalanceDisplay = Math.max(0, loanBalanceDisplay - companyLoanDeduction);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose} className="payslip-modal-overlay">

            <style jsx global>{`
                @media print {
                    .payslip-modal-overlay { display: none !important; }
                }
            `}</style>

            <div style={{
                background: 'white', borderRadius: '24px', width: '100%', maxWidth: '900px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative', overflow: 'hidden',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>

                {/* Close Button */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: '24px', right: '24px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: '24px', zIndex: 10
                }}>×</button>

                {/* Header */}
                <div style={{ padding: '32px 40px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{
                            width: '120px',
                            padding: '8px',
                            background: 'white',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                            border: '1px solid #f3f4f6'
                        }}>
                            <img src="/images/logo.jpg" alt="Melann Lending" style={{ width: '100%', height: 'auto' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase' }}>OFFICIAL PAYSLIP</p>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Melann Lending Investor Corp.</h2>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{employee.first_name} {employee.last_name}</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>Employee ID: {employee.employee_year ? `${employee.employee_year}-${employee.employee_id.toString().padStart(4, '0')}` : employee.employee_number || employee.employee_id}</p>
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '2px 0 0' }}>{employee.position} • {employee.department}</p>
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{ padding: '24px 40px', background: '#f9fafb', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>PAY PERIOD</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            {new Date(run.payroll_period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(run.payroll_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>PAY DATE</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>EARNINGS BASIS</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Semi-Monthly</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>PAYMENT METHOD</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#2563eb' }}>Direct Deposit</div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '40px' }}>

                        {/* Column 1: Earnings */}
                        <div>
                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '20px' }}>
                                EARNINGS
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {earnings.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>{item.label}</span>
                                        <span style={{ color: '#111827', fontWeight: '600' }}>{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                <span style={{ color: '#111827', textTransform: 'uppercase', fontSize: '12px' }}>TOTAL GROSS PAY</span>
                                <span style={{ color: '#111827' }}>{formatCurrency(totalEarnings)}</span>
                            </div>
                        </div>

                        {/* Column 2: Deductions (Includes Tax & Statutory) */}
                        <div>
                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #ef4444', paddingBottom: '12px', marginBottom: '20px' }}>
                                DEDUCTIONS
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {statutory.map((item, i) => (
                                    <div key={`stat-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>{item.label}</span>
                                        <span style={{ color: '#ef4444', fontWeight: '500' }}>-{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                {taxes.map((item, i) => (
                                    <div key={`tax-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>{item.label}</span>
                                        <span style={{ color: '#ef4444', fontWeight: '500' }}>-{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                {otherDeductions.map((item, i) => (
                                    <div key={`other-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>{item.label.replace(/ \(Bal: .*\)/, '')}</span>
                                        <span style={{ color: '#ef4444', fontWeight: '500' }}>-{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                                {(statutory.length === 0 && taxes.length === 0 && otherDeductions.length === 0) && (
                                    <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>None</div>
                                )}
                            </div>
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                <span style={{ color: '#ef4444', textTransform: 'uppercase', fontSize: '12px' }}>TOTAL DEDUCTIONS</span>
                                <span style={{ color: '#ef4444' }}>-{formatCurrency(totalDeductions + totalTaxes)}</span>
                            </div>
                        </div>

                        {/* Column 3: Balances */}
                        <div>
                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #f59e0b', paddingBottom: '12px', marginBottom: '20px' }}>
                                BALANCES
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {/* Company Balance */}
                                {loanBalanceDisplay > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>Company Loan</span>
                                        <span style={{ color: '#111827', fontWeight: '600' }}>{formatCurrency(loanBalanceDisplay)}</span>
                                    </div>
                                )}

                                {/* Other Deduction Balances */}
                                {(() => {
                                    const balances = parsedOtherDeductionsBreakdown
                                        ? parsedOtherDeductionsBreakdown.filter((d: any) => parseFloat(d.balance) > 0)
                                        : [];

                                    return balances.map((d: any, i: number) => (
                                        <div key={`bal-${i}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: '#4b5563' }}>{d.name || d.note || 'Other'}</span>
                                            <span style={{ color: '#111827', fontWeight: '600' }}>{formatCurrency(d.balance)}</span>
                                        </div>
                                    ));
                                })()}

                                {(loanBalanceDisplay <= 0 && (!parsedOtherDeductionsBreakdown || parsedOtherDeductionsBreakdown.filter((d: any) => d.balance > 0).length === 0)) && (
                                    <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>None</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Take Home Pay Card */}
                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{
                            background: '#2563eb', padding: '24px 32px', borderRadius: '16px',
                            color: 'white', display: 'flex', alignItems: 'center', gap: '24px',
                            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)'
                        }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#bfdbfe', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                    TAKE HOME PAY
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '800', lineHeight: 1 }}>
                                    {formatCurrency(netPay)}
                                </div>
                            </div>
                            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="12" y1="12" x2="12" y2="12" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 40px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '12px', fontStyle: 'italic' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        SOC2 Compliant • Digitally Signed by Melann Lending Investor Corporation
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} style={{
                            padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db',
                            background: 'white', color: '#374151', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            Close
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}
