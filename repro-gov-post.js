const { query } = require('./lib/database');
const { getAllEmployees } = require('./lib/data');

async function repro() {
    const branch_id = 'Ormoc';
    const contribution_type = 'SSS';
    const payroll_period = 'March 2026';
    const userId = 1;

    try {
        console.log('1. Fetching employees...');
        const allEmployeesRaw = await getAllEmployees();
        const inactiveStatuses = ['Resigned', 'Terminated', 'Floating', 'Inactive', 'Deceased'];
        let employeesRows = allEmployeesRaw.filter((emp) => 
            emp.employment_status && !inactiveStatuses.includes(emp.employment_status)
        );

        console.log(`Found ${employeesRows.length} active employees total.`);
        
        const normalizedTargetBranch = branch_id.toLowerCase();
        employeesRows = employeesRows.filter((emp) =>
            (emp.branch || '').toLowerCase() === normalizedTargetBranch
        );
        
        console.log(`Found ${employeesRows.length} employees for branch ${branch_id}.`);

        if (employeesRows.length === 0) {
            console.log('No employees found.');
            return;
        }

        console.log('2. Fetching SSS table...');
        const sssRes = await query(`SELECT * FROM sss_contribution_table WHERE effectivity_year = 2025`);
        const sssTable = sssRes.rows;
        console.log(`Found ${sssTable.length} SSS brackets.`);

        if (sssTable.length === 0) {
            console.error('SSS 2025 Table is empty!');
            return;
        }

        let total_er = 0;
        let total_ee = 0;
        let total_ec = 0;
        let total_loan = 0;
        const details = [];

        for (const emp of employeesRows) {
            let salaryInfo = {};
            try {
                salaryInfo = typeof emp.salary_info === 'string' ? JSON.parse(emp.salary_info) : (emp.salary_info || {});
            } catch (e) {
                salaryInfo = {};
            }

            const basicSalary = Number(salaryInfo.monthly_salary || 0);
            const regularAllowance = Number(salaryInfo.allowances?.regular || 0);
            const specialAllowance = Number(salaryInfo.allowances?.special || 0);
            const grossSalary = basicSalary + regularAllowance + specialAllowance;

            // Fetch loans
            const activeLoansReq = await query(
                `SELECT loan_type, balance as remaining_balance, monthly_payment as monthly_amortization 
                 FROM employee_loans 
                 WHERE employee_id = $1 AND status = 'Active' AND balance > 0
                 UNION ALL
                 SELECT category as loan_type, remaining_balance, deduction_amount as monthly_amortization
                 FROM emergency_loans
                 WHERE employee_id = $1 AND status = 'Approved' AND remaining_balance > 0`,
                [emp.id]
            );
            const activeLoans = activeLoansReq.rows;

            let er_share = 0;
            let ee_share = 0;
            let ec = 0;
            let loan_deduction = 0;
            let gov_number = emp.sss_number || 'N/A';
            let used_rate = null;

            const manualSSSEE = Number(salaryInfo?.deductions?.sss || 0);
            ee_share = manualSSSEE;

            if (ee_share > 0) {
                const bracketByEE = sssTable.find((b) => Number(b.employee_share) === manualSSSEE);
                if (bracketByEE) {
                    er_share = Number(bracketByEE.employer_share);
                    ec = Number(bracketByEE.ec_contribution);
                    used_rate = bracketByEE;
                } else {
                    const bracket = sssTable.find((b) => grossSalary >= Number(b.salary_range_from) && grossSalary <= Number(b.salary_range_to)) || {};
                    er_share = Number(bracket.employer_share || 0);
                    ec = Number(bracket.ec_contribution || 0);
                    used_rate = { manual_override: true, matched_bracket: bracket, original_ee: manualSSSEE };
                }
            } else {
                used_rate = { manual_override: true, note: 'No SSS encoded' };
            }

            activeLoans.filter((l) => l.loan_type?.toUpperCase().includes('SSS')).forEach((l) => {
                const deduction = Math.min(Number(l.monthly_amortization), Number(l.remaining_balance));
                loan_deduction += deduction;
            });

            const deductionsInfo = salaryInfo?.deductions || {};
            const manualSssLoan = parseFloat(deductionsInfo.sss_loan?.amortization || deductionsInfo.sss_loan) || 0;
            loan_deduction += manualSssLoan;

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
                config_id_used: 999,
                rate_used: used_rate
            });
        }

        console.log(`Computed ${details.length} details. Total Loan: ${total_loan}`);

        // Insert report
        console.log('3. Inserting report...');
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
                0, 'Draft', userId, new Date().toISOString(),
                details.length, 0, 0
            ]
        );
        const reportId = reportInsert.rows[0].id;
        console.log(`Report inserted with ID: ${reportId}`);

        // Insert details
        console.log('4. Inserting details...');
        const valPlaceholders = details.map((_, i) =>
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
                0, 0
            );
        }

        await query(
            `INSERT INTO gov_contribution_details (
                report_id, employee_id, government_number, 
                salary, er_share, ee_share, ec, 
                loan_deduction, config_id_used, rate_used, 
                computation_date, mpf_er, mpf_ee
            ) VALUES ${valPlaceholders}`,
            params
        );
        console.log('Details inserted successfully.');

    } catch (e) {
        console.error('REPRO ERROR:', e);
    }
}

repro();
