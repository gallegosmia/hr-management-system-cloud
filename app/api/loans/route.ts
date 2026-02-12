
import { NextRequest, NextResponse } from 'next/server';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { getEmergencyLoans, createEmergencyLoan, logAudit } from '@/lib/data';
import { filterByBranch } from '@/lib/branch-access';

export async function GET(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });

        const user = validation.user!;
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');

        const filters: any = {};
        if (employeeId) filters.employee_id = parseInt(employeeId);
        if (status && status !== 'All') filters.status = status;

        // If employee role, force filter by their own ID
        if (user.role === 'Employee') {
            if (!user.employee_id) return NextResponse.json({ error: 'Employee profile not found' }, { status: 400 });
            filters.employee_id = user.employee_id;
        }

        const loans = await getEmergencyLoans(filters);

        // Apply branch-based isolation
        const filteredLoans = filterByBranch(loans, user.role, user.assigned_branch);

        return NextResponse.json(filteredLoans);
    } catch (error) {
        console.error('Fetch loans error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });

        const user = validation.user!;
        const body = await request.json();

        // Validation and role check
        if (user.role === 'Employee') {
            body.employee_id = user.employee_id;
            body.status = 'Submitted';
        } else {
            // HR/Admin can set status or default to Submitted
            if (!body.status) body.status = 'Submitted';
        }

        if (!body.employee_id) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

        const loanId = await createEmergencyLoan({
            ...body,
            approvals: JSON.stringify(body.approvals || []),
            attachments: JSON.stringify(body.attachments || []),
            metadata: JSON.stringify({
                ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
                device: request.headers.get('user-agent') || 'Unknown'
            }),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        await logAudit({
            user_id: user.id,
            action: `Filed Emergency Loan Request #${loanId}`,
            table_name: 'emergency_loans',
            record_id: loanId
        });

        return NextResponse.json({ success: true, id: loanId });
    } catch (error) {
        console.error('Create loan error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
