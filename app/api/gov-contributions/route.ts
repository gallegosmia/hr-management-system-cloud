import { NextRequest, NextResponse } from 'next/server';
import { query, getAll } from '@/lib/database';

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
            SELECT r.*, u.username as approved_by_name 
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

        const sessionRes = await query("SELECT user_id FROM sessions WHERE id = $1", [sessionId]);
        if (sessionRes.rowCount === 0) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = sessionRes.rows[0].user_id;

        const body = await req.json();
        const { branch_id, contribution_type, payroll_period } = body;

        if (!branch_id || !contribution_type || !payroll_period) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Validate duplicates
        const existing = await query(
            "SELECT id FROM gov_contribution_reports WHERE branch_id = $1 AND contribution_type = $2 AND payroll_period = $3 AND status != 'Rejected'",
            [branch_id, contribution_type, payroll_period]
        );

        if (existing.rowCount > 0) {
            return NextResponse.json({ error: 'A contribution report for this branch, type, and period already exists' }, { status: 400 });
        }

        // 1. Fetch active employees for branch
        let empSql = "SELECT * FROM employees WHERE employment_status != 'Resigned'";
        let empParams: any[] = [];
        if (branch_id !== 'All' && branch_id !== 'All Branches') {
            empSql += " AND branch = $1";
            empParams.push(branch_id);
        }

        const employees = await query(empSql, empParams);

        if (employees.rowCount === 0) {
            return NextResponse.json({ error: 'No active employees found for this branch' }, { status: 400 });
        }

        // 2. Fetch Active Config for the Year
        const yearMatch = payroll_period.match(/\d{4}/);
        const configYear = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();

        const configQuery = await query(
            `SELECT id, config_data FROM gov_contribution_configs WHERE type = $1 AND year_effective = $2`,
            [contribution_type, configYear]
        );

        if (configQuery.rows.length === 0) {
            return NextResponse.json({ error: `Government contribution configuration for ${contribution_type} (${configYear}) not found. Please configure in Compensation & Benefits.` }, { status: 400 });
        }

        const activeConfig = configQuery.rows[0];
        const configId = activeConfig.id;
        const configData = activeConfig.config_data;

        // 3. Compute
        let total_er = 0;
        let total_ee = 0;
        let total_ec = 0;
        let total_loan = 0;

        const details = [];

        for (const emp of employees.rows) {
            const salaryInfo = typeof emp.salary_info === 'string' ? JSON.parse(emp.salary_info) : (emp.salary_info || {});
            const basicSalary = Number(salaryInfo.monthly_salary || 0);
            const regularAllowance = Number(salaryInfo.allowances?.regular || 0);
            const specialAllowance = Number(salaryInfo.allowances?.special || 0);
            const grossSalary = basicSalary + regularAllowance + specialAllowance;

            if (grossSalary === 0) continue; // Skip if no salary

            let er_share = 0;
            let ee_share = 0;
            let ec = 0;
            let loan_deduction = 0;
            let gov_number = '';
            let used_rate: any = null;

            // --- COMPUTATION LOGIC ---
            if (contribution_type === 'SSS') {
                gov_number = emp.sss_number || 'N/A';

                // Find correct bracket
                const brackets = Array.isArray(configData) ? configData : [];
                const bracket = brackets.find((b: any) => grossSalary >= Number(b.range_start) && grossSalary <= Number(b.range_end))
                    || brackets[brackets.length - 1]; // Fallback to max bracket if exceeded

                if (bracket) {
                    ee_share = Number(bracket.ee_share);
                    er_share = Number(bracket.er_share);
                    ec = Number(bracket.ec);
                    used_rate = bracket;
                }

                loan_deduction = Number(salaryInfo?.deductions?.sss_loan?.amortization || 0);

            } else if (contribution_type === 'Pag-IBIG') {
                gov_number = emp.pagibig_number || 'N/A';

                const brackets = Array.isArray(configData) ? configData : [];
                const bracket = brackets.find((b: any) => grossSalary >= Number(b.range_start) && grossSalary <= Number(b.range_end))
                    || brackets[brackets.length - 1];

                if (bracket) {
                    const fundSalary = Math.min(grossSalary, Number(bracket.max_cap));
                    ee_share = fundSalary * Number(bracket.ee_rate);
                    er_share = fundSalary * Number(bracket.er_rate);
                    used_rate = { ...bracket, computed_fund_salary: fundSalary };
                }

                loan_deduction = Number(salaryInfo?.deductions?.pagibig_loan_15th?.amortization || 0) +
                    Number(salaryInfo?.deductions?.pagibig_loan_30th?.amortization || 0);

            } else if (contribution_type === 'PhilHealth') {
                gov_number = emp.philhealth_number || 'N/A';

                const min = Number(configData.min_salary);
                const max = Number(configData.max_salary);
                const rate = Number(configData.rate);
                const eeSplit = Number(configData.ee_split);
                const erSplit = Number(configData.er_split);

                const phicSalary = Math.min(Math.max(grossSalary, min), max);
                const totalContrib = phicSalary * rate;

                ee_share = totalContrib * eeSplit;
                er_share = totalContrib * erSplit;

                used_rate = { applied_salary: phicSalary, rate, ee_split: eeSplit, er_split: erSplit };
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

        if (details.length === 0) {
            return NextResponse.json({ error: 'No valid employee salaries eligible for computation' }, { status: 400 });
        }

        // 3. Insert Report
        const reportInsert = await query(
            `INSERT INTO gov_contribution_reports (branch_id, payroll_period, contribution_type, total_er, total_ee, total_ec, total_loan, status, created_by, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [branch_id, payroll_period, contribution_type, total_er, total_ee, total_ec, total_loan, 'Draft', userId, new Date().toISOString()]
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
