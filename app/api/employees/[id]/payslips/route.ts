import { NextRequest, NextResponse } from 'next/server';
import { getEmployeePayslips, getEmployeeById } from '@/lib/data';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { isSuperAdmin, normalizeBranchName } from '@/lib/branch-access';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Enforce Session & Branch Auth
        const validation = await validateBranchRequest(request);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });
        }

        const { user } = validation;
        if (!user) return NextResponse.json({ error: 'User context missing' }, { status: 401 });

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Employee ID' }, { status: 400 });
        }

        // Fetch Employee to verify Branch ownership
        const employee = await getEmployeeById(id);
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Strict Access Control
        if (!isSuperAdmin(user.role)) {
            // HR: Must match branch
            if (user.role === 'HR') {
                if (normalizeBranchName(user.assigned_branch) !== normalizeBranchName(employee.branch)) {
                    return NextResponse.json({ error: 'Access denied: Employee belongs to another branch' }, { status: 403 });
                }
            }
            // Employee: Must be self
            else if (user.role === 'Employee') {
                if (Number(user.employee_id) !== id) {
                    return NextResponse.json({ error: 'Access denied: You can only view your own payslips' }, { status: 403 });
                }
            }
        }

        const payslips = await getEmployeePayslips(id);
        return NextResponse.json(payslips);
    } catch (error) {
        console.error('Fetch employee payslips error:', error);
        return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
    }
}
