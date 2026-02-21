import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/database';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const payrollRunId = parseInt(params.id);

        // Get payroll run details
        const payrollRunResult = await db.query(
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

        // Get all payslips for this payroll run
        const payslipsResult = await db.query(
            `SELECT * FROM payslips WHERE payroll_run_id = $1`,
            [payrollRunId]
        );

        if (!payslipsResult.rows || payslipsResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'No payslips found for this payroll run' },
                { status: 404 }
            );
        }

        const payslips = payslipsResult.rows;
        const startDate = payrollRun.payroll_period_start;
        const endDate = payrollRun.payroll_period_end;

        // Calculate days worked for each employee
        const updates: { payslipId: number; daysWorked: number }[] = [];

        for (const payslip of payslips) {
            // Get attendance records for this employee within the payroll period
            const attendanceResult = await db.query(
                `SELECT status FROM attendance_records 
                 WHERE employee_id = $1 
                 AND date >= $2 
                 AND date <= $3`,
                [payslip.employee_id, startDate, endDate]
            );

            const attendanceRecords = attendanceResult.rows || [];

            // Calculate days worked
            let daysWorked = 0;

            for (const record of attendanceRecords) {
                const status = record.status;

                if (status === 'Present' || status === 'Late') {
                    // Full day
                    daysWorked += 1;
                } else if (status === 'Half-Day') {
                    // Half day
                    daysWorked += 0.5;
                }
                // Absent, On Leave, No Work, etc. = 0 days
            }

            updates.push({
                payslipId: payslip.id,
                daysWorked: daysWorked
            });
        }

        // Update all payslips with calculated days
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

            await db.query(
                `UPDATE payslips 
                 SET payroll_days = $1, 
                     basic_pay = $2, 
                     gross_pay = $3, 
                     net_pay = $4
                 WHERE id = $5`,
                [update.daysWorked, newBasicPay, grossPay, netPay, update.payslipId]
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synced attendance data for ${updates.length} employees`,
            updates: updates
        });

    } catch (error) {
        console.error('Error syncing attendance:', error);
        return NextResponse.json(
            { error: 'Failed to sync attendance data' },
            { status: 500 }
        );
    }
}
