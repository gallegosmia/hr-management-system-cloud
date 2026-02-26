import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireBranchAuth } from '@/lib/middleware/branch-auth';

// Define status constants for better readability
const STATUS = {
    PRESENT: 'Present',
    LATE: 'Late',
    HALF_DAY: 'Half-Day',
    OFFICIAL_BUSINESS: 'Official Business',
    WORK_FROM_HOME: 'Work From Home',
    LEAVE: 'Leave',
    ON_LEAVE: 'On Leave',
    SICK_LEAVE: 'Sick Leave',
    VACATION_LEAVE: 'Vacation Leave',
    BIRTHDAY_LEAVE: 'Birthday Leave',
    TRAINING_SEMINAR: 'Training / Seminar',
    LEAVE_WITHOUT_PAY: 'Leave Without Pay',
    ABSENT: 'Absent'
};

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireBranchAuth(request);
        if (auth instanceof NextResponse) return auth;
        const [user, selectedBranch] = auth;

        const payrollRunId = params.id;
        const body = await request.json().catch(() => ({}));
        const { employeeId } = body;

        // Get payroll run details
        const payrollRunResult = await query(
            `SELECT * FROM payroll_runs WHERE id = $1`,
            [payrollRunId]
        );

        if (!payrollRunResult.rows || payrollRunResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Payroll run not found' },
                { status: 404 }
            );
        }

        const payrollRun = payrollRunResult.rows[0];

        // Get payslips (filter by employeeId if provided)
        let payslipsQuery = `SELECT * FROM payslips WHERE payroll_run_id = $1`;
        const queryParams: any[] = [payrollRunId];

        if (employeeId) {
            payslipsQuery += ` AND employee_id = $2`;
            queryParams.push(employeeId);
        }

        const payslipsResult = await query(payslipsQuery, queryParams);

        if (!payslipsResult.rows || payslipsResult.rows.length === 0) {
            if (employeeId) {
                return NextResponse.json(
                    { error: 'No payslip found for this employee in this payroll run' },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: 'No payslips found for this payroll run' },
                { status: 404 }
            );
        }

        const payslips = payslipsResult.rows;
        const startDate = payrollRun.payroll_period_start;
        const endDate = payrollRun.payroll_period_end;

        // Calculate days worked for each employee
        const updates: any[] = [];
        const auditLogs: any[] = [];

        for (const payslip of payslips) {
            // Fetch employee details for leave balance
            const employeeResult = await query(
                `SELECT leave_balance, first_name, last_name FROM employees WHERE id = $1`,
                [payslip.employee_id]
            );
            const employee = employeeResult.rows[0];
            if (!employee) continue;

            const hasLeaveCredits = (employee.leave_balance || 0) > 0;

            // Get attendance records for this employee
            const attendanceResult = await query(
                `SELECT * FROM attendance WHERE employee_id = $1 AND date >= $2 AND date <= $3`,
                [payslip.employee_id, startDate, endDate]
            );

            const allEmployeeRecords = attendanceResult.rows || [];

            // Normalize start and end dates
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            // end.setHours(23, 59, 59, 999);

            let daysWorked = 0;
            const currentDate = new Date(start);
            const missingDates: string[] = [];

            // Iterate through each day of the payroll period (Calendar Days: Mon-Sun)
            while (currentDate.toISOString().split('T')[0] <= end.toISOString().split('T')[0]) {
                const dateString = currentDate.toISOString().split('T')[0];

                // Find record matching this date
                const record = allEmployeeRecords.find((r: any) => {
                    const rDate = new Date(r.date);
                    return rDate.toISOString().split('T')[0] === dateString;
                });

                // Rule D: Overrides all - Absent -> 0
                if (record && (record.status === STATUS.ABSENT || record.status === STATUS.LEAVE_WITHOUT_PAY)) {
                    // Count as 0
                }
                else if (record) {
                    const status = record.status;

                    // Rule A: Present, Late, Official Business, Work From Home, Training, Birthday -> +1
                    if ([STATUS.PRESENT, STATUS.LATE, STATUS.OFFICIAL_BUSINESS, STATUS.WORK_FROM_HOME, STATUS.TRAINING_SEMINAR, STATUS.BIRTHDAY_LEAVE].includes(status)) {
                        daysWorked += 1;
                    }
                    // Rule A: Half Day -> 0.5 (System supports it)
                    else if (status === STATUS.HALF_DAY || status === 'Half Day') {
                        daysWorked += 0.5;
                    }
                    // Rule B: Leave (Sick, Vacation) -> Check if deducted previously or if they have balance.
                    // But actually, we already check and deduct them in the /api/attendance! So if the status is Sick/Vacation, it means they HAD balance and it was successfully deducted there. So just +1. 
                    else if ([STATUS.LEAVE, STATUS.ON_LEAVE, STATUS.SICK_LEAVE, STATUS.VACATION_LEAVE].includes(status)) {
                        daysWorked += 1; // Since it's Sick/Vacation, it was already filtered in attendance API to become LWOP if they had no balance. 
                        // Note: Legacy "On Leave" left for older syncs
                    }
                }
                else {
                    // No Record Found.
                    // Rule C: Weekend Inclusion (Automatic)
                    // If it is Sunday (0) or Saturday (6) and NO record exists (meaning user didn't input absent), count as 1.
                    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        daysWorked += 1;
                    } else {
                        missingDates.push(dateString);
                    }
                }

                // Move to next day
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }

            console.log(`Employee ${payslip.employee_id}: Days Worked = ${daysWorked} (${startDate} to ${endDate})`);

            updates.push({
                payslipId: payslip.id,
                daysWorked: daysWorked,
                employeeName: `${employee.first_name} ${employee.last_name}`,
                missingDates: missingDates
            });
        }

        // Prepare Audit Log
        const logDetails: any = {
            message: updates.length === 1 && employeeId ? 'Synced Days Worked (Single)' : 'Synced Days Worked (All)',
            updates_count: updates.length,
        };

        if (employeeId && updates.length > 0) {
            logDetails.employee = updates[0].employeeName;
            logDetails.days_worked = updates[0].daysWorked;
            logDetails.missing_dates = updates[0].missingDates; // Log missing dates
        }

        if (updates.length > 0) {
            auditLogs.push({
                payrollRunId,
                action: employeeId ? 'SYNCED_DAYS_WORKED' : 'SYNCED_DAYS_WORKED_ALL',
                performedBy: user.id,
                details: JSON.stringify(logDetails),
                performedAt: new Date().toISOString()
            });
        }

        // Update all payslips
        for (const update of updates) {
            const payslip = payslips.find((p: any) => p.id === update.payslipId);
            if (!payslip) continue;

            const dailyRate = payslip.daily_rate || 0;
            const newBasicPay = dailyRate * update.daysWorked;

            // Recalculate gross pay
            const grossPay = newBasicPay +
                (payslip.regular_allowance || 0) +
                (payslip.special_allowance || 0) +
                (payslip.holiday_pay || 0) +
                (payslip.other_earnings || 0);

            // Recalculate net pay
            const netPay = grossPay - (payslip.total_deductions || 0);

            await query(
                `UPDATE payslips 
                 SET payroll_days = $1, 
                     basic_pay = $2, 
                     gross_pay = $3, 
                     net_pay = $4
                 WHERE id = $5`,
                [update.daysWorked, newBasicPay, grossPay, netPay, update.payslipId]
            );
        }

        // Insert Audit Logs
        for (const log of auditLogs) {
            await query(
                `INSERT INTO payroll_audit_log (payroll_run_id, action, performed_by, details, performed_at) VALUES ($1, $2, $3, $4, $5)`,
                [log.payrollRunId, log.action, log.performedBy, log.details, log.performedAt]
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synced attendance data for ${updates.length} employees`,
            updates: updates
        });

    } catch (error: any) {
        console.error('Error syncing attendance:', error);
        return NextResponse.json(
            { error: 'Failed to sync attendance data', details: error.message },
            { status: 500 }
        );
    }
}
