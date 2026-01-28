import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// GET - Fetch trainings and certificates for an employee
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const type = searchParams.get('type'); // 'trainings' or 'certificates'

        if (!employeeId) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
        }

        if (type === 'certificates') {
            const result = await query(
                `SELECT * FROM employee_certificates 
                 WHERE employee_id = $1 
                 ORDER BY issue_date DESC`,
                [employeeId]
            );
            return NextResponse.json(result.rows);
        }

        // Default to trainings
        const result = await query(
            `SELECT * FROM employee_trainings 
             WHERE employee_id = $1 
             ORDER BY date_completed DESC, date_started DESC`,
            [employeeId]
        );
        return NextResponse.json(result.rows);

    } catch (error: any) {
        console.error('Fetch trainings error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Add a new training or certificate
export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { type, employee_id, ...recordData } = data;

        if (!employee_id) {
            return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
        }

        if (type === 'certificate') {
            const result = await query(
                `INSERT INTO employee_certificates 
                 (employee_id, certificate_name, issuing_organization, issue_date, expiry_date, certificate_number, certificate_file, status, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    employee_id,
                    recordData.certificate_name,
                    recordData.issuing_organization,
                    recordData.issue_date || null,
                    recordData.expiry_date || null,
                    recordData.certificate_number,
                    recordData.certificate_file,
                    recordData.status || 'Active',
                    recordData.remarks
                ]
            );
            return NextResponse.json(result.rows[0]);
        }

        // Default: Add training
        const result = await query(
            `INSERT INTO employee_trainings 
             (employee_id, training_name, training_type, provider, date_started, date_completed, hours_completed, certificate_number, certificate_file, status, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                employee_id,
                recordData.training_name,
                recordData.training_type,
                recordData.provider,
                recordData.date_started || null,
                recordData.date_completed || null,
                recordData.hours_completed || null,
                recordData.certificate_number,
                recordData.certificate_file,
                recordData.status || 'Completed',
                recordData.remarks
            ]
        );
        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error('Add training error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update training or certificate
export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { type, id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
        }

        if (type === 'certificate') {
            const result = await query(
                `UPDATE employee_certificates SET
                 certificate_name = COALESCE($1, certificate_name),
                 issuing_organization = COALESCE($2, issuing_organization),
                 issue_date = COALESCE($3, issue_date),
                 expiry_date = $4,
                 certificate_number = COALESCE($5, certificate_number),
                 certificate_file = COALESCE($6, certificate_file),
                 status = COALESCE($7, status),
                 remarks = $8,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9
                 RETURNING *`,
                [
                    updateData.certificate_name,
                    updateData.issuing_organization,
                    updateData.issue_date,
                    updateData.expiry_date,
                    updateData.certificate_number,
                    updateData.certificate_file,
                    updateData.status,
                    updateData.remarks,
                    id
                ]
            );
            return NextResponse.json(result.rows[0]);
        }

        // Default: Update training
        const result = await query(
            `UPDATE employee_trainings SET
             training_name = COALESCE($1, training_name),
             training_type = COALESCE($2, training_type),
             provider = COALESCE($3, provider),
             date_started = COALESCE($4, date_started),
             date_completed = $5,
             hours_completed = COALESCE($6, hours_completed),
             certificate_number = COALESCE($7, certificate_number),
             certificate_file = COALESCE($8, certificate_file),
             status = COALESCE($9, status),
             remarks = $10,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $11
             RETURNING *`,
            [
                updateData.training_name,
                updateData.training_type,
                updateData.provider,
                updateData.date_started,
                updateData.date_completed,
                updateData.hours_completed,
                updateData.certificate_number,
                updateData.certificate_file,
                updateData.status,
                updateData.remarks,
                id
            ]
        );
        return NextResponse.json(result.rows[0]);

    } catch (error: any) {
        console.error('Update training error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Remove training or certificate
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const type = searchParams.get('type');

        if (!id) {
            return NextResponse.json({ error: 'Record ID required' }, { status: 400 });
        }

        const table = type === 'certificate' ? 'employee_certificates' : 'employee_trainings';
        await query(`DELETE FROM ${table} WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete training error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
