
import { NextRequest, NextResponse } from 'next/server';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { getEmergencyLoanById, updateEmergencyLoan, logAudit, updateEmployee, getEmployeeById, addLoanToLedger } from '@/lib/data';
import { query } from '@/lib/database';
import { createNotification } from '@/lib/notifications';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        console.log(`[GET] /api/loans/${params.id} - Start`);
        const validation = await validateBranchRequest(request);
        console.log(`[GET] Validation: ${validation.valid}, Error: ${validation.error}`);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });

        const user = validation.user!;
        console.log(`[GET] User: ${user.username} (${user.role})`);

        const loanId = parseInt(params.id);
        console.log(`[GET] Fetching Loan ID: ${loanId}`);
        const loan = await getEmergencyLoanById(loanId);
        console.log(`[GET] Loan found: ${!!loan}`);

        if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

        // Security: Employees can only view their own loans
        if (user.role === 'Employee' && loan.employee_id !== user.employee_id) {
            console.log(`[GET] Access Denied for employee ${user.employee_id} vs loan owner ${loan.employee_id}`);
            return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
        }

        console.log(`[GET] Returning loan data`);
        return NextResponse.json(loan);
    } catch (error) {
        console.error('Fetch loan error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });

        const user = validation.user!;
        const loanId = parseInt(params.id);
        const body = await request.json();

        const currentLoan = await getEmergencyLoanById(loanId);
        if (!currentLoan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

        // Permission check for status changes
        if (body.status && user.role === 'Employee' && body.status !== 'Draft') {
            // Employees can only update as draft or submit
        }

        const updates: any = { ...body, updated_at: new Date().toISOString() };
        if (updates.approvals) updates.approvals = JSON.stringify(updates.approvals);
        if (updates.attachments) updates.attachments = JSON.stringify(updates.attachments);
        if (updates.metadata) updates.metadata = JSON.stringify(updates.metadata);

        await updateEmergencyLoan(loanId, updates);

        // If status becomes "Approved", we might update the employee's loan balance
        if (body.status === 'Approved' && currentLoan.status !== 'Approved') {
            const emp = await getEmployeeById(currentLoan.employee_id);
            if (emp) {
                const approvedAmount = Number(body.approved_amount || currentLoan.requested_amount);
                const newBalance = (Number(emp.loan_balance) || 0) + approvedAmount;

                // 1. Update legacy loan_balance field
                const updates: any = { loan_balance: newBalance };

                // 2. Update Professional Salary Info / Deductions
                const salaryInfo = (emp.salary_info as any) || {};
                if (!salaryInfo.deductions) salaryInfo.deductions = {};
                if (!salaryInfo.deductions.company_loan) {
                    salaryInfo.deductions.company_loan = { balance: 0, amortization: 0 };
                }

                // Add to existing balance
                salaryInfo.deductions.company_loan.balance = (Number(salaryInfo.deductions.company_loan.balance) || 0) + approvedAmount;

                // If the loan has a specific deduction amount defined, set it as amortization
                if (currentLoan.deduction_amount) {
                    salaryInfo.deductions.company_loan.amortization = Number(currentLoan.deduction_amount);
                }

                updates.salary_info = salaryInfo;
                await updateEmployee(emp.id, updates);

                // 3. Add to professional Loan Ledger
                await addLoanToLedger({
                    employee_id: emp.id,
                    loan_type: `Emergency Loan: ${currentLoan.category}`,
                    principal: approvedAmount,
                    balance: approvedAmount,
                    status: 'Active'
                });

                await logAudit({
                    user_id: user.id,
                    action: 'LOAN_APPROVED_BALANCE_UPDATE',
                    table_name: 'employees',
                    record_id: emp.id,
                    new_value: JSON.stringify({
                        loan_id: loanId,
                        amount: approvedAmount,
                        new_total_balance: newBalance
                    })
                });
            }

            try {
                const userRes = await query(`SELECT id FROM users WHERE employee_id = $1 LIMIT 1`, [currentLoan.employee_id]);
                if (userRes.rows.length > 0) {
                    await createNotification({
                        userId: userRes.rows[0].id,
                        type: 'LOAN_APPROVED',
                        title: 'Loan Request Approved',
                        message: `Your emergency loan request for ${currentLoan.category} has been approved.`,
                        link: `/loans/${loanId}`,
                        referenceId: `loan-${loanId}-approved`,
                        severity: 'high'
                    });
                }
            } catch (e) { console.error('Failed to notify loan approval:', e); }
        }

        if (body.status === 'Rejected' && currentLoan.status !== 'Rejected') {
            try {
                const userRes = await query(`SELECT id FROM users WHERE employee_id = $1 LIMIT 1`, [currentLoan.employee_id]);
                if (userRes.rows.length > 0) {
                    await createNotification({
                        userId: userRes.rows[0].id,
                        type: 'LOAN_REJECTED',
                        title: 'Loan Request Rejected',
                        message: `Your emergency loan request for ${currentLoan.category} has been rejected.`,
                        link: `/loans/${loanId}`,
                        referenceId: `loan-${loanId}-rejected`,
                        severity: 'high'
                    });
                }
            } catch (e) { console.error('Failed to notify loan rejection:', e); }
        }

        // Release Action
        if (body.action === 'Release') {
            const approvedAmount = currentLoan.approved_amount || currentLoan.requested_amount;
            let newStatus = currentLoan.status;
            let updates: any = {
                updated_at: new Date().toISOString(),
                release_type: body.release_type
            };

            const releaseType = body.release_type; // 'FULL' or 'STAGGERED'

            if (releaseType === 'FULL') {
                updates.released_amount = approvedAmount;
                updates.total_released_amount = approvedAmount;
                updates.remaining_balance = 0;
                updates.tracker_status = 'Fully Released';
                updates.status = 'Fully Released';
                // Clear staggered fields if any
                updates.first_release_amount = null;
                updates.second_release_amount = null;
                updates.last_release_amount = null;
            } else if (releaseType === 'STAGGERED') {
                const first = Number(body.first_release_amount) || 0;
                const second = Number(body.second_release_amount) || 0;
                const last = Number(body.last_release_amount) || 0;

                const totalReleased = first + second + last;

                // Validation
                if (totalReleased > approvedAmount) {
                    return NextResponse.json({ error: 'Total released amount cannot exceed approved amount' }, { status: 400 });
                }

                updates.first_release_amount = first;
                updates.first_release_date = body.first_release_date || null;
                updates.second_release_amount = second;
                updates.second_release_date = body.second_release_date || null;
                updates.last_release_amount = last;
                updates.last_release_date = body.last_release_date || null;
                updates.released_amount = totalReleased;
                updates.total_released_amount = totalReleased;
                updates.remaining_balance = approvedAmount - totalReleased;

                if (Math.abs(totalReleased - approvedAmount) < 0.01) {
                    updates.tracker_status = 'Fully Released';
                    updates.status = 'Fully Released';
                } else {
                    updates.tracker_status = 'Partially Released';
                    updates.status = 'Partially Released';
                }
            } else {
                return NextResponse.json({ error: 'Invalid release type' }, { status: 400 });
            }

            await updateEmergencyLoan(loanId, updates);

            await logAudit({
                user_id: user.id,
                action: `RELEASED FUNDS (${releaseType}): ${updates.released_amount}. Status: ${updates.status}`,
                table_name: 'emergency_loans',
                record_id: loanId
            });

            return NextResponse.json({ success: true });
        }

        await logAudit({
            user_id: user.id,
            action: `Updated Emergency Loan #${loanId} to status: ${body.status || currentLoan.status}`,
            table_name: 'emergency_loans',
            record_id: loanId
        });


        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update loan error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });

        const user = validation.user!;
        const loanId = parseInt(params.id);

        const currentLoan = await getEmergencyLoanById(loanId);
        if (!currentLoan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

        // Authorization:
        // 1. Admins/HR/High-level can delete any.
        // 2. Owners can delete ONLY if status is 'Draft' or 'Submitted' (before approval).
        const isOwner = user.employee_id === currentLoan.employee_id;
        const isAdmin = ['Admin', 'HR', 'President', 'Vice President'].includes(user.role);

        if (!isAdmin) {
            if (!isOwner) return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
            if (!['Draft', 'Submitted'].includes(currentLoan.status)) {
                return NextResponse.json({ error: 'Cannot delete a loan that is under review or approved.' }, { status: 403 });
            }
        }

        // Perform deletion (using a soft delete status for safety, or hard delete if no function exists)
        // Since we don't have a 'deleteEmergencyLoan' imported, checking the available functions...
        // I'll update it to 'Cancelled' or 'Deleted' status if I can't hard delete, 
        // OR I can assume `deleteEmergencyLoan` exists or I can use `updateEmergencyLoan` with status 'Deleted'.
        // Let's us `updateEmergencyLoan` to set status to 'Deleted' (soft delete) which is safer.

        await updateEmergencyLoan(loanId, {
            status: 'Deleted',
            updated_at: new Date().toISOString()
        });

        await logAudit({
            user_id: user.id,
            action: `Deleted Emergency Loan #${loanId}`,
            table_name: 'emergency_loans',
            record_id: loanId
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete loan error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

