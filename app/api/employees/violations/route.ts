import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Fetch violations and warnings for an employee
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const type = searchParams.get('type'); // 'violations' or 'warnings'

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
        }

        if (type === 'warnings') {
            const result = await query(
                `SELECT w.*, 
                        CONCAT(e.first_name, ' ', e.last_name) as issued_by_name
                 FROM employee_warnings w
                 LEFT JOIN employees e ON w.issued_by = e.id
                 WHERE w.employee_id = $1 
                 ORDER BY w.warning_date DESC`,
                [employeeId]
            );
            return NextResponse.json(result.rows);
        }

        // Default to violations
        const result = await query(
            `SELECT v.*, 
                    CONCAT(e.first_name, ' ', e.last_name) as issued_by_name
             FROM employee_violations v
             LEFT JOIN employees e ON v.issued_by = e.id
             WHERE v.employee_id = $1 
             ORDER BY v.incident_date DESC`,
            [employeeId]
        );
        return NextResponse.json(result.rows);

    } catch (error: any) {
        console.error('Fetch violations error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Add a new violation or warning
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { type, employee_id, ...recordData } = data;

        if (!employee_id) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
        }

        if (type === 'warning') {
            const result = await query(
                `INSERT INTO employee_warnings 
                 (employee_id, violation_id, warning_type, warning_date, reason, duration_days, issued_by, document_file, status, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [
                    employee_id,
                    recordData.violation_id || null,
                    recordData.warning_type,
                    recordData.warning_date,
                    recordData.reason,
                    recordData.duration_days || null,
                    recordData.issued_by || null,
                    recordData.document_file,
                    recordData.status || 'Active',
                    recordData.remarks
                ]
            );
            return NextResponse.json(result.rows[0]);
        }

        // Default: Add violation
        const result = await query(
            `INSERT INTO employee_violations 
             (employee_id, violation_type, severity, incident_date, description, action_taken, action_date, action_document, issued_by, status, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                employee_id,
                recordData.violation_type,
                recordData.severity || 'Minor',
                recordData.incident_date,
                recordData.description,
                recordData.action_taken,
                recordData.action_date || null,
                recordData.action_document,
                recordData.issued_by || null,
                recordData.status || 'Active',
                recordData.remarks
            ]
        );
        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error('Add violation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update violation or warning
export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { type, id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
        }

        if (type === 'warning') {
            const result = await query(
                `UPDATE employee_warnings SET
                 warning_type = COALESCE($1, warning_type),
                 warning_date = COALESCE($2, warning_date),
                 reason = COALESCE($3, reason),
                 duration_days = $4,
                 acknowledged = COALESCE($5, acknowledged),
                 acknowledged_at = $6,
                 document_file = COALESCE($7, document_file),
                 status = COALESCE($8, status),
                 remarks = $9,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = $10
                 RETURNING *`,
                [
                    updateData.warning_type,
                    updateData.warning_date,
                    updateData.reason,
                    updateData.duration_days,
                    updateData.acknowledged,
                    updateData.acknowledged_at,
                    updateData.document_file,
                    updateData.status,
                    updateData.remarks,
                    id
                ]
            );
            return NextResponse.json(result.rows[0]);
        }

        // Default: Update violation
        const result = await query(
            `UPDATE employee_violations SET
             violation_type = COALESCE($1, violation_type),
             severity = COALESCE($2, severity),
             incident_date = COALESCE($3, incident_date),
             description = COALESCE($4, description),
             action_taken = COALESCE($5, action_taken),
             action_date = $6,
             action_document = COALESCE($7, action_document),
             acknowledged_by_employee = COALESCE($8, acknowledged_by_employee),
             acknowledged_at = $9,
             status = COALESCE($10, status),
             remarks = $11,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $12
             RETURNING *`,
            [
                updateData.violation_type,
                updateData.severity,
                updateData.incident_date,
                updateData.description,
                updateData.action_taken,
                updateData.action_date,
                updateData.action_document,
                updateData.acknowledged_by_employee,
                updateData.acknowledged_at,
                updateData.status,
                updateData.remarks,
                id
            ]
        );
        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error('Update violation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove violation or warning
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type');

        if (!id) {
            return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
        }

        const table = type === 'warning' ? 'employee_warnings' : 'employee_violations';
        await query(`DELETE FROM ${table} WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete violation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
