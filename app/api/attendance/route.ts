import { NextRequest, NextResponse } from 'next/server';
import { getAll, query } from '@/lib/database';
import { recordAttendance, getAttendanceByDate, batchRecordAttendance } from '@/lib/data';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const employeeId = searchParams.get('employee_id');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');

        if (date) {
            const attendance = await getAttendanceByDate(date);
            return NextResponse.json(attendance);
        }

        if (employeeId && startDate && endDate) {
            const res = await query(
                "SELECT * FROM attendance WHERE employee_id = $1 AND date >= $2 AND date <= $3",
                [parseInt(employeeId), startDate, endDate]
            );
            return NextResponse.json(res.rows);
        }

        if (startDate && endDate) {
            const res = await query(
                "SELECT * FROM attendance WHERE date >= $1 AND date <= $2 ORDER BY date DESC, time_in ASC",
                [startDate, endDate]
            );
            return NextResponse.json(res.rows);
        }

        // Get all attendance
        const attendance = await getAll('attendance');
        return NextResponse.json(attendance);
    } catch (error) {
        console.error('Get attendance error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch attendance' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await query("DELETE FROM attendance WHERE id = $1", [parseInt(id)]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete attendance error:', error);
        return NextResponse.json(
            { error: 'Failed to delete record' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { date, records } = await request.json();

        if (!date || !records || !Array.isArray(records)) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        // Efficiently save all records in one batch
        await batchRecordAttendance(records.map(record => ({
            employee_id: record.employee_id,
            date: date,
            time_in: record.time_in || null,
            time_out: record.time_out || null,
            status: record.status,
            remarks: record.remarks || null
        })));

        return NextResponse.json({ success: true, count: records.length });
    } catch (error: any) {
        console.error('Save attendance error:', error);
        return NextResponse.json(
            { error: `Failed to save attendance: ${error.message || String(error)}` },
            { status: 500 }
        );
    }
}
