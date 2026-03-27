/**
 * Payroll Runs API Route
 * Handles CRUD operations for payroll runs
 * POST /api/payroll/runs - Create new payroll run
 * GET /api/payroll/runs - List payroll runs
 * GET /api/payroll/runs/[id] - Get payroll run details
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, isPostgres } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';
import { canAccessPayroll, canCreatePayroll, validatePayrollAccess, getAccessibleBranches } from '@/lib/payroll-access';
import { generateRunNumber, validatePayrollDays } from '@/lib/payroll-calculations';
import { normalizeBranchName } from '@/lib/branch-access';
import { getAllEmployees } from '@/lib/data';

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

        let runs = [];
        let total = 0;

        // Optimized query for PostgreSQL
        if (isPostgres()) {
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
            runs = result.rows;
            total = result.rows.length; // Approximate for now or run count query
        } else {
            // Fallback for Local JSON DB (No Aggregation Support)
            let sql = `SELECT * FROM payroll_runs WHERE 1=1`;
            const params: any[] = [];
            let paramIndex = 1;

            if (branch && branch !== 'All') {
                sql += ` AND branch = $${paramIndex++}`;
                params.push(branch);
            }
            if (status) {
                sql += ` AND status = $${paramIndex++}`;
                params.push(status);
            }

            sql += ` ORDER BY created_at DESC`;
            // Local DB doesn't support OFFSET/LIMIT well in query string usually, but let's try or slice later

            const result = await query(sql, params);
            let allRuns = result.rows;

            // Manual Pagination
            total = allRuns.length;
            const slicedRuns = allRuns.slice(offset, offset + limit);

            // Manual Hydration (Joins & Aggregates)
            runs = await Promise.all(slicedRuns.map(async (run: any) => {
                // Get Creator Name
                let created_by_name = 'System';
                if (run.created_by) {
                    const uRes = await query(`SELECT username FROM users WHERE id = $1`, [run.created_by]);
                    if (uRes.rows.length > 0) created_by_name = uRes.rows[0].username;
                }

                // Get Approver Name
                let approved_by_name = null;
                if (run.approved_by) {
                    const aRes = await query(`SELECT username FROM users WHERE id = $1`, [run.approved_by]);
                    if (aRes.rows.length > 0) approved_by_name = aRes.rows[0].username;
                }

                // Get Payslips Stats
                const pRes = await query(`SELECT net_pay FROM payslips WHERE payroll_run_id = $1`, [run.id]);
                const employee_count = pRes.rowCount || 0;
                const total_net_pay = pRes.rows.reduce((sum: number, p: any) => sum + (parseFloat(p.net_pay) || 0), 0);

                return {
                    ...run,
                    created_by_name,
                    approved_by_name,
                    employee_count,
                    total_net_pay
                };
            }));
        }

        return NextResponse.json({
            runs,
            total,
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

        // Fetch ACTIVE SSS config for the payroll year (Always using 2025 Official Table as instructed)
        const sssTableRes = await query(
            `SELECT * FROM sss_contribution_table WHERE effectivity_year = 2025`
        );
        const sssTable = sssTableRes.rows;


        // Use getAllEmployees() — the SAME function as the employee list page (Step 2 in wizard)
        // This guarantees we see the same employees regardless of DB backend
        const allEmployeesRaw = await getAllEmployees();

        // Filter by specific employee IDs if provided
        let allEmployeesFiltered = allEmployeesRaw;
        if (employeeIds && employeeIds.length > 0) {
            const idSet = new Set(employeeIds.map(Number));
            allEmployeesFiltered = allEmployeesRaw.filter((e: any) => idSet.has(Number(e.id)));
        }

        // Step-by-step debug logging
        const totalFromDB = allEmployeesFiltered.length;
        console.log(`[Payroll] getAllEmployees returned ${totalFromDB} employees (all branches). Using DB: ${isPostgres() ? 'PostgreSQL' : 'LocalJSON'}`);
        if (totalFromDB > 0) {
            console.log(`[Payroll] Sample branches:`, [...new Set(allEmployeesFiltered.map((e: any) => e.branch))].slice(0, 10));
        }

        // JS-based branch normalization (same as employees API)
        // Handles 'Ormoc', 'Ormoc Branch', 'ormoc branch', 'ORMOC' all as equal
        const normalizedTargetBranch = normalizeBranchName(branch);
        console.log(`[Payroll] Looking for branch: '${branch}' normalized: '${normalizedTargetBranch}'`);

        const branchFiltered = allEmployeesFiltered.filter((emp: any) =>
            normalizeBranchName(emp.branch) === normalizedTargetBranch
        );
        console.log(`[Payroll] After branch filter: ${branchFiltered.length} employees`);

        // ELIGIBILITY FILTER
        const employees = branchFiltered.filter((emp: any) => {
            // 1. Check Status (SQL already filters Resigned/Terminated/AWOL, but double-check)
            const inactiveStatuses = ['Resigned', 'Terminated', 'AWOL'];
            if (inactiveStatuses.includes(emp.employment_status)) {
                console.log(`[Payroll] Dropped ${emp.first_name} ${emp.last_name}: inactive status ${emp.employment_status}`);
                return false;
            }

            // 2. Must have valid salary info
            let s = emp.salary_info;
            if (!s) {
                console.log(`[Payroll] Dropped ${emp.first_name} ${emp.last_name}: no salary_info`);
                return false;
            }

            // Parse if string
            if (typeof s === 'string') {
                try {
                    s = JSON.parse(s);
                    emp.salary_info = s; // Update object reference for later use
                } catch (e) {
                    console.log(`[Payroll] Dropped ${emp.first_name} ${emp.last_name}: salary_info JSON parse error`);
                    return false;
                }
            }

            // Check numeric values — accept any of daily_rate, monthly_salary, or basic_salary
            const daily = parseFloat(s.daily_rate) || 0;
            const monthly = parseFloat(s.monthly_salary) || parseFloat(s.basic_salary) || 0;

            if (daily <= 0 && monthly <= 0) {
                console.log(`[Payroll] Dropped ${emp.first_name} ${emp.last_name}: no salary values (daily=${daily}, monthly=${monthly})`);
                return false;
            }

            // 3. Only exclude if the employee's separation date is BEFORE the payroll period START
            //    (they had already left before this period began).
            //    Employees who separated during or after the period should still be paid.
            if (emp.date_separated && periodStart) {
                const separationDate = new Date(emp.date_separated);
                const pStart = new Date(periodStart);

                if (separationDate < pStart) {
                    console.log(`[Payroll] Dropped ${emp.first_name} ${emp.last_name}: separated before period start`);
                    return false;
                }
            }
            return true;
        });

        // Summary log
        console.log(`[Payroll] Final eligible employees: ${employees.length} (from ${totalFromDB} DB rows, ${branchFiltered.length} in branch)`);

        if (employees.length === 0) {
            let debugInfo = '';
            if (branchFiltered.length > 0) {
                debugInfo = `Found ${branchFiltered.length} employees in branch "${branch}" but none passed eligibility. Check server logs for details.`;
            } else if (totalFromDB > 0) {
                const allBranches = [...new Set(allEmployeesFiltered.map((e: any) => e.branch))].join(', ');
                debugInfo = `Found ${totalFromDB} total employees but none matched branch "${branch}". Branches in DB: ${allBranches}`;
            } else {
                debugInfo = `No employees found in the database at all.`;
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

            // Allowances - Check both regular and special fields - Split by 2 (Semi-monthly)
            const regularAllowance = getSalaryVal(sInfo.allowances?.regular) / 2;
            const specialAllowance = getSalaryVal(sInfo.allowances?.special) / 2;

            const grossPay = basicPay + regularAllowance + specialAllowance;
            const fullMonthGross = monthlySalary + (regularAllowance * 2) + (specialAllowance * 2);

            // Strict Validation Rule: Missing data check
            if (basicPay <= 0) {
                return NextResponse.json({ error: `Employee ${employee.first_name} ${employee.last_name} has invalid or missing basic salary.` }, { status: 400 });
            }

            // Deductions Calculation
            let phic = 0;
            let pagibig = 0;
            let pagibigLoan = 0;
            let companyFunds = 0;
            let sss = 0;
            let sssLoan = 0;

            // ER Shares Storage
            let sss_er = 0;
            let phic_er = 0;
            let pagibig_er = 0;

            // Common Deductions
            let companyLoan = getSalaryVal(deductionsInfo.company_loan?.amortization || deductionsInfo.company_loan);
            let cashAdvance = getSalaryVal(deductionsInfo.cash_advance);

            // Other deductions (sum of array)
            let otherDeductions = 0;
            let otherDeductionsBreakdown = null;

            if (Array.isArray(deductionsInfo.other_deductions)) {
                otherDeductions = deductionsInfo.other_deductions.reduce((sum: number, d: any) => sum + getSalaryVal(d.amount), 0);
                otherDeductionsBreakdown = JSON.stringify(deductionsInfo.other_deductions);
            } else if (deductionsInfo.other_deductions) {
                // Handle legacy number format
                otherDeductions = getSalaryVal(deductionsInfo.other_deductions);
            }

            // Cutoff Specific Deductions
            if (cutoffDay === 15) {
                // 1st Cutoff: PHIC, Pag-IBIG, Pag-IBIG Loan, Company Funds
                phic = getSalaryVal(deductionsInfo.phic); // Legacy name
                if (!phic) phic = getSalaryVal(deductionsInfo.philhealth_contribution);
                phic_er = phic; // ER strictly matches EE

                pagibig = getSalaryVal(deductionsInfo.pagibig); // Legacy name
                if (!pagibig) pagibig = getSalaryVal(deductionsInfo.pagibig_contribution);
                pagibig_er = pagibig; // ER strictly matches EE

                pagibigLoan = getSalaryVal(deductionsInfo.pagibig_loan_15th);

                companyFunds = getSalaryVal(deductionsInfo.company_funds || deductionsInfo.company_cash_fund);
            } else {
                // 2nd Cutoff (30/31): SSS, SSS Loan, Pag-IBIG Loan (30th)
                sssLoan = getSalaryVal(deductionsInfo.sss_loan?.amortization || deductionsInfo.sss_loan);

                // Add Pag-IBIG Loan 30th support
                pagibigLoan = getSalaryVal(deductionsInfo.pagibig_loan_30th);
                if (!pagibigLoan) {
                    // Fallback for legacy single loan field (moved to 2nd cutoff by user request)
                    pagibigLoan = getSalaryVal(deductionsInfo.pagibig_loan?.amortization || deductionsInfo.pagibig_loan);
                }

                // 2nd Cutoff (30/31): 1️⃣ SSS Source of Truth Rule
                if (!sssTable || sssTable.length === 0) {
                    return NextResponse.json({ error: 'System Error: SSS 2025 Official Contribution Table is not configured.' }, { status: 400 });
                }

                // 2️⃣ Salary Mapping Rule using Basic Monthly Salary
                const tableBracket = sssTable.find((b: any) => monthlySalary >= Number(b.salary_range_from) && monthlySalary <= Number(b.salary_range_to));

                if (!tableBracket) {
                    return NextResponse.json({ error: `ERROR: Salary for ${employee.first_name} ${employee.last_name} (${monthlySalary}) does not match any SSS MSC bracket.` }, { status: 400 });
                }

                // 3️⃣ Contribution Extraction Rule & 6️⃣ Validation Rules (Override any legacy manual overrides)
                sss = Number(tableBracket.employee_share);
                sss_er = Number(tableBracket.employer_share) + Number(tableBracket.ec_contribution);
            }

            const totalDeductions = phic + pagibig + pagibigLoan + companyFunds + sss + sssLoan + companyLoan + cashAdvance + otherDeductions;
            const netPay = grossPay - totalDeductions;

            // Store ER shares separately
            let expandedBreakdown = deductionsInfo.other_deductions_breakdown ? JSON.parse(deductionsInfo.other_deductions_breakdown) : (otherDeductionsBreakdown ? JSON.parse(otherDeductionsBreakdown) : []);

            // Format and stringify back into other_deductions_breakdown
            const storedBreakdown = JSON.stringify({
                custom_deductions: expandedBreakdown,
                employer_shares: {
                    sss_er,
                    phic_er,
                    pagibig_er
                }
            });

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
                    other_deductions,
                    other_deductions_breakdown
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
                otherDeductions,
                storedBreakdown
            ]);

            payslips.push(payslipResult.rows[0]);
        }

        // Log action
        await query(`
            INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            payrollRun.id,
            'CREATED',
            user.id,
            JSON.stringify({
                run_number: runNumber,
                branch,
                employee_count: employees.length
            }),
            new Date().toISOString()
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
