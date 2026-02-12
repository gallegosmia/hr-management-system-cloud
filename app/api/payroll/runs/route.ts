/**
 * Payroll Runs API Route
 * Handles CRUD operations for payroll runs
 * POST /api/payroll/runs - Create new payroll run
 * GET /api/payroll/runs - List payroll runs
 * GET /api/payroll/runs/[id] - Get payroll run details
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll, canCreatePayroll, validatePayrollAccess, getAccessibleBranches } from '@/lib/payroll-access';
import { generateRunNumber, validatePayrollDays } from '@/lib/payroll-calculations';

// GET /api/payroll/runs - List payroll runs
export async function GET(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const { searchParams } = new URL(request.url);
        const branch = searchParams.get('branch');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get accessible branches for user
        const accessibleBranches = getAccessibleBranches(user);

        if (accessibleBranches.length === 0) {
            return NextResponse.json({ error: 'No access to payroll' }, { status: 403 });
        }

        // Build query
        let sql = `
            SELECT 
                pr.*,
                u.username as created_by_name,
                a.username as approved_by_name,
                COUNT(ps.id) as employee_count,
                SUM(ps.net_pay) as total_net_pay
            FROM payroll_runs pr
            LEFT JOIN users u ON pr.created_by = u.id
            LEFT JOIN users a ON pr.approved_by = a.id
            LEFT JOIN payslips ps ON pr.id = ps.payroll_run_id
            WHERE 1=1
        `;

        const params: any[] = [];
        let paramIndex = 1;

        // Filter by branch access
        if (branch && branch !== 'All') {
            sql += ` AND pr.branch = $${paramIndex++}`;
            params.push(branch);
        } else if (!accessibleBranches.includes('All')) {
            sql += ` AND pr.branch = ANY($${paramIndex++})`;
            params.push(accessibleBranches);
        }

        // Filter by status
        if (status) {
            sql += ` AND pr.status = $${paramIndex++}`;
            params.push(status);
        }

        sql += ` GROUP BY pr.id, u.username, a.username`;
        sql += ` ORDER BY pr.created_at DESC`;
        sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await query(sql, params);

        return NextResponse.json({
            runs: result.rows,
            total: result.rows.length,
            limit,
            offset
        });

    } catch (error: any) {
        console.error('Error fetching payroll runs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payroll runs', details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/payroll/runs - Create new payroll run
export async function POST(request: NextRequest) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const body = await request.json();
        const { branch, periodStart, periodEnd, cutoffDay, employeeIds } = body;

        // Validate required fields
        if (!branch || !periodStart || !periodEnd || !cutoffDay) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate cutoff day
        if (![15, 30, 31].includes(cutoffDay)) {
            return NextResponse.json(
                { error: 'Invalid cutoff day. Must be 15, 30, or 31' },
                { status: 400 }
            );
        }

        // Check permissions
        const accessCheck = validatePayrollAccess(user, 'create', branch);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error }, { status: 403 });
        }

        // Validate period dates
        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);

        if (startDate >= endDate) {
            return NextResponse.json(
                { error: 'Period start must be before period end' },
                { status: 400 }
            );
        }

        // Generate run number
        // Fetch existing runs to calculate next sequence (JS-side calculation for compatibility with JSON DB)
        const runPrefix = `${branch.toUpperCase()}-${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}-`;

        let sequence = 1;

        // Try optimized query first (works on Postgres)
        try {
            const sequenceResult = await query(`
                SELECT run_number FROM payroll_runs
                WHERE run_number LIKE $1
            `, [`${runPrefix}%`]);

            if (sequenceResult.rows && sequenceResult.rows.length > 0) {
                const maxSeq = sequenceResult.rows.reduce((max: number, row: any) => {
                    if (!row.run_number) return max;
                    const parts = row.run_number.split('-');
                    const seq = parseInt(parts[parts.length - 1]);
                    return !isNaN(seq) && seq > max ? seq : max;
                }, 0);
                sequence = maxSeq + 1;
            }
        } catch (e) {
            console.warn('Sequence numbering fallback used:', e);
            // Fallback: If query fails, assume 1 (or handle differently)
        }

        const runNumber = generateRunNumber(branch, startDate, cutoffDay, sequence);

        // Create payroll run
        const runResult = await query(`
            INSERT INTO payroll_runs (
                run_number,
                branch,
                payroll_period_start,
                payroll_period_end,
                cutoff_day,
                default_payroll_days,
                status,
                created_by,
                workflow_stage,
                current_reviewer_role
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            runNumber,
            branch,
            periodStart,
            periodEnd,
            cutoffDay,
            15.00, // Default payroll days
            'DRAFT',
            user.id,
            0,
            'Payroll Preparer'
        ]);

        const payrollRun = runResult.rows[0];

        // Get employees for this branch
        // Update SQL to allow multiple active statuses
        let employeeSql = `
            SELECT 
                id,
                employee_id,
                first_name,
                last_name,
                department,
                position,
                branch,
                salary_info,
                date_separated,
                employment_status
            FROM employees
            WHERE (
                UPPER(TRIM(REPLACE(branch, 'Branch', ''))) = UPPER(TRIM(REPLACE($1, 'Branch', '')))
                OR branch = $1
            )
            AND employment_status NOT IN ('Resigned', 'Terminated', 'AWOL')
        `;

        const employeeParams: any[] = [branch];

        // Filter by specific employee IDs if provided
        if (employeeIds && employeeIds.length > 0) {
            employeeSql += ` AND id = ANY($2)`;
            employeeParams.push(employeeIds);
        }

        const employeesResult = await query(employeeSql, employeeParams);

        // STRICT ELIGIBILITY FILTER
        // Filter out employees without valid salary info or who resigned before period start
        const employees = employeesResult.rows.filter((emp: any) => {
            // 1. Check Status (Already filtered in SQL for explicit excludes, but ensure we keep valid ones)
            const inactiveStatuses = ['Resigned', 'Terminated', 'AWOL'];
            if (inactiveStatuses.includes(emp.employment_status)) return false;

            // 2. Must have valid salary info
            let s = emp.salary_info;
            if (!s) return false;

            // Parse if string
            if (typeof s === 'string') {
                try {
                    s = JSON.parse(s);
                    emp.salary_info = s; // Update object reference for later use
                } catch (e) {
                    return false;
                }
            }

            // Check numeric values
            const daily = parseFloat(s.daily_rate) || 0;
            const monthly = parseFloat(s.monthly_salary) || parseFloat(s.basic_salary) || 0;

            if (daily <= 0 && monthly <= 0) return false;

            // 3. Not resigned effective before period end
            // If periodEnd is provided in body
            if (emp.date_separated && periodEnd) {
                const separationDate = new Date(emp.date_separated);
                const pEnd = new Date(periodEnd);

                // If separation date is ON or BEFORE period end, they are excluded logic
                if (separationDate <= pEnd) {
                    return false;
                }
            }
            return true;
        });

        if (employees.length === 0) {
            // Detailed error for debugging
            const firstEmp = employeesResult.rows[0];
            let debugInfo = '';
            if (firstEmp) {
                debugInfo = `Found ${employeesResult.rows.length} raw employees. Sample: ${firstEmp.employment_status}, hasSalary: ${!!firstEmp.salary_info}`;
            }
            return NextResponse.json({ error: `No eligible employees found for this payroll run. ${debugInfo}` }, { status: 400 });
        }

        // Create payslips for each employee
        const payslips = [];
        for (const employee of employees) {
            // Helper to parse salary info safely
            const getSalaryVal = (val: any) => {
                const num = parseFloat(val);
                return isNaN(num) ? 0 : num;
            };

            // Ensure salary_info is an object
            const sInfo = typeof employee.salary_info === 'string' ? JSON.parse(employee.salary_info) : employee.salary_info;
            const deductionsInfo = sInfo.deductions || {};

            const monthlySalary = getSalaryVal(sInfo.monthly_salary || sInfo.basic_salary);
            const dailyRate = Math.round((monthlySalary / 30) * 100) / 100;
            const payrollDays = 15.00;
            const basicPay = Math.round((dailyRate * payrollDays) * 100) / 100;

            // Allowances - Check both regular and special fields
            const regularAllowance = getSalaryVal(sInfo.allowances?.regular);
            const specialAllowance = getSalaryVal(sInfo.allowances?.special);

            const grossPay = basicPay + regularAllowance + specialAllowance;

            // Deductions Calculation
            let phic = 0;
            let pagibig = 0;
            let pagibigLoan = 0;
            let companyFunds = 0;
            let sss = 0;
            let sssLoan = 0;

            // Common Deductions
            let companyLoan = getSalaryVal(deductionsInfo.company_loan?.amortization);
            let cashAdvance = getSalaryVal(deductionsInfo.cash_advance);

            // Other deductions (sum of array)
            let otherDeductions = 0;
            if (Array.isArray(deductionsInfo.other_deductions)) {
                otherDeductions = deductionsInfo.other_deductions.reduce((sum: number, d: any) => sum + getSalaryVal(d.amount), 0);
            }

            // Cutoff Specific Deductions
            if (cutoffDay === 15) {
                // 1st Cutoff: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds
                phic = getSalaryVal(deductionsInfo.philhealth_contribution);
                pagibig = getSalaryVal(deductionsInfo.pagibig_contribution);
                pagibigLoan = getSalaryVal(deductionsInfo.pagibig_loan?.amortization);
                companyFunds = getSalaryVal(deductionsInfo.company_funds || deductionsInfo.company_cash_fund);
            } else {
                // 2nd Cutoff (30/31): SSS, SSS Loan
                sss = getSalaryVal(deductionsInfo.sss_contribution);
                sssLoan = getSalaryVal(deductionsInfo.sss_loan?.amortization);
            }

            const totalDeductions = phic + pagibig + pagibigLoan + companyFunds + sss + sssLoan + companyLoan + cashAdvance + otherDeductions;
            const netPay = grossPay - totalDeductions;

            const payslipResult = await query(`
                INSERT INTO payslips (
                    payroll_run_id,
                    employee_id,
                    monthly_salary,
                    daily_rate,
                    payroll_days,
                    basic_pay,
                    regular_allowance,
                    special_allowance,
                    gross_pay,
                    total_deductions,
                    net_pay,
                    phic,
                    pagibig,
                    pagibig_loan,
                    company_funds,
                    sss,
                    sss_loan,
                    company_loan,
                    cash_advance,
                    other_deductions
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                RETURNING *
            `, [
                payrollRun.id,
                employee.id,
                monthlySalary,
                dailyRate,
                payrollDays,
                basicPay,
                regularAllowance,
                specialAllowance,
                grossPay,
                totalDeductions,
                netPay,
                phic,
                pagibig,
                pagibigLoan,
                companyFunds,
                sss,
                sssLoan,
                companyLoan,
                cashAdvance,
                otherDeductions
            ]);

            payslips.push(payslipResult.rows[0]);
        }

        // Log action
        await query(`
            INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details)
            VALUES ($1, $2, $3, $4)
        `, [
            payrollRun.id,
            'CREATED',
            user.id,
            JSON.stringify({
                run_number: runNumber,
                branch,
                employee_count: employees.length
            })
        ]);

        return NextResponse.json({
            success: true,
            payrollRun,
            payslipsCreated: payslips.length
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating payroll run:', error);
        return NextResponse.json(
            { error: 'Failed to create payroll run', details: error.message },
            { status: 500 }
        );
    }
}
