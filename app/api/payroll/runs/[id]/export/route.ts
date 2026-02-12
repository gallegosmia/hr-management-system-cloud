/**
 * Payroll Export API Route
 * POST /api/payroll/runs/[id]/export - Generate batch PDF or Excel export
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll } from '@/lib/payroll-access';
import { formatCurrency } from '@/lib/payroll-calculations';

// POST /api/payroll/runs/[id]/export - Export payroll data
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = params.id;
        const body = await request.json();
        const { format } = body; // 'pdf' or 'excel'

        // Get payroll run
        const runResult = await query(`
            SELECT 
                pr.*,
                u.username as created_by_name,
                a.username as approved_by_name
            FROM payroll_runs pr
            LEFT JOIN users u ON pr.created_by = u.id
            LEFT JOIN users a ON pr.approved_by = a.id
            WHERE pr.id = $1
        `, [payrollRunId]);

        if (runResult.rows.length === 0) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        const payrollRun = runResult.rows[0];

        // Check access
        if (!canAccessPayroll(user, payrollRun.branch)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get payslips and employees separately for robust mapping (JSON DB safe)
        const payslipsResult = await query(`SELECT * FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);
        const allPayslips = payslipsResult.rows;

        // Get employees involved in this payroll
        const employeeIds = allPayslips.map((p: any) => p.employee_id);

        let employeesMap: any = {};
        if (employeeIds.length > 0) {
            // Fetch employees in chunks if needed, but for now simple query
            // Local JSON DB logic can handle ANY($1) if implemented, but simpler is fetch all or loop
            // Since we upgraded query logic, let's try a bulk fetch or loop if fallback
            // To be safe, let's fetch all relevant employees
            // Actually, fetch all employees for simplicity in JSON context usually low volume, but better:
            // "SELECT * FROM employees WHERE id = ANY($1)"

            // Safe approach: Fetch employees one by one or in small batches if ANY is not supported in JSON
            // BUT, our JSON DB logic supports `id = $1` but not `ANY($1)` fully in simple implementation maybe?
            // Let's rely on basic query or just iterate. 
            // Iterating is safe.
            for (const id of employeeIds) {
                if (!employeesMap[id]) {
                    const eRes = await query(`SELECT * FROM employees WHERE id = $1`, [id]);
                    if (eRes.rows.length > 0) {
                        employeesMap[id] = eRes.rows[0];
                    }
                }
            }
        }

        // Extract salary info for balance
        const payslips = allPayslips.map((ps: any) => {
            const emp = employeesMap[ps.employee_id] || {};

            // Extract salary info for balance
            let salaryInfo: any = {};
            try {
                if (typeof emp.salary_info === 'string') {
                    salaryInfo = JSON.parse(emp.salary_info);
                } else {
                    salaryInfo = emp.salary_info || {};
                }
            } catch (e) { salaryInfo = {}; }

            const companyLoanBalance = salaryInfo.deductions?.company_loan_balance || salaryInfo.deductions?.company_loan?.balance || 0;

            return {
                ...ps,
                employee_number: emp.employee_id, // This is the string ID "ORMOC-..."
                first_name: emp.first_name,
                last_name: emp.last_name,
                department: emp.department,
                position: emp.position,
                branch: emp.branch,
                company_loan_balance: companyLoanBalance
            };
        }).sort((a: any, b: any) => {
            return (a.last_name || '').localeCompare(b.last_name || '') || (a.first_name || '').localeCompare(b.first_name || '');
        });

        if (format === 'excel') {
            // Generate Excel data
            const excelData = generateExcelData(payrollRun, payslips);
            return NextResponse.json({
                success: true,
                format: 'excel',
                data: excelData
            });
        } else if (format === 'pdf') {
            // Generate PDF data
            const pdfData = generatePDFData(payrollRun, payslips);
            return NextResponse.json({
                success: true,
                format: 'pdf',
                data: pdfData
            });
        } else {
            return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Error exporting payroll:', error);
        return NextResponse.json(
            { error: 'Failed to export payroll', details: error.message },
            { status: 500 }
        );
    }
}

// Generate Excel-compatible data structure
function generateExcelData(payrollRun: any, payslips: any[]) {
    const cutoff = payrollRun.cutoff_day;

    // Define columns based on cutoff
    const baseColumns = [
        'Employee ID',
        'Last Name',
        'First Name',
        'Position',
        'Department',
        'Payroll Days',
        'Daily Rate',
        'Basic Pay',
        'Regular Allowance',
        'Special Allowance',
        'Holiday Pay',
        'Gross Pay'
    ];

    const deductionColumns = cutoff === 15
        ? ['PHIC', 'Pag-IBIG', 'Pag-IBIG Loan', 'Company Funds', 'Company Loan', 'Cash Advance', 'Other Deductions']
        : ['SSS', 'SSS Loan', 'Company Loan', 'Cash Advance', 'Other Deductions'];

    const columns = [...baseColumns, ...deductionColumns, 'Total Deductions', 'Net Pay'];

    // Generate rows
    const rows = payslips.map(ps => {
        const baseRow = [
            ps.employee_number,
            ps.last_name,
            ps.first_name,
            ps.position,
            ps.department,
            ps.payroll_days.toFixed(2),
            formatCurrency(ps.daily_rate),
            formatCurrency(ps.basic_pay),
            formatCurrency(ps.regular_allowance || 0),
            formatCurrency(ps.special_allowance || 0),
            formatCurrency(ps.holiday_pay || 0),
            formatCurrency(ps.gross_pay)
        ];

        const deductionRow = cutoff === 15
            ? [
                formatCurrency(ps.phic || 0),
                formatCurrency(ps.pagibig || 0),
                formatCurrency(ps.pagibig_loan || 0),
                formatCurrency(ps.company_funds || 0),
                formatCurrency(ps.company_loan || 0),
                formatCurrency(ps.cash_advance || 0),
                formatCurrency(ps.other_deductions || 0)
            ]
            : [
                formatCurrency(ps.sss || 0),
                formatCurrency(ps.sss_loan || 0),
                formatCurrency(ps.company_loan || 0),
                formatCurrency(ps.cash_advance || 0),
                formatCurrency(ps.other_deductions || 0)
            ];

        return [...baseRow, ...deductionRow, formatCurrency(ps.total_deductions), formatCurrency(ps.net_pay)];
    });

    // Calculate totals
    const totals = ['', '', '', '', '', '', '', '', '', '', '',
        formatCurrency(payslips.reduce((sum, ps) => sum + (ps.gross_pay || 0), 0))
    ];

    // Add deduction totals
    if (cutoff === 15) {
        totals.push(
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.phic || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.pagibig || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.pagibig_loan || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.company_funds || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.company_loan || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.cash_advance || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.other_deductions || 0), 0))
        );
    } else {
        totals.push(
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.sss || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.sss_loan || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.company_loan || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.cash_advance || 0), 0)),
            formatCurrency(payslips.reduce((sum, ps) => sum + (ps.other_deductions || 0), 0))
        );
    }

    totals.push(
        formatCurrency(payslips.reduce((sum, ps) => sum + (ps.total_deductions || 0), 0)),
        formatCurrency(payslips.reduce((sum, ps) => sum + (ps.net_pay || 0), 0))
    );

    return {
        runNumber: payrollRun.run_number,
        branch: payrollRun.branch,
        period: `${payrollRun.payroll_period_start} to ${payrollRun.payroll_period_end}`,
        cutoff: `${payrollRun.cutoff_day}th`,
        columns,
        rows,
        totals
    };
}

// Generate PDF-compatible data structure
function generatePDFData(payrollRun: any, payslips: any[]) {
    return {
        runNumber: payrollRun.run_number,
        branch: payrollRun.branch,
        periodStart: payrollRun.payroll_period_start,
        periodEnd: payrollRun.payroll_period_end,
        cutoff: payrollRun.cutoff_day,
        status: payrollRun.status,
        createdBy: payrollRun.created_by_name,
        approvedBy: payrollRun.approved_by_name,
        createdAt: payrollRun.created_at,
        approvedAt: payrollRun.approved_at,
        payslips: payslips.map(ps => ({
            employeeNumber: ps.employee_number,
            firstName: ps.first_name,
            lastName: ps.last_name,
            position: ps.position,
            department: ps.department,
            branch: ps.branch,
            payrollDays: ps.payroll_days,
            dailyRate: ps.daily_rate,
            basicPay: ps.basic_pay,
            regularAllowance: ps.regular_allowance || 0,
            specialAllowance: ps.special_allowance || 0,
            holidayPay: ps.holiday_pay || 0,
            grossPay: ps.gross_pay,
            // Deductions
            phic: ps.phic || 0,
            pagibig: ps.pagibig || 0,
            pagibigLoan: ps.pagibig_loan || 0,
            companyFunds: ps.company_funds || 0,
            sss: ps.sss || 0,
            sssLoan: ps.sss_loan || 0,
            companyLoan: ps.company_loan || 0,
            cashAdvance: ps.cash_advance || 0,
            otherDeductions: ps.other_deductions || 0,
            totalDeductions: ps.total_deductions,
            netPay: ps.net_pay,
            companyLoanBalance: ps.company_loan_balance || 0
        })),
        summary: {
            totalEmployees: payslips.length,
            totalGrossPay: payslips.reduce((sum, ps) => sum + (ps.gross_pay || 0), 0),
            totalDeductions: payslips.reduce((sum, ps) => sum + (ps.total_deductions || 0), 0),
            totalNetPay: payslips.reduce((sum, ps) => sum + (ps.net_pay || 0), 0)
        }
    };
}
