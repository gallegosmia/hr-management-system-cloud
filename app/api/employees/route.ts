import { NextRequest, NextResponse } from 'next/server';
import { getAllEmployees, createEmployee, getEmployeeById, updateEmployee, update201Checklist, deleteEmployee, logAudit } from '@/lib/data';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const employee = await getEmployeeById(parseInt(id));
            if (!employee) {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
            }
            return NextResponse.json(employee);
        }

        const employees = await getAllEmployees();
        return NextResponse.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch employees' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const userId = 1;

        const employeeId = await createEmployee(data, userId);

        await logAudit({
            user_id: userId,
            action: 'CREATE_EMPLOYEE',
            table_name: 'employees',
            record_id: employeeId,
            new_value: JSON.stringify(data)
        });

        return NextResponse.json({ id: employeeId, success: true });
    } catch (error) {
        console.error('Create employee error:', error);
        return NextResponse.json(
            { error: 'Failed to create employee' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { id, ...data } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const userId = 1;
        const oldEmployee = await getEmployeeById(id);

        await updateEmployee(id, data);

        await logAudit({
            user_id: userId,
            action: 'UPDATE_EMPLOYEE',
            table_name: 'employees',
            record_id: id,
            old_value: JSON.stringify(oldEmployee),
            new_value: JSON.stringify(data)
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update employee error:', error);
        return NextResponse.json(
            { error: 'Failed to update employee' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, checklist, salary_info } = body;

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const userId = 1;
        const employeeId = parseInt(id as string, 10);

        if (checklist) {
            await update201Checklist(employeeId, checklist);
            await logAudit({
                user_id: userId,
                action: 'UPDATE_201_CHECKLIST',
                table_name: 'employees',
                record_id: employeeId
            });
        }

        if (salary_info !== undefined) {
            const oldEmployee = await getEmployeeById(employeeId);
            await updateEmployee(employeeId, { salary_info });

            await logAudit({
                user_id: userId,
                action: 'UPDATE_SALARY_INFO',
                table_name: 'employees',
                record_id: employeeId,
                old_value: JSON.stringify(oldEmployee?.salary_info),
                new_value: JSON.stringify(salary_info)
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PATCH employee error:', error);
        return NextResponse.json(
            { error: 'Failed to update employee' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const userId = 1;
        await deleteEmployee(parseInt(id));

        await logAudit({
            user_id: userId,
            action: 'DELETE_EMPLOYEE',
            table_name: 'employees',
            record_id: parseInt(id)
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

