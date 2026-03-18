const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(process.cwd(), 'data', 'database.json');

async function recover() {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

        // 1. Recover payroll_runs
        const missingRuns = [
            {
                "run_number": "ORMOC-202603-15-001",
                "branch": "Ormoc",
                "payroll_period_start": "2026-03-01",
                "payroll_period_end": "2026-03-15",
                "cutoff_day": 15,
                "default_payroll_days": 15,
                "status": "Released",
                "created_by": 21,
                "workflow_stage": 4,
                "current_reviewer_role": "null",
                "id": 2,
                "process_date": "2026-02-28T08:57:40.410Z",
                "updated_at": "2026-03-04T00:34:58.136Z",
                "evp_review_status": "Approved",
                "evp_review_date": "2026-03-04T00:32:01.631Z",
                "approved_by": 23,
                "approved_at": "2026-03-04T00:32:01.632Z"
            },
            {
                "run_number": "ORMOC-202603-31-001",
                "branch": "Ormoc",
                "payroll_period_start": "2026-03-16",
                "payroll_period_end": "2026-03-31",
                "cutoff_day": 31,
                "default_payroll_days": 15,
                "status": "Released",
                "created_by": 21,
                "workflow_stage": 4,
                "current_reviewer_role": "null",
                "id": 3,
                "process_date": "2026-03-17T03:15:36.857Z",
                "updated_at": "2026-03-17T03:15:36.857Z",
                "evp_review_status": "Approved",
                "evp_review_date": "2026-03-17T03:15:36.857Z",
                "approved_by": 23,
                "approved_at": "2026-03-17T03:15:36.857Z"
            }
        ];

        missingRuns.forEach(run => {
            if (!data.payroll_runs.find(r => r.id === run.id)) {
                data.payroll_runs.push(run);
            }
        });

        // 2. Recover payslips (Manual recovery from Step 183 and 162 logs)
        // I will only include the missing ones (15-43)
        const missingPayslips = [
            // Run 2: IDs 15-28
            { "payroll_run_id": 2, "employee_id": 1, "monthly_salary": 13710, "daily_rate": 457, "payroll_days": 15, "basic_pay": 6855, "regular_allowance": 0, "special_allowance": 750, "gross_pay": 7605, "total_deductions": 2568.16, "net_pay": 5036.84, "phic": 285, "pagibig": 200, "pagibig_loan": 1783.16, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 0, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":285,\"pagibig_er\":200}}", "id": 15, "holiday_pay": 0, "holiday_days": 0 },
            { "payroll_run_id": 2, "employee_id": 6, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 3554.55, "net_pay": 3725.45, "phic": 281.25, "pagibig": 200, "pagibig_loan": 1773.3, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":281.25,\"pagibig_er\":200}}", "id": 16 },
            { "payroll_run_id": 2, "employee_id": 4, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 2652.25, "net_pay": 4627.75, "phic": 281.25, "pagibig": 200, "pagibig_loan": 371, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 1500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":281.25,\"pagibig_er\":200}}", "id": 17 },
            { "payroll_run_id": 2, "employee_id": 11, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 1763.25, "net_pay": 5516.75, "phic": 263.25, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":263.25,\"pagibig_er\":200}}", "id": 18 },
            { "payroll_run_id": 2, "employee_id": 12, "monthly_salary": 14310, "daily_rate": 477, "payroll_days": 15, "basic_pay": 7155, "regular_allowance": 0, "special_allowance": 900, "gross_pay": 8055, "total_deductions": 4473.88, "net_pay": 3581.12, "phic": 300, "pagibig": 200, "pagibig_loan": 2673.88, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":300,\"pagibig_er\":200}}", "id": 19, "holiday_pay": 0 },
            { "payroll_run_id": 2, "employee_id": 13, "monthly_salary": 15660, "daily_rate": 522, "payroll_days": 15, "basic_pay": 7830, "regular_allowance": 0, "special_allowance": 900, "gross_pay": 8730, "total_deductions": 2333.75, "net_pay": 6396.25, "phic": 333.75, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 1500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":333.75,\"pagibig_er\":200}}", "id": 20 },
            { "payroll_run_id": 2, "employee_id": 14, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 1781.25, "net_pay": 5498.75, "phic": 281.25, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":281.25,\"pagibig_er\":200}}", "id": 21 },
            { "payroll_run_id": 2, "employee_id": 15, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 1250, "gross_pay": 8030, "total_deductions": 3109.68, "net_pay": 4920.32, "phic": 281.25, "pagibig": 200, "pagibig_loan": 1028.43, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 500, "other_deductions_breakdown": "{\"custom_deductions\":[{\"name\":\"Motorcycle Loan\",\"amount\":500,\"balance\":14500}],\"employer_shares\":{\"sss_er\":0,\"phic_er\":281.25,\"pagibig_er\":200}}", "id": 22 },
            { "payroll_run_id": 2, "employee_id": 21, "monthly_salary": 18660, "daily_rate": 622, "payroll_days": 15, "basic_pay": 9330, "regular_allowance": 0, "special_allowance": 1750, "gross_pay": 11080, "total_deductions": 908.75, "net_pay": 10171.25, "phic": 408.75, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 0, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":408.75,\"pagibig_er\":200}}", "id": 23 },
            { "payroll_run_id": 2, "employee_id": 20, "monthly_salary": 24660, "daily_rate": 822, "payroll_days": 15, "basic_pay": 12330, "regular_allowance": 0, "special_allowance": 2250, "gross_pay": 14580, "total_deductions": 2563.75, "net_pay": 12016.25, "phic": 558.75, "pagibig": 200, "pagibig_loan": 1505, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 0, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":558.75,\"pagibig_er\":200}}", "id": 24 },
            { "payroll_run_id": 2, "employee_id": 22, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 750, "gross_pay": 7530, "total_deductions": 1282, "net_pay": 6248, "phic": 282, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":282,\"pagibig_er\":200}}", "id": 25 },
            { "payroll_run_id": 2, "employee_id": 16, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 1581.25, "net_pay": 5698.75, "phic": 281.25, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":281.25,\"pagibig_er\":200}}", "id": 26 },
            { "payroll_run_id": 2, "employee_id": 17, "monthly_salary": 15060, "daily_rate": 502, "payroll_days": 15, "basic_pay": 7530, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 8030, "total_deductions": 3118.75, "net_pay": 4911.25, "phic": 318.75, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 1500, "other_deductions_breakdown": "{\"custom_deductions\":[{\"name\":\"Motorcycle Loan\",\"amount\":1500,\"balance\":20000}],\"employer_shares\":{\"sss_er\":0,\"phic_er\":318.75,\"pagibig_er\":200}}", "id": 27 },
            { "payroll_run_id": 2, "employee_id": 9, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 1250, "gross_pay": 8030, "total_deductions": 1581.25, "net_pay": 6448.75, "phic": 281.25, "pagibig": 200, "pagibig_loan": 0, "company_funds": 300, "sss": 0, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":0,\"phic_er\":281.25,\"pagibig_er\":200}}", "id": 28 },
            // Run 3: IDs 29-43
            { "payroll_run_id": 3, "employee_id": 1, "monthly_salary": 13710, "daily_rate": 457, "payroll_days": 15, "basic_pay": 6855, "regular_allowance": 0, "special_allowance": 750, "gross_pay": 7605, "total_deductions": 675, "net_pay": 6930, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 0, "company_loan": 0, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 29 },
            { "payroll_run_id": 3, "employee_id": 6, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 2874.77, "net_pay": 4405.23, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 1199.77, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 30 },
            { "payroll_run_id": 3, "employee_id": 4, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 2705.67, "net_pay": 4574.33, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 530.67, "company_loan": 1500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 31 },
            { "payroll_run_id": 3, "employee_id": 11, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 2331.6, "net_pay": 4948.4, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 656.6, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 32 },
            { "payroll_run_id": 3, "employee_id": 12, "monthly_salary": 14310, "daily_rate": 477, "payroll_days": 15, "basic_pay": 7155, "regular_allowance": 0, "special_allowance": 900, "gross_pay": 8055, "total_deductions": 3084.35, "net_pay": 4970.65, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 700, "sss_loan": 1384.35, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1340,\"phic_er\":0,\"pagibig_er\":0}}", "id": 33 },
            { "payroll_run_id": 3, "employee_id": 13, "monthly_salary": 15660, "daily_rate": 522, "payroll_days": 15, "basic_pay": 7830, "regular_allowance": 0, "special_allowance": 900, "gross_pay": 8730, "total_deductions": 2200, "net_pay": 6530, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 700, "sss_loan": 0, "company_loan": 1500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1340,\"phic_er\":0,\"pagibig_er\":0}}", "id": 34 },
            { "payroll_run_id": 3, "employee_id": 14, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 1675, "net_pay": 5605, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 0, "company_loan": 1000, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 35 },
            { "payroll_run_id": 3, "employee_id": 15, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 1250, "gross_pay": 8030, "total_deductions": 1975, "net_pay": 6055, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 500, "other_deductions_breakdown": "{\"custom_deductions\":[{\"name\":\"Motorcycle Loan\",\"amount\":500,\"balance\":14500}],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 36 },
            { "payroll_run_id": 3, "employee_id": 18, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 900, "gross_pay": 7680, "total_deductions": 1175, "net_pay": 6505, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 0, "company_loan": 500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 37 },
            { "payroll_run_id": 3, "employee_id": 21, "monthly_salary": 18660, "daily_rate": 622, "payroll_days": 15, "basic_pay": 9330, "regular_allowance": 0, "special_allowance": 1750, "gross_pay": 11080, "total_deductions": 700, "net_pay": 10380, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 700, "sss_loan": 0, "company_loan": 0, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1340,\"phic_er\":0,\"pagibig_er\":0}}", "id": 38 },
            { "payroll_run_id": 3, "employee_id": 20, "monthly_salary": 24660, "daily_rate": 822, "payroll_days": 15, "basic_pay": 12330, "regular_allowance": 0, "special_allowance": 2250, "gross_pay": 14580, "total_deductions": 2204.11, "net_pay": 12375.89, "phic": 0, "pagibig": 0, "pagibig_loan": 1504.11, "company_funds": 0, "sss": 700, "sss_loan": 0, "company_loan": 0, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1340,\"phic_er\":0,\"pagibig_er\":0}}", "id": 39 },
            { "payroll_run_id": 3, "employee_id": 22, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 750, "gross_pay": 7530, "total_deductions": 1175, "net_pay": 6355, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 0, "company_loan": 500, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 40 },
            { "payroll_run_id": 3, "employee_id": 16, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 7280, "total_deductions": 1475, "net_pay": 5805, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 675, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 41 },
            { "payroll_run_id": 3, "employee_id": 17, "monthly_salary": 15060, "daily_rate": 502, "payroll_days": 15, "basic_pay": 7530, "regular_allowance": 0, "special_allowance": 500, "gross_pay": 8030, "total_deductions": 3000, "net_pay": 5030, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 700, "sss_loan": 0, "company_loan": 800, "cash_advance": 0, "other_deductions": 1500, "other_deductions_breakdown": "{\"custom_deductions\":[{\"name\":\"Motorcycle Loan\",\"amount\":1500,\"balance\":20000}],\"employer_shares\":{\"sss_er\":1340,\"phic_er\":0,\"pagibig_er\":0}}", "id": 42 },
            { "payroll_run_id": 3, "employee_id": 9, "monthly_salary": 13560, "daily_rate": 452, "payroll_days": 15, "basic_pay": 6780, "regular_allowance": 0, "special_allowance": 1250, "gross_pay": 8030, "total_deductions": 2112.95, "net_pay": 5917.05, "phic": 0, "pagibig": 0, "pagibig_loan": 0, "company_funds": 0, "sss": 725, "sss_loan": 587.95, "company_loan": 800, "cash_advance": 0, "other_deductions": 0, "other_deductions_breakdown": "{\"custom_deductions\":[],\"employer_shares\":{\"sss_er\":1292.5,\"phic_er\":0,\"pagibig_er\":0}}", "id": 43, "holiday_pay": 0, "holiday_days": 0 }
        ];

        missingPayslips.forEach(ps => {
            if (!data.payslips.find(p => p.id === ps.id)) {
                data.payslips.push(ps);
            }
        });

        // 3. Recover missing notifications from git diff
        const missingNotifications = [
            { "user_id": 21, "title": "EXCESSIVE LATES", "message": "ANGELITO TORRETA has 5 lates this month. Candidate for warning.", "type": "alert", "severity": "high", "link": "/employees/17", "reference_id": "lates-17-2", "is_read": "TRUE", "read_at": "2026-03-17T03:15:36.857Z", "id": 32 },
            { "user_id": 21, "title": "EXCESSIVE LATES", "message": "JOSEPHINE ARRADAZA has 5 lates this month. Candidate for warning.", "type": "alert", "severity": "high", "link": "/employees/1", "reference_id": "lates-1-2", "is_read": "TRUE", "read_at": "2026-03-17T03:15:36.857Z", "id": 33 },
            { "user_id": 21, "title": "EXCESSIVE LATES", "message": "RENATO DOMINGONO has 5 lates this month. Candidate for warning.", "type": "alert", "severity": "high", "link": "/employees/4", "reference_id": "lates-4-2", "is_read": "TRUE", "read_at": "2026-03-17T03:15:36.913Z", "id": 34 }
        ];

        missingNotifications.forEach(notif => {
            if (!data.notifications.find(n => n.id === notif.id)) {
                data.notifications.push(notif);
            }
        });

        // 4. Save
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('✅ Recovery complete!');
        console.log('Restored Runs:', missingRuns.length);
        console.log('Restored Payslips:', missingPayslips.length);

    } catch (error) {
        console.error('❌ Recovery failed:', error);
    }
}

recover();
