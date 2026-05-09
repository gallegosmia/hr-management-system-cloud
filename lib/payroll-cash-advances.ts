import { query } from '@/lib/database';

function toNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

export function getPayrollCashAdvanceCutoffLabel(payrollRun: {
    payroll_period_start?: string | null;
    period_start?: string | null;
    cutoff_day?: string | number | null;
}): string | null {
    const start = payrollRun.payroll_period_start || payrollRun.period_start;
    if (!start) return null;

    const date = new Date(start);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const cutoffDay = Number(payrollRun.cutoff_day);
    const half = cutoffDay === 15 ? 'A' : 'B';

    return `${year}-${month}-${half}`;
}

export async function getApprovedCashAdvanceAmount(employeeId: number, cutoffLabel: string | null): Promise<number> {
    if (!employeeId || !cutoffLabel) return 0;

    const result = await query(
        `SELECT COALESCE(SUM(
            CASE
                WHEN COALESCE(approved_amount, 0) > 0 THEN approved_amount
                ELSE requested_amount
            END
        ), 0) as amount
         FROM cash_advances
         WHERE employee_id = $1
           AND cutoff_period = $2
           AND status = 'Approved'`,
        [employeeId, cutoffLabel]
    );

    return toNumber(result.rows[0]?.amount);
}

export async function syncApprovedCashAdvancesForPayrollRun(payrollRunId: number): Promise<number> {
    const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [payrollRunId]);
    if (runResult.rows.length === 0) return 0;

    const payrollRun = runResult.rows[0];
    const status = String(payrollRun.status || '').toLowerCase();
    if (status === 'released' || status === 'locked') return 0;

    const cutoffLabel = getPayrollCashAdvanceCutoffLabel(payrollRun);
    if (!cutoffLabel) return 0;

    const payslipResult = await query(`SELECT * FROM payslips WHERE payroll_run_id = $1`, [payrollRunId]);
    let updatedCount = 0;

    for (const payslip of payslipResult.rows) {
        const approvedCashAdvance = await getApprovedCashAdvanceAmount(Number(payslip.employee_id), cutoffLabel);
        if (approvedCashAdvance <= 0) continue;

        const currentCashAdvance = toNumber(payslip.cash_advance);

        if (Math.abs(approvedCashAdvance - currentCashAdvance) < 0.01) continue;

        const totalDeductions = toNumber(payslip.total_deductions) - currentCashAdvance + approvedCashAdvance;
        const netPay = toNumber(payslip.gross_pay) - totalDeductions;

        await query(
            `UPDATE payslips
             SET cash_advance = $1,
                 total_deductions = $2,
                 net_pay = $3
             WHERE id = $4`,
            [approvedCashAdvance, totalDeductions, netPay, payslip.id]
        );
        updatedCount += 1;
    }

    if (updatedCount > 0) {
        const totalsResult = await query(
            `SELECT
                COUNT(*) as employee_count,
                COALESCE(SUM(net_pay), 0) as total_net_pay,
                COALESCE(SUM(gross_pay), 0) as total_gross_pay
             FROM payslips
             WHERE payroll_run_id = $1`,
            [payrollRunId]
        );
        const totals = totalsResult.rows[0];

        await query(
            `UPDATE payroll_runs
             SET employee_count = $2,
                 total_net_pay = $3,
                 total_gross_pay = $4,
                 updated_at = NOW()
             WHERE id = $1`,
            [payrollRunId, totals.employee_count, totals.total_net_pay, totals.total_gross_pay]
        );
    }

    return updatedCount;
}

export async function syncApprovedCashAdvanceForEmployee(employeeId: number, cutoffLabel: string | null): Promise<number> {
    if (!employeeId || !cutoffLabel) return 0;

    const runsResult = await query(
        `SELECT DISTINCT pr.id
         FROM payroll_runs pr
         JOIN payslips ps ON ps.payroll_run_id = pr.id
         WHERE ps.employee_id = $1
           AND LOWER(COALESCE(pr.status, '')) NOT IN ('released', 'locked')`,
        [employeeId]
    );

    let updatedCount = 0;
    for (const run of runsResult.rows) {
        const runResult = await query(`SELECT * FROM payroll_runs WHERE id = $1`, [run.id]);
        const payrollRun = runResult.rows[0];
        if (getPayrollCashAdvanceCutoffLabel(payrollRun) !== cutoffLabel) continue;
        updatedCount += await syncApprovedCashAdvancesForPayrollRun(Number(run.id));
    }

    return updatedCount;
}
