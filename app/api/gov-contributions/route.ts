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
                (SELECT COUNT(*) FROM gov_contribution_details d WHERE d.report_id = r.id) as employee_count
            FROM gov_contribution_reports r
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
    let branch_id = '';
    let contribution_type = '';
    let payroll_period = '';

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
        const parsedBody = body || {};
        branch_id = parsedBody.branch_id;
        contribution_type = parsedBody.contribution_type;
        payroll_period = parsedBody.payroll_period;

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

        // Include all except clearly resigned/inactive ones
        const inactiveStatuses = ['Resigned', 'Terminated', 'Floating', 'Inactive', 'Deceased'];
        let employeesRows = allEmployeesRaw.filter((emp: any) => 
            emp.employment_status && !inactiveStatuses.includes(emp.employment_status)
        );

        if (branch_id !== 'All' && branch_id !== 'All Branches') {
            const normalizedTargetBranch = normalizeBranchName(branch_id);
            employeesRows = employeesRows.filter((emp: any) =>
                normalizeBranchName(emp.branch) === normalizedTargetBranch
            );
        }

        if (employeesRows.length === 0) {
            const allBranches = [...new Set(allEmployeesRaw.map((e: any) => e.branch))].filter(Boolean);
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
            const sssRes = await query(`SELECT * FROM sss_contribution_table WHERE effectivity_year = $1`, [configYear]);
            if (sssRes.rows.length === 0) {
                // Fallback to 2025 if new year not yet configured
                const fallbackSSS = await query(`SELECT * FROM sss_contribution_table WHERE effectivity_year = 2025`);
                if (fallbackSSS.rows.length === 0) {
                    return NextResponse.json({ error: `System Error: SSS Official Contribution Table is not configured for ${configYear} or 2025.` }, { status: 400 });
                }
                sssTable = fallbackSSS.rows;
            } else {
                sssTable = sssRes.rows;
            }
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
                    // Auto-seed a default config so generation can proceed
                    let defaultConfigData: any;
                    if (contribution_type === 'PhilHealth') {
                        // 2026 PhilHealth: 5% of monthly basic salary, split equally EE/ER
                        // Salary bracket: ₱10,000 floor, ₱100,000 ceiling
                        defaultConfigData = {
                            rate: 0.05,
                            min_salary: 10000,
                            max_salary: 100000,
                            ee_rate: 0.025,
                            er_rate: 0.025,
                            note: 'Auto-seeded default — PhilHealth 2026 (5% rate). Update in Gov Configs for exact figures.'
                        };
                    } else if (contribution_type === 'Pag-IBIG') {
                        // Default Pag-IBIG: 2% EE up to ₱5,000 cap
                        defaultConfigData = [
                            { range_start: 0, range_end: 1500, ee_rate: 0.01, er_rate: 0.02, max_cap: 5000 },
                            { range_start: 1500.01, range_end: 9999999, ee_rate: 0.02, er_rate: 0.02, max_cap: 5000 }
                        ];
                    } else {
                        return NextResponse.json({ error: `Government contribution configuration for ${contribution_type} not found. Please configure in Compensation & Benefits.` }, { status: 400 });
                    }

                    // Insert the default config
                    const insertedConfig = await query(
                        `INSERT INTO gov_contribution_configs (type, year_effective, config_data)
                         VALUES ($1, $2, $3) RETURNING id, config_data, year_effective`,
                        [contribution_type, configYear, JSON.stringify(defaultConfigData)]
                    );
                    activeConfig = insertedConfig.rows[0];
                    console.log(`[GovContrib] Auto-seeded default ${contribution_type} config for year ${configYear}`);
                } else {
                    activeConfig = fallbackQuery.rows[0];
                    console.log(`Using fallback config from ${activeConfig.year_effective} for ${contribution_type} (${configYear} not found)`);
                }
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

        const getNum = (v: any) => {
            const rawValue = typeof v === 'object' && v !== null && 'amortization' in v ? v.amortization : v;
            const n = parseFloat(rawValue);
            return isNaN(n) ? 0 : n;
        };

        const details = [];

        for (const emp of employeesRows) {
            let salaryInfo: any = {};
            const rawSalary = emp.salary_info as any;
            if (typeof rawSalary === 'string' && rawSalary.trim()) {
                try {
                    salaryInfo = JSON.parse(rawSalary);
                } catch (e) {
                    // Don't skip — include with 0 salary so count stays consistent
                    console.warn(`Employee ${emp.id} has invalid salary_info JSON — including with 0 contributions`);
                    salaryInfo = {};
                }
            } else if (typeof rawSalary === 'object' && rawSalary !== null) {
                salaryInfo = rawSalary;
            }

            const basicSalary = getNum(salaryInfo.monthly_salary || salaryInfo.basic_salary);
            const regularAllowance = getNum(salaryInfo.allowances?.regular);
            const specialAllowance = getNum(salaryInfo.allowances?.special);
            const grossSalary = basicSalary + regularAllowance + specialAllowance;

            // Handle 0 salary by still including them but with 0 contributions (to pass count check)
            // Skip only if salary is missing/undefined (which should still exist as 0 theoretically)

            // Fetch Employee Loans from database directly
            let activeLoans: any[] = [];
            try {
                const activeLoansReq = await query(
                    `SELECT employee_id, loan_type, balance as remaining_balance, monthly_payment as monthly_amortization 
                     FROM employee_loans 
                     WHERE employee_id = $1 AND status = 'Active' AND balance > 0
                     UNION ALL
                     SELECT employee_id, category as loan_type, remaining_balance, deduction_amount as monthly_amortization
                     FROM emergency_loans
                     WHERE employee_id = $1 AND status = 'Approved' AND remaining_balance > 0`,
                    [emp.id]
                );
                activeLoans = activeLoansReq.rows;
            } catch (loanErr) {
                console.error(`[GovContrib] Error fetching loans for employee ${emp.id}:`, loanErr);
                // Non-blocking: continue with empty loans if query fails
                activeLoans = [];
            }

            let er_share = 0;
            let ee_share = 0;
            let ec = 0;
            let loan_deduction = 0;
            let gov_number = '';
            let used_rate: any = null;

            // --- COMPUTATION LOGIC ---
            if (contribution_type === 'SSS') {
                gov_number = emp.sss_number || 'N/A';

                const manualSSSEE = getNum(salaryInfo?.deductions?.sss || salaryInfo?.deductions?.sss_contribution);

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
                    const deduction = Math.min(getNum(l.monthly_amortization), getNum(l.remaining_balance));
                    loan_deduction += deduction;
                });

                // Add manual SSS loan input from Compensation & Benefits
                const deductionsInfo = salaryInfo?.deductions || {};
                const getSalaryVal = getNum;
                const manualSssLoan = getSalaryVal(deductionsInfo.sss_loan?.amortization || deductionsInfo.sss_loan);
                loan_deduction += manualSssLoan;

            } else if (contribution_type === 'Pag-IBIG') {
                gov_number = emp.pagibig_number || 'N/A';

                ee_share = getNum(salaryInfo?.deductions?.pagibig || salaryInfo?.deductions?.pagibig_contribution);
                er_share = ee_share; // ER equals EE exactly

                const brackets = Array.isArray(configData) ? configData : [];
                if (brackets.length === 0) {
                    console.error(`[GovContrib] Pag-IBIG configuration is empty or invalid for year ${configYear}`);
                    return NextResponse.json({ error: 'Pag-IBIG configuration is missing or malformed.' }, { status: 400 });
                }
                const bracket = brackets.find((b: any) => grossSalary >= Number(b.range_start) && grossSalary <= Number(b.range_end))
                    || brackets[brackets.length - 1];

                if (bracket) {
                    const fundSalary = Math.min(grossSalary, Number(bracket.max_cap || 5000));
                    used_rate = { ...bracket, computed_fund_salary: fundSalary, manual_override: true };
                }

                // Strictly fetch PAGIBIG loans only
                activeLoans.filter((l: any) => 
                    (l.loan_type?.toUpperCase().includes('PAGIBIG') || l.loan_type?.toUpperCase().includes('PAG-IBIG'))
                ).forEach((l: any) => {
                    const deduction = Math.min(getNum(l.monthly_amortization), getNum(l.remaining_balance));
                    loan_deduction += deduction;
                });

                // Add manual Pag-IBIG loan input from Compensation & Benefits
                const deductionsInfo = salaryInfo?.deductions || {};
                const getSalaryVal = getNum;
                let manualPbLoan15 = getSalaryVal(deductionsInfo.pagibig_loan_15th);
                let manualPbLoan30 = getSalaryVal(deductionsInfo.pagibig_loan_30th);
                let manualPbLoan = 0;
                if (!manualPbLoan15 && deductionsInfo.pagibig_loan && !deductionsInfo.pagibig_loan_30th) {
                    manualPbLoan = getSalaryVal(deductionsInfo.pagibig_loan?.amortization || deductionsInfo.pagibig_loan);
                }
                loan_deduction += (manualPbLoan15 + manualPbLoan30 + manualPbLoan);

            } else if (contribution_type === 'PhilHealth') {
                gov_number = emp.philhealth_number || 'N/A';

                ee_share = getNum(salaryInfo?.deductions?.phic || salaryInfo?.deductions?.philhealth_contribution);
                er_share = ee_share; // ER equals EE exactly

                const min = Number(configData?.min_salary || 10000);
                const max = Number(configData?.max_salary || 100000);
                const phicSalary = Math.min(Math.max(grossSalary, min), max);

                used_rate = { 
                    applied_salary: phicSalary, 
                    manual_override: true, 
                    original_rate: configData?.rate || 0.05 
                };
            }

            const total = er_share + ee_share + ec;

            total_ee += getNum(ee_share);
            total_er += getNum(er_share);
            total_ec += getNum(ec);
            total_loan += getNum(loan_deduction);

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

        // Validation: must have at least one employee computed
        if (details.length === 0) {
            return NextResponse.json({ error: 'No active employees found eligible for computation.' }, { status: 400 });
        }

        // Log any employees whose salary data was missing (non-blocking)
        if (details.length < employeesRows.length) {
            const branchName = (branch_id === 'All' || branch_id === 'All Branches') ? 'all' : branch_id;
            console.warn(`[GovContrib] ${employeesRows.length - details.length} employee(s) in "${branchName}" had no salary data and were included with 0 contributions.`);
        }

        // 3. Batch Service Charge
        const batch_service_charge = (contribution_type === 'PhilHealth' || contribution_type === 'Pag-IBIG' || contribution_type === 'PagIBIG') ? 30.00 : 0.00;

        // 4. Insert Report
        const reportInsert = await query(
            `INSERT INTO gov_contribution_reports (
                branch_id, payroll_period, contribution_type, 
                total_er, total_ee, total_ec, total_loan, 
                service_charge, status, created_by, created_at,
                employee_count, total_mpf_er, total_mpf_ee
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [
                branch_id, payroll_period, contribution_type, 
                total_er, total_ee, total_ec, total_loan, 
                batch_service_charge, 'Draft', userId, new Date().toISOString(),
                details.length, 0, 0 // Initial MPF values are 0
            ]
        );

        const reportId = reportInsert.rows[0].id;

        // 4. Insert Details
        if (details.length > 0) {
            const values = details.map((_, i) =>
                `($1, $${i * 12 + 2}, $${i * 12 + 3}, $${i * 12 + 4}, $${i * 12 + 5}, $${i * 12 + 6}, $${i * 12 + 7}, $${i * 12 + 8}, $${i * 12 + 9}, $${i * 12 + 10}, $${i * 12 + 11}, $${i * 12 + 12}, $${i * 12 + 13})`
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
                    new Date().toISOString(),
                    0, // mpf_er
                    0  // mpf_ee
                );
            }

            await query(
                `INSERT INTO gov_contribution_details (
                    report_id, employee_id, government_number, 
                    salary, er_share, ee_share, ec, 
                    loan_deduction, config_id_used, rate_used, 
                    computation_date, mpf_er, mpf_ee
                ) VALUES ${values}`,
                params
            );
        }

        return NextResponse.json({ success: true, report_id: reportId });

    } catch (error: any) {
        console.error('API Error [GovContributions POST Generation]:', {
            message: error.message,
            stack: error.stack,
            contribution_type,
            payroll_period,
            branch_id
        });
        return NextResponse.json({ 
            error: error.message || 'Failed to generate report',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
