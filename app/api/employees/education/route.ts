import { NextRequest, NextResponse } from 'next/server';
import { getEducationByEmployeeId, addEducation, deleteEducation, replaceEmployeeEducation, logAudit } from '@/lib/data';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
        }

        const education = await getEducationByEmployeeId(parseInt(employeeId));
        return NextResponse.json(education);
    } catch (error) {
        console.error('Get education error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch education records' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data.employee_id || !data.level || !data.school_name || !data.year_graduated) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const id = await addEducation(data);

        // Log audit
        await logAudit({
            user_id: 1, // Assuming admin/current user
            action: 'ADD_EDUCATION',
            table_name: 'education',
            record_id: id,
            new_value: JSON.stringify(data)
        });

        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Add education error:', error);
        return NextResponse.json(
            { error: 'Failed to add education record' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { employee_id, education } = data;

        if (!employee_id || !Array.isArray(education)) {
            return NextResponse.json({ error: 'Employee ID and education list required' }, { status: 400 });
        }

        await replaceEmployeeEducation(employee_id, education);

        await logAudit({
            user_id: 1,
            action: 'UPDATE_EDUCATION_BULK',
            table_name: 'education',
            record_id: employee_id,
            new_value: JSON.stringify(education)
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update education error:', error);
        return NextResponse.json(
            { error: 'Failed to update education records' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Education ID is required' }, { status: 400 });
        }

        await deleteEducation(parseInt(id));

        // Log audit
        await logAudit({
            user_id: 1,
            action: 'DELETE_EDUCATION',
            table_name: 'education',
            record_id: parseInt(id)
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete education error:', error);
        return NextResponse.json(
            { error: 'Failed to delete education record' },
            { status: 500 }
        );
    }
}
