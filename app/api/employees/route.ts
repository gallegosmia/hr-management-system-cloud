import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeeById, updateEmployee, update201Checklist, deleteEmployee, logAudit, getEmployeeByEmployeeId, searchEmployees, getEmployeeLeaveCount, getEmployeeLateCount, getEmployeeLoanBalance, getLoanConfig, filterEmployees } from '@/lib/data';
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
        const branchParam = searchParams.get('branch');
        const statusParam = searchParams.get('status');
        const payrollEligible = searchParams.get('payroll_eligible') === 'true';
        const periodEndParam = searchParams.get('period_end');

        if (id) {
            // ... existing ID handling ...
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

            // Ensure salary_info is parsed if it is a string from the DB
            if (typeof employee.salary_info === 'string') {
                try {
                    employee.salary_info = JSON.parse(employee.salary_info);
                } catch (e) {
                    // Ignored parsing errors
                }
            }

            // BRANCH ACCESS CONTROL
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

            // ... fetch peripheral data ...
            const eduRes = await query("SELECT * FROM education WHERE employee_id = $1 ORDER BY year_graduated DESC", [employee.id]);
            employee.education = eduRes.rows;

            try {
                const now = new Date();
                const used = await getEmployeeLeaveCount(employee.id, now.getFullYear());
                employee.leave_balance = Math.max(0, 5 - used);
                employee.leave_used = used;

                const lates = await getEmployeeLateCount(employee.id, now.getMonth(), now.getFullYear());
                employee.lates_this_month = lates;

                const balance = await getEmployeeLoanBalance(employee.id);
                employee.ledger_balance = balance;

                const loanConfig = await getLoanConfig();
                employee.loan_config = loanConfig;
            } catch (e) {
                console.error('Error fetching peripheral data:', e);
                // Set defaults...
            }

            return NextResponse.json(serialize(employee));
        }

        // Fetch all or search employees
        let employees;



        if (search) {
            employees = await searchEmployees(search);
        } else if (payrollEligible) {
            // Strict Payroll Eligibility Check
            const allEmployees = await getAllEmployees();

            employees = allEmployees.filter(emp => {
                // 1. Must be Active
                // Allow Regular, Probationary, Contractual, Active. Exclude Resigned, Terminated.
                const inactiveStatuses = ['Resigned', 'Terminated', 'AWOL'];
                if (inactiveStatuses.includes(emp.employment_status)) return false;

                // 2. Must have valid salary info
                if (!emp.salary_info) return false;


                // Handle various field names for salary (basic_salary or monthly_salary)
                let s = emp.salary_info as any;
                if (typeof s === 'string') {
                    try {
                        s = JSON.parse(s);
                    } catch (e) {
                        return false;
                    }
                }

                const dailyRate = parseFloat(s.daily_rate) || 0;
                const monthlySalary = parseFloat(s.monthly_salary) || parseFloat(s.basic_salary) || 0;

                if (dailyRate <= 0 && monthlySalary <= 0) return false;

                // 3. Not resigned effective before/on payroll period end
                if (emp.date_separated && periodEndParam) {
                    const separationDate = new Date(emp.date_separated);
                    const periodEnd = new Date(periodEndParam);
                    if (separationDate <= periodEnd) {
                        console.log(`[Payroll-Check] Filtered ${emp.first_name} ${emp.last_name}: Resigned on/before ${periodEndParam}`);
                        return false;
                    }
                }

                console.log(`[Payroll-Check] Included ${emp.first_name} ${emp.last_name} (${emp.branch})`);
                return true;
            });

            console.log(`[Payroll-Check] Found ${employees.length} eligible employees out of ${allEmployees.length} total.`);
        } else if (statusParam) {
            employees = await filterEmployees({ employment_status: statusParam });
        } else {
            employees = await getAllEmployees();
        }

        // Determine which branch to filter by
        // If query param is provided, use it (after validation)
        // Otherwise use session selectedBranch
        let targetBranch = selectedBranch;

        if (branchParam) {
            // Validate access to requested branch
            if (isSuperAdmin(user!.role)) {
                targetBranch = branchParam;
            } else {
                // Regular users can only request their assigned branch
                if (normalizeBranchName(branchParam) === normalizeBranchName(user!.assigned_branch)) {
                    targetBranch = branchParam;
                } else {
                    // Only return their assigned branch if they try to access another
                    targetBranch = user!.assigned_branch;
                }
            }
        }

        // BRANCH FILTERING
        const filteredEmployees = filterByBranch(employees, user!.role, targetBranch);

        filteredEmployees.forEach(emp => {
            if (typeof emp.salary_info === 'string') {
                try {
                    emp.salary_info = JSON.parse(emp.salary_info);
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            }
        });

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
        const ignoredKeys = ['id', 'created_at', 'updated_at'];
        
        Object.entries(data).forEach(([key, value]) => {
            if (oldEmployee && key in oldEmployee && !ignoredKeys.includes(key)) {
                cleanData[key] = value === '' ? null : value;
            }
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

