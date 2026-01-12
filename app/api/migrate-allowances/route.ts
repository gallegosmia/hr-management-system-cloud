import { NextResponse } from 'next/server';
import { getAllEmployees } from '@/lib/data';
import { update } from '@/lib/database';

export async function POST() {
    try {
        const employees = await getAllEmployees();
        let migratedCount = 0;

        for (const emp of employees) {
            if (emp.salary_info && emp.salary_info.allowances) {
                const allowances = emp.salary_info.allowances as any;

                // Check if using old structure
                if (allowances.rice !== undefined || allowances.laundry !== undefined ||
                    allowances.clothing !== undefined || allowances.other !== undefined) {

                    // Calculate total from old fields
                    const total = (Number(allowances.rice) || 0) +
                        (Number(allowances.laundry) || 0) +
                        (Number(allowances.clothing) || 0) +
                        (Number(allowances.other) || 0);

                    // Update to new structure
                    emp.salary_info.allowances = {
                        special: total
                    };

                    await update('employees', emp.id, emp);
                    migratedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Migrated ${migratedCount} employee(s) to new allowance structure`
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}
