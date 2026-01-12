import { NextRequest, NextResponse } from 'next/server';
import { insert, getAll } from '@/lib/database';
import { logAudit } from '@/lib/data';

interface ExcelRow {
    employee_id: string;
    last_name: string;
    first_name: string;
    middle_name?: string;
    department: string;
    position: string;
    employment_status: string;
    date_hired: string;
    contact_number?: string;
    email_address?: string;
    sss_number?: string;
    philhealth_number?: string;
    pagibig_number?: string;
    tin?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { data, mode } = await request.json();

        if (!data || !Array.isArray(data)) {
            return NextResponse.json(
                { error: 'Invalid data format' },
                { status: 400 }
            );
        }

        const results = {
            total: data.length,
            success: 0,
            failed: 0,
            errors: [] as any[]
        };

        const existingEmployees = await getAll('employees');
        const existingIds = new Set(existingEmployees.map((emp: any) => emp.employee_id));

        let index = 0;
        for (const row of data) {
            index++;
            try {
                // Validation
                const errors: string[] = [];

                if (!row.employee_id) errors.push('Employee ID is required');
                if (!row.last_name) errors.push('Last Name is required');
                if (!row.first_name) errors.push('First Name is required');
                if (!row.department) errors.push('Department is required');
                if (!row.position) errors.push('Position is required');
                if (!row.employment_status) errors.push('Employment Status is required');
                if (!row.date_hired) errors.push('Date Hired is required');

                // Check for duplicate Employee ID
                if (mode === 'create' && existingIds.has(row.employee_id)) {
                    errors.push(`Employee ID ${row.employee_id} already exists`);
                }

                if (errors.length > 0) {
                    results.failed++;
                    results.errors.push({
                        row: index,
                        employee_id: row.employee_id,
                        errors
                    });
                    continue;
                }

                // Create employee record
                const employeeData = {
                    employee_id: row.employee_id,
                    last_name: row.last_name,
                    first_name: row.first_name,
                    middle_name: row.middle_name || '',
                    department: row.department,
                    position: row.position,
                    employment_status: row.employment_status,
                    date_hired: row.date_hired,
                    contact_number: row.contact_number || '',
                    email_address: row.email_address || '',
                    sss_number: row.sss_number || '',
                    philhealth_number: row.philhealth_number || '',
                    pagibig_number: row.pagibig_number || '',
                    tin: row.tin || '',
                    personal_info_complete: 0,
                    preemployment_req_complete: 0,
                    government_docs_complete: 0,
                    employment_records_complete: 0,
                    attendance_records_complete: 0,
                    payroll_records_complete: 0,
                    disciplinary_records: 0,
                    training_records: 0,
                    separation_records: 0,
                    file_completion_status: 'Incomplete',
                    created_by: 1
                };

                const employeeId = await insert('employees', employeeData);
                existingIds.add(row.employee_id);

                await logAudit({
                    user_id: 1,
                    action: 'BULK_IMPORT_EMPLOYEE',
                    table_name: 'employees',
                    record_id: employeeId,
                    new_value: JSON.stringify(employeeData)
                });

                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push({
                    row: index,
                    employee_id: row.employee_id,
                    errors: [error.message]
                });
            }
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Excel import error:', error);
        return NextResponse.json(
            { error: 'Failed to import Excel data' },
            { status: 500 }
        );
    }
}
