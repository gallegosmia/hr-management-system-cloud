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

    // Calculate Totals (if not pre-calculated)
    const earnings = [
        { label: 'Basic Pay', amount: safeVal(payslip.basic_pay) },
        { label: 'Regular Allowance', amount: safeVal(payslip.allowances?.regular) },
        { label: 'Special Allowance', amount: safeVal(payslip.allowances?.special) },
        { label: 'Overtime', amount: safeVal(payslip.overtime_pay) },
        { label: 'Bonuses', amount: safeVal(payslip.bonuses) },
    ].filter(e => e.amount > 0);

    const taxes = [
        { label: 'Withholding Tax', amount: safeVal(payslip.deductions?.tax) },
    ].filter(t => t.amount > 0);

    // Group Statutory Deductions
    const statutory = [
        { label: 'SSS Contribution', amount: safeVal(payslip.deductions?.sss_contribution) },
        { label: 'PhilHealth', amount: safeVal(payslip.deductions?.philhealth_contribution) },
        { label: 'Pag-IBIG', amount: safeVal(payslip.deductions?.pagibig_contribution) },
    ].filter(d => d.amount > 0);

    // Other Deductions
    const otherDeductions = [
        { label: 'SSS Loan', amount: safeVal(payslip.deductions?.sss_loan?.amortization) },
        { label: 'Pag-IBIG Loan', amount: safeVal(payslip.deductions?.pagibig_loan?.amortization) },
        { label: 'Company Loan', amount: safeVal(payslip.deductions?.company_loan?.amortization) },
        { label: 'Cash Advance', amount: safeVal(payslip.deductions?.cash_advance) },
        ...(Array.isArray(payslip.deductions?.other_deductions)
            ? payslip.deductions.other_deductions.map((d: any) => ({ label: d.note || 'Other', amount: safeVal(d.amount) }))
            : [])
    ].filter(d => d.amount > 0);

    const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);
    const totalTaxes = taxes.reduce((sum, item) => sum + item.amount, 0);
    const totalDeductions = statutory.reduce((sum, item) => sum + item.amount, 0) + otherDeductions.reduce((sum, item) => sum + item.amount, 0);

    // Net Pay should ideally come from DB, but we verify here
    const netPay = safeVal(payslip.net_pay);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
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
                <div style={{ padding: '32px 40px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', background: '#2563eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>Melann Lending Investor Corporation</h2>
                            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase' }}>PAYROLL SYSTEM</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{employee.first_name} {employee.last_name}</h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>Employee ID: {employee.employee_id}</p>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '40px' }}>

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
                                <span style={{ color: '#111827', textTransform: 'uppercase', fontSize: '12px' }}>TOTAL EARNINGS</span>
                                <span style={{ color: '#111827' }}>{formatCurrency(totalEarnings)}</span>
                            </div>
                        </div>

                        {/* Column 2: Taxes */}
                        <div>
                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #ef4444', paddingBottom: '12px', marginBottom: '20px' }}>
                                TAXES
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {taxes.length > 0 ? taxes.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>{item.label}</span>
                                        <span style={{ color: '#ef4444', fontWeight: '500' }}>-{formatCurrency(item.amount)}</span>
                                    </div>
                                )) : (
                                    <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>None</div>
                                )}
                            </div>
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                <span style={{ color: '#ef4444', textTransform: 'uppercase', fontSize: '12px' }}>TOTAL TAXES</span>
                                <span style={{ color: '#ef4444' }}>-{formatCurrency(totalTaxes)}</span>
                            </div>
                        </div>

                        {/* Column 3: Deductions */}
                        <div>
                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #f59e0b', paddingBottom: '12px', marginBottom: '20px' }}>
                                DEDUCTIONS
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[...statutory, ...otherDeductions].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#4b5563' }}>{item.label}</span>
                                        <span style={{ color: '#ef4444', fontWeight: '500' }}>-{formatCurrency(item.amount)}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                                <span style={{ color: '#ef4444', textTransform: 'uppercase', fontSize: '12px' }}>TOTAL DEDUCTIONS</span>
                                <span style={{ color: '#ef4444' }}>-{formatCurrency(totalDeductions)}</span>
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
                        <button onClick={() => window.print()} style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            background: '#2563eb', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
                            Print Payslip
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
