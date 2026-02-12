import { NextRequest, NextResponse } from 'next/server';
import { getAll, getById, update, remove } from '@/lib/database';
import { createLeaveRequest, getLeaveRequests, getLeaveSettings } from '@/lib/data';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { filterByBranch } from '@/lib/branch-access';

export async function GET(request: NextRequest) {
    try {
        const validation = await validateBranchRequest(request);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 401 });

        const user = validation.user!;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const status = searchParams.get('status');
        const employeeId = searchParams.get('employee_id');

        if (id) {
            const req = await getById('leave_requests', parseInt(id));
            if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            const employees = await getAll('employees');
            const emp = employees.find((e: any) => Number(e.id) === Number(req.employee_id));

            const leaveData = {
                ...req,
                employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                department: emp ? emp.department : 'Unknown',
                branch: emp ? emp.branch : 'Unknown'
            };

            // Double check access to this specific request's branch
            const filtered = filterByBranch([leaveData], user.role, validation.selectedBranch);
            if (filtered.length === 0) {
                return NextResponse.json({ error: 'Access denied: Leave request belongs to another branch' }, { status: 403 });
            }

            return NextResponse.json(leaveData);
        }

        let requests = await getLeaveRequests(status || undefined);

        if (employeeId) {
            requests = requests.filter((req: any) => Number(req.employee_id) === Number(employeeId));
        }

        // If employee role, extra restriction to own leaves
        if (user.role === 'Employee') {
            requests = requests.filter((req: any) => Number(req.employee_id) === Number(user.employee_id));
        }

        const employees = await getAll('employees');
        const enrichedRequests = requests.map((req: any) => {
            const emp = employees.find((e: any) => Number(e.id) === Number(req.employee_id));
            return {
                ...req,
                employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
                department: emp ? emp.department : 'Unknown',
                branch: emp ? emp.branch : 'Unknown'
            };
        });

        // Apply branch-based isolation
        const filteredRequests = filterByBranch(enrichedRequests, user.role, validation.selectedBranch);

        return NextResponse.json(filteredRequests);
    } catch (error) {
        console.error('Get leave requests error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leave requests' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data.employee_id || !data.leave_type || !data.start_date || !data.end_date) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const settings = await getLeaveSettings();
        if (data.leave_type === 'Birthday Leave') {
            const employees = await getAll('employees');
            const emp = employees.find((e: any) => Number(e.id) === Number(data.employee_id));
            if (emp && emp.date_of_birth) {
                const bday = new Date(emp.date_of_birth);
                const start = new Date(data.start_date);
                if (bday.getMonth() !== start.getMonth() || bday.getDate() !== start.getDate()) {
                    console.log(`Birthday Leave date mismatch for ${emp.first_name}: ${data.start_date} vs ${emp.date_of_birth}`);
                }
            }

            const year = new Date(data.start_date).getFullYear();
            const leaves = await getAll('leave_requests');
            const existing = leaves.filter((l: any) =>
                l.employee_id === Number(data.employee_id) &&
                l.leave_type === 'Birthday Leave' &&
                new Date(l.start_date).getFullYear() === year &&
                l.status !== 'Rejected' &&
                l.status !== 'Cancelled'
            );

            if (existing.length > 0) {
                console.log(`Duplicate Birthday Leave attempt for employee ${data.employee_id} in ${year}`);
            }
        }

        const id = await createLeaveRequest(data);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Create leave request error:', error);
        return NextResponse.json(
            { error: 'Failed to create leave request' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { id, status, approver_id, remarks, approver_role } = await request.json();

        if (!id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const leaveRequest = await getById('leave_requests', id);

        if (!leaveRequest) {
            return NextResponse.json(
                { error: 'Leave request not found' },
                { status: 404 }
            );
        }

        if (status === 'Cancelled') {
            await update('leave_requests', id, {
                status: 'Cancelled',
                remarks,
                updated_at: new Date().toISOString()
            });
            return NextResponse.json({ success: true });
        }

        if (status === 'Rejected') {
            await update('leave_requests', id, {
                status: 'Rejected',
                rejected_by: approver_role || 'Unknown',
                remarks,
                updated_at: new Date().toISOString()
            });
            return NextResponse.json({ success: true });
        }

        if (status === 'Approved') {
            const currentStatus = leaveRequest.status;

            if (currentStatus === 'Pending Branch Manager' || currentStatus === 'Pending') {
                await update('leave_requests', id, {
                    status: 'Pending EVP',
                    branch_manager_approved_at: new Date().toISOString(),
                    branch_manager_approved_by: approver_id || 1,
                    branch_manager_remarks: remarks || 'Approved',
                    remarks: 'Approved by Branch Manager',
                    updated_at: new Date().toISOString()
                });
                return NextResponse.json({
                    success: true,
                    message: 'Approved by Branch Manager. Pending EVP approval.'
                });
            }

            if (currentStatus === 'Pending EVP') {
                const existingRemarks = leaveRequest.remarks || '';
                const finalRemarks = existingRemarks + ' | Approved by Executive Vice President';

                await update('leave_requests', id, {
                    status: 'Approved',
                    evp_approved_at: new Date().toISOString(),
                    evp_approved_by: approver_id || 1,
                    evp_remarks: remarks || 'Approved',
                    remarks: finalRemarks,
                    final_approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                return NextResponse.json({
                    success: true,
                    message: 'Fully approved by Executive Vice President.'
                });
            }

            if (currentStatus === 'Approved') {
                return NextResponse.json({
                    success: false,
                    message: 'Leave request is already fully approved.'
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update leave status error:', error);
        return NextResponse.json(
            { error: 'Failed to update leave status' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        await update('leave_requests', parseInt(id), {
            ...updateData,
            updated_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update leave request error:', error);
        return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await remove('leave_requests', parseInt(id));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 });
    }
}
