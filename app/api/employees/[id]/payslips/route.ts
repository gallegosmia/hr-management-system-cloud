import { NextRequest, NextResponse } from 'next/server';
import { getEmployeePayslips } from '@/lib/data';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Employee ID' }, { status: 400 });
        }

        const payslips = await getEmployeePayslips(id);
        return NextResponse.json(payslips);
    } catch (error) {
        console.error('Fetch employee payslips error:', error);
        return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
    }
}
