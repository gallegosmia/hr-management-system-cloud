import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeeById, updateEmployee, update201Checklist, deleteEmployee, logAudit, getEmployeeByEmployeeId, searchEmployees, getEmployeeLeaveCount, getEmployeeLateCount } from '@/lib/data';
import { query } from '@/lib/database';
import { validateBranchRequest } from '@/lib/middleware/branch-auth';
import { isSuperAdmin, filterByBranch, normalizeBranchName } from '@/lib/branch-access';

// Helper to make response serializable
const serialize = (obj: any) => {
    if (obj === undefined || obj === null) return obj;
    return JSON.parse(JSON.stringify(obj));
};

export async function GET(request: NextRequest) {
    try {
        // Validate session and get user/branch context
        const validation = await validateBranchRequest(request);

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }

        const { user, selectedBranch } = validation;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const search = searchParams.get('search');

        if (id) {
            const cleanId = id.trim();
            let employee = null;

            // Try by Internal ID (Numeric) first
            if (/^\d+$/.test(cleanId)) {
                employee = await getEmployeeById(parseInt(cleanId));
            }

            // If not found, try by Employee ID (String, e.g., 2017-0001, case-insensitive)
            if (!employee) {
                const res = await query("SELECT * FROM employees WHERE UPPER(employee_id) = UPPER($1)", [cleanId]);
                employee = res.rows[0];
            }

            if (!employee) {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
            }

            // BRANCH ACCESS CONTROL: Validate user can access this employee's branch
            if (!isSuperAdmin(user!.role)) {
                if (employee.branch && user!.assigned_branch) {
                    if (normalizeBranchName(employee.branch) !== normalizeBranchName(user!.assigned_branch)) {
                        return NextResponse.json(
                            { error: 'Access denied: You do not have permission to view this employee' },
                            { status: 403 }
                        );
                    }
                }
            }

            // Fetch Education Records for the Personal Info Tab
            const eduRes = await query("SELECT * FROM education WHERE employee_id = $1 ORDER BY year_graduated DESC", [employee.id]);
            employee.education = eduRes.rows;

            // Fetch Leave Balance & Lates
            try {
                const now = new Date();
                const used = await getEmployeeLeaveCount(employee.id, now.getFullYear());
                employee.leave_balance = Math.max(0, 5 - used);

                const lates = await getEmployeeLateCount(employee.id, now.getMonth(), now.getFullYear());
                employee.lates_this_month = lates;
            } catch (e) {
                console.error('Error fetching leave/lates:', e);
                employee.leave_balance = 5;
                employee.lates_this_month = 0;
            }

            return NextResponse.json(serialize(employee));
        }

        // Fetch all or search employees
        let employees;

        if (search) {
            employees = await searchEmployees(search);
        } else {
            employees = await getAllEmployees();
        }

        // BRANCH FILTERING: Filter employees by user's branch (unless Super Admin)
        const filteredEmployees = filterByBranch(employees, user!.role, user!.assigned_branch);

        return NextResponse.json(serialize(filteredEmployees));
    } catch (error) {
        console.error('Get employees error:', error);
        return NextResponse.json(
            serialize({ error: 'Failed to fetch employees' }),
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Validate session and get user/branch context
        const validation = await validateBranchRequest(request);

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }

        const { user } = validation;
        const rawData = await request.json();

        // Clean data: convert empty strings to null
        const data: any = {};
        Object.entries(rawData).forEach(([key, value]) => {
            data[key] = value === '' ? null : value;
        });

        // BRANCH ACCESS CONTROL: Validate user can create employee in this branch
        if (data.branch && !isSuperAdmin(user!.role)) {
            if (!user!.assigned_branch) {
                return NextResponse.json(
                    { error: 'User has no assigned branch' },
                    { status: 403 }
                );
            }

            if (normalizeBranchName(data.branch) !== normalizeBranchName(user!.assigned_branch)) {
                return NextResponse.json(
                    { error: `You can only create employees for ${user!.assigned_branch} branch` },
                    { status: 403 }
                );
            }
        }

        const employeeId = await createEmployee(data, user!.id);

        await logAudit({
            user_id: user!.id,
            action: 'CREATE_EMPLOYEE',
            table_name: 'employees',
            record_id: employeeId,
            new_value: JSON.stringify(data)
        });

        return NextResponse.json(serialize({ id: employeeId, success: true }));
    } catch (error) {
        console.error('Create employee error:', error);
        return NextResponse.json(
            serialize({ error: `Failed to create employee: ${error instanceof Error ? error.message : String(error)}` }),
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Validate session and get user/branch context
        const validation = await validateBranchRequest(request);

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }

        const { user } = validation;
        let { id, ...data } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        // If ID is string (e.g. "2017-0001"), find the internal numeric ID
        if (typeof id === 'string' && !/^\d+$/.test(id)) {
            const res = await query("SELECT id FROM employees WHERE UPPER(employee_id) = UPPER($1)", [id]);
            if (res.rows[0]) {
                id = res.rows[0].id;
            } else {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
            }
        } else if (typeof id === 'string') {
            id = parseInt(id, 10);
        }

        // Get existing employee to check branch
        const oldEmployee = await getEmployeeById(id);

        if (!oldEmployee) {
            return NextResponse.json({ error: 'Employee not found in database' }, { status: 404 });
        }

        // BRANCH ACCESS CONTROL: Validate user can modify this employee's branch
        if (!isSuperAdmin(user!.role)) {
            // Check existing employee's branch
            if (oldEmployee.branch && user!.assigned_branch) {
                if (normalizeBranchName(oldEmployee.branch) !== normalizeBranchName(user!.assigned_branch)) {
                    return NextResponse.json(
                        { error: 'Access denied: You cannot modify employees from other branches' },
                        { status: 403 }
                    );
                }
            }

            // If changing branch, validate new branch
            if (data.branch && data.branch !== oldEmployee.branch) {
                if (!user!.assigned_branch) {
                    return NextResponse.json(
                        { error: 'User has no assigned branch' },
                        { status: 403 }
                    );
                }

                if (normalizeBranchName(data.branch) !== normalizeBranchName(user!.assigned_branch)) {
                    return NextResponse.json(
                        { error: `You can only assign employees to ${user!.assigned_branch} branch` },
                        { status: 403 }
                    );
                }
            }
        }

        // Clean data: convert empty strings to null
        const cleanData: any = {};
        Object.entries(data).forEach(([key, value]) => {
            cleanData[key] = value === '' ? null : value;
        });

        await updateEmployee(id, cleanData);

        await logAudit({
            user_id: user!.id,
            action: 'UPDATE_EMPLOYEE',
            table_name: 'employees',
            record_id: id,
            old_value: JSON.stringify(oldEmployee),
            new_value: JSON.stringify(cleanData)
        });

        return NextResponse.json(serialize({ success: true }));
    } catch (error: any) {
        console.error('Update employee error:', error);
        return NextResponse.json(
            serialize({ error: `Failed to update employee: ${error.message || String(error)}` }),
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        // Validate session and get user/branch context
        const validation = await validateBranchRequest(request);

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }

        const { user } = validation;
        const body = await request.json();
        const { id, checklist, salary_info } = body;

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const employeeId = parseInt(id as string, 10);
        const employee = await getEmployeeById(employeeId);

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // BRANCH ACCESS CONTROL: Validate user can modify this employee
        if (!isSuperAdmin(user!.role)) {
            if (employee.branch && user!.assigned_branch) {
                if (normalizeBranchName(employee.branch) !== normalizeBranchName(user!.assigned_branch)) {
                    return NextResponse.json(
                        { error: 'Access denied: You cannot modify employees from other branches' },
                        { status: 403 }
                    );
                }
            }
        }

        if (checklist) {
            await update201Checklist(employeeId, checklist);
            await logAudit({
                user_id: user!.id,
                action: 'UPDATE_201_CHECKLIST',
                table_name: 'employees',
                record_id: employeeId
            });
        }

        if (salary_info !== undefined) {
            await updateEmployee(employeeId, { salary_info });

            await logAudit({
                user_id: user!.id,
                action: 'UPDATE_SALARY_INFO',
                table_name: 'employees',
                record_id: employeeId,
                old_value: JSON.stringify(employee?.salary_info),
                new_value: JSON.stringify(salary_info)
            });
        }

        return NextResponse.json(serialize({ success: true }));
    } catch (error) {
        console.error('PATCH employee error:', error);
        return NextResponse.json(
            serialize({ error: 'Failed to update employee' }),
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Validate session and get user/branch context
        const validation = await validateBranchRequest(request);

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: validation.errorCode || 403 });
        }

        const { user } = validation;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const employeeId = parseInt(id);
        const employee = await getEmployeeById(employeeId);

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // BRANCH ACCESS CONTROL: Validate user can delete this employee
        if (!isSuperAdmin(user!.role)) {
            if (employee.branch && user!.assigned_branch) {
                if (normalizeBranchName(employee.branch) !== normalizeBranchName(user!.assigned_branch)) {
                    return NextResponse.json(
                        { error: 'Access denied: You cannot delete employees from other branches' },
                        { status: 403 }
                    );
                }
            }
        }

        await deleteEmployee(employeeId);

        await logAudit({
            user_id: user!.id,
            action: 'DELETE_EMPLOYEE',
            table_name: 'employees',
            record_id: employeeId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete employee error:', error);
        return NextResponse.json(
            { error: 'Failed to delete employee' },
            { status: 500 }
        );
    }
}

