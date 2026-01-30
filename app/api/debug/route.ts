import { NextResponse } from 'next/server';
import { getAllEmployees } from '@/lib/data';

export async function GET() {
    try {
        const employees = await getAllEmployees();
        console.log('--- ALL EMPLOYEES DEBUG ---');
        console.log(`Total Count: ${employees.length}`);

        // Simplified output for terminal consumption
        const simpleList = employees.map(e => ({
            i: e.id,
            n: e.first_name + ' ' + e.last_name,
            b: e.branch,
            s: e.employment_status
        }));

        return NextResponse.json(simpleList);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
