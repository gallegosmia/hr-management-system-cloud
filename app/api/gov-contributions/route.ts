import { NextRequest, NextResponse } from 'next/server';
import { query, getAll } from '@/lib/database';
import { normalizeBranchName } from '@/lib/branch-access';
import { getAllEmployees } from '@/lib/data';

export async function GET(req: NextRequest) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionRes = await query("SELECT user_id, selected_branch FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = sessionRes.rows[0];
        const userRes = await query("SELECT role FROM users WHERE id = $1", [session.user_id]);
        const user = userRes.rows[0];

        // Tracker listing
        let sql = `
            SELECT 
                r.*, 
                u.username as approved_by_name,
                (SELECT COUNT(*) FROM gov_contribution_details d WHERE d.report_id = r.id) as employee_count
            FROM gov_contribution_reports r
            LEFT JOIN users u ON r.approved_by = u.id
        `;
        let params: any[] = [];

        // Apply branching rule
        if (user.role !== 'President' && user.role !== 'Vice President' && user.role !== 'Admin') {
            if (session.selected_branch && session.selected_branch !== 'All Branches' && session.selected_branch !== 'All') {
                sql += ` WHERE r.branch_id = $1`;
                params.push(session.selected_branch);
            }
        }

        sql += ` ORDER BY r.created_at DESC`;

        const reports = await query(sql, params);

        return NextResponse.json(reports.rows);
    } catch (error) {
        console.error('API Error [GovContributions GET]', error);
        return NextResponse.json({ error: 'Failed to fetch contribution reports' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const sessionId = req.headers.get('x-session-id');
        if (!sessionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const sessionRes = await query("SELECT user_id, selected_branch FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = sessionRes.rows[0];
        const userId = session.user_id;

        const body = await req.json();
        let { branch_id, contribution_type, payroll_period } = body;

        const userRes = await query("SELECT role FROM users WHERE id = $1", [userId]);
        const user = userRes.rows[0];

        // 1. Login-Based Data Isolation Rule
        if (user && user.role !== 'President' && user.role !== 'Vice President' && user.role !== 'Admin') {
            if (session.selected_branch && session.selected_branch !== 'All Branches' && session.selected_branch !== 'All') {
                if (branch_id !== 'All' && branch_id !== session.selected_branch) {
                    return NextResponse.json({ error: `Unauthorized: You can only generate reports for ${session.selected_branch}` }, { status: 403 });
                }
                branch_id = session.selected_branch; // Strictly override
            }
        }

        if (!branch_id || !contribution_type || !payroll_period) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Validate duplicates
        const existing = await query(
            "SELECT id FROM gov_contribution_reports WHERE branch_id = $1 AND contribution_type = $2 AND payroll_period = $3 AND status != 'Rejected'",
            [branch_id, contribution_type, payroll_period]
        );

        if (existing.rowCount > 0) {
            return NextResponse.json({
                error: 'A contribution report for this branch, type, and period already exists.',
                existing_report_id: existing.rows[0].id
            }, { status: 400 });
        }

        // 1. Fetch active employees for branch using getAllEmployees for consistent DB agnostic behavior
        const allEmployeesRaw = await getAllEmployees();

        // JS-based branch normalization (exclude inactive statuses to simulate 'Active')
        const inactiveStatuses = ['Resigned', 'Terminated', 'Floating'];
        let employeesRows = allEmployeesRaw.filter((emp: any) => !inactiveStatuses.includes(emp.employment_status));

        if (branch_id !== 'All' && branch_id !== 'All Branches') {
            const normalizedTargetBranch = normalizeBranchName(branch_id);
            employeesRows = employeesRows.filter((emp: any) =>
                normalizeBranchName(emp.branch) === normalizedTargetBranch
            );
        }

        if (employeesRows.length === 0) {
            // Diagnostic: log what branches exist to help debug mismatches
            const allBranches = [...new Set(allEmployeesRaw.map((e: any) => e.branch))].filter(Boolean);
            console.error(`[GovContrib] No employees found for branch_id="${branch_id}". Available branches in DB:`, allBranches);
            return NextResponse.json({
                error: `No active employees found for branch "${branch_id}". Available branches: ${allBranches.join(', ') || 'none'}`
            }, { status: 400 });
        }

        // 2. Fetch Active Config for the Year
        const yearMatch = payroll_period.match(/\d{4}/);
        const configYear = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();

        let sssTable: any = null;
        let configId = 0;
        let configData: any = null;

        if (contribution_type === 'SSS') {
            const sssRes = await query(`SELECT * FROM sss_contribution_table WHERE effectivity_year = 2025`);
            if (sssRes.rows.length === 0) {
                return NextResponse.json({ error: `System Error: SSS 2025 Official Contribution Table is not configured.` }, { status: 400 });
            }
            sssTable = sssRes.rows;
            configId = 999; // Mock config ID for table-driven entries
        } else {
            const configQuery = await query(
                `SELECT id, config_data, year_effective FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2`,
                [contribution_type, configYear]
            );

            let activeConfig = configQuery.rows[0];

            // Fallback: if no config for the exact year, use the most recent one available
            if (!activeConfig) {
                const fallbackQuery = await query(
                    `SELECT id, config_data, year_effective FROM gov_contribution_configs WHERE type = $1 ORDER BY year_effective DESC LIMIT 1`,
                    [contribution_type]
                );
                if (fallbackQuery.rows.length === 0) {
                    return NextResponse.json({ error: `Government contribution configuration for ${contribution_type} not found. Please configure in Compensation & Benefits.` }, { status: 400 });
                }
                activeConfig = fallbackQuery.rows[0];
                console.log(`Using fallback config from ${activeConfig.year_effective} for ${contribution_type} (${configYear} not found)`);
            }

            configId = activeConfig.id;
            configData = activeConfig.config_data;
            if (typeof configData === 'string') {
                try { configData = JSON.parse(configData); } catch (e) {
                    console.error('Failed to parse configData string', e);
                }
            }
        }

        // 3. Compute
        let total_er = 0;
        let total_ee = 0;
        let total_ec = 0;
        let total_loan = 0;

        const details = [];

        for (const emp of employeesRows) {
            let salaryInfo: any = {};
            const rawSalary = emp.salary_info as any;
            if (typeof rawSalary === 'string' && rawSalary.trim()) {
                try {
                    salaryInfo = JSON.parse(rawSalary);
                } catch (e) {
                    console.error(`Skipping employee ${emp.id} due to invalid salary_info JSON`);
                    continue;
                }
            } else if (typeof rawSalary === 'object' && rawSalary !== null) {
                salaryInfo = rawSalary;
            }

            const basicSalary = Number(salaryInfo.monthly_salary || 0);
            const regularAllowance = Number(salaryInfo.allowances?.regular || 0);
            const specialAllowance = Number(salaryInfo.allowances?.special || 0);
            const grossSalary = basicSalary + regularAllowance + specialAllowance;

            if (grossSalary === 0) continue; // Skip if no salary

            // 3.5 Fetch Employee Loans from database directly instead of salary_info
            // Strictly querying PAGIBIG and SSS active loans where balance > 0
            const activeLoansReq = await query(
                `SELECT loan_type, remaining_balance, monthly_amortization 
                 FROM employee_loans 
                 WHERE employee_id = $1 AND status = 'Active' AND remaining_balance > 0`,
                [emp.id]
            );
            const activeLoans = activeLoansReq.rows;

            let er_share = 0;
            let ee_share = 0;
            let ec = 0;
            let loan_deduction = 0;
            let gov_number = '';
            let used_rate: any = null;

            // --- COMPUTATION LOGIC ---
            if (contribution_type === 'SSS') {
                gov_number = emp.sss_number || 'N/A';

                const manualSSSEE = Number(salaryInfo?.deductions?.sss || 0);

                // STRICT RULE: Compensation & Benefits is the single source of truth.
                ee_share = manualSSSEE;

                if (ee_share > 0) {
                    // Reverse match the SSS bracket based on exact Employee Share to fetch proper ER and EC match
                    const bracketByEE = sssTable.find((b: any) => Number(b.employee_share) === manualSSSEE);
                    if (bracketByEE) {
                        er_share = Number(bracketByEE.employer_share);
                        ec = Number(bracketByEE.ec_contribution);
                        used_rate = bracketByEE;
                    } else {
                        const bracket = sssTable.find((b: any) => grossSalary >= Number(b.salary_range_from) && grossSalary <= Number(b.salary_range_to)) || {};
                        er_share = Number(bracket.employer_share || 0);
                        ec = Number(bracket.ec_contribution || 0);
                        used_rate = { manual_override: true, matched_bracket: bracket, original_ee: manualSSSEE };
                    }
                } else {
                    // If EE is explicitly 0 or undefined in Compensation & Benefits, DO NOT compute via table.
                    // The employee should have 0 contribution naturally.
                    er_share = 0;
                    ec = 0;
                    used_rate = { manual_override: true, note: 'No SSS encoded in Compensation & Benefits' };
                }

                // Strictly fetch SSS loans only (SSS Salary Loan, SSS Calamity Loan)
                activeLoans.filter((l: any) => l.loan_type?.toUpperCase().includes('SSS')).forEach((l: any) => {
                    // Cap deduction to remaining balance
                    const deduction = Math.min(Number(l.monthly_amortization), Number(l.remaining_balance));
                    loan_deduction += deduction;
                });

                // Add manual SSS loan input from Compensation & Benefits
                const deductionsInfo = salaryInfo?.deductions || {};
                const getSalaryVal = (val: any) => { const num = parseFloat(val); return isNaN(num) ? 0 : num; };
                const manualSssLoan = getSalaryVal(deductionsInfo.sss_loan?.amortization || deductionsInfo.sss_loan);
                loan_deduction += manualSssLoan;

            } else if (contribution_type === 'Pag-IBIG') {
                gov_number = emp.pagibig_number || 'N/A';

                ee_share = Number(salaryInfo?.deductions?.pagibig || salaryInfo?.deductions?.pagibig_contribution || 0);
                er_share = ee_share; // ER equals EE exactly

                const brackets = Array.isArray(configData) ? configData : [];
                const bracket = brackets.find((b: any) => grossSalary >= Number(b.range_start) && grossSalary <= Number(b.range_end))
                    || brackets[brackets.length - 1];

                if (bracket) {
                    const fundSalary = Math.min(grossSalary, Number(bracket.max_cap));
                    used_rate = { ...bracket, computed_fund_salary: fundSalary, manual_override: true };
                }

                // Strictly fetch PAGIBIG loans only
                activeLoans.filter((l: any) => l.loan_type?.toUpperCase().includes('PAGIBIG') || l.loan_type?.toUpperCase().includes('PAG-IBIG')).forEach((l: any) => {
                    const deduction = Math.min(Number(l.monthly_amortization), Number(l.remaining_balance));
                    loan_deduction += deduction;
                });

                // Add manual Pag-IBIG loan input from Compensation & Benefits
                const deductionsInfo = salaryInfo?.deductions || {};
                const getSalaryVal = (val: any) => { const num = parseFloat(val); return isNaN(num) ? 0 : num; };
                let manualPbLoan15 = getSalaryVal(deductionsInfo.pagibig_loan_15th);
                let manualPbLoan30 = getSalaryVal(deductionsInfo.pagibig_loan_30th);
                let manualPbLoan = 0;
                if (!manualPbLoan15 && deductionsInfo.pagibig_loan && !deductionsInfo.pagibig_loan_30th) {
                    manualPbLoan = getSalaryVal(deductionsInfo.pagibig_loan?.amortization || deductionsInfo.pagibig_loan);
                }
                loan_deduction += (manualPbLoan15 + manualPbLoan30 + manualPbLoan);

            } else if (contribution_type === 'PhilHealth') {
                gov_number = emp.philhealth_number || 'N/A';

                ee_share = Number(salaryInfo?.deductions?.phic || salaryInfo?.deductions?.philhealth_contribution || 0);
                er_share = ee_share; // ER equals EE exactly

                const min = Number(configData.min_salary);
                const max = Number(configData.max_salary);
                const phicSalary = Math.min(Math.max(grossSalary, min), max);

                used_rate = { applied_salary: phicSalary, manual_override: true, original_rate: configData.rate };
            }

            const total = er_share + ee_share + ec;

            total_ee += ee_share;
            total_er += er_share;
            total_ec += ec;
            total_loan += loan_deduction;

            details.push({
                employee_id: emp.id,
                government_number: gov_number,
                salary: grossSalary,
                er_share,
                ee_share,
                ec,
                loan_deduction,
                total,
                config_id_used: configId,
                rate_used: used_rate
            });
        }

        // 3. Validation Rule (CRITICAL)
        if (details.length < employeesRows.length) {
            const branchName = (branch_id === 'All' || branch_id === 'All Branches') ? 'all' : branch_id;
            return NextResponse.json({
                error: `ERROR: Government contribution list does not match total active employees in ${branchName} branch.`
            }, { status: 400 });
        }

        if (details.length === 0) {
            return NextResponse.json({ error: 'No valid employee salaries eligible for computation' }, { status: 400 });
        }

        // 3. Batch Service Charge
        const batch_service_charge = (contribution_type === 'PhilHealth' || contribution_type === 'Pag-IBIG' || contribution_type === 'PagIBIG') ? 30.00 : 0.00;

        // 4. Insert Report
        const reportInsert = await query(
            `INSERT INTO gov_contribution_reports (branch_id, payroll_period, contribution_type, total_er, total_ee, total_ec, total_loan, service_charge, status, created_by, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [branch_id, payroll_period, contribution_type, total_er, total_ee, total_ec, total_loan, batch_service_charge, 'Draft', userId, new Date().toISOString()]
        );

        const reportId = reportInsert.rows[0].id;

        // 4. Insert Details
        if (details.length > 0) {
            const values = details.map((_, i) =>
                `($1, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10}, $${i * 10 + 11})`
            ).join(', ');

            const params = [reportId];
            for (const d of details) {
                params.push(
                    d.employee_id,
                    d.government_number,
                    d.salary,
                    d.er_share,
                    d.ee_share,
                    d.ec,
                    d.loan_deduction,
                    d.config_id_used,
                    JSON.stringify(d.rate_used),
                    new Date().toISOString()
                );
            }

            await query(
                `INSERT INTO gov_contribution_details (report_id, employee_id, government_number, salary, er_share, ee_share, ec, loan_deduction, config_id_used, rate_used, computation_date)
                 VALUES ${values}`,
                params
            );
        }

        return NextResponse.json({ success: true, report_id: reportId });

    } catch (error: any) {
        console.error('API Error [GovContributions POST Generation]', error);
        return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
    }
}
